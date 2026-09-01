export type SportType = 'football' | 'basketball' | 'tennis';

export interface SportMatch {
  id: string;
  sport: SportType;
  homeTeam: string;
  awayTeam: string;
  league: string;
  startTime: string; // ISO string
  status: 'upcoming' | 'live' | 'completed';
  homeScore?: number;
  awayScore?: number;
  // Match statistical breakdown (for Corners, Cards, Fouls, Shots grading)
  corners?: { home: number; away: number };
  yellowCards?: { home: number; away: number };
  fouls?: { home: number; away: number };
  shotsOnTarget?: { home: number; away: number };
  shotsOffTarget?: { home: number; away: number };
  // Advanced analysis stats
  form?: { home: string[]; away: string[] }; // e.g. ["W", "D", "W"]
  h2h?: string[]; // e.g. ["Real Madrid 2-1 Sevilla", "Sevilla 0-1 Real Madrid"]
  injuries?: { home: string[]; away: string[] };
  additionalStats?: Record<string, string | number>; // xG, ATP Rank, Offensive rating, etc.
  groundingSources?: { title: string; url: string }[]; // Verified match & league reference links
  dataSource?: 'api-football' | 'statistical-engine' | 'ai-grounded' | 'simulated' | 'espn-live-sports' | 'sports-consensus-engine';
  finishedMatchesCount?: { home: number; away: number };
}

export type MarketCategory = 
  | '1x2' 
  | 'goals' 
  | 'corners' 
  | 'yellow_cards' 
  | 'fouls' 
  | 'shots_on_target' 
  | 'shots_off_target' 
  | 'handicap' 
  | 'other';

export type MarketOptionType = 'over' | 'under' | '1x2_winner' | 'handicap' | 'btts' | 'double_chance' | 'spread';

export interface MatchStatistics {
  corners?: { home: number; away: number };
  yellowCards?: { home: number; away: number };
  fouls?: { home: number; away: number };
  shotsOnTarget?: { home: number; away: number };
  shotsOffTarget?: { home: number; away: number };
}

export interface Prediction {
  id: string;
  matchId: string;
  match: SportMatch;
  pick: string; // e.g. "Real Madrid to Win"
  market: string; // e.g. "Match Winner", "Corners - Over 9.5", "Yellow Cards - 1X2", etc.
  marketCategory?: MarketCategory;
  marketOptionType?: MarketOptionType;
  odds: number; // e.g. 1.55
  confidence: number; // 0-100%, must be > 75%
  riskLevel: 'Low' | 'Medium' | 'High';
  expectedValue: number; // e.g. 1.15
  probability: number; // e.g. 72%
  suggestedBetType: string; // e.g. "Single" or "Accumulator Leg"
  aiExplanation: string; // Detailed reason
  analysisCriteria: {
    formAnalysis: string;
    injuryImpact: string;
    tacticalMatchup: string;
    oddsMovement: string;
    otherFactors: string; // Weather, motivation, surface, referee, back-to-back, etc.
  };
  result?: 'win' | 'loss' | 'pending' | 'void';
  // New Mathematical Engine & Honesty Layer attributes
  dataSource?: 'api-football' | 'statistical-engine' | 'ai-grounded' | 'simulated' | 'espn-live-sports' | 'sports-consensus-engine';
  modelFairOdds?: number; // Model-derived fair odds (1/Probability), explicitly labeled
  impliedProbability?: number; // Model estimated probability %
  plainLanguageFactors?: string[]; // Plain-language bulleted factors
  statisticalMetrics?: {
    lambdaHome: number;
    lambdaAway: number;
    shrinkageFactor: number;
    homeRecentAvg: number;
    awayRecentAvg: number;
    sampleSizeHome: number;
    sampleSizeAway: number;
    jointProbabilities?: Record<string, number>;
  };
  lastUpdated?: string;
  analyzedAt?: string;
  gradedAt?: string;
  actualHomeScore?: number;
  actualAwayScore?: number;
  actualMatchStats?: MatchStatistics;
  // Ensemble AI Architecture breakdown
  ensembleBreakdown?: {
    modelAgreement: number; // 0 - 100% agreement index
    confidenceCategory: 'Very High Confidence' | 'High Confidence' | 'Medium Confidence' | 'Low Confidence' | 'Insufficient Data / No Edge';
    models: {
      poisson: { name: string; probability: number; weight: number; edgeScore: number };
      eloBayesian: { name: string; probability: number; weight: number; ratingDiff: number };
      xgMatchup: { name: string; probability: number; weight: number; xgDiff: number };
      momentumFatigue: { name: string; probability: number; weight: number; formTrend: string };
      deepClassifier: { name: string; probability: number; weight: number; featureScore: number };
    };
    sourceReliabilityScore: number; // 0 - 100%
    dataFreshnessMinutes: number;
    leagueContext: string;
    brierScoreTarget?: number;
    noBetDecision?: boolean;
    noBetReason?: string;
  };
}

export interface ModelPerformanceMetric {
  modelId: string;
  modelName: string;
  accuracy: number;
  sampleSize: number;
  brierScore: number; // Lower is better (0 = perfect calibration)
  logLoss: number;
  roiPct: number;
  weightInEnsemble: number;
}

export interface CalibrationBin {
  binRange: string; // e.g. "70-80%"
  predictedProbability: number;
  actualWinRate: number;
  sampleCount: number;
  calibrationError: number;
}

export interface BacktestAnalytics {
  totalPredictionsTested: number;
  overallAccuracy: number;
  overallRoi: number;
  overallBrierScore: number;
  overallLogLoss: number;
  calibrationBins: CalibrationBin[];
  modelComparison: ModelPerformanceMetric[];
  leagueBreakdown: { league: string; accuracy: number; samples: number; roiPct: number }[];
  marketBreakdown: { market: string; accuracy: number; samples: number; roiPct: number }[];
  confidenceBreakdown: { category: string; accuracy: number; samples: number; roiPct: number }[];
  lastBacktestDate: string;
}

export interface MarketAccuracyRecord {
  market: string;
  displayName: string;
  correct: number;
  total: number;
  winRatePct: number;
  averageOdds: number;
  profitUnits: number;
  roiPct: number;
  lastUpdated: string;
}

export interface SystemHealthStatus {
  sportsApi: {
    configured: boolean;
    status: 'connected' | 'missing_key' | 'rate_limited' | 'error';
    latencyMs: number;
    cacheCount: number;
    lastSyncTime: string | null;
    message: string;
  };
  gemini: {
    configured: boolean;
    status: 'connected' | 'missing_key' | 'error';
    latencyMs: number;
    model: string;
    lastPingTime: string | null;
  };
  firebase: {
    configured: boolean;
    status: 'connected' | 'error';
    databaseId: string;
    totalPredictions: number;
    totalMatches: number;
    lastSyncTime: string | null;
  };
  statisticalEngine: {
    status: 'operational';
    version: string;
    unitTestsPassed: boolean;
    assertionsPassed: number;
    totalAssertions: number;
    testResults?: { id: number; name: string; passed: boolean; message: string }[];
    ensembleDiagnostics?: {
      allPassed: boolean;
      totalAssertions: number;
      assertionsPassed: number;
      results: { id: number; modelName: string; passed: boolean; description: string }[];
    };
    mathSafetyDiagnostics?: {
      timestamp: string;
      allPassed: boolean;
      totalTests: number;
      passedTests: number;
      failedTests: number;
      testCases: { id: number; category: string; name: string; passed: boolean; details: string; durationMs: number }[];
    };
  };
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  source: 'api-football' | 'statistical-engine' | 'manual-sync' | 'auto-grade';
  status: 'success' | 'warning' | 'error';
  fetchedCount: number;
  validCount: number;
  filteredCount: number;
  gradedCount?: number;
  summary: string;
  details?: string;
}

export interface Accumulator {
  id: string;
  type: 'safe' | 'balanced' | 'high_value';
  title: string; // e.g. "Safe Daily Acca", "Balanced Double", "Weekend High Value Gold"
  name?: string; // Alias for title
  date: string; // YYYY-MM-DD
  predictions: Prediction[];
  totalOdds: number;
  combinedConfidence: number;
  status: 'pending' | 'win' | 'loss';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  durationDays: number;
  durationHours: number;
  priceKES: number;
  currencyPrices: Record<string, number>;
  description: string;
  features: string[];
  isPopular?: boolean;
  discountPct?: number;
  badge?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export type AccessKeyStatus = 'PENDING' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'BLOCKED' | 'REVOKED' | 'SUSPENDED';

export interface KeyAuditEntry {
  timestamp: string;
  action: 'GENERATED' | 'ACTIVATED' | 'EXTENDED' | 'REDUCED' | 'BLOCKED' | 'UNBLOCKED' | 'REVOKED' | 'SUSPENDED' | 'SESSION_RESET' | 'EXPIRED';
  actor: string;
  details?: string;
}

export interface AccessKey {
  id: string;
  keyCode: string; // Format: PP-XXXX-XXXX-XXXX
  keyHash?: string; // SHA-256 hash for secure server verification
  subscriptionId?: string;
  planId: string;
  planName: string;
  durationDays: number;
  durationHours: number;
  price: number;
  currency: string;
  paymentReference?: string;
  paymentMethod?: string;
  clientContact?: string; // Phone or email
  status: AccessKeyStatus;
  createdAt: string;
  activatedAt?: string;
  expiresAt?: string;
  deviceFingerprint?: string;
  activeSessionToken?: string;
  sessionExpiresAt?: string;
  lastActiveAt?: string;
  isComplimentary?: boolean;
  complimentaryReason?: string;
  grantedBy?: string;
  adminNotes?: string;
  history: KeyAuditEntry[];
}

export interface AccessSession {
  token: string;
  keyId: string;
  keyCode: string;
  planId: string;
  planName: string;
  status: AccessKeyStatus;
  activatedAt: string;
  expiresAt: string;
  remainingSeconds: number;
  deviceFingerprint?: string;
  features: string[];
}

export interface KeyAuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  keyId?: string;
  keyCode?: string;
  paymentRef?: string;
  details: string;
}

export interface AccountlessPaymentSubmission {
  id: string;
  planId: string;
  planName: string;
  durationDays: number;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  phone?: string;
  email?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  keyCode?: string;
  timestamp: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  createdAt: string;
  role: 'user' | 'admin';
  subscriptionStatus: 'none' | 'pending_approval' | 'premium' | 'rejected' | 'expired' | 'trial';
  paymentStatus?: 'none' | 'pending_approval' | 'approved' | 'rejected';
  phone?: string;
  authProvider?: 'password' | 'phone' | 'google.com' | 'apple.com' | 'microsoft.com' | 'guest';
  emailVerified?: boolean;
  phoneVerified?: boolean;
  avatarUrl?: string;
  subscriptionPlan?: 'daily' | 'weekly' | '15days' | 'monthly' | '2months' | '3months' | '6months' | 'yearly' | string;
  trialStartedAt?: string;
  premiumExpiresAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentAmount?: number;
  paymentSubmittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvalNotes?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface PaymentLog {
  id: string;
  uid: string;
  email: string;
  username?: string;
  phone?: string;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  plan: 'daily' | 'weekly' | '15days' | 'monthly' | '2months' | '3months' | '6months' | 'yearly' | string;
  status: 'pending' | 'pending_approval' | 'approved' | 'rejected';
  timestamp: string;
  receiptUrl?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvalNotes?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface PerformanceStats {
  monthlyAccuracy: number;
  weeklyAccuracy: number;
  roi: number; // e.g. 18.5 for 18.5%
  winRate: number; // 0-100
  totalWon: number;
  totalLost: number;
  totalActive: number;
  streak?: string;
  historicalChartData: {
    date: string;
    winRate: number;
    roi: number;
  }[];
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  sport?: SportType;
  publishedAt: string;
  readTime: string;
  imageUrl?: string;
}

export interface NotificationLog {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'success' | 'system' | 'streak';
  timestamp: string;
  read?: boolean;
}

export interface Feedback {
  id: string;
  itemId: string;
  itemType: 'prediction' | 'accumulator';
  itemTitle: string;
  rating: number; // 1-5
  comment?: string;
  userId?: string;
  userEmail?: string;
  timestamp: string;
}

export interface SavedPrediction {
  id: string;
  predictionId: string;
  userId: string;
  savedAt: string;
  prediction: Prediction;
}
