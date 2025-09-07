import { prisma } from './prisma'
import { roundToTwoDecimals, convertUsdToEur } from './utils'
import { ComponentType, Role } from '@prisma/client'

interface RuleSet {
  salesRep: {
    baseCommission: number
    activityCommission: number
    fixedBonuses: {
      m0_5: number
      m1: number
      m1_retention: number
      m2: number
    }
  }
  teamLeader: {
    baseCommission: number
    activityCommission: number
    fixedBonuses: {
      m0_5: number
      m1: number
      m1_retention: number
      m2: number
    }
    downlineRates: {
      levelA: number
      levelB: number
      levelC: number
    }
    teamBonus: {
      rate: number
      recruitment: number
      graduation: number
    }
  }
  teamTargets: {
    minTeamRevenue: number
  }
}

interface PersonalRevenue {
  managerId: string
  baseUsd: number
  activityUsd: number
  totalUsd: number
  milestones: {
    m0_5: number
    m1: number
    m1_retention: number
    m2: number
  }
  creatorCount: number
}

interface CommissionCalculation {
  managerId: string
  role: Role
  components: CommissionComponent[]
  totalEur: number
}

interface CommissionComponent {
  type: ComponentType
  amountUsd?: number
  amountEur: number
  calculation: any
}

export class CommissionEngine {
  private rules: RuleSet
  private usdEurRate: number
  private periodId: string

  constructor(rules: RuleSet, usdEurRate: number, periodId: string) {
    this.rules = rules
    this.usdEurRate = usdEurRate
    this.periodId = periodId
  }

  static async create(periodId: string): Promise<CommissionEngine> {
    // Get period and rules
    const [period, ruleSet] = await Promise.all([
      prisma.period.findUnique({ where: { id: periodId } }),
      prisma.ruleSet.findFirst({
        where: { isActive: true },
        orderBy: { activeFrom: 'desc' }
      })
    ])

    if (!period) {
      throw new Error(`Period ${periodId} not found`)
    }

    if (!period.usdEurRate) {
      throw new Error(`USD/EUR rate not set for period ${periodId}`)
    }

    if (!ruleSet) {
      throw new Error('No active rule set found')
    }

    return new CommissionEngine(
      ruleSet.jsonRules as RuleSet,
      parseFloat(period.usdEurRate.toString()),
      periodId
    )
  }

  async calculateAllCommissions(): Promise<CommissionCalculation[]> {
    // Clear existing commission ledger for this period
    await prisma.commissionLedger.deleteMany({
      where: { periodId: this.periodId }
    })

    // Get all managers with revenue data
    const managers = await this.getManagersWithRevenue()
    const calculations: CommissionCalculation[] = []

    // Calculate personal commissions first
    for (const manager of managers) {
      const calculation = await this.calculatePersonalCommissions(manager)
      calculations.push(calculation)
    }

    // Calculate downline commissions for team leaders
    const teamLeaders = managers.filter(m => m.role === 'TEAM_LEADER')
    for (const teamLeader of teamLeaders) {
      const downlineCalculation = await this.calculateDownlineCommissions(teamLeader.id)
      const existingCalc = calculations.find(c => c.managerId === teamLeader.id)
      if (existingCalc) {
        existingCalc.components.push(...downlineCalculation.components)
        existingCalc.totalEur = roundToTwoDecimals(existingCalc.totalEur + downlineCalculation.totalEur)
      }
    }

    // Calculate team bonuses
    for (const teamLeader of teamLeaders) {
      const teamBonusCalculation = await this.calculateTeamBonus(teamLeader.id)
      const existingCalc = calculations.find(c => c.managerId === teamLeader.id)
      if (existingCalc && teamBonusCalculation) {
        existingCalc.components.push(...teamBonusCalculation.components)
        existingCalc.totalEur = roundToTwoDecimals(existingCalc.totalEur + teamBonusCalculation.totalEur)
      }
    }

    // Save all commission components to ledger
    for (const calculation of calculations) {
      await this.saveCommissionLedger(calculation)
    }

    return calculations
  }

  private async getManagersWithRevenue() {
    return await prisma.user.findMany({
      where: {
        role: { in: ['TEAM_LEADER', 'SALES_REP'] },
        active: true,
        revenueItems: {
          some: { periodId: this.periodId }
        }
      },
      include: {
        revenueItems: {
          where: { periodId: this.periodId }
        }
      }
    })
  }

