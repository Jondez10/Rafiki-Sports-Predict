import { SportMatch, Prediction, Accumulator, Article, PerformanceStats, NotificationLog, SportType } from '../types';

// Helper to generate IDs
const uuid = () => Math.random().toString(36).substring(2, 15);

// Helper to subtract days
const minusDays = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

export const INITIAL_MATCHES: SportMatch[] = [
  // FOOTBALL MATCHES (TODAY/UPCOMING)
  {
    id: 'f-1',
    sport: 'football',
    homeTeam: 'Real Madrid',
    awayTeam: 'Sevilla',
    league: 'La Liga (Spain)',
    startTime: new Date(Date.now() + 4 * 3600000).toISOString(), // 4 hours from now
    status: 'upcoming',
    form: { home: ['W', 'W', 'D', 'W', 'L'], away: ['L', 'D', 'W', 'L', 'L'] },
    h2h: ['Real Madrid 2-1 Sevilla', 'Sevilla 0-1 Real Madrid', 'Real Madrid 3-1 Sevilla'],
    injuries: {
      home: ['Eder Militao (Knee)', 'Eduardo Camavinga (Thigh)'],
      away: ['Lucas Ocampos (Muscle)', 'Marcos Acuna (Ankle)', 'Youssef En-Nesyri (Suspended)']
    },
    additionalStats: {
      'Home xG': 2.34,
      'Away xG': 1.12,
      'Home Possession': '58.4%',
      'Referee Card Avg': '4.2 YC/Match',
      'Weather Forecast': 'Clear, 18°C'
    }
  },
  {
    id: 'f-2',
    sport: 'football',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    league: 'Premier League (England)',
    startTime: new Date(Date.now() + 6 * 3600000).toISOString(),
    status: 'upcoming',
    form: { home: ['W', 'D', 'W', 'W', 'W'], away: ['W', 'W', 'L', 'D', 'W'] },
    h2h: ['Chelsea 2-2 Arsenal', 'Arsenal 3-1 Chelsea', 'Chelsea 0-1 Arsenal'],
    injuries: {
      home: ['Bukayo Saka (Fitness Check)'],
      away: ['Reece James (Hamstring)', 'Christopher Nkunku (Knee)']
    },
    additionalStats: {
      'Home xG': 2.18,
      'Away xG': 1.65,
      'Home Clean Sheets': '42%',
      'Referee Card Avg': '3.8 YC/Match',
      'Weather Forecast': 'Light Rain, 12°C'
    }
  },
  {
    id: 'f-3',
    sport: 'football',
    homeTeam: 'Bayern Munich',
    awayTeam: 'Bochum',
    league: 'Bundesliga (Germany)',
    startTime: new Date(Date.now() - 1 * 3600000).toISOString(), // Live now
    status: 'live',
    homeScore: 2,
    awayScore: 0,
    form: { home: ['W', 'W', 'W', 'W', 'D'], away: ['L', 'L', 'D', 'L', 'W'] },
    h2h: ['Bochum 0-7 Bayern Munich', 'Bayern Munich 3-0 Bochum', 'Bochum 1-5 Bayern Munich'],
    injuries: {
      home: [],
      away: ['Ivan Ordets (Muscle)', 'Cristian Gamboa (Calf)']
    },
    additionalStats: {
      'Home xG': 3.12,
      'Away xG': 0.85,
      'Possession Live': '68%',
      'Shots on Target': '7 - 1'
    }
  },
  {
    id: 'f-4',
    sport: 'football',
    homeTeam: 'Inter Milan',
    awayTeam: 'Fiorentina',
    league: 'Serie A (Italy)',
    startTime: new Date(Date.now() + 8 * 3600000).toISOString(),
    status: 'upcoming',
    form: { home: ['W', 'W', 'D', 'W', 'W'], away: ['W', 'L', 'W', 'D', 'L'] },
    h2h: ['Fiorentina 0-1 Inter Milan', 'Inter Milan 4-0 Fiorentina', 'Fiorentina 1-2 Inter Milan'],
    injuries: {
      home: ['Hakan Calhanoglu (Rested)'],
      away: ['Dodo (Knee)']
    },
    additionalStats: {
      'Home xG': 1.95,
      'Away xG': 1.32,
      'Average Corners': '9.8 per game',
      'Referee': 'Davide Massa'
    }
  },

  // BASKETBALL MATCHES (TODAY/UPCOMING)
  {
    id: 'b-1',
    sport: 'basketball',
    homeTeam: 'Boston Celtics',
    awayTeam: 'Miami Heat',
    league: 'NBA (USA)',
    startTime: new Date(Date.now() + 5 * 3600000).toISOString(),
    status: 'upcoming',
    form: { home: ['W', 'W', 'W', 'L', 'W'], away: ['L', 'W', 'W', 'L', 'D'] }, // Heat W, L etc
    h2h: ['Celtics 110-106 Heat', 'Heat 102-114 Celtics', 'Celtics 118-84 Heat'],
    injuries: {
      home: ['Kristaps Porzingis (Out)'],
      away: ['Jimmy Butler (Questionable)', 'Terry Rozier (Out)']
    },
    additionalStats: {
      'Home Offensive Rating': '122.2 (1st)',
      'Away Defensive Rating': '111.5 (5th)',
      'Pace Rating': '97.5',
      'Rest Days Advantage': 'Celtics (2 days) vs Heat (0 days - B2B)'
    }
  },
  {
    id: 'b-2',
    sport: 'basketball',
    homeTeam: 'Golden State Warriors',
    awayTeam: 'LA Lakers',
    league: 'NBA (USA)',
    startTime: new Date(Date.now() + 7 * 3600000).toISOString(),
    status: 'upcoming',
    form: { home: ['W', 'L', 'W', 'W', 'L'], away: ['W', 'W', 'W', 'L', 'W'] },
    h2h: ['Lakers 121-128 Warriors', 'Warriors 144-145 Lakers', 'Lakers 115-120 Warriors'],
    injuries: {
      home: ['Gary Payton II (Out)'],
      away: ['LeBron James (Probable)', 'Anthony Davis (Probable)']
    },
    additionalStats: {
      'Home 3PT %': '38.1%',
      'Away PPG': '118.0',
      'Expected Total Points': '232.5',
      'Referee Crew': 'Scott Foster, Tony Brothers'
    }
  },

  // TENNIS MATCHES (TODAY/UPCOMING)
  {
    id: 't-1',
    sport: 'tennis',
    homeTeam: 'Carlos Alcaraz',
    awayTeam: 'Jannik Sinner',
    league: 'Wimbledon (Grand Slam) - Men\'s Singles',
    startTime: new Date(Date.now() + 3 * 3600000).toISOString(),
    status: 'upcoming',
    form: { home: ['W', 'W', 'W', 'W', 'L'], away: ['W', 'W', 'W', 'W', 'W'] },
    h2h: ['Alcaraz 4-4 Sinner', 'Alcaraz def. Sinner 1-6 6-3 5-7 6-1 7-5', 'Sinner def. Alcaraz 7-6 6-3'],
    injuries: {
      home: ['None (Fully fit)'],
      away: ['Slight Hip discomfort']
    },
    additionalStats: {
      'Surface Preference': 'Grass (Alcaraz: 85% WR, Sinner: 82% WR)',
      'ATP Rankings': 'Alcaraz (No. 3) vs Sinner (No. 1)',
      '1st Serve % Avg': 'Alcaraz (66%) vs Sinner (64%)',
      'Break Point Save %': 'Alcaraz (68%) vs Sinner (71%)'
    }
  },
  {
    id: 't-2',
    sport: 'tennis',
    homeTeam: 'Iga Swiatek',
    awayTeam: 'Aryna Sabalenka',
    league: 'WTA Finals - Women\'s Singles',
    startTime: new Date(Date.now() + 9 * 3600000).toISOString(),
    status: 'upcoming',
    form: { home: ['W', 'W', 'L', 'W', 'W'], away: ['W', 'W', 'W', 'W', 'L'] },
    h2h: ['Swiatek 8-3 Sabalenka', 'Swiatek def. Sabalenka 6-2 6-3', 'Swiatek def. Sabalenka 7-5 6-4'],
    injuries: {
      home: [],
      away: []
    },
    additionalStats: {
      'Surface Preference': 'Hardcourt (Swiatek: 84% WR, Sabalenka: 81% WR)',
      'WTA Rankings': 'Swiatek (No. 1) vs Sabalenka (No. 2)',
      'Break Point Conv %': 'Swiatek (49%) vs Sabalenka (44%)'
    }
  }
];

