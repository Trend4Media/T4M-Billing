const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding production database...')

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 12)

  // Create default users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@trend4media.local' },
    update: {},
    create: {
      email: 'admin@trend4media.local',
      name: 'Admin User',
      role: 'ADMIN',
      hash: hashedPassword,
      active: true,
    },
  })

  const teamLeader = await prisma.user.upsert({
    where: { email: 'teamleader@trend4media.local' },
    update: {},
    create: {
      email: 'teamleader@trend4media.local',
      name: 'Team Leader',
      role: 'TEAM_LEADER',
      hash: hashedPassword,
      active: true,
    },
  })

  const liveManager = await prisma.user.upsert({
    where: { email: 'livemanager@trend4media.local' },
    update: {},
    create: {
      email: 'livemanager@trend4media.local',
      name: 'Live Manager',
      role: 'SALES_REP',
      hash: hashedPassword,
      active: true,
    },
  })

  // Create organizational structure
  await prisma.orgEdge.upsert({
    where: {
      parentId_childId_validFrom: {
        parentId: teamLeader.id,
        childId: liveManager.id,
        validFrom: new Date('2024-01-01'),
      },
    },
    update: {},
    create: {
      parentId: teamLeader.id,
      childId: liveManager.id,
      validFrom: new Date('2024-01-01'),
    },
  })

  await prisma.orgRelation.upsert({
    where: {
      ancestorId_descendantId: {
        ancestorId: teamLeader.id,
        descendantId: liveManager.id,
      },
    },
    update: {},
    create: {
      ancestorId: teamLeader.id,
      descendantId: liveManager.id,
      depth: 1,
    },
  })

  // Create default RuleSet
  await prisma.ruleSet.upsert({
    where: { id: 'default-rules-2024' },
    update: {},
    create: {
      id: 'default-rules-2024',
      jsonRules: {
        salesRep: {
          baseCommission: 0.30,
          activityCommission: 0.30,
          fixedBonuses: {
            m0_5: 75,
            m1: 150,
            m1_retention: 100,
            m2: 400,
          },
        },
        teamLeader: {
          baseCommission: 0.35,
          activityCommission: 0.35,
          fixedBonuses: {
            m0_5: 80,
            m1: 165,
            m1_retention: 120,
            m2: 450,
          },
          downlineRates: {
            levelA: 0.10,
            levelB: 0.075,
            levelC: 0.05,
          },
          teamBonus: {
            rate: 0.10,
            recruitment: 50,
            graduation: 50,
          },
        },
        teamTargets: {
          minTeamRevenue: 10000,
        },
      },
      activeFrom: new Date('2024-01-01'),
      isActive: true,
    },
  })

  // Create current period
  const now = new Date()
  const periodId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  
  await prisma.period.upsert({
    where: { id: periodId },
    update: {},
    create: {
      id: periodId,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      usdEurRate: 0.92,
      status: 'ACTIVE',
    },
  })

  console.log('✅ Production database seeded successfully!')
  console.log('\n📋 Login credentials:')
  console.log('Admin: admin@trend4media.local / password123')
  console.log('Team Leader: teamleader@trend4media.local / password123')
  console.log('Live Manager: livemanager@trend4media.local / password123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })