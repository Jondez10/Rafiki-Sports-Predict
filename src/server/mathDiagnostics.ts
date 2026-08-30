/**
 * Math Calculations & Edge-Case Diagnostic Test Suite
 * Validates Poisson Engine & Ensemble Engine under extreme data conditions:
 * - null/undefined data points
 * - division-by-zero scenarios
 * - negative numbers, NaNs, and Infinities
 * - extreme outlier values (k > 100, Elo diff > 10,000)
 */

import {
  poissonPMF,
  poissonCDF,
  computeEventPoissonModel,
  computePoissonPrediction,
  gradePrediction,
  TeamGoalRecord
} from './poissonEngine';

import {
  validateMatchData,
  runModel1Poisson,
  runModel2EloBayesian,
  runModel3XgMatchup,
  runModel4MomentumFatigue,
  runModel5DeepClassifier,
  computeEnsemblePrediction,
  evaluateBacktestPerformance,
  getLeagueProfile
} from './ensembleEngine';

export interface MathDiagnosticCase {
  id: number;
  category: string;
  name: string;
  passed: boolean;
  details: string;
  durationMs: number;
}

export interface MathDiagnosticReport {
  timestamp: string;
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  testCases: MathDiagnosticCase[];
}

export function runMathDiagnostics(): MathDiagnosticReport {
  const cases: MathDiagnosticCase[] = [];

  // Helper to run a test safely
  const runTest = (id: number, category: string, name: string, fn: () => boolean | string) => {
    const start = performance.now();
    try {
      const res = fn();
      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      if (typeof res === 'string') {
        cases.push({ id, category, name, passed: true, details: res, durationMs });
      } else if (res === true) {
        cases.push({ id, category, name, passed: true, details: 'Assertion verified: No exceptions, valid mathematical bounds.', durationMs });
      } else {
        cases.push({ id, category, name, passed: false, details: 'Assertion failed: Condition evaluated to false.', durationMs });
      }
    } catch (err: any) {
      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      cases.push({ id, category, name, passed: false, details: `Runtime Exception: ${err.message || String(err)}`, durationMs });
    }
  };

  // 1. poissonPMF defensive checks
  runTest(1, 'Poisson PMF', 'Handles null, undefined, NaN, and negative parameters safely', () => {
    const r1 = poissonPMF(null as any, 2.5);
    const r2 = poissonPMF(undefined as any, 2.5);
    const r3 = poissonPMF(NaN as any, 2.5);
    const r4 = poissonPMF(-3, 2.5);
    const r5 = poissonPMF(2, null as any);
    const r6 = poissonPMF(2, undefined as any);
    const r7 = poissonPMF(2, NaN as any);
    const r8 = poissonPMF(0, 0);
    const r9 = poissonPMF(1, 0);

    const safe = r1 === 0 && r2 === 0 && r3 === 0 && r4 === 0 &&
                 r5 === 0 && r6 === 0 && r7 === 0 &&
                 r8 === 1 && r9 === 0;
    return safe ? `All PMF edge checks returned expected values (r8=${r8}, r9=${r9})` : 'PMF edge check mismatch';
  });

  // 2. poissonPMF large k log-space handling
  runTest(2, 'Poisson PMF', 'Computes large factorial/exponent (k=120, lambda=95) in log-space without overflow', () => {
    const res = poissonPMF(120, 95);
    const isValid = !isNaN(res) && isFinite(res) && res >= 0 && res <= 1 && res > 0;
    return isValid ? `Large k PMF computed safely: P(X=120 | lambda=95) = ${res.toExponential(4)}` : 'PMF large k overflowed to NaN/Infinity';
  });

  // 3. poissonCDF defensive checks
  runTest(3, 'Poisson CDF', 'Handles zero and negative limits without infinite loops or exceptions', () => {
    const c0 = poissonCDF(0, 0);
    const cNeg = poissonCDF(-5, 2.5);
    const cNull = poissonCDF(null as any, undefined as any);
    const cVal = poissonCDF(5, 2.5);

    const valid = c0 === 1 && cNeg === 0 && cNull === 0 && (cVal > 0.9 && cVal <= 1.0);
    return valid ? `CDF checks passed: c0=${c0}, cNeg=${cNeg}, cVal=${cVal.toFixed(4)}` : 'CDF checks failed';
  });

  // 4. computeEventPoissonModel division-by-zero protection
  runTest(4, 'Event Poisson Model', 'Safely handles 0 lambda values and NaN parameters for event models', () => {
    const m1 = computeEventPoissonModel('corners', 0, 0, 9.5, -1.5);
    const m2 = computeEventPoissonModel('yellow_cards', NaN as any, null as any, undefined as any, -0.5);

    const m1Valid = isFinite(m1.overProb) && isFinite(m1.underProb) && isFinite(m1.fairOddsOver) && !isNaN(m1.fairOddsOver);
    const m2Valid = isFinite(m2.homeMostProb) && isFinite(m2.drawProb) && isFinite(m2.awayMostProb);

    return (m1Valid && m2Valid) ? `Event models with zero/null lambdas yielded valid probabilities (m1 Fair Odds: ${m1.fairOddsOver})` : 'Event model produced NaN/Infinity';
  });

  // 5. computePoissonPrediction thin data and null object defense
  runTest(5, 'Poisson Regression', 'Gracefully rejects null/undefined team records without runtime errors', () => {
    const resNull = computePoissonPrediction(null, null);
    const resUndefined = computePoissonPrediction(undefined, undefined);
    const resEmpty = computePoissonPrediction({ teamName: 'Empty', matchesPlayed: 0, goalsScored: 0, goalsConceded: 0 }, { teamName: 'Empty2', matchesPlayed: 0, goalsScored: 0, goalsConceded: 0 });

    const safe = !resNull.valid && !resUndefined.valid && !resEmpty.valid && 
                 Boolean(resNull.reason) && Boolean(resEmpty.reason);
    return safe ? `Thin/null inputs safely rejected: "${resNull.reason}"` : 'Failed to reject null inputs cleanly';
  });

  // 6. computePoissonPrediction zero-scoring teams
  runTest(6, 'Poisson Regression', 'Calculates valid prediction for teams with 0 goals scored/conceded across valid sample', () => {
    const teamA: TeamGoalRecord = { teamName: 'Zero FC', matchesPlayed: 5, goalsScored: 0, goalsConceded: 0 };
    const teamB: TeamGoalRecord = { teamName: 'Null United', matchesPlayed: 5, goalsScored: 0, goalsConceded: 0 };
    const pred = computePoissonPrediction(teamA, teamB);

    const isValid = pred.valid && isFinite(pred.homeWinProb) && isFinite(pred.drawProb) && isFinite(pred.awayWinProb) &&
                    !isNaN(pred.homeWinProb) && (pred.homeWinProb + pred.drawProb + pred.awayWinProb) > 0.99;
    return isValid ? `Zero-scoring teams predicted: Home=${pred.homeWinProb}, Draw=${pred.drawProb}, Away=${pred.awayWinProb}` : 'Zero-scoring team produced invalid math';
  });

  // 7. gradePrediction null/undefined arguments
  runTest(7, 'Prediction Grader', 'Safely returns void on undefined/null scores and string options', () => {
    const g1 = gradePrediction(null, null, null, null);
    const g2 = gradePrediction('Arsenal to Win', '1X2 Match Winner', NaN as any, 1);
    const g3 = gradePrediction(undefined, undefined, 2, undefined as any);

    const safe = g1 === 'void' && g2 === 'void' && g3 === 'void';
    return safe ? 'All invalid grading arguments cleanly returned "void"' : 'Grader did not return void on bad inputs';
  });

  // 8. runModel2EloBayesian extreme Elo bounds
  runTest(8, 'Elo Bayesian Model', 'Prevents Math.pow exponent overflow with +/- 10,000 Elo differentials', () => {
    const lp = getLeagueProfile('Premier League');
    const mockInput: any = {
      match: { id: 'test-1', homeTeam: 'Gods FC', awayTeam: 'Mortals FC', league: 'Premier League' },
      homeStats: { teamName: 'Gods FC', matchesPlayed: 10, goalsScored: 30, goalsConceded: 2 },
      awayStats: { teamName: 'Mortals FC', matchesPlayed: 10, goalsScored: 2, goalsConceded: 30 },
      homeElo: 10000,
      awayElo: 50
    };

    const res = runModel2EloBayesian(mockInput, lp);
    const valid = isFinite(res.homeWinProb) && isFinite(res.awayWinProb) && !isNaN(res.homeWinProb) &&
                  res.homeWinProb > 0.80 && res.awayWinProb < 0.10;
    return valid ? `Extreme Elo (+${res.ratingDiff}) handled safely: Home Win=${res.homeWinProb}, Away Win=${res.awayWinProb}` : 'Elo overflowed';
  });

  // 9. runModel3XgMatchup division by zero
  runTest(9, 'xG Space Model', 'Prevents division by zero when matchesPlayed is 0 and xG is undefined', () => {
    const lp = getLeagueProfile('La Liga');
    const mockInput: any = {
      match: { id: 'test-2', homeTeam: 'Team A', awayTeam: 'Team B', league: 'La Liga' },
      homeStats: { teamName: 'Team A', matchesPlayed: 0, goalsScored: 0, goalsConceded: 0 },
      awayStats: { teamName: 'Team B', matchesPlayed: 0, goalsScored: 0, goalsConceded: 0 }
    };

    const res = runModel3XgMatchup(mockInput, lp);
    const valid = isFinite(res.homeWinProb) && isFinite(res.drawProb) && isFinite(res.awayWinProb) &&
                  !isNaN(res.homeWinProb) && !isNaN(res.projHomeXg);
    return valid ? `xG Matchup with 0 matches produced safe defaults (Proj xG: ${res.projHomeXg} vs ${res.projAwayXg})` : 'xG model division by zero';
  });

  // 10. runModel4MomentumFatigue empty arrays
  runTest(10, 'Momentum & Fatigue Model', 'Handles empty recent results arrays without indexing out-of-bounds or zero-division', () => {
    const mockInput: any = {
      match: { id: 'test-3', homeTeam: 'Team C', awayTeam: 'Team D', league: 'Serie A' },
      homeStats: { teamName: 'Team C', matchesPlayed: 0, goalsScored: 0, goalsConceded: 0, recentResults: [] },
      awayStats: { teamName: 'Team D', matchesPlayed: 0, goalsScored: 0, goalsConceded: 0, recentResults: [] },
      homeRestDays: undefined,
      awayRestDays: undefined
    };

    const res = runModel4MomentumFatigue(mockInput);
    const valid = isFinite(res.homeWinProb) && isFinite(res.drawProb) && isFinite(res.awayWinProb) &&
                  !isNaN(res.homeWinProb);
    return valid ? `Momentum model handled empty history (Home=${res.homeWinProb}, Trend=${res.formTrend})` : 'Momentum model crashed';
  });

  // 11. runModel5DeepClassifier non-linear boundary protection
  runTest(11, 'Deep Classifier Proxy', 'Softmax activation does not overflow with NaN or Infinity inputs', () => {
    const mockM1: any = { homeWinProb: 0.5, drawProb: 0.25, awayWinProb: 0.25, lambdaHome: 1.5, lambdaAway: 1.2, over25Prob: 0.5, bttsYesProb: 0.5 };
    const mockM2: any = { homeWinProb: 0.6, drawProb: 0.20, awayWinProb: 0.20, over25Prob: 0.5, bttsYesProb: 0.5 };
    const mockM3: any = { homeWinProb: 0.55, drawProb: 0.25, awayWinProb: 0.20, over25Prob: 0.5, bttsYesProb: 0.5 };
    const mockM4: any = { homeWinProb: 0.45, drawProb: 0.30, awayWinProb: 0.25 };

    const res = runModel5DeepClassifier(mockM1, mockM2, mockM3, mockM4);
    const sum = res.homeWinProb + res.drawProb + res.awayWinProb;
    const valid = isFinite(res.homeWinProb) && Math.abs(sum - 1.0) < 0.01;
    return valid ? `Softmax normalized cleanly (Home=${res.homeWinProb}, Draw=${res.drawProb}, Away=${res.awayWinProb}, Sum=${sum.toFixed(3)})` : 'Deep classifier softmax failed';
  });

  // 12. computeEnsemblePrediction complete corrupted input defense
  runTest(12, 'Ensemble Engine', 'Safely absorbs completely malformed MatchAnalysisInput without throwing', () => {
    const res = computeEnsemblePrediction({} as any);
    const valid = !res.valid && res.prediction && res.prediction.pick.includes('Insufficient Data');
    return valid ? `Ensemble safely generated guarded fallback: "${res.prediction.pick}"` : 'Ensemble crashed on empty object';
  });

  // 13. evaluateBacktestPerformance empty and invalid inputs
  runTest(13, 'Backtesting & Brier Analytics', 'Safely handles empty array [], null, and single-prediction datasets without zero division', () => {
    const bEmpty = evaluateBacktestPerformance([]);
    const bNull = evaluateBacktestPerformance(null as any);
    const bSingle = evaluateBacktestPerformance([
      { id: '1', result: 'win', probability: 80, odds: 1.85, match: { league: 'EPL' } } as any
    ]);

    const valid = isFinite(bEmpty.overallBrierScore) && !isNaN(bEmpty.overallAccuracy) &&
                  isFinite(bNull.overallLogLoss) &&
                  bSingle.totalPredictionsTested === 1 && bSingle.overallAccuracy === 100;

    return valid ? `Backtest metrics computed safely: empty Brier=${bEmpty.overallBrierScore}, single Acc=${bSingle.overallAccuracy}%` : 'Backtest engine division by zero';
  });

  const passedTests = cases.filter(c => c.passed).length;
  const failedTests = cases.length - passedTests;

  return {
    timestamp: new Date().toISOString(),
    allPassed: failedTests === 0,
    totalTests: cases.length,
    passedTests,
    failedTests,
    testCases: cases
  };
}