export const INITIAL_PREDICTIONS: Prediction[] = [
  {
    id: 'p-1',
    matchId: 'f-1',
    match: INITIAL_MATCHES[0], // Real Madrid vs Sevilla
    pick: 'Real Madrid to Win',
    market: 'Match Winner',
    odds: 1.55,
    confidence: 91,
    riskLevel: 'Low',
    expectedValue: 1.41,
    probability: 91,
    suggestedBetType: 'Accumulator Leg / Single',
    aiExplanation: 'Real Madrid has won 9 of their last 10 home matches at the Santiago Bernabéu and possesses an expected goals (xG) differential of +1.22 over Sevilla. Sevilla is heavily depleted, missing three starting defensive stalwarts (Lucas Ocampos, Marcos Acuna, and the suspended Youssef En-Nesyri). Our tactical simulations indicate Sevilla\'s defensive structure will collapse in the wide areas, projecting a high 72% straight win probability and making the 1.55 price exceptionally valuable.',
    analysisCriteria: {
      formAnalysis: 'Real Madrid is in excellent domestic form (WWDLW), maintaining a 15-match undefeated home streak. Sevilla (LDWLL) has struggled immensely on the road, securing only 2 away wins this entire season.',
      injuryImpact: 'Sevilla is missing crucial tactical pillars. Without Acuna and Ocampos, their left-flank transition is severely compromised. Youssef En-Nesyri\'s suspension deprives Sevilla of their main aerial counter-attacking threat.',
      tacticalMatchup: 'Real Madrid\'s midfield rotation (Bellingham, Valverde, Camavinga) will completely dominant the possession battle. Sevilla is expected to sit in a low block, but their lack of defensive cohesion will permit Vinicius Jr. and Rodrygo to breach the flanks repeatedly.',
      oddsMovement: 'Opening price of 1.62 has steamed down to 1.55 across major sportsbooks, showing substantial smart-money backing on Madrid.',
      otherFactors: 'Motivation is high for Real Madrid to stretch their lead at the top of La Liga. Weather is perfect (18°C, clear) which favors high-tempo passing football.'
    },
    result: 'pending',
    dataSource: 'statistical-engine',
    modelFairOdds: 1.52,
    impliedProbability: 65.8,
    plainLanguageFactors: [
      'Real Madrid 6-game goal rate: 2.67 scored, 0.83 conceded at home.',
      'Sevilla away record: 1.00 scored, 1.83 conceded across 6 fixtures.',
      'Empirical Bayes shrinkage applied (0.60 sample weight) toward La Liga prior (2.55 avg goals).',
      'Model estimated Expected Goals (xG): Real Madrid 2.24 vs Sevilla 0.88.'
    ],
    lastUpdated: new Date().toISOString(),
    analyzedAt: new Date().toISOString()
  },
  {
    id: 'p-2',
    matchId: 'f-2',
    match: INITIAL_MATCHES[1], // Arsenal vs Chelsea
    pick: 'Both Teams To Score (Yes)',
    market: 'Both Teams To Score',
    odds: 1.68,
    confidence: 84,
    riskLevel: 'Medium',
    expectedValue: 1.41,
    probability: 84,
    suggestedBetType: 'Accumulator Leg',
    aiExplanation: 'Arsenal and Chelsea have an intense scoring history, with Both Teams To Score (BTTS) landing in 4 of their last 5 head-to-head fixtures. Arsenal matches at home average 2.18 expected goals (xG), while Chelsea\'s high-press transitional style leaves large defensive gaps but provides potent offensive xG (1.65). Both teams are missing defensive leaders (Reece James, Bukayo Saka is a fitness concern but expected to play a role). Our predictive engine projects an active, high-tempo derby with both teams hitting the back of the net.',
    analysisCriteria: {
      formAnalysis: 'Arsenal (WDWWW) is scoring freely but has conceded in 3 of their last 5 games. Chelsea (WWLDW) is showing massive offensive improvements under Cole Palmer\'s creative playmaker role.',
      injuryImpact: 'Chelsea\'s defense is compromised without captain Reece James. Arsenal\'s backline will be tested by Nicolas Jackson\'s direct runs behind the lines.',
      tacticalMatchup: 'Both managers deploy modern high-pressing 4-3-3 setups, creating a high-congestion midfield. Transitions will be lightning-fast, creating numerous counter-attacking opportunities for both squads.',
      oddsMovement: 'BTTS odds have stabilized at 1.68, representing steady market sentiment for goals in this London derby.',
      otherFactors: 'A wet London evening (light rain) often increases defensive slip-ups and rapid ball skidding, which heavily favors offensive attackers over rigid defensive line-ups.'
    },
    result: 'pending',
    dataSource: 'statistical-engine',
    modelFairOdds: 1.65,
    impliedProbability: 60.6,
    plainLanguageFactors: [
      'Arsenal recent goal average: 2.50 scored, 0.67 conceded.',
      'Chelsea recent goal average: 1.50 scored, 1.33 conceded.',
      'Joint probability matrix indicates high mutual goal likelihood (60.6% BTTS).',
      'Model estimated Expected Goals (xG): Arsenal 1.94 vs Chelsea 1.28.'
    ],
    lastUpdated: new Date().toISOString(),
    analyzedAt: new Date().toISOString()
  },
  {
    id: 'p-3',
    matchId: 'b-1',
    match: INITIAL_MATCHES[4], // Boston Celtics vs Miami Heat
    pick: 'Boston Celtics -6.5 Handicap',
    market: 'Point Spread Handicap',
    odds: 1.90,
    confidence: 88,
    riskLevel: 'Low',
    expectedValue: 1.67,
    probability: 88,
    suggestedBetType: 'Single / Accumulator Leg',
    aiExplanation: 'The Boston Celtics boast the NBA\'s #1 offensive rating (122.2) and represent a formidable force at TD Garden. In contrast, the Miami Heat are playing a back-to-back sequence (B2B) with zero rest days after a grueling away match. Crucially, Miami is depleted, with Jimmy Butler questionable and Terry Rozier confirmed out. Boston, with 2 full rest days, will utilize their superior pace (97.5) and offensive depth to wear out a fatigued Heat squad, easily covering the -6.5 spread.',
    analysisCriteria: {
      formAnalysis: 'Celtics (WWWLW) are on a 3-game home win streak with a +12.4 average point margin. Heat (LWWLD) are struggling with roster inconsistency and road-fatigue.',
      injuryImpact: 'The absence of Jimmy Butler (if confirmed) removes 22.4 PPG and elite defensive lockdown capabilities. Boston\'s minor absence of Porzingis is easily absorbed by Al Horford and Luke Kornet.',
      tacticalMatchup: 'Boston\'s five-out spacing and high-volume 3PT shooting will stretch Miami\'s zone defense past its breaking point. Miami\'s heavy legs on back-to-back travel will prevent them from executing closeouts.',
      oddsMovement: 'Spread opened at Celtics -5.5 and immediately moved to -6.5 as money poured into Boston due to the Heat injury report and B2B schedule.',
      otherFactors: 'Historical dominance: Boston is 8-2 straight up against Miami in their last 10 games, and 4-1 against the spread.'
    },
    result: 'pending',
    dataSource: 'ai-grounded',
    modelFairOdds: 1.82,
    impliedProbability: 55.0,
    plainLanguageFactors: [
      'Boston home scoring rating: 122.2 pts/100 poss vs Heat 111.5 defensive rating.',
      'Schedule rest advantage: Celtics 2 days rest vs Heat 0 days (Back-to-Back).',
      'Handicap model simulates 63.4% cover probability for Boston -6.5.'
    ],
    lastUpdated: new Date().toISOString(),
    analyzedAt: new Date().toISOString()
  },
  {
    id: 'p-4',
    matchId: 't-1',
    match: INITIAL_MATCHES[6], // Alcaraz vs Sinner
    pick: 'Carlos Alcaraz to Win',
    market: 'Match Winner',
    odds: 1.82,
    confidence: 79,
    riskLevel: 'Medium',
    expectedValue: 1.44,
    probability: 79,
    suggestedBetType: 'Single / High-Value Acca Leg',
    aiExplanation: 'Carlos Alcaraz matches up exceptionally well against Jannik Sinner on grass, holding a slight historical advantage on this surface (85% Grass Win Rate). Sinner is playing through a minor hip issue, which our physical telemetry models estimate will degrade his lateral movement by 8-12% as the match reaches the 3rd or 4th set. Alcaraz\'s drop shots and high match workload stamina make him the slight favorite to win in an epic tactical showcase.',
    analysisCriteria: {
      formAnalysis: 'Alcaraz has been superb in grass tournaments (WWWWL), showing great slide and recovery. Sinner is undefeated in 5 but carried physical stress in his last 5-setter.',
      injuryImpact: 'Sinner\'s hip discomfort is a massive warning sign for a best-of-five Grand Slam format. Grass court movement requires intense low flexing, putting high stress on hips.',
      tacticalMatchup: 'Alcaraz will exploit Sinner\'s movement with slice changes and forward drops. Swapping deep rallies with short angles will force Sinner to move vertically, where his hip discomfort is most exposed.',
      oddsMovement: 'Odds opened at even money (1.91 each) and have moved slightly in Alcaraz\'s favor (1.82) following practice court reports of Sinner wearing heavy thigh taping.',
      otherFactors: 'Wimbledon crowds and atmosphere heavily feed Alcaraz\'s emotional playstyle, while Sinner prefers a quieter, indoor-like rhythm.'
    },
    result: 'pending',
    dataSource: 'ai-grounded',
    modelFairOdds: 1.78,
    impliedProbability: 56.2,
    plainLanguageFactors: [
      'Surface win rate differential: Alcaraz 85% on grass vs Sinner 82%.',
      'Break point conversion edge: Alcaraz 48.2% vs Sinner 44.1% on grass.',
      'Telemetry flags physical recovery load on Sinner following 5-set quarterfinal.'
    ],
    lastUpdated: new Date().toISOString(),
    analyzedAt: new Date().toISOString()
  },
  {
    id: 'p-5',
    matchId: 'f-1',
    match: INITIAL_MATCHES[0], // Real Madrid vs Sevilla
    pick: 'Over 9.5 Corners',
    market: 'Corners - Over/Under',
    marketCategory: 'corners',
    marketOptionType: 'over',
    odds: 1.75,
    confidence: 83,
    riskLevel: 'Low',
    expectedValue: 1.45,
    probability: 83,
    suggestedBetType: 'Accumulator Leg',
    aiExplanation: 'Poisson event model computed corner expectancy of 10.4 total corners. Real Madrid generates 6.8 corners at home, while Sevilla conceded 5.9 per away fixture. The wide wing threat from Vinicius and Rodrygo forces heavy defensive blocks and deflection sequences.',
    analysisCriteria: {
      formAnalysis: 'Madrid home fixtures average 10.8 corners in La Liga this season.',
      injuryImpact: 'Sevilla wingers out, forcing deep clearance patterns into corners.',
      tacticalMatchup: 'Heavy flank overloads produce high corner rates.',
      oddsMovement: 'Over 9.5 line steamed from 1.82 to 1.75.',
      otherFactors: 'Standard grass pitch and fast ball speed accelerate corner yields.'
    },
    result: 'pending',
    dataSource: 'statistical-engine',
    modelFairOdds: 1.72,
    impliedProbability: 58.1,
    plainLanguageFactors: [
      'Poisson Corners Lambda: Real Madrid 6.2 vs Sevilla 4.2 (Total: 10.4).',
      'Over 9.5 Corners evaluated probability: 58.1% (Fair Odds 1.72).',
      'Defensive flank block rate for Sevilla ranks top 3 in La Liga away games.'
    ],
    lastUpdated: new Date().toISOString(),
    analyzedAt: new Date().toISOString()
  },
  {
    id: 'p-6',
    matchId: 'f-2',
    match: INITIAL_MATCHES[1], // Arsenal vs Chelsea
    pick: 'Over 4.5 Yellow Cards',
    market: 'Yellow Cards - Over/Under',
    marketCategory: 'yellow_cards',
    marketOptionType: 'over',
    odds: 1.85,
    confidence: 81,
    riskLevel: 'Medium',
    expectedValue: 1.50,
    probability: 81,
    suggestedBetType: 'Single / High-Value Leg',
    aiExplanation: 'London Derbies between Arsenal and Chelsea average 5.4 cards over their last 6 meetings. Referee strictness index and high-press midfield fouls elevate card expectancy to 5.1 total cards.',
    analysisCriteria: {
      formAnalysis: 'Chelsea is among the most booked sides in the Premier League (2.8 YC/match).',
      injuryImpact: 'Midfield replacements increase cynical challenge frequency.',
      tacticalMatchup: 'High transition counter-attacks trigger tactical fouls.',
      oddsMovement: 'Card line holds steady at 4.5.',
      otherFactors: 'High emotional stakes in derby match.'
    },
    result: 'pending',
    dataSource: 'statistical-engine',
    modelFairOdds: 1.80,
    impliedProbability: 55.5,
    plainLanguageFactors: [
      'Poisson Yellow Cards Lambda: Arsenal 2.2 vs Chelsea 2.9 (Total: 5.1).',
      'Over 4.5 Yellow Cards probability: 55.5% (Fair Odds 1.80).',
      'Referee Anthony Taylor card frequency: 4.6 cards per match.'
    ],
    lastUpdated: new Date().toISOString(),
    analyzedAt: new Date().toISOString()
  },
  {
    id: 'p-7',
    matchId: 'f-4',
    match: INITIAL_MATCHES[3], // Inter vs Fiorentina
    pick: 'Inter -1.5 Shots on Target Handicap',
    market: 'Shots on Target - Handicap',
    marketCategory: 'shots_on_target',
    marketOptionType: 'handicap',
    odds: 1.80,
    confidence: 85,
    riskLevel: 'Low',
    expectedValue: 1.53,
    probability: 85,
    suggestedBetType: 'Accumulator Leg',
    aiExplanation: 'Inter Milan averages 6.7 shots on target at San Siro compared to Fiorentina conceding 5.8 on the road. Poisson handicap model computes a 62.4% probability for Inter covering the -1.5 Shots on Target margin.',
    analysisCriteria: {
      formAnalysis: 'Inter has won the Shots on Target battle in 9 of their last 10 home matches.',
      injuryImpact: 'Full offensive strength available for Inter front line.',
      tacticalMatchup: 'Fiorentina high line permits direct shots on goal.',
      oddsMovement: 'SoT handicap odds moved in Inter favor.',
      otherFactors: 'Home crowd advantage and high shots volume.'
    },
    result: 'pending',
    dataSource: 'statistical-engine',
    modelFairOdds: 1.76,
    impliedProbability: 56.8,
    plainLanguageFactors: [
      'Poisson Shots on Target Lambda: Inter 6.4 vs Fiorentina 3.6.',
      'Inter -1.5 SoT handicap cover probability: 56.8%.',
      'Fiorentina goalkeeper faces 5.8 shots on target per away fixture.'
    ],
    lastUpdated: new Date().toISOString(),
    analyzedAt: new Date().toISOString()
  },
  {
    id: 'p-8',
    matchId: 'f-2',
    match: INITIAL_MATCHES[1], // Arsenal vs Chelsea
    pick: 'Chelsea Most Fouls (1X2)',
    market: 'Fouls - 1X2 Winner',
    marketCategory: 'fouls',
    marketOptionType: '1x2_winner',
    odds: 1.70,
    confidence: 82,
    riskLevel: 'Low',
    expectedValue: 1.39,
    probability: 82,
    suggestedBetType: 'Accumulator Leg',
    aiExplanation: 'Arsenal dominates possession (60.2% avg) forcing opponents to commit more fouls attempting recovery. Chelsea averages 13.4 fouls committed away compared to Arsenal committing only 9.8 at Emirates Stadium.',
    analysisCriteria: {
      formAnalysis: 'Chelsea committed more fouls than Arsenal in 4 of their last 5 derbies.',
      injuryImpact: 'Midfield pressing intensity remains high.',
      tacticalMatchup: 'Possession disparity creates asymmetrical foul counts.',
      oddsMovement: 'Chelsea Most Fouls favorite at 1.70.',
      otherFactors: 'Referee strict on transitional interference.'
    },
    result: 'pending',
    dataSource: 'statistical-engine',
    modelFairOdds: 1.68,
    impliedProbability: 59.5,
    plainLanguageFactors: [
      'Poisson Fouls Lambda: Chelsea 13.5 vs Arsenal 10.1.',
      'Chelsea Most Fouls probability: 59.5% (Fair Odds 1.68).',
      'Arsenal high possession rate consistently forces visiting fouls.'
    ],
    lastUpdated: new Date().toISOString(),
    analyzedAt: new Date().toISOString()
  }
];

export const INITIAL_MARKET_ACCURACY = [
  {
    market: '1X2 Match Winner',
    displayName: '1X2 Full-Time Winner',
    correct: 42,
    total: 51,
    winRatePct: 82.4,
    averageOdds: 1.68,
    profitUnits: 19.56,
    roiPct: 38.35,
    lastUpdated: new Date().toISOString()
  },
  {
    market: 'Over/Under 2.5 Goals',
    displayName: 'Over / Under 2.5 Goals',
    correct: 36,
    total: 44,
    winRatePct: 81.8,
    averageOdds: 1.74,
    profitUnits: 18.64,
    roiPct: 42.36,
    lastUpdated: new Date().toISOString()
  },
  {
    market: 'Both Teams To Score',
    displayName: 'Both Teams to Score (BTTS / GG)',
    correct: 29,
    total: 36,
    winRatePct: 80.6,
    averageOdds: 1.70,
    profitUnits: 13.30,
    roiPct: 36.94,
    lastUpdated: new Date().toISOString()
  },
  {
    market: 'Double Chance',
    displayName: 'Double Chance (1X / X2 / 12)',
    correct: 31,
    total: 34,
    winRatePct: 91.2,
    averageOdds: 1.38,
    profitUnits: 8.78,
    roiPct: 25.82,
    lastUpdated: new Date().toISOString()
  },
  {
    market: 'Point Spread / Handicap',
    displayName: 'Handicap & Spreads',
    correct: 22,
    total: 28,
    winRatePct: 78.6,
    averageOdds: 1.88,
    profitUnits: 13.36,
    roiPct: 47.71,
    lastUpdated: new Date().toISOString()
  },
  {
    market: 'Corners (Over/Under, 1X2 & Handicap)',
    displayName: 'Corners Markets',
    correct: 27,
    total: 33,
    winRatePct: 81.8,
    averageOdds: 1.76,
    profitUnits: 14.52,
    roiPct: 44.00,
    lastUpdated: new Date().toISOString()
  },
  {
    market: 'Yellow Cards (Over/Under, 1X2 & Handicap)',
    displayName: 'Yellow Cards & Bookings',
    correct: 24,
    total: 30,
    winRatePct: 80.0,
    averageOdds: 1.82,
    profitUnits: 13.68,
    roiPct: 45.60,
    lastUpdated: new Date().toISOString()
  },
  {
    market: 'Fouls Committed (Over/Under, 1X2 & Handicap)',
    displayName: 'Fouls Markets',
    correct: 21,
    total: 26,
    winRatePct: 80.8,
    averageOdds: 1.78,
    profitUnits: 11.38,
    roiPct: 43.77,
    lastUpdated: new Date().toISOString()
  },
  {
    market: 'Shots on Target (Over/Under, 1X2 & Handicap)',
    displayName: 'Shots on Target',
    correct: 25,
    total: 31,
    winRatePct: 80.6,
    averageOdds: 1.75,
    profitUnits: 12.75,
    roiPct: 41.13,
    lastUpdated: new Date().toISOString()
  },
  {
    market: 'Shots off Target (Over/Under, 1X2 & Handicap)',
    displayName: 'Shots off Target',
    correct: 19,
    total: 24,
    winRatePct: 79.2,
    averageOdds: 1.80,
    profitUnits: 10.20,
    roiPct: 42.50,
    lastUpdated: new Date().toISOString()
  }
];

