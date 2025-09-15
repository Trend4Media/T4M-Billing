// Default rule set according to v1 specification
export const DEFAULT_RULE_SET = {
  salesRep: {
    baseCommission: 0.30,      // 30% of Estimated Bonus (USD, Base)
    activityCommission: 0.30,  // 30% of Estimated Bonus - Activeness task (USD)
    fixedBonuses: {
      m0_5: 75,        // €75 per M0.5 achievement
      m1: 150,         // €150 per M1 achievement
      m1_retention: 100, // €100 per M1 Retention achievement
      m2: 400          // €400 per M2 achievement
    }
  },
  teamLeader: {
    baseCommission: 0.35,      // 35% of Estimated Bonus (USD, Base)
    activityCommission: 0.35,  // 35% of Estimated Bonus - Activeness task (USD)
    fixedBonuses: {
      m0_5: 80,        // €80 per M0.5 achievement
      m1: 165,         // €165 per M1 achievement
      m1_retention: 120, // €120 per M1 Retention achievement
      m2: 450          // €450 per M2 achievement
    },
    downlineRates: {
      levelA: 0.10,    // 10% of downline A personal revenue
      levelB: 0.075,   // 7.5% of downline B personal revenue
      levelC: 0.05     // 5.0% of downline C personal revenue
    },
    teamBonus: {
      rate: 0.10,      // 10% of team total revenue when target met
      recruitment: 50, // €50 monthly recruitment bonus
      graduation: 50   // €50 monthly graduation bonus
    }
  },
  teamTargets: {
    minTeamRevenue: 0  // Will be set based on business requirements
  }
}