  private async calculatePersonalCommissions(manager: any): Promise<CommissionCalculation> {
    const personalRevenue = this.calculatePersonalRevenue(manager.revenueItems)
    const isTeamLeader = manager.role === 'TEAM_LEADER'
    const rules = isTeamLeader ? this.rules.teamLeader : this.rules.salesRep

    const components: CommissionComponent[] = []

    // Base Commission
    if (personalRevenue.baseUsd > 0) {
      const baseCommissionUsd = roundToTwoDecimals(personalRevenue.baseUsd * rules.baseCommission)
      const baseCommissionEur = convertUsdToEur(baseCommissionUsd, this.usdEurRate)
      
      components.push({
        type: ComponentType.BASE_COMMISSION,
        amountUsd: baseCommissionUsd,
        amountEur: baseCommissionEur,
        calculation: {
          baseRevenue: personalRevenue.baseUsd,
          rate: rules.baseCommission,
          usdEurRate: this.usdEurRate
        }
      })
    }

    // Activity Commission
    if (personalRevenue.activityUsd > 0) {
      const activityCommissionUsd = roundToTwoDecimals(personalRevenue.activityUsd * rules.activityCommission)
      const activityCommissionEur = convertUsdToEur(activityCommissionUsd, this.usdEurRate)
      
      components.push({
        type: ComponentType.ACTIVITY_COMMISSION,
        amountUsd: activityCommissionUsd,
        amountEur: activityCommissionEur,
        calculation: {
          activityRevenue: personalRevenue.activityUsd,
          rate: rules.activityCommission,
          usdEurRate: this.usdEurRate
        }
      })
    }

    // Fixed Bonuses (in EUR)
    if (personalRevenue.milestones.m0_5 > 0) {
      components.push({
        type: ComponentType.M0_5_BONUS,
        amountEur: roundToTwoDecimals(personalRevenue.milestones.m0_5 * rules.fixedBonuses.m0_5),
        calculation: {
          count: personalRevenue.milestones.m0_5,
          bonusPerMilestone: rules.fixedBonuses.m0_5
        }
      })
    }

    if (personalRevenue.milestones.m1 > 0) {
      components.push({
        type: ComponentType.M1_BONUS,
        amountEur: roundToTwoDecimals(personalRevenue.milestones.m1 * rules.fixedBonuses.m1),
        calculation: {
          count: personalRevenue.milestones.m1,
          bonusPerMilestone: rules.fixedBonuses.m1
        }
      })
    }

    if (personalRevenue.milestones.m1_retention > 0) {
      components.push({
        type: ComponentType.M1_RETENTION_BONUS,
        amountEur: roundToTwoDecimals(personalRevenue.milestones.m1_retention * rules.fixedBonuses.m1_retention),
        calculation: {
          count: personalRevenue.milestones.m1_retention,
          bonusPerMilestone: rules.fixedBonuses.m1_retention
        }
      })
    }

    if (personalRevenue.milestones.m2 > 0) {
      components.push({
        type: ComponentType.M2_BONUS,
        amountEur: roundToTwoDecimals(personalRevenue.milestones.m2 * rules.fixedBonuses.m2),
        calculation: {
          count: personalRevenue.milestones.m2,
          bonusPerMilestone: rules.fixedBonuses.m2
        }
      })
    }

    const totalEur = components.reduce((sum, comp) => sum + comp.amountEur, 0)

    return {
      managerId: manager.id,
      role: manager.role,
      components,
      totalEur: roundToTwoDecimals(totalEur)
    }
  }

  private calculatePersonalRevenue(revenueItems: any[]): PersonalRevenue {
    const revenue: PersonalRevenue = {
      managerId: revenueItems[0]?.managerId || '',
      baseUsd: 0,
      activityUsd: 0,
      totalUsd: 0,
      milestones: {
        m0_5: 0,
        m1: 0,
        m1_retention: 0,
        m2: 0
      },
      creatorCount: revenueItems.length
    }

    for (const item of revenueItems) {
      revenue.baseUsd += parseFloat(item.estBaseUsd.toString())
      revenue.activityUsd += parseFloat(item.estActivityUsd.toString())
      
      if (item.m0_5) revenue.milestones.m0_5++
      if (item.m1) revenue.milestones.m1++
      if (item.m1Retention) revenue.milestones.m1_retention++
      if (item.m2) revenue.milestones.m2++
    }

    revenue.totalUsd = revenue.baseUsd + revenue.activityUsd
    return revenue
  }

  private async calculateDownlineCommissions(teamLeaderId: string): Promise<CommissionCalculation> {
    // Get downline structure
    const downlineRelations = await prisma.orgRelation.findMany({
      where: {
        ancestorId: teamLeaderId,
        depth: { in: [1, 2, 3] } // A, B, C levels
      },
      include: {
        descendant: {
          include: {
            revenueItems: {
              where: { periodId: this.periodId }
            }
          }
        }
      }
    })

    const components: CommissionComponent[] = []
    const rates = this.rules.teamLeader.downlineRates

    for (const relation of downlineRelations) {
      const descendantRevenue = this.calculatePersonalRevenue(relation.descendant.revenueItems)
      
      if (descendantRevenue.totalUsd > 0) {
        let rate: number
        let componentType: ComponentType

        switch (relation.depth) {
          case 1:
            rate = rates.levelA
            componentType = ComponentType.DOWNLINE_A
            break
          case 2:
            rate = rates.levelB
            componentType = ComponentType.DOWNLINE_B
            break
          case 3:
            rate = rates.levelC
            componentType = ComponentType.DOWNLINE_C
            break
          default:
            continue
        }

        const downlineCommissionUsd = roundToTwoDecimals(descendantRevenue.totalUsd * rate)
        const downlineCommissionEur = convertUsdToEur(downlineCommissionUsd, this.usdEurRate)

        components.push({
          type: componentType,
          amountUsd: downlineCommissionUsd,
          amountEur: downlineCommissionEur,
          calculation: {
            descendantId: relation.descendantId,
            descendantName: relation.descendant.name,
            level: relation.depth,
            personalRevenue: descendantRevenue.totalUsd,
            rate,
            usdEurRate: this.usdEurRate
          }
        })
      }
    }

    const totalEur = components.reduce((sum, comp) => sum + comp.amountEur, 0)

    return {
      managerId: teamLeaderId,
      role: Role.TEAM_LEADER,
      components,
      totalEur: roundToTwoDecimals(totalEur)
    }
  }

  private async calculateTeamBonus(teamLeaderId: string): Promise<CommissionCalculation | null> {
    // Get all team members (direct and indirect descendants)
    const teamRevenue = await this.getTeamTotalRevenue(teamLeaderId)
    
    if (teamRevenue < this.rules.teamTargets.minTeamRevenue) {
      return null // Team target not met
    }

    const components: CommissionComponent[] = []

    // Team revenue bonus (10%)
    const teamBonusUsd = roundToTwoDecimals(teamRevenue * this.rules.teamLeader.teamBonus.rate)
    const teamBonusEur = convertUsdToEur(teamBonusUsd, this.usdEurRate)

    components.push({
      type: ComponentType.TEAM_BONUS,
      amountUsd: teamBonusUsd,
      amountEur: teamBonusEur,
      calculation: {
        teamRevenue,
        rate: this.rules.teamLeader.teamBonus.rate,
        usdEurRate: this.usdEurRate,
        targetMet: true
      }
    })

    // Recruitment bonus (€50 per month - placeholder logic)
    components.push({
      type: ComponentType.TEAM_RECRUITMENT,
      amountEur: this.rules.teamLeader.teamBonus.recruitment,
      calculation: {
        monthlyBonus: this.rules.teamLeader.teamBonus.recruitment
      }
    })

    // Graduation bonus (€50 per month - placeholder logic)
    components.push({
      type: ComponentType.TEAM_GRADUATION,
      amountEur: this.rules.teamLeader.teamBonus.graduation,
      calculation: {
        monthlyBonus: this.rules.teamLeader.teamBonus.graduation
      }
    })

    const totalEur = components.reduce((sum, comp) => sum + comp.amountEur, 0)

    return {
      managerId: teamLeaderId,
      role: Role.TEAM_LEADER,
      components,
      totalEur: roundToTwoDecimals(totalEur)
    }
  }

  private async getTeamTotalRevenue(teamLeaderId: string): Promise<number> {
    // Get all team members including the team leader
    const teamMembers = await prisma.orgRelation.findMany({
      where: {
        ancestorId: teamLeaderId
      },
      include: {
        descendant: {
          include: {
            revenueItems: {
              where: { periodId: this.periodId }
            }
          }
        }
      }
    })

    // Also include team leader's own revenue
    const teamLeader = await prisma.user.findUnique({
      where: { id: teamLeaderId },
      include: {
        revenueItems: {
          where: { periodId: this.periodId }
        }
      }
    })

    let totalRevenue = 0

    // Team leader's personal revenue
    if (teamLeader) {
      const personalRevenue = this.calculatePersonalRevenue(teamLeader.revenueItems)
      totalRevenue += personalRevenue.totalUsd
    }

    // Team members' revenue
    for (const member of teamMembers) {
      const memberRevenue = this.calculatePersonalRevenue(member.descendant.revenueItems)
      totalRevenue += memberRevenue.totalUsd
    }

    return totalRevenue
  }

  private async saveCommissionLedger(calculation: CommissionCalculation): Promise<void> {
    for (const component of calculation.components) {
      await prisma.commissionLedger.create({
        data: {
          periodId: this.periodId,
          userId: calculation.managerId,
          component: component.type,
          amountUsd: component.amountUsd,
          amountEur: component.amountEur,
          calc: component.calculation
        }
      })
    }
  }
}