export const INITIAL_SYNC_LOGS = [
  {
    id: 'sync-1',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    source: 'statistical-engine',
    status: 'success',
    fetchedCount: 6,
    validCount: 6,
    filteredCount: 0,
    summary: 'Poisson Mathematical Engine analyzed 6 fixtures with empirical goal distribution. 0 rejected.',
    details: 'Applied Bayesian small-sample shrinkage (strength=4.0) to compute expected goals.'
  },
  {
    id: 'sync-2',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    source: 'api-football',
    status: 'success',
    fetchedCount: 15,
    validCount: 12,
    filteredCount: 3,
    summary: 'API-Football synchronized 12 validated fixtures (3 filtered with < 3 finished matches).',
    details: 'Cached in memory with 15-minute TTL. Latency: 142ms.'
  },
  {
    id: 'sync-3',
    timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    source: 'auto-grade',
    status: 'success',
    fetchedCount: 8,
    validCount: 8,
    filteredCount: 0,
    gradedCount: 8,
    summary: 'Auto-grader settled 8 completed predictions against official final scores (7 Wins, 1 Loss).',
    details: 'Updated per-market accuracy logs in Firestore.'
  }
];

export const INITIAL_ACCUMULATORS: Accumulator[] = [
  {
    id: 'acc-1',
    type: 'safe',
    title: 'Daily Safe Double ⭐⭐',
    date: new Date().toISOString().split('T')[0],
    predictions: [INITIAL_PREDICTIONS[0], INITIAL_PREDICTIONS[2]], // Real Madrid to Win (1.55) & Celtics -6.5 (1.90)
    totalOdds: 2.95, // 1.55 * 1.90
    combinedConfidence: 89,
    status: 'pending'
  },
  {
    id: 'acc-2',
    type: 'balanced',
    title: 'Elite Balanced Treble ⭐⭐⭐',
    date: new Date().toISOString().split('T')[0],
    predictions: [INITIAL_PREDICTIONS[0], INITIAL_PREDICTIONS[1], INITIAL_PREDICTIONS[2]], // Madrid (1.55), BTTS (1.68), Celtics (1.90)
    totalOdds: 4.95, // 1.55 * 1.68 * 1.90
    combinedConfidence: 81,
    status: 'pending'
  },
  {
    id: 'acc-3',
    type: 'high_value',
    title: 'High-Value VIP accumulator ⭐⭐⭐⭐⭐',
    date: new Date().toISOString().split('T')[0],
    predictions: [INITIAL_PREDICTIONS[0], INITIAL_PREDICTIONS[1], INITIAL_PREDICTIONS[2], INITIAL_PREDICTIONS[3]], // Madrid, BTTS, Celtics, Alcaraz (1.82)
    totalOdds: 9.01, // 4.95 * 1.82
    combinedConfidence: 76,
    status: 'pending'
  }
];

export const HISTORICAL_PREDICTIONS: Prediction[] = Array.from({ length: 45 }).map((_, i) => {
  const sports: SportType[] = ['football', 'basketball', 'tennis'];
  const sport = sports[i % 3];
  const date = minusDays(Math.floor(i / 1.5) + 1);
  const result = i % 5 === 0 ? 'loss' : 'win'; // ~80% win rate
  const odds = Math.round((1.4 + (i % 8) * 0.15) * 100) / 100;
  const confidence = Math.floor(76 + (i % 24));
  
  let matchHome = 'Man City';
  let matchAway = 'Liverpool';
  let pick = 'Man City or Draw';
  let league = 'Premier League';

  if (sport === 'football') {
    const teams = [
      ['PSG', 'Marseille', 'PSG to Win', 'Ligue 1 (France)', '1.45'],
      ['Barcelona', 'Atletico Madrid', 'Over 2.5 Goals', 'La Liga (Spain)', '1.75'],
      ['AC Milan', 'Juventus', 'Under 2.5 Goals', 'Serie A (Italy)', '1.60'],
      ['Dortmund', 'Leipzig', 'Both Teams to Score', 'Bundesliga (Germany)', '1.50']
    ];
    const item = teams[i % teams.length];
    matchHome = item[0];
    matchAway = item[1];
    pick = item[2];
    league = item[3];
  } else if (sport === 'basketball') {
    const teams = [
      ['Milwaukee Bucks', 'Chicago Bulls', 'Bucks -8.5 Spread', 'NBA (USA)', '1.85'],
      ['Phoenix Suns', 'Dallas Mavericks', 'Over 224.5 Points', 'NBA (USA)', '1.91'],
      ['Real Madrid Baloncesto', 'Barcelona', 'Real Madrid to Win', 'EuroLeague', '1.52'],
      ['Denver Nuggets', 'Clippers', 'Denver Nuggets -4.5', 'NBA (USA)', '1.88']
    ];
    const item = teams[i % teams.length];
    matchHome = item[0];
    matchAway = item[1];
    pick = item[2];
    league = item[3];
  } else {
    const players = [
      ['Novak Djokovic', 'Taylor Fritz', 'Djokovic to Win 3-0', 'Australian Open', '2.10'],
      ['Coco Gauff', 'Jessica Pegula', 'Coco Gauff to Win', 'WTA Rome', '1.65'],
      ['Daniil Medvedev', 'Alexander Zverev', 'Over 3.5 Sets', 'US Open', '1.55'],
      ['Stefanos Tsitsipas', 'Casper Ruud', 'Casper Ruud to Win', 'Monte Carlo Masters', '1.95']
    ];
    const item = players[i % players.length];
    matchHome = item[0];
    matchAway = item[1];
    pick = item[2];
    league = item[3];
  }

  const m: SportMatch = {
    id: `m-hist-${i}`,
    sport,
    homeTeam: matchHome,
    awayTeam: matchAway,
    league,
    startTime: date,
    status: 'completed',
    homeScore: result === 'win' ? 3 : 1,
    awayScore: result === 'win' ? 1 : 2
  };

  return {
    id: `p-hist-${i}`,
    matchId: `m-hist-${i}`,
    match: m,
    pick,
    market: 'Main Market',
    odds,
    confidence,
    riskLevel: odds > 1.8 ? 'Medium' : 'Low',
    expectedValue: Math.round((odds * (confidence / 100)) * 100) / 100,
    probability: confidence,
    suggestedBetType: 'Accumulator Leg',
    aiExplanation: `Historical predictive simulation ran on ${new Date(date).toLocaleDateString()} showed high tactical superiority for ${pick}. Detailed variables analyzed: Squad performance, xG models, weather, surface speed, and heavy market line steaming. Verification confirmed prediction matched final game parameters successfully.`,
    analysisCriteria: {
      formAnalysis: 'Strong historical performance and positive expected scoring traits.',
      injuryImpact: 'Lineups were fully stable at kick-off with zero critical tactical elements missing.',
      tacticalMatchup: 'Strategic setup favored high possession retention and dominant territorial play.',
      oddsMovement: 'Smart bookmakers adjusted lines downwards right before kickoff.',
      otherFactors: 'Motivation, fatigue recovery, and referee metrics aligned perfectly.'
    },
    result
  };
});

export const INITIAL_STATS: PerformanceStats = {
  monthlyAccuracy: 84.5,
  weeklyAccuracy: 86.2,
  roi: 18.4,
  winRate: 84.4,
  totalWon: 38,
  totalLost: 7,
  totalActive: 4,
  streak: "5 Wins",
  historicalChartData: [
    { date: 'Jun 10', winRate: 78, roi: 12.5 },
    { date: 'Jun 15', winRate: 80, roi: 14.1 },
    { date: 'Jun 20', winRate: 82, roi: 15.8 },
    { date: 'Jun 25', winRate: 81, roi: 15.2 },
    { date: 'Jun 30', winRate: 83, roi: 17.0 },
    { date: 'Jul 05', winRate: 84.5, roi: 18.4 }
  ]
};

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art-1',
    title: 'How our AI Engine Utilizes Expected Goals (xG) for Value Betting',
    summary: 'Expected Goals (xG) is a revolutionary metric, but most punters use it wrong. Here is how our AI models isolate high-value opportunities.',
    content: `Expected Goals (xG) has become a staple of modern football analytics. However, simply backing high-xG teams is a fast track to losing your bankroll. Bookmakers have already integrated basic xG calculations into their pricing models. 
    
    To find true "value" (where the bookmaker's odds represent a lower probability than reality), our AI prediction engine goes three steps deeper:
    
    1. **Non-Shot Expected Goals (NSxG):** We track actions in the final third—passes, dribbles, and crosses—that don't end in a shot but indicate high threat. This exposes teams whose goal-scoring is about to explode, even if they have been unlucky in recent matches.
    
    2. **Game-State Adjustments:** A team leading 2-0 naturally drops deep and concedes xG, while the trailing team racks up desperate, low-quality shots. Our engine discounts late-game "desperation xG" and weights early-game "deadlock xG" much higher.
    
    3. **Shooter & Goalkeeper Quality Ratings:** We compare the striker's historical finish conversion rate against the specific goalkeeper's post-shot xG saving ratio. This lets us predict if a low-xG chance is actually high-probability in the hands of a world-class finisher.
    
    By combining these tactical metrics, Rafiki Predict identifies mismatches where the public leans on raw league tables, allowing us to hit high-confidence single bets and accumulators.`,
    author: 'John Mushira (Lead Analyst)',
    sport: 'football',
    publishedAt: minusDays(2),
    readTime: '4 min read',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 'art-2',
    title: 'Mastering Tennis Surface Preferences: Clay vs Grass vs Hardcourt',
    summary: 'Analyzing why ATP and WTA players perform radically differently on separate court surfaces, and how our AI tracks physical fatigue.',
    content: `Tennis is the ultimate individual sport, and the playing surface acts as the third competitor on the court. A player who looks unbeatable on clay can become incredibly vulnerable on grass.
    
    Our tennis AI algorithms weight surface coefficients higher than raw ATP/WTA rankings. Here is a breakdown of what the AI analyzes:
    
    * **Clay Courts:** High bounce and extreme friction. Clay slows the ball down, rewarding defensive baseliners, heavy topspin, and superior cardiovascular stamina. We track "slide-recovery speed" and break-point conversion rates, as games are longer and breaks are common.
    
    * **Grass Courts:** Fast-paced, low-skidding bounce. Serves are dominant, and rallies are short. Our engine weights 1st-serve percentage, ace ratios, and net-volley completion rates. A player who cannot hold serve on grass is an automatic fade target.
    
    * **Hard Courts:** The true test of balanced play. Hard courts are medium-fast and predictable. We focus heavily on "return points won" and lateral deceleration metrics, as hard courts put the highest mechanical strain on players' joints.
    
    Additionally, our physical exhaustion telemetry monitors match workloads. If a player has run more than 5.2 kilometers in a matches sequence over the preceding 48 hours, our model automatically applies a 12% fatigue discount, alerting us to high-value upset opportunities.`,
    author: 'AI Prediction Team',
    sport: 'tennis',
    publishedAt: minusDays(4),
    readTime: '5 min read',
    imageUrl: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=600&auto=format&fit=crop'
  }
];

export const INITIAL_NOTIFICATIONS: NotificationLog[] = [
  {
    id: 'not-1',
    title: '🚀 Safe Daily Acca Generated',
    message: 'Our AI has finalized today\'s Safe Accumulator with combined odds of 2.95! High confidence check inside.',
    type: 'alert',
    timestamp: new Date().toISOString()
  },
  {
    id: 'not-2',
    title: '🏆 5-Game Winning Streak!',
    message: 'VIP Tennis accumulators have hit a flawless 5-game winning streak. Net ROI is up +24.8% this week!',
    type: 'streak',
    timestamp: minusDays(1)
  },
  {
    id: 'not-3',
    title: '💳 M-Pesa Integration Live',
    message: 'You can now instantly activate Premium membership using our automated M-Pesa payment route.',
    type: 'system',
    timestamp: minusDays(3)
  }
];
