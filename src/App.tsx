import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  signInWithGoogle,
  signInWithApple,
  signInWithMicrosoft,
  signOut,
  doc, 
  getDoc, 
  setDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  withFirestoreRetry,
  reconnectFirestore,
  logFirestoreError
} from './lib/firebase';
import { FirebaseUser } from './lib/firebase';
import { 
  UserProfile, 
  Prediction, 
  Accumulator, 
  Article, 
  NotificationLog, 
  PerformanceStats,
  SavedPrediction
} from './types';

// Icons
import { 
  Trophy, 
  TrendingUp, 
  Coins, 
  BookOpen, 
  Bell, 
  ShieldAlert, 
  Sparkles, 
  Phone, 
  Mail, 
  MessageSquare, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Lock, 
  Settings, 
  Share2,
  Activity, 
  Menu, 
  X,
  UserCheck,
  CheckCircle2,
  CalendarDays,
  Globe,
  Flame,
  Zap,
  Crown,
  Award,
  Scale,
  Cookie,
  Star,
  Twitter,
  Send,
  Facebook,
  Instagram,
  MessageCircle,
  ChevronDown,
  HelpCircle,
  Download,
  Users,
  Shield,
  Cpu
} from 'lucide-react';

import { translations } from './translations';

// Subcomponents
import PredictionsTab from './components/PredictionsTab';
import SubscriptionTab from './components/SubscriptionTab';
import ArchiveTab from './components/ArchiveTab';
import ArticlesTab from './components/ArticlesTab';
import ResponsibleGambling from './components/ResponsibleGambling';
import AdminDashboard from './components/AdminDashboard';
import DailyQuiz from './components/DailyQuiz';
import GmailTab from './components/GmailTab';
import BettingBuddy from './components/BettingBuddy';
import CustomerSupportAgent from './components/CustomerSupportAgent';
import AppBanner from './components/AppBanner';
import AuthModal, { AuthMode } from './components/AuthModal';
import AccountModal from './components/AccountModal';
import CommunityModal from './components/CommunityModal';
import ScreenScrollControls from './components/ScreenScrollControls';
import { signInWithGoogleGmail } from './lib/gmail';

// Badge Definitions and Helpers
export interface PerformanceBadge {
  id: string;
  level: number;
  name: string;
  nameSw: string;
  iconName: string;
  colorClass: string;
  bgGradient: string;
  glowColor: string;
  description: string;
  descriptionSw: string;
  minStreak: number;
}

export const ALL_BADGES: PerformanceBadge[] = [
  {
    id: 'legendary',
    level: 5,
    name: 'Legendary Oracle',
    nameSw: 'Kiongozi wa Ajabu',
    iconName: 'Sparkles',
    colorClass: 'text-fuchsia-400 bg-fuchsia-950/20 border-fuchsia-900/30',
    bgGradient: 'from-fuchsia-500/20 to-indigo-500/10',
    glowColor: 'rgba(217,70,239,0.5)',
    description: 'Divine prediction streak of 10+ correct bets in a row! Pure legendary prediction god.',
    descriptionSw: 'Mfululizo wa kimungu wa utabiri sahihi 10+ mfululizo! Bingwa wa ajabu.',
    minStreak: 10
  },
  {
    id: 'elite',
    level: 4,
    name: 'Elite Predictor',
    nameSw: 'Mtabiri Mkuu',
    iconName: 'Crown',
    colorClass: 'text-violet-400 bg-violet-950/20 border-violet-900/30',
    bgGradient: 'from-violet-500/20 to-purple-500/10',
    glowColor: 'rgba(139,92,246,0.4)',
    description: 'A stellar run of 8+ consecutive correct predictions. Master level analysis.',
    descriptionSw: 'Mfululizo mzuri wa utabiri sahihi 8+ mfululizo. Uchambuzi wa kiwango cha juu.',
    minStreak: 8
  },
  {
    id: 'unstoppable',
    level: 3,
    name: 'Unstoppable Force',
    nameSw: 'Nguvu Isiyozuilika',
    iconName: 'Zap',
    colorClass: 'text-amber-400 bg-amber-950/20 border-amber-900/30',
    bgGradient: 'from-amber-500/20 to-orange-500/10',
    glowColor: 'rgba(245,158,11,0.4)',
    description: 'Incredible form! 5+ wins in a row. Bookmakers are starting to sweat.',
    descriptionSw: 'Fomu ya kustaajabisha! Ushindi 5+ mfululizo. Makampuni ya kamari yanaanza kuogopa.',
    minStreak: 5
  },
  {
    id: 'hot_streak',
    level: 2,
    name: 'Hot Streak',
    nameSw: 'Moto Unaowaka',
    iconName: 'Flame',
    colorClass: 'text-rose-400 bg-rose-950/20 border-rose-900/30',
    bgGradient: 'from-rose-500/20 to-red-500/10',
    glowColor: 'rgba(244,63,94,0.4)',
    description: '3+ wins in a row! The analysis engine is locked in and heated up.',
    descriptionSw: 'Ushindi 3+ mfululizo! Injini ya uchambuzi imejipanga na ina mfululizo mzuri.',
    minStreak: 3
  },
  {
    id: 'rising_star',
    level: 1,
    name: 'Rising Star',
    nameSw: 'Nyota Inayoibuka',
    iconName: 'Award',
    colorClass: 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30',
    bgGradient: 'from-emerald-500/10 to-teal-500/5',
    glowColor: 'rgba(16,185,129,0.3)',
    description: 'Excellent accuracy, starting strong in the arena.',
    descriptionSw: 'Usahihi mzuri, anayeanza kwa kasi uwanjani.',
    minStreak: 1
  }
];

export function getBadgeForStreak(streakStr: string): PerformanceBadge {
  const match = (streakStr || '').match(/(\d+)\s*(\w+)/);
  if (!match) {
    return ALL_BADGES[ALL_BADGES.length - 1]; // Fallback to Rising Star
  }

  const count = parseInt(match[1]);
  const isLoss = match[2].toLowerCase().includes('loss') || match[2].toLowerCase().includes('lose');

  if (isLoss) {
    return {
      id: 'contender',
      level: 0,
      name: 'Active Contender',
      nameSw: 'Mshindani Hai',
      iconName: 'Activity',
      colorClass: 'text-gray-400 bg-zinc-900/40 border-zinc-800/30',
      bgGradient: 'from-zinc-800/10 to-zinc-700/5',
      glowColor: 'rgba(156,163,175,0.1)',
      description: 'Analyzing patterns and adjusting strategies to bounce back.',
      descriptionSw: 'Anachambua mifumo na kurekebisha mbinu ili kurudi vizuri.',
      minStreak: 0
    };
  }

  if (count >= 10) return ALL_BADGES[0]; // Legendary
  if (count >= 8) return ALL_BADGES[1]; // Elite
  if (count >= 5) return ALL_BADGES[2]; // Unstoppable
  if (count >= 3) return ALL_BADGES[3]; // Hot Streak
  return ALL_BADGES[4]; // Rising Star
}

export function renderBadgeIcon(iconName: string, className = "w-4 h-4") {
  switch (iconName) {
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Crown':
      return <Crown className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Flame':
      return <Flame className={className} />;
    case 'Award':
      return <Award className={className} />;
    case 'Activity':
      return <Activity className={className} />;
    default:
      return <Trophy className={className} />;
  }
}

export default function App() {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<'predictions' | 'subscription' | 'archive' | 'articles' | 'responsible' | 'admin' | 'quiz' | 'gmail'>('predictions');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [buddyOpen, setBuddyOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [communityModalOpen, setCommunityModalOpen] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [theme, setTheme] = useState<'midnight' | 'high-contrast'>(() => {
    return (localStorage.getItem('rafiki-theme') as 'midnight' | 'high-contrast') || 'high-contrast';
  });
  const [displayDensity, setDisplayDensity] = useState<'comfortable' | 'compact'>(() => {
    return (localStorage.getItem('rafiki-density') as 'comfortable' | 'compact') || 'comfortable';
  });

  const handleToggleTheme = (newTheme?: 'midnight' | 'high-contrast') => {
    const nextTheme = newTheme || (theme === 'midnight' ? 'high-contrast' : 'midnight');
    setTheme(nextTheme);
    localStorage.setItem('rafiki-theme', nextTheme);
  };

  const handleToggleDensity = (newDensity?: 'comfortable' | 'compact') => {
    const nextDensity = newDensity || (displayDensity === 'comfortable' ? 'compact' : 'comfortable');
    setDisplayDensity(nextDensity);
    localStorage.setItem('rafiki-density', nextDensity);
  };

  const handleRestoreDisplayDefaults = () => {
    setTheme('high-contrast');
    setDisplayDensity('comfortable');
    localStorage.setItem('rafiki-theme', 'high-contrast');
    localStorage.setItem('rafiki-density', 'comfortable');
  };
  const [language, setLanguage] = useState<'en' | 'sw'>(() => {
    return (localStorage.getItem('rafiki-language') as 'en' | 'sw') || 'en';
  });
  
  const t = translations[language];

  // Handler for sharing the application using native Web Share API
  const handleShareApp = async () => {
    const shareData = {
      title: 'Rafiki Predict',
      text: t.shareAppDesc,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Web Share API error:', err);
          copyToClipboardFallback();
        }
      }
    } else {
      copyToClipboardFallback();
    }
  };

  const copyToClipboardFallback = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    }).catch((err) => {
      console.error('Failed to copy link to clipboard:', err);
    });
  };
  
  // Auth States - Real Firebase Auth user & profile (null when signed out)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // 1-Day Guest VIP Pass State (Stored locally for non-account daily purchasers)
  const [guestPass, setGuestPass] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('rafiki_guest_pass');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() > Date.now()) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const handleGuestPassActivated = (pass: any) => {
    setGuestPass(pass);
    try {
      localStorage.setItem('rafiki_guest_pass', JSON.stringify(pass));
    } catch {}
  };

  // Badge States
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState<'terms' | 'privacy' | 'cookies' | null>(null);
  const [celebratingBadge, setCelebratingBadge] = useState<any>(null);
  const [lastBadgeLevel, setLastBadgeLevel] = useState<number | null>(null);

  // Platform Data States with Local Cache fallback/hydration
  const [predictions, setPredictions] = useState<Prediction[]>(() => {
    try {
      const cached = localStorage.getItem('rafiki-predictions-cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed.predictions) ? parsed.predictions : [];
      }
    } catch (_) {}
    return [];
  });
  const [accumulators, setAccumulators] = useState<Accumulator[]>(() => {
    try {
      const cached = localStorage.getItem('rafiki-predictions-cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed.accumulators) ? parsed.accumulators : [];
      }
    } catch (_) {}
    return [];
  });
  const [articles, setArticles] = useState<Article[]>(() => {
    try {
      const cached = localStorage.getItem('rafiki-predictions-cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed.articles) ? parsed.articles : [];
      }
    } catch (_) {}
    return [];
  });
  const [notifications, setNotifications] = useState<NotificationLog[]>(() => {
    try {
      const cached = localStorage.getItem('rafiki-predictions-cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed.notifications) ? parsed.notifications : [];
      }
    } catch (_) {}
    return [];
  });
  const [stats, setStats] = useState<PerformanceStats | null>(() => {
    try {
      const cached = localStorage.getItem('rafiki-predictions-cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.stats || null;
      }
    } catch (_) {}
    return null;
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [savedPredictions, setSavedPredictions] = useState<SavedPrediction[]>([]);
  
  // Structured Sync & Connection State Management
  const [syncState, setSyncState] = useState<{
    status: 'idle' | 'syncing' | 'synced' | 'retrying' | 'error';
    lastSyncTime: string | null;
    error: string | null;
    retryAttempt: number;
    stage: string | null;
  }>({
    status: 'idle',
    lastSyncTime: null,
    error: null,
    retryAttempt: 0,
    stage: null
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Explicit Structured Error & Sync Logger
   */
  const logSyncError = (stage: string, context: Record<string, any>, error: any) => {
    const timestamp = new Date().toISOString();
    const errorDetails = {
      timestamp,
      stage,
      message: error?.message || String(error),
      code: error?.code || error?.status || 'UNKNOWN_ERROR',
      stack: error?.stack,
      ...context
    };

    console.error(`[SyncEngine][ERROR][${stage}] at ${timestamp}:`, errorDetails);
  };

  const logSyncInfo = (stage: string, message: string, meta?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    console.info(`[SyncEngine][INFO][${stage}] ${message} (${timestamp})`, meta || {});
  };

  // Monitor saved/bookmarked predictions in Firestore with localStorage fallback and reconnection logic
  useEffect(() => {
    const currentUid = user?.uid || userProfile?.uid;
    const localKey = `rafiki_saved_preds_${currentUid || 'usr_guest_vip'}`;

    // 1. Load initial cached bookmarks from localStorage
    try {
      const localData = localStorage.getItem(localKey);
      if (localData) {
        setSavedPredictions(JSON.parse(localData));
      }
    } catch (readErr) {
      logSyncError('SavedPredictionsLocalStorageRead', { localKey }, readErr);
    }

    // 2. Real-time Firestore sync (only if user is authenticated)
    if (!currentUid) {
      return;
    }

    let unsubscribe = () => {};
    try {
      logSyncInfo('SavedPredictionsFirestore', `Initializing real-time listener for user: ${currentUid}`);
      const q = query(collection(db, 'saved'), where('userId', '==', currentUid));
      unsubscribe = onSnapshot(
        q, 
        (snapshot) => {
          const docs: SavedPrediction[] = [];
          snapshot.forEach((snapDoc) => {
            docs.push(snapDoc.data() as SavedPrediction);
          });
          docs.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
          setSavedPredictions(docs);
          logSyncInfo('SavedPredictionsFirestore', `Successfully synchronized ${docs.length} bookmarks from Firestore.`);
          try {
            localStorage.setItem(localKey, JSON.stringify(docs));
          } catch (writeErr) {
            logSyncError('SavedPredictionsLocalStorageWrite', { localKey, count: docs.length }, writeErr);
          }
        }, 
        (firestoreErr) => {
          logSyncError('SavedPredictionsFirestoreSnapshot', { userId: currentUid }, firestoreErr);
          logFirestoreError('SavedPredictionsSnapshotListener', firestoreErr, { userId: currentUid });
          // Attempt non-blocking Firestore network reconnect on snapshot drops
          reconnectFirestore().catch(() => {});
        }
      );
    } catch (initErr) {
      logSyncError('SavedPredictionsFirestoreInit', { userId: currentUid }, initErr);
      logFirestoreError('SavedPredictionsSnapshotInit', initErr, { userId: currentUid });
    }

    return () => {
      unsubscribe();
    };
  }, [user?.uid, userProfile?.uid]);

  // 1. Monitor Real Firebase User State & Profile Sync with Robust Retries
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setShowAuthModal(false);
        setSyncState(prev => ({ ...prev, stage: 'FirestoreUserProfile', status: 'syncing' }));

        try {
          // Sync with Firestore profile using resilient exponential backoff retry mechanism
          const userRef = doc(db, 'users', firebaseUser.uid);
          
          const snap = await withFirestoreRetry(
            () => getDoc(userRef),
            {
              maxRetries: 4,
              initialDelayMs: 600,
              maxDelayMs: 8000,
              contextTag: `UserProfileFetch[${firebaseUser.uid}]`,
              onRetry: (attempt, err, nextDelay) => {
                logSyncError('UserProfileFetchRetry', { attempt, nextDelay, uid: firebaseUser.uid }, err);
                setSyncState(prev => ({ ...prev, status: 'retrying', retryAttempt: attempt }));
              }
            }
          );
          
          if (snap.exists()) {
            const profile = snap.data() as UserProfile;
            setUserProfile(profile);
            localStorage.setItem('rafiki_user_session', JSON.stringify(profile));
            logSyncInfo('FirestoreUserProfile', `Profile synchronized successfully for ${profile.email} (${profile.uid}).`);
          } else {
            // Create default profile for newly authenticated user with retry
            const isTargetAdmin = firebaseUser.email === 'rafikibc1000@gmail.com' || firebaseUser.email === 'johnmushira@gmail.com';
            const defaultProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              username: firebaseUser.displayName || (firebaseUser.email || '').split('@')[0] || 'Member',
              createdAt: new Date().toISOString(),
              role: isTargetAdmin ? 'admin' : 'user',
              subscriptionStatus: 'trial',
              subscriptionPlan: 'Free Trial',
              trialStartedAt: new Date().toISOString()
            };
            
            await withFirestoreRetry(
              () => setDoc(userRef, defaultProfile),
              {
                maxRetries: 3,
                initialDelayMs: 800,
                contextTag: `UserProfileCreate[${firebaseUser.uid}]`,
                onRetry: (attempt, err, nextDelay) => {
                  logSyncError('UserProfileCreateRetry', { attempt, nextDelay, uid: firebaseUser.uid }, err);
                }
              }
            );

            setUserProfile(defaultProfile);
            localStorage.setItem('rafiki_user_session', JSON.stringify(defaultProfile));
            logSyncInfo('FirestoreUserProfile', `Default profile generated and synchronized in Firestore for ${defaultProfile.email}.`);
          }

          setSyncState(prev => ({
            ...prev,
            status: 'synced',
            lastSyncTime: new Date().toISOString(),
            error: null,
            retryAttempt: 0
          }));
        } catch (err: any) {
          logSyncError('FirestoreUserProfileSync', { uid: firebaseUser.uid, email: firebaseUser.email }, err);
          logFirestoreError('UserProfileSync', err, { uid: firebaseUser.uid });
          
          setSyncState(prev => ({
            ...prev,
            status: 'error',
            error: `User Profile Sync Notice: ${err?.message || 'Database connection error'}`,
            retryAttempt: 0
          }));

          // Fallback to local session if Firestore was unreachable
          try {
            const cachedSession = localStorage.getItem('rafiki_user_session');
            if (cachedSession) {
              setUserProfile(JSON.parse(cachedSession));
              logSyncInfo('FirestoreUserProfile', 'Loaded user profile from localStorage fallback cache.');
            }
          } catch (storageErr) {
            logSyncError('UserProfileLocalStorageFallback', {}, storageErr);
          }
        }
      } else {
        // Genuine signed-out guest state (null)
        setUser(null);
        setUserProfile(null);
        localStorage.removeItem('rafiki_user_session');
        setSyncState(prev => ({ ...prev, stage: null, error: null }));
      }
    });

    return () => unsubscribe();
  }, []);

  // Helper to safely parse API JSON responses with explicit error logging
  const safeFetchJson = async (res: Response, endpoint: string) => {
    try {
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
      
      if (!res.ok) {
        logSyncError('ApiFetchNonOkStatus', { endpoint, status: res.status, statusText: res.statusText }, new Error(`HTTP ${res.status}: ${res.statusText}`));
      } else if (!contentType.includes('application/json')) {
        logSyncError('ApiFetchInvalidContentType', { endpoint, contentType }, new Error(`Expected JSON but received: ${contentType}`));
      }
    } catch (err) {
      logSyncError('ApiJsonParseError', { endpoint }, err);
    }
    return null;
  };

  // 2. Fetch API & Remote Synchronized Data with Exponential Backoff Retries
  const fetchPlatformData = async (retryAttempt: number = 0, maxRetries: number = 3) => {
    setDataLoading(true);
    setSyncState(prev => ({
      ...prev,
      status: retryAttempt > 0 ? 'retrying' : 'syncing',
      retryAttempt,
      stage: 'PlatformDataSync',
      error: retryAttempt > 0 ? prev.error : null
    }));

    const startTime = Date.now();

    try {
      const headers: Record<string, string> = {};
      if (user?.uid) {
        headers['x-user-uid'] = user.uid;
      }
      const uidQuery = user?.uid ? `?uid=${encodeURIComponent(user.uid)}` : '';

      logSyncInfo('PlatformDataSync', `Synchronizing platform data (Attempt ${retryAttempt + 1}/${maxRetries + 1})...`);

      const [pRes, aRes, artRes, nRes, sRes] = await Promise.all([
        fetch(`/api/predictions${uidQuery}`, { headers }).catch(err => {
          logSyncError('FetchPredictionsEndpoint', { endpoint: '/api/predictions' }, err);
          return new Response(null, { status: 503, statusText: 'Service Unavailable' });
        }),
        fetch(`/api/accumulators${uidQuery}`, { headers }).catch(err => {
          logSyncError('FetchAccumulatorsEndpoint', { endpoint: '/api/accumulators' }, err);
          return new Response(null, { status: 503, statusText: 'Service Unavailable' });
        }),
        fetch(`/api/articles${uidQuery}`, { headers }).catch(err => {
          logSyncError('FetchArticlesEndpoint', { endpoint: '/api/articles' }, err);
          return new Response(null, { status: 503, statusText: 'Service Unavailable' });
        }),
        fetch(`/api/notifications${uidQuery}`, { headers }).catch(err => {
          logSyncError('FetchNotificationsEndpoint', { endpoint: '/api/notifications' }, err);
          return new Response(null, { status: 503, statusText: 'Service Unavailable' });
        }),
        fetch(`/api/stats${uidQuery}`, { headers }).catch(err => {
          logSyncError('FetchStatsEndpoint', { endpoint: '/api/stats' }, err);
          return new Response(null, { status: 503, statusText: 'Service Unavailable' });
        })
      ]);

      const [pData, aData, artData, nData, sData] = await Promise.all([
        safeFetchJson(pRes, '/api/predictions'),
        safeFetchJson(aRes, '/api/accumulators'),
        safeFetchJson(artRes, '/api/articles'),
        safeFetchJson(nRes, '/api/notifications'),
        safeFetchJson(sRes, '/api/stats')
      ]);

      const cleanPredictions = Array.isArray(pData) ? pData : [];
      const cleanAccumulators = Array.isArray(aData) ? aData : [];
      const cleanArticles = Array.isArray(artData) ? artData : [];
      const cleanNotifications = Array.isArray(nData) ? nData : [];
      const cleanStats = (sData && !sData.error) ? sData : null;

      const totalItems = cleanPredictions.length + cleanAccumulators.length + cleanArticles.length;
      const allResponsesFailed = !pRes.ok && !aRes.ok && !artRes.ok;

      if (allResponsesFailed && retryAttempt < maxRetries) {
        throw new Error(`API endpoints returned non-OK status. (HTTP ${pRes.status}, ${aRes.status}, ${artRes.status})`);
      }

      setPredictions(cleanPredictions);
      setAccumulators(cleanAccumulators);
      setArticles(cleanArticles);
      setNotifications(cleanNotifications);
      setStats(cleanStats);

      // Save to localStorage for robust offline caching
      if (totalItems > 0) {
        try {
          localStorage.setItem('rafiki-predictions-cache', JSON.stringify({
            predictions: cleanPredictions,
            accumulators: cleanAccumulators,
            articles: cleanArticles,
            notifications: cleanNotifications,
            stats: cleanStats,
            cachedAt: new Date().toISOString()
          }));
        } catch (cacheErr) {
          logSyncError('CacheLocalStorageWrite', {}, cacheErr);
        }
      }

      const elapsed = Date.now() - startTime;
      logSyncInfo('PlatformDataSync', `Sync completed in ${elapsed}ms. (${cleanPredictions.length} preds, ${cleanAccumulators.length} accas, ${cleanArticles.length} articles)`);

      setIsOffline(false);
      setSyncState({
        status: 'synced',
        lastSyncTime: new Date().toISOString(),
        error: null,
        retryAttempt: 0,
        stage: null
      });
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      logSyncError('PlatformDataSyncFailure', { attempt: retryAttempt, elapsed, maxRetries }, err);

      if (retryAttempt < maxRetries) {
        // Compute exponential backoff with full jitter
        const jitter = Math.random() * 0.4 + 0.8;
        const delay = Math.min(800 * Math.pow(2, retryAttempt) * jitter, 6000);
        
        console.warn(`[SyncEngine] Retry ${retryAttempt + 1}/${maxRetries} scheduled in ${Math.round(delay)}ms...`);
        
        setSyncState(prev => ({
          ...prev,
          status: 'retrying',
          retryAttempt: retryAttempt + 1,
          error: `Synchronization connection issue. Retrying in ${Math.round(delay / 1000)}s...`
        }));

        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          fetchPlatformData(retryAttempt + 1, maxRetries);
        }, delay);
        return;
      }

      // Max retries exceeded: Load fallback from cache
      logSyncInfo('PlatformDataSync', 'Retries exhausted. Falling back to cached local storage data.');
      try {
        const cached = localStorage.getItem('rafiki-predictions-cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.predictions)) setPredictions(parsed.predictions);
          if (Array.isArray(parsed.accumulators)) setAccumulators(parsed.accumulators);
          if (Array.isArray(parsed.articles)) setArticles(parsed.articles);
          if (Array.isArray(parsed.notifications)) setNotifications(parsed.notifications);
          if (parsed.stats) setStats(parsed.stats);
          logSyncInfo('PlatformDataSyncCacheFallback', `Loaded fallback cache from ${parsed.cachedAt || 'prior session'}.`);
        }
      } catch (cacheLoadErr) {
        logSyncError('CacheFallbackLoad', {}, cacheLoadErr);
      }

      setSyncState({
        status: 'error',
        lastSyncTime: null,
        error: err?.message || 'Failed to synchronize live registries. Showing cached data.',
        retryAttempt: maxRetries,
        stage: null
      });
    } finally {
      setDataLoading(false);
    }
  };

  // Re-synchronize and handle network connectivity restorations
  useEffect(() => {
    fetchPlatformData(0, 3);

    const handleOnline = async () => {
      setIsOffline(false);
      logSyncInfo('NetworkStatus', 'Network connection restored. Triggering Firestore reconnection and platform re-sync...');
      await reconnectFirestore();
      fetchPlatformData(0, 3);
    };

    const handleOffline = () => {
      setIsOffline(true);
      logSyncInfo('NetworkStatus', 'Network offline detected. Operating in cached local storage mode.');
      setSyncState(prev => ({
        ...prev,
        status: 'error',
        error: 'Network connection lost. Operating in offline cached mode.'
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user?.uid, userProfile?.paymentStatus, userProfile?.subscriptionStatus]);

  // Monitor streak milestones and trigger animations
  useEffect(() => {
    if (!stats) return;
    const currentBadge = getBadgeForStreak(stats.streak || '');
    if (lastBadgeLevel !== null && currentBadge.level > lastBadgeLevel) {
      // Trigger milestone celebration!
      setCelebratingBadge(currentBadge);
    }
    setLastBadgeLevel(currentBadge.level);
  }, [stats?.streak]);

  // 3. Real Authentication Handlers
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!authEmail.trim() || !authEmail.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    if (authMode === 'reset') {
      setAuthLoading(true);
      try {
        await sendPasswordResetEmail(auth, authEmail.trim());
        setAuthSuccess('Password reset link sent to your email! Please check your inbox.');
      } catch (err: any) {
        setAuthError(err?.message || 'Failed to send password reset email.');
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    if (!authPassword || authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setAuthLoading(true);
    try {
      if (authMode === 'signup') {
        const userCred = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        if (authDisplayName.trim()) {
          try {
            await updateProfile(userCred.user, { displayName: authDisplayName.trim() });
          } catch (_) {}
        }
        setShowAuthModal(false);
        setAuthPassword('');
      } else {
        await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        setShowAuthModal(false);
        setAuthPassword('');
      }
    } catch (err: any) {
      let msg = err?.message || 'Authentication failed. Please check credentials.';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        msg = 'Invalid email or password.';
      } else if (msg.includes('email-already-in-use')) {
        msg = 'An account with this email already exists. Please sign in instead.';
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOAuthSignIn = async (providerName: 'google' | 'apple' | 'microsoft') => {
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);
    try {
      if (providerName === 'google') {
        await signInWithGoogle();
      } else if (providerName === 'apple') {
        await signInWithApple();
      } else {
        await signInWithMicrosoft();
      }
      setShowAuthModal(false);
    } catch (err: any) {
      console.warn(`${providerName} sign in notice:`, err);
      let msg = err?.message || `Failed to sign in with ${providerName}.`;
      if (err?.code === 'auth/popup-closed-by-user') {
        msg = 'Sign in popup was closed. Please try again.';
      } else if (err?.code === 'auth/cancelled-popup-request') {
        msg = 'Sign in request cancelled.';
      } else if (err?.code === 'auth/popup-blocked') {
        msg = 'Sign-in popup was blocked by browser. Please allow popups for this site.';
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (_) {}
    setUser(null);
    setUserProfile(null);
    localStorage.removeItem('rafiki_user_session');
    setShowAuthModal(false);
    setActiveTab('predictions');
  };

  // 4. Update local userProfile after subscription billing completes
  const handlePaymentSuccess = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
  };

  const handleSimulateWin = () => {
    if (!stats) return;
    const match = (stats.streak || '').match(/(\d+)\s*(\w+)/);
    let count = match ? parseInt(match[1]) : 0;
    const type = match ? match[2].toLowerCase() : 'wins';
    
    if (type.includes('loss') || type.includes('lose') || count === 0) {
      count = 1;
    } else {
      count += 1;
    }
    const newStreak = `${count} ${count === 1 ? 'Win' : 'Wins'}`;
    const updatedStats = { ...stats, streak: newStreak };
    setStats(updatedStats);
    
    // Also save to cache so it persists!
    try {
      const cached = localStorage.getItem('rafiki-predictions-cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.stats = updatedStats;
        localStorage.setItem('rafiki-predictions-cache', JSON.stringify(parsed));
      }
    } catch (_) {}
  };

  const handleSimulateLoss = () => {
    if (!stats) return;
    const match = (stats.streak || '').match(/(\d+)\s*(\w+)/);
    let count = match ? parseInt(match[1]) : 0;
    const type = match ? match[2].toLowerCase() : 'losses';
    
    if (type.includes('win') || count === 0) {
      count = 1;
    } else {
      count += 1;
    }
    const newStreak = `${count} ${count === 1 ? 'Loss' : 'Losses'}`;
    const updatedStats = { ...stats, streak: newStreak };
    setStats(updatedStats);
    
    try {
      const cached = localStorage.getItem('rafiki-predictions-cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.stats = updatedStats;
        localStorage.setItem('rafiki-predictions-cache', JSON.stringify(parsed));
      }
    } catch (_) {}
  };

  const currentBadge = getBadgeForStreak(stats?.streak || '5 Wins');

  // Find current win streak count
  const streakMatch = (stats?.streak || '').match(/(\d+)\s*(\w+)/);
  const winCount = (streakMatch && !streakMatch[2].toLowerCase().includes('loss') && !streakMatch[2].toLowerCase().includes('lose')) ? parseInt(streakMatch[1]) : 0;
  
  // Find the next badge
  const nextBadge = ALL_BADGES.slice().reverse().find(b => b.minStreak > winCount) || null;
  
  const prevMin = currentBadge.minStreak;
  const nextMin = nextBadge ? nextBadge.minStreak : 12;
  const progressPercent = Math.min(100, Math.max(0, ((winCount - prevMin) / (nextMin - prevMin)) * 100));

  return (
    <div className={`min-h-screen ${theme === 'high-contrast' ? 'theme-high-contrast bg-slate-50 text-slate-900' : 'bg-black text-gray-100'} flex flex-col justify-between selection:bg-emerald-500 selection:text-black antialiased font-sans`}>
      
      {/* HEADER SECTION - TWO COMPACT ROWS TO FIT IN FIRST SCREEN */}
      <header className="bg-zinc-950/95 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-40" id="app-header">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
          
          {/* ROW 1: BRANDING & TWO-ROW TOP ACTION ICONS / AUTH */}
          <div className="flex justify-between items-center py-2.5 sm:py-3 gap-3">
            
            {/* Branding Logo & Quick Win-Rate Pill */}
            <div className="flex items-center gap-3 shrink-0">
              <div 
                className="flex items-center gap-2.5 cursor-pointer group" 
                onClick={() => setActiveTab('predictions')}
                title="Rafiki Predict - Smart Picks • Big Wins"
              >
                <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full ring-2 ring-emerald-500/40 shadow-[0_0_18px_-2px_rgba(16,185,129,0.5)] overflow-hidden group-hover:scale-105 transition-all bg-zinc-950 flex items-center justify-center shrink-0">
                  <img 
                    src="/src/assets/images/rafiki_app_logo_1787728334689.jpg" 
                    alt="Rafiki Predict Logo"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm sm:text-base font-sans font-black tracking-tight text-white block">
                      Rafiki Predict
                    </span>
                    <span className="text-emerald-400 text-xs hidden sm:inline">⭐⭐⭐⭐⭐</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-emerald-400 font-mono tracking-widest uppercase block -mt-0.5 font-bold">
                    Smart Picks • Big Wins
                  </span>
                </div>
              </div>

              {/* Quick Record/Win-rate pill in Row 1 */}
              {stats && (
                <div 
                  className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-zinc-900/80 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all cursor-default ml-2"
                  title={`${language === 'en' ? 'Win/Loss Ratio' : 'Uwiano wa Ushindi/Kushindwa'}: ${stats.totalWon}W - ${stats.totalLost}L`}
                >
                  <div className="w-6 h-6 relative flex items-center justify-center">
                    <PieChart width={24} height={24}>
                      <Pie
                        data={[
                          { name: 'Won', value: stats.totalWon || 1 },
                          { name: 'Lost', value: stats.totalLost || 0 }
                        ]}
                        cx={12}
                        cy={12}
                        innerRadius={6}
                        outerRadius={11}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        <Cell key="cell-0" fill="#10b981" />
                        <Cell key="cell-1" fill="#ef4444" />
                      </Pie>
                    </PieChart>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] text-gray-400 font-mono uppercase tracking-wider leading-none">
                      {Math.round(((stats.totalWon || 0) / ((stats.totalWon || 0) + (stats.totalLost || 0) || 1)) * 100)}% Win Rate
                    </span>
                    <span className="text-[10px] font-mono font-bold text-white leading-tight mt-0.5">
                      {stats.totalWon}W - {stats.totalLost}L
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* TOP ICONS CLUSTER - STRUCTURED IN TWO DISTINCT COMPACT ROWS */}
            <div className="flex flex-col items-end justify-center gap-1.5 shrink-0" id="header-two-rows-icons-container">
              
              {/* TOP ROW A: Social Channels, Community Hub, Account Auth / Profile & Mobile Trigger */}
              <div className="flex items-center gap-1.5 sm:gap-2" id="header-top-row-a">
                
                {/* Twitter / X */}
                <a
                  id="header-twitter-link"
                  href="https://x.com/Blaisejondez"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 sm:p-2 bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white rounded-xl border border-zinc-800 hover:border-emerald-500/50 transition-all flex items-center justify-center cursor-pointer shadow-sm"
                  title="Official Twitter / X (@Blaisejondez)"
                >
                  <Twitter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1DA1F2]" />
                </a>

                {/* Instagram */}
                <a
                  id="header-instagram-link"
                  href="https://www.instagram.com/rafikisportspredict?igsi=MXJzMXFtb2U2M2hhZg=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 sm:p-2 bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white rounded-xl border border-zinc-800 hover:border-pink-500/50 transition-all flex items-center justify-center cursor-pointer shadow-sm"
                  title="Official Instagram (@rafikisportspredict)"
                >
                  <Instagram className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E4405F]" />
                </a>

                {/* Community Hub Modal Trigger */}
                <button
                  id="header-community-hub-btn"
                  onClick={() => setCommunityModalOpen(true)}
                  className="px-2 py-1.5 sm:px-2.5 sm:py-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white rounded-xl border border-zinc-800 hover:border-emerald-500/50 transition-all flex items-center justify-center gap-1.5 group cursor-pointer shadow-sm text-xs"
                  title={language === 'en' ? 'Official Social & Community Hub' : 'Kituo Rasmi cha Jamii na Mitandao'}
                >
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-semibold text-gray-200 hidden sm:inline">Community</span>
                </button>

                {/* Login / Register Buttons OR Profile Pill */}
                {!user ? (
                  <div className="flex items-center gap-1 sm:gap-1.5 ml-1" id="header-settings-auth-buttons">
                    <button
                      id="header-login-btn"
                      onClick={() => {
                        setAuthMode('signin');
                        setShowAuthModal(true);
                      }}
                      className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-zinc-900 hover:bg-zinc-800 text-gray-200 hover:text-white border border-zinc-700/80 hover:border-emerald-500/50 rounded-xl text-[11px] sm:text-xs font-semibold cursor-pointer transition-all shrink-0 shadow-sm"
                      title="Log In to your Account"
                    >
                      <LogIn className="w-3 h-3 text-emerald-400" />
                      <span>Log In</span>
                    </button>

                    <button
                      id="header-register-btn"
                      onClick={() => {
                        setAuthMode('signup');
                        setShowAuthModal(true);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-bold rounded-xl text-[11px] sm:text-xs cursor-pointer transition-all shadow-[0_0_12px_-2px_rgba(16,185,129,0.4)] shrink-0"
                      title="Register Free Account"
                    >
                      <UserPlus className="w-3 h-3 text-black" />
                      <span>Register</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 sm:gap-1.5 ml-1">
                    {/* User Profile Button */}
                    <button
                      id="header-profile-btn"
                      onClick={() => setShowAccountModal(true)}
                      className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 bg-zinc-900/90 hover:bg-zinc-800 rounded-xl border border-zinc-800 hover:border-emerald-500/40 text-right cursor-pointer transition-all"
                      title="Click to view Member Profile / Manage Account"
                    >
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-[10px] sm:text-xs">
                        {userProfile?.username?.charAt(0)?.toUpperCase() || user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-[11px] sm:text-xs font-semibold text-white truncate max-w-[80px] sm:max-w-[110px]">
                        {userProfile?.username || user.displayName || user.email?.split('@')[0] || 'Member'}
                      </span>
                      <span className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                        userProfile?.role === 'admin' ? 'bg-amber-500/20 text-amber-300 font-bold' : (userProfile?.subscriptionStatus === 'premium' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'bg-zinc-800 text-gray-400')
                      }`}>
                        {userProfile?.role === 'admin' ? 'Admin' : (userProfile?.subscriptionStatus === 'premium' ? 'VIP' : 'Free')}
                      </span>
                    </button>

                    {/* Streak Badge pill */}
                    <button 
                      onClick={() => setIsBadgesModalOpen(true)}
                      className={`hidden sm:flex text-[9px] font-mono ${currentBadge.colorClass} font-bold items-center gap-1 px-2 py-1 rounded-xl border border-zinc-800 bg-zinc-900/80 cursor-pointer hover:scale-105 transition-all`}
                      title={`${t.badgesTitle}: ${language === 'en' ? currentBadge.name : currentBadge.nameSw}`}
                    >
                      <motion.div
                        animate={{ rotate: [0, 15, -15, 15, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                      >
                        {renderBadgeIcon(currentBadge.iconName, "w-3 h-3")}
                      </motion.div>
                      <span>{stats?.streak || '5W'}</span>
                    </button>

                    {/* Logout */}
                    <button 
                      onClick={handleLogout}
                      className="p-1.5 sm:p-2 bg-zinc-900 hover:bg-zinc-800 text-gray-400 hover:text-white rounded-xl border border-zinc-800 cursor-pointer transition-colors"
                      title="Sign Out"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 1-Day Pass indicator if guest */}
                {!user && guestPass && (
                  <div 
                    className="hidden sm:flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-[10px] font-mono font-bold"
                    title={`1-Day Pass active until ${new Date(guestPass.expiresAt).toLocaleTimeString()}`}
                  >
                    <span>🎫 1-Day Pass</span>
                  </div>
                )}

                {/* Mobile Menu Hamburger Button */}
                <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-1.5 sm:p-2 md:hidden bg-zinc-900 text-gray-300 rounded-xl border border-zinc-800 cursor-pointer"
                  title="Menu"
                >
                  {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </div>

              {/* TOP ROW B: AI Buddy, Notifications, Theme Mode, Settings, Share App */}
              <div className="flex items-center gap-1.5 sm:gap-2" id="header-top-row-b">
                
                {/* Betting Buddy AI Chat Trigger */}
                <button 
                  onClick={() => {
                    setBuddyOpen(!buddyOpen);
                    setNotifDrawerOpen(false);
                    setSettingsOpen(false);
                  }}
                  className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl border relative cursor-pointer transition-all flex items-center gap-1.5 text-xs font-semibold ${
                    buddyOpen 
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                      : 'bg-zinc-900/90 text-gray-300 hover:text-white border-zinc-800 hover:border-emerald-500/40'
                  }`}
                  title={t.bettingBuddy}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-emerald-300 font-bold hidden sm:inline">AI Buddy</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </button>

                {/* Notification bell trigger */}
                <button 
                  onClick={() => {
                    setNotifDrawerOpen(!notifDrawerOpen);
                    setSettingsOpen(false);
                    setBuddyOpen(false);
                  }}
                  className="p-1.5 sm:p-2 bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white rounded-xl border border-zinc-800 relative cursor-pointer transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  )}
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500"></span>
                  )}
                </button>

                {/* Quick Display Theme Mode toggle */}
                <button 
                  onClick={() => handleToggleTheme()}
                  className={`p-1.5 sm:p-2 hover:bg-zinc-800 rounded-xl border relative cursor-pointer transition-colors text-xs ${
                    theme === 'high-contrast'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold'
                      : 'bg-zinc-900/90 text-gray-300 hover:text-white border-zinc-800'
                  }`}
                  title={theme === 'high-contrast' ? 'Switch to Midnight Dark Theme' : 'Switch to High Contrast Light Theme'}
                >
                  {theme === 'high-contrast' ? '☀️' : '🌙'}
                </button>

                {/* Settings gear trigger */}
                <button 
                  onClick={() => {
                    setSettingsOpen(!settingsOpen);
                    setNotifDrawerOpen(false);
                    setBuddyOpen(false);
                  }}
                  className={`p-1.5 sm:p-2 hover:bg-zinc-800 rounded-xl border relative cursor-pointer transition-colors ${
                    settingsOpen 
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400' 
                      : 'bg-zinc-900/90 text-gray-300 hover:text-white border-zinc-800'
                  }`}
                  title="Settings & Preferences"
                >
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Share button trigger */}
                <button 
                  onClick={handleShareApp}
                  className={`p-1.5 sm:p-2 hover:bg-zinc-800 rounded-xl border relative cursor-pointer transition-all ${
                    shareSuccess
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400'
                      : 'bg-zinc-900/90 text-gray-300 hover:text-white border-zinc-800'
                  }`}
                  title={t.shareApp}
                >
                  <Share2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${shareSuccess ? 'animate-bounce text-emerald-400' : ''}`} />
                  {shareSuccess && (
                    <span className="absolute top-8 right-0 bg-emerald-500 text-black text-[10px] font-bold font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                      {language === 'en' ? 'Link Copied!' : 'Kiungo Kimenakiliwa!'}
                    </span>
                  )}
                </button>
              </div>

            </div>

          </div>

          {/* ROW 2: PRIMARY NAVIGATION TABS BAR - ALWAYS ACCESSIBLE & VISIBLE ON FIRST SCREEN */}
          <div className="border-t border-zinc-900/90 py-1.5 sm:py-2 overflow-x-auto no-scrollbar" id="header-row-2-navigation">
            <nav className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold min-w-max">
              <button 
                onClick={() => setActiveTab('predictions')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'predictions' ? 'bg-zinc-900 text-emerald-400 border border-emerald-500/40 shadow-sm' : 'text-gray-400 hover:text-white bg-zinc-950/60 border border-transparent hover:border-zinc-800'
                }`}
              >
                <span>⚽</span>
                <span>{t.todaysPicks}</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('archive')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'archive' ? 'bg-zinc-900 text-emerald-400 border border-emerald-500/40 shadow-sm' : 'text-gray-400 hover:text-white bg-zinc-950/60 border border-transparent hover:border-zinc-800'
                }`}
              >
                <span>📊</span>
                <span>{t.performanceLogs}</span>
              </button>

              <button 
                onClick={() => setActiveTab('articles')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'articles' ? 'bg-zinc-900 text-emerald-400 border border-emerald-500/40 shadow-sm' : 'text-gray-400 hover:text-white bg-zinc-950/60 border border-transparent hover:border-zinc-800'
                }`}
              >
                <span>📚</span>
                <span>{t.strategyGuides}</span>
              </button>

              <button 
                onClick={() => setActiveTab('quiz')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'quiz' ? 'bg-zinc-900 text-emerald-400 border border-emerald-500/40 font-bold shadow-sm' : 'text-gray-400 hover:text-white bg-zinc-950/60 border border-transparent hover:border-zinc-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.dailyQuiz}</span>
              </button>

              <button 
                onClick={() => setActiveTab('gmail')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'gmail' ? 'bg-zinc-900 text-emerald-400 border border-emerald-500/40 font-bold shadow-sm' : 'text-gray-400 hover:text-white bg-zinc-950/60 border border-transparent hover:border-zinc-800'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-red-400" />
                <span>{t.gmailInbox}</span>
              </button>

              <button 
                onClick={() => setActiveTab('responsible')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'responsible' ? 'bg-zinc-900 text-emerald-400 border border-emerald-500/40 shadow-sm' : 'text-gray-400 hover:text-white bg-zinc-950/60 border border-transparent hover:border-zinc-800'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.stakingGuard}</span>
              </button>

              <button 
                onClick={() => setActiveTab('subscription')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'subscription' 
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/50 shadow-sm' 
                    : 'text-emerald-400/90 hover:text-emerald-300 bg-emerald-950/20 border border-emerald-900/30'
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.unlockVipAcca}</span>
              </button>

              {userProfile?.role === 'admin' && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 border ${
                    activeTab === 'admin' 
                      ? 'bg-zinc-900 text-white border-zinc-700 shadow-sm' 
                      : 'text-purple-400 border-purple-950 bg-purple-950/20 hover:bg-purple-950/40'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t.adminCenter}</span>
                </button>
              )}
            </nav>
          </div>

        </div>
      </header>

      {/* MOBILE MENU NAVIGATION */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-950 border-b border-zinc-900 p-4 space-y-2 text-xs font-semibold">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-2 bg-zinc-900/50 rounded-xl border border-zinc-850">
            <div className="w-8 h-8 rounded-full ring-1 ring-emerald-500/40 overflow-hidden bg-zinc-950 shrink-0">
              <img 
                src="/src/assets/images/rafiki_app_logo_1787728334689.jpg" 
                alt="Rafiki Predict Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-sm font-bold text-white block">Rafiki Predict</span>
              <span className="text-[9px] font-mono text-emerald-400 uppercase font-semibold">Smart Picks • Big Wins</span>
            </div>
          </div>

          {[
            { id: 'predictions', label: t.todaysPicks },
            { id: 'archive', label: t.performanceLogs },
            { id: 'articles', label: t.strategyGuides },
            { id: 'quiz', label: `${t.dailyQuiz} ✨` },
            { id: 'gmail', label: `📧 ${t.gmailInbox}` },
            { id: 'responsible', label: t.stakingGuard },
            { id: 'subscription', label: t.unlockVipAcca, premium: true }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl block transition-all ${
                activeTab === item.id 
                  ? item.premium 
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30'
                    : 'bg-zinc-900 text-white' 
                  : item.premium
                  ? 'text-emerald-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}

          {userProfile?.role === 'admin' && (
            <button
              onClick={() => {
                setActiveTab('admin');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-3 rounded-xl bg-purple-950/20 text-purple-400 border border-purple-900 block"
            >
              Admin Center
            </button>
          )}

          {user ? (
            <div className="border-t border-zinc-900 pt-3 mt-3 px-4 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">User:</span>
                <span className="font-semibold text-white">{userProfile?.username || user.displayName || user.email || 'Member'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Status:</span>
                <span className={`font-mono uppercase text-[10px] tracking-wider ${
                  userProfile?.subscriptionStatus === 'premium' ? 'text-emerald-400 font-bold' : 'text-gray-500'
                }`}>
                  {userProfile?.subscriptionStatus === 'premium' ? t.premium : t.trialMode}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">{t.badgesTitle || 'Badge'}:</span>
                <button 
                  onClick={() => {
                    setIsBadgesModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-[10px] font-mono ${currentBadge.colorClass} font-bold flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer hover:scale-105 active:scale-95 transition-all`}
                  title={`${t.badgesTitle}: ${language === 'en' ? currentBadge.name : currentBadge.nameSw}`}
                >
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 15, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  >
                    {renderBadgeIcon(currentBadge.iconName, "w-3 h-3")}
                  </motion.div>
                  <span>{stats?.streak || (language === 'en' ? '5 Wins' : 'Ushindi 5')}</span>
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowAccountModal(true);
                  }}
                  className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'My Account' : 'Akaunti Yangu'}</span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="py-2 px-3 bg-zinc-900 text-red-400 border border-zinc-800 rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Sign Out' : 'Toka'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-zinc-900 pt-3 mt-3 px-4 flex flex-col gap-2">
              {guestPass && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-mono font-bold text-center">
                  🎫 1-Day Guest Pass Active
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="mobile-login-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthMode('signin');
                    setShowAuthModal(true);
                  }}
                  className="py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-zinc-750"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Log In</span>
                </button>
                <button
                  id="mobile-register-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthMode('signup');
                    setShowAuthModal(true);
                  }}
                  className="py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register Free</span>
                </button>
              </div>
            </div>
          )}

          {/* Mobile Menu Social Channels Row */}
          <div className="border-t border-zinc-900 pt-3 mt-3 px-2 flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400 font-medium">
              {language === 'en' ? 'Follow Us:' : 'Tufuate:'}
            </span>
            <div className="flex items-center gap-2">
              <a
                href="https://x.com/Blaisejondez"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-zinc-900 hover:bg-zinc-800 text-gray-300 hover:text-white rounded-xl border border-zinc-800 flex items-center justify-center gap-1.5 text-xs font-semibold"
                title="Twitter / X (@Blaisejondez)"
                id="mobile-nav-twitter-link"
              >
                <Twitter className="w-3.5 h-3.5 text-emerald-400" />
                <span>X / Twitter</span>
              </a>
              <a
                href="https://www.instagram.com/rafikisportspredict?igsi=MXJzMXFtb2U2M2hhZg=="
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-zinc-900 hover:bg-pink-950/40 text-gray-300 hover:text-pink-400 rounded-xl border border-zinc-800 flex items-center justify-center gap-1.5 text-xs font-semibold"
                title="Instagram (@rafikisportspredict)"
                id="mobile-nav-instagram-link"
              >
                <Instagram className="w-3.5 h-3.5 text-pink-400" />
                <span>Instagram</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM NOTIFICATION ALERTS DRAWER */}
      {notifDrawerOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-zinc-950 border-l border-zinc-800 shadow-2xl p-6 flex flex-col justify-between animate-slideLeft">
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
              <div className="flex items-center gap-2 text-white font-sans font-bold text-sm">
                <Bell className="w-4 h-4 text-emerald-400 animate-bounce" />
                Rafiki Notification Logs
              </div>
              <button 
                onClick={() => setNotifDrawerOpen(false)}
                className="text-gray-500 hover:text-white text-xs bg-zinc-900 p-1 rounded border border-zinc-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-xs font-mono">
                  No notifications recorded currently.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl space-y-1.5 hover:border-zinc-700 transition-colors">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-white">{notif.title}</span>
                      <span className="text-[8px] font-mono text-gray-500">
                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-zinc-900 pt-4 text-center text-[10px] text-gray-500 font-mono">
            Directly monitoring cloud webhooks
          </div>
        </div>
      )}

      {/* APP SETTINGS DRAWER */}
      {settingsOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-zinc-950 border-l border-zinc-800 shadow-2xl p-6 flex flex-col justify-between animate-slideLeft" id="settings-drawer">
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
              <div className="flex items-center gap-2 text-white font-sans font-bold text-sm">
                <Settings className="w-4 h-4 text-emerald-400" />
                {t.settingsTitle}
              </div>
              <button 
                onClick={() => setSettingsOpen(false)}
                className="text-gray-500 hover:text-white text-xs bg-zinc-900 p-1 rounded border border-zinc-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Language Settings Section */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold font-mono uppercase tracking-wider text-gray-500 block flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  {t.languageToggle}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setLanguage('en');
                      localStorage.setItem('rafiki-language', 'en');
                    }}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all py-2.5 flex items-center justify-center gap-1.5 ${
                      language === 'en'
                        ? theme === 'high-contrast'
                          ? 'bg-zinc-100 border-emerald-600 text-zinc-900 font-bold'
                          : 'bg-zinc-900 border-emerald-500 text-white font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>🇺🇸</span>
                    <span className="text-xs font-sans">{t.english}</span>
                  </button>

                  <button
                    onClick={() => {
                      setLanguage('sw');
                      localStorage.setItem('rafiki-language', 'sw');
                    }}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all py-2.5 flex items-center justify-center gap-1.5 ${
                      language === 'sw'
                        ? theme === 'high-contrast'
                          ? 'bg-zinc-100 border-emerald-600 text-zinc-900 font-bold'
                          : 'bg-zinc-900 border-emerald-500 text-white font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>🇹🇿</span>
                    <span className="text-xs font-sans">{t.swahili}</span>
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 leading-normal font-sans">
                  {t.languageToggleDesc}
                </p>
              </div>

              {/* Visual Theme Settings Section */}
              <div className="space-y-3 pt-2 border-t border-zinc-900">
                <label className="text-[10px] font-bold font-mono uppercase tracking-wider text-gray-500 block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  {t.visualInterfaceTheme}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleToggleTheme('midnight')}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all py-2.5 flex flex-col items-center gap-1 ${
                      theme === 'midnight'
                        ? 'bg-zinc-900 border-emerald-500 text-white font-bold shadow-lg'
                        : 'bg-zinc-950 border-zinc-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">🌙</span>
                    <span className="text-xs font-sans">{t.midnightDark}</span>
                  </button>

                  <button
                    onClick={() => handleToggleTheme('high-contrast')}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all py-2.5 flex flex-col items-center gap-1 ${
                      theme === 'high-contrast'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold shadow-lg'
                        : 'bg-zinc-950 border-zinc-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">☀️</span>
                    <span className="text-xs font-sans">{t.highContrast}</span>
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 leading-normal font-sans">
                  {theme === 'high-contrast' ? t.highContrastDesc : t.midnightDesc}
                </p>
              </div>

              {/* Display Layout Density Section */}
              <div className="space-y-3 pt-2 border-t border-zinc-900">
                <label className="text-[10px] font-bold font-mono uppercase tracking-wider text-gray-500 block flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  {t.displayDensityTitle}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleToggleDensity('comfortable')}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all py-2.5 flex flex-col items-center gap-1 ${
                      displayDensity === 'comfortable'
                        ? 'bg-zinc-900 border-emerald-500 text-emerald-400 font-bold shadow-lg'
                        : 'bg-zinc-950 border-zinc-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-mono font-bold">📐</span>
                    <span className="text-xs font-sans">{t.comfortableMode}</span>
                  </button>

                  <button
                    onClick={() => handleToggleDensity('compact')}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all py-2.5 flex flex-col items-center gap-1 ${
                      displayDensity === 'compact'
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 font-bold shadow-lg'
                        : 'bg-zinc-950 border-zinc-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-mono font-bold">⚡</span>
                    <span className="text-xs font-sans">{t.compactMode}</span>
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 leading-normal font-sans">
                  {t.displayDensityDesc}
                </p>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleRestoreDisplayDefaults}
                    className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-xs text-gray-400 hover:text-white rounded-xl transition-all font-mono flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>↺</span>
                    <span>{t.restoreDefaults || 'Restore Defaults'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-900 pt-4 text-center text-[10px] text-gray-500 font-mono">
            {t.versionLabel}
          </div>
        </div>
      )}

      {/* MAIN LAYOUT PLATFORM CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        
        {/* APP SHOWCASE HERO BANNER WITH RECTANGULAR ARTWORK & ROUND LOGO */}
        {activeTab === 'predictions' && (
          <AppBanner 
            onExploreClick={() => {
              const el = document.getElementById('predictions-header-area');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            onVipClick={() => setActiveTab('subscription')}
            language={language}
            theme={theme}
            isVip={userProfile?.subscriptionStatus === 'premium'}
          />
        )}

        {/* Quick User Subscription Status Indicator Ribbon */}
        {userProfile && (
          <div className="mb-6 bg-zinc-900/50 border border-zinc-850 p-3.5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-gray-300">
                {t.loggedInAs} <strong className="text-white">{userProfile.email}</strong>
              </span>
              <span className="text-gray-600 font-mono">|</span>
              <span className="text-gray-400">
                {t.accessTier}: <strong className="text-white capitalize">{userProfile.subscriptionStatus === 'premium' ? `${t.premium} (${userProfile.subscriptionPlan})` : t.trial}</strong>
              </span>
            </div>

            {userProfile.subscriptionStatus !== 'premium' ? (
              <button 
                onClick={() => setActiveTab('subscription')}
                className="text-emerald-400 font-semibold hover:text-emerald-300 flex items-center gap-1 cursor-pointer underline underline-offset-4"
              >
                {t.claimVipNow}
              </button>
            ) : (
              <div className="text-emerald-400 font-mono text-[11px]">
                {t.activeUntil} {new Date(userProfile.premiumExpiresAt || '').toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {/* Synchronization Status & Offline Banner */}
        {isOffline ? (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-2xl flex items-center justify-between text-xs text-amber-400">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>{t.offlineMode || "Offline Mode (Showing cached sports data)"}</span>
            </div>
            <button 
              onClick={() => fetchPlatformData(0, 3)}
              className="px-2.5 py-1 text-[10px] bg-amber-950/40 hover:bg-amber-950/60 border border-amber-900/30 rounded-lg cursor-pointer text-amber-300 font-mono transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : syncState.status === 'retrying' ? (
          <div className="mb-6 bg-blue-500/10 border border-blue-500/20 px-4 py-3 rounded-2xl flex items-center justify-between text-xs text-blue-400">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
              <span>Reconnecting to registry... (Attempt {syncState.retryAttempt}/3)</span>
            </div>
            <span className="text-[10px] font-mono text-blue-300/80">Retrying automatically</span>
          </div>
        ) : syncState.status === 'error' && syncState.error ? (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-2xl flex items-center justify-between text-xs text-red-400">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              <span className="truncate max-w-md">{syncState.error}</span>
            </div>
            <button 
              onClick={() => fetchPlatformData(0, 3)}
              className="px-2.5 py-1 text-[10px] bg-red-950/40 hover:bg-red-950/60 border border-red-900/30 rounded-lg cursor-pointer text-red-300 font-mono transition-colors shrink-0"
            >
              Retry Sync
            </button>
          </div>
        ) : null}

        {/* Global Loading Spinner */}
        {dataLoading ? (
          <div className="py-20 text-center space-y-3 font-mono text-xs text-gray-400">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto"></div>
            <span>Synchronizing secure sport registries...</span>
          </div>
        ) : (
          <div className="animate-fadeIn">
            {activeTab === 'predictions' && (
              <PredictionsTab 
                predictions={predictions} 
                accumulators={accumulators} 
                userProfile={userProfile} 
                guestPass={guestPass}
                onNavigateToBilling={() => setActiveTab('subscription')} 
                onRefreshData={fetchPlatformData}
                language={language}
                savedPredictions={savedPredictions}
                theme={theme}
                displayDensity={displayDensity}
                onToggleTheme={handleToggleTheme}
                onToggleDensity={handleToggleDensity}
                onRestoreDefaults={handleRestoreDisplayDefaults}
              />
            )}

            {activeTab === 'subscription' && (
              <SubscriptionTab 
                user={user} 
                userProfile={userProfile} 
                onPaymentSuccess={handlePaymentSuccess} 
                onGuestPassActivated={handleGuestPassActivated}
                onRequestLogin={() => {
                  setAuthMode('signin');
                  setShowAuthModal(true);
                }}
                onRequestRegister={() => {
                  setAuthMode('signup');
                  setShowAuthModal(true);
                }}
              />
            )}

            {activeTab === 'archive' && (
              <ArchiveTab 
                historicalPredictions={predictions.filter(p => p.id.startsWith('p-hist-'))} 
                stats={stats} 
                language={language}
                savedPredictions={savedPredictions}
              />
            )}

            {activeTab === 'articles' && (
              <ArticlesTab articles={articles} />
            )}

            {activeTab === 'responsible' && (
              <ResponsibleGambling />
            )}

            {activeTab === 'quiz' && (
              <DailyQuiz 
                predictions={predictions} 
                userProfile={userProfile} 
              />
            )}

            {activeTab === 'gmail' && (
              <GmailTab 
                userProfile={userProfile}
                language={language}
                theme={theme}
                displayDensity={displayDensity}
              />
            )}

            {userProfile?.role === 'admin' && activeTab === 'admin' && (
              <AdminDashboard 
                predictions={predictions} 
                articles={articles} 
                notifications={notifications} 
                stats={stats} 
                onRefreshData={fetchPlatformData} 
              />
            )}
          </div>
        )}
      </main>

      {/* FOOTER & CONTACT CHANNELS */}
      <footer className={`border-t mt-12 py-12 transition-all duration-300 ${theme === 'high-contrast' ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-zinc-950 border-zinc-900 text-gray-400'}`} id="app-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Responsive Grid */}
          <div className={`grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b ${theme === 'high-contrast' ? 'border-slate-200' : 'border-zinc-900/60'} transition-colors duration-300`}>
            
            {/* Brand Column */}
            <div className="md:col-span-3 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full ring-2 ring-emerald-500/40 overflow-hidden bg-zinc-950 shrink-0 shadow-lg shadow-emerald-500/20">
                    <img 
                      src="/src/assets/images/rafiki_app_logo_1787728334689.jpg" 
                      alt="Rafiki Predict Logo"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className={`text-sm font-black tracking-tight block ${theme === 'high-contrast' ? 'text-slate-950' : 'text-white'}`}>
                      Rafiki Predict
                    </span>
                    <span className="flex text-amber-400 text-[10px] gap-0.5">
                      <Star className="w-3 h-3 fill-current" />
                      <Star className="w-3 h-3 fill-current" />
                      <Star className="w-3 h-3 fill-current" />
                      <Star className="w-3 h-3 fill-current" />
                      <Star className="w-3 h-3 fill-current" />
                    </span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed max-w-sm text-gray-500">
                  {t.footerDesc}
                </p>
              </div>
              
              {/* Compliance & Security */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-bold tracking-wider ${theme === 'high-contrast' ? 'bg-slate-200 text-slate-700' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
                  BeGambleAware 18+
                </span>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-bold tracking-wider ${theme === 'high-contrast' ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/20'}`}>
                  SSL SECURE
                </span>
              </div>
            </div>

            {/* Social & Community Column */}
            <div className="md:col-span-3 space-y-3">
              <div className="space-y-0.5">
                <h5 className={`text-xs font-mono font-bold uppercase tracking-wider ${theme === 'high-contrast' ? 'text-slate-950' : 'text-white'}`}>
                  {language === 'en' ? 'Official Community & Socials' : 'Jumuiya Rasmi na Mitandao'}
                </h5>
                <p className="text-[10px] font-mono text-gray-500">
                  {language === 'en' ? 'Join our winning network' : 'Jiunge na mtandao wetu wa washindi'}
                </p>
              </div>

              <div className="flex flex-col gap-2 text-xs">
                {/* WhatsApp Community Group */}
                <a 
                  href="https://chat.whatsapp.com/IWwD0roFnr70ulTORf8vBQ?s=cl&p=a&mlu=4" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`flex items-center gap-2.5 p-2 rounded-xl transition-all border group ${theme === 'high-contrast' ? 'bg-white hover:bg-emerald-50 border-slate-200 text-slate-700 hover:text-emerald-600' : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-900 text-gray-400 hover:text-emerald-400'}`}
                  id="footer-whatsapp-community"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="truncate text-left flex-1">
                    <div className="flex items-center justify-between">
                      <span className="block text-[9px] font-mono text-gray-500 leading-none mb-0.5">WhatsApp Community</span>
                      <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">JOIN</span>
                    </div>
                    <span className="font-semibold text-[11px] truncate block">Rafiki Predict Group</span>
                  </div>
                </a>

                {/* Telegram VIP Channel / Group */}
                <a 
                  href="https://t.me/+QXMSJqVZWMo1NTU0" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`flex items-center gap-2.5 p-2 rounded-xl transition-all border group ${theme === 'high-contrast' ? 'bg-white hover:bg-sky-50 border-slate-200 text-slate-700 hover:text-sky-600' : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-900 text-gray-400 hover:text-sky-400'}`}
                  id="footer-telegram-channel"
                >
                  <Send className="w-4 h-4 text-sky-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="truncate text-left flex-1">
                    <div className="flex items-center justify-between">
                      <span className="block text-[9px] font-mono text-gray-500 leading-none mb-0.5">Telegram</span>
                      <span className="text-[8px] bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded font-mono font-bold">VIP</span>
                    </div>
                    <span className="font-semibold text-[11px] truncate block">Rafiki Predict Channel</span>
                  </div>
                </a>

                {/* Facebook Page */}
                <a 
                  href="https://www.facebook.com/profile.php?id=61593522495692" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`flex items-center gap-2.5 p-2 rounded-xl transition-all border group ${theme === 'high-contrast' ? 'bg-white hover:bg-blue-50 border-slate-200 text-slate-700 hover:text-blue-600' : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-900 text-gray-400 hover:text-blue-400'}`}
                  id="footer-facebook-page"
                >
                  <Facebook className="w-4 h-4 text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="truncate text-left flex-1">
                    <div className="flex items-center justify-between">
                      <span className="block text-[9px] font-mono text-gray-500 leading-none mb-0.5">Facebook</span>
                      <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-mono font-bold">OFFICIAL</span>
                    </div>
                    <span className="font-semibold text-[11px] truncate block">Rafiki Predict</span>
                  </div>
                </a>

                {/* Twitter / X */}
                <a 
                  href="https://x.com/Blaisejondez" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`flex items-center gap-2.5 p-2 rounded-xl transition-all border group ${theme === 'high-contrast' ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-white' : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-900 text-gray-400 hover:text-white'}`}
                  id="footer-twitter-x"
                >
                  <Twitter className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="truncate text-left flex-1">
                    <div className="flex items-center justify-between">
                      <span className="block text-[9px] font-mono text-gray-500 leading-none mb-0.5">Twitter / X</span>
                      <span className="text-[8px] bg-zinc-800 text-gray-300 px-1.5 py-0.5 rounded font-mono font-bold">FOLLOW</span>
                    </div>
                    <span className="font-semibold text-[11px] truncate block">@Blaisejondez</span>
                  </div>
                </a>

                {/* Instagram */}
                <a 
                  href="https://www.instagram.com/rafikisportspredict?igsi=MXJzMXFtb2U2M2hhZg==" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`flex items-center gap-2.5 p-2 rounded-xl transition-all border group ${theme === 'high-contrast' ? 'bg-white hover:bg-pink-50 border-slate-200 text-slate-700 hover:text-pink-600' : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-900 text-gray-400 hover:text-pink-400'}`}
                  id="footer-instagram-page"
                >
                  <Instagram className="w-4 h-4 text-pink-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="truncate text-left flex-1">
                    <div className="flex items-center justify-between">
                      <span className="block text-[9px] font-mono text-gray-500 leading-none mb-0.5">Instagram</span>
                      <span className="text-[8px] bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded font-mono font-bold">FOLLOW</span>
                    </div>
                    <span className="font-semibold text-[11px] truncate block">@rafikisportspredict</span>
                  </div>
                </a>

                {/* Official Website */}
                <a 
                  href="https://rafiki-business-vercel-com.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`flex items-center gap-2.5 p-2 rounded-xl transition-all border group ${theme === 'high-contrast' ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-emerald-600' : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-900 text-gray-400 hover:text-emerald-400'}`}
                  id="footer-website"
                >
                  <Globe className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="truncate text-left flex-1">
                    <span className="block text-[9px] font-mono text-gray-500 leading-none mb-0.5">Website</span>
                    <span className="font-semibold text-[11px] truncate block">rafiki-business-vercel-com.vercel.app</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Support Channels Column */}
            <div className="md:col-span-3 space-y-3">
              <div className="space-y-0.5">
                <h5 className={`text-xs font-mono font-bold uppercase tracking-wider ${theme === 'high-contrast' ? 'text-slate-950' : 'text-white'}`}>
                  {t.supportHeading}
                </h5>
                <p className="text-[10px] font-mono text-gray-500">
                  {t.contactHours}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2 text-xs">
                <a href="mailto:rafikibc1000@gmail.com" className={`flex items-center gap-2.5 p-2 rounded-xl transition-all border ${theme === 'high-contrast' ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-emerald-600' : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-900 text-gray-400 hover:text-emerald-400'}`}>
                  <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="truncate">
                    <span className="block text-[9px] font-mono text-gray-500 leading-none mb-0.5">{t.emailSupport}</span>
                    <span className="font-mono text-[11px] truncate">rafikibc1000@gmail.com</span>
                  </div>
                </a>

                <a href="https://wa.me/254716483642" target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2.5 p-2 rounded-xl transition-all border ${theme === 'high-contrast' ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-emerald-600' : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-900 text-gray-400 hover:text-emerald-400'}`}>
                  <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="truncate">
                    <span className="block text-[9px] font-mono text-gray-500 leading-none mb-0.5">{t.whatsAppChat}</span>
                    <span className="font-mono text-[11px] truncate">0716483642 (+254716483642)</span>
                  </div>
                </a>

                <a href="tel:+254716483642" className={`flex items-center gap-2.5 p-2 rounded-xl transition-all border ${theme === 'high-contrast' ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-emerald-600' : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-900 text-gray-400 hover:text-emerald-400'}`}>
                  <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="truncate">
                    <span className="block text-[9px] font-mono text-gray-500 leading-none mb-0.5">{t.callAgent}</span>
                    <span className="font-mono text-[11px] truncate">0716483642 (+254716483642)</span>
                  </div>
                </a>

                <a href="sms:+254716483642" className={`flex items-center gap-2.5 p-2 rounded-xl transition-all border ${theme === 'high-contrast' ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-emerald-600' : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-900 text-gray-400 hover:text-emerald-400'}`}>
                  <MessageSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="truncate">
                    <span className="block text-[9px] font-mono text-gray-500 leading-none mb-0.5">{t.smsSupport}</span>
                    <span className="font-mono text-[11px] truncate">0716483642</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Policies Column */}
            <div className="md:col-span-3 space-y-3">
              <h5 className={`text-xs font-mono font-bold uppercase tracking-wider ${theme === 'high-contrast' ? 'text-slate-950' : 'text-white'}`}>
                {t.legalHeading}
              </h5>

              <div className="flex flex-col gap-2 text-xs font-mono">
                <button 
                  onClick={() => {
                    setActiveTab('responsible');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} 
                  className={`flex items-center gap-2 py-1 hover:underline text-left cursor-pointer transition-colors ${theme === 'high-contrast' ? 'text-slate-600 hover:text-emerald-600' : 'text-gray-400 hover:text-emerald-400'}`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{t.responsibleGaming}</span>
                </button>

                <button 
                  onClick={() => setShowLegalModal('terms')} 
                  className={`flex items-center gap-2 py-1 hover:underline text-left cursor-pointer transition-colors ${theme === 'high-contrast' ? 'text-slate-600 hover:text-emerald-600' : 'text-gray-400 hover:text-emerald-400'}`}
                >
                  <Scale className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{language === 'en' ? 'Terms of Service' : 'Vigezo na Masharti'}</span>
                </button>

                <button 
                  onClick={() => setShowLegalModal('privacy')} 
                  className={`flex items-center gap-2 py-1 hover:underline text-left cursor-pointer transition-colors ${theme === 'high-contrast' ? 'text-slate-600 hover:text-emerald-600' : 'text-gray-400 hover:text-emerald-400'}`}
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{language === 'en' ? 'Privacy Policy' : 'Sera ya Faragha'}</span>
                </button>

                <button 
                  onClick={() => setShowLegalModal('cookies')} 
                  className={`flex items-center gap-2 py-1 hover:underline text-left cursor-pointer transition-colors ${theme === 'high-contrast' ? 'text-slate-600 hover:text-emerald-600' : 'text-gray-400 hover:text-emerald-400'}`}
                >
                  <Cookie className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{t.cookieSettings}</span>
                </button>
              </div>
            </div>
          </div>

          {/* FAQ Accordion Section */}
          <div className={`mt-8 pt-8 border-t ${theme === 'high-contrast' ? 'border-slate-200' : 'border-zinc-900/60'} space-y-6`} id="footer-faq-section">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <h4 className={`text-xs font-mono font-bold uppercase tracking-wider ${theme === 'high-contrast' ? 'text-slate-950' : 'text-white'}`}>
                {language === 'en' ? 'Frequently Asked Questions' : 'Maswali yanayoulizwa mara kwa mara'}
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: 'upgrade',
                  question: language === 'en' ? 'How do I upgrade to Premium?' : 'Ninalipia vipi kujiunga na VIP Premium?',
                  answer: language === 'en' 
                    ? 'Upgrading to Premium is quick and secure! Navigate to the "Subscription" tab, select your preferred plan (Daily, Weekly, or Monthly), and click "Unlock Premium Now". You can complete the checkout using our secure payment gateway mockup with any test credit card details.'
                    : 'Kujiunga na Premium ni haraka na salama! Nenda kwenye tabo ya "Subscription" (Usajili), chagua mpango unaopendelea (Kila Siku, Wiki, au Mwezi), na ubofye "Unlock Premium Now". Unaweza kukamilisha malipo kwa kutumia lango letu la malipo salama la majaribio kwa kutumia nambari yoyote ya kadi ya majaribio.'
                },
                {
                  id: 'accuracy',
                  question: language === 'en' ? 'Is the AI accuracy guaranteed?' : 'Je, usahihi wa AI umehifadhiwa kikamilifu?',
                  answer: language === 'en'
                    ? 'While our multi-criteria AI consensus modeling engine operates at a high verified historical success rate (typically exceeding 80%+ on low-risk picks), sports outcomes are inherently unpredictable. No prediction is 100% guaranteed. We highly advise following our Responsible Gambling guidelines and bankroll management strategies.'
                    : 'Ingawa mfumo wetu wa makubaliano wa AI hufanya kazi kwa kiwango cha juu cha mafanikio ya kihistoria kilichothibitishwa (kawaida kinazidi 80%+ kwenye chaguo za hatari ndogo), matokeo ya michezo hayajatulia kwa asili. Hakuna utabiri unaohakikishwa 100%. Tunashauri sana kufuata miongozo yetu ya Kamari ya Kiwajibikaji na mikakati ya usimamizi wa mtaji.'
                },
                {
                  id: 'cancel',
                  question: language === 'en' ? 'How do I cancel my subscription?' : 'Je, ninafuta vipi usajili wangu?',
                  answer: language === 'en'
                    ? 'You are in full control of your subscriptions. Since we support offline-first local states and simulated secure profiles, you can cancel, pause, or reset your current premium tier directly at any time by visiting the "Subscription" tab and clicking "Cancel Active Plan" inside the billing management section, with no questions asked and zero penalties.'
                    : 'Una udhibiti kamili wa usajili wako. Kwa sababu tunasaidia hifadhi ya karibu ya kwanza (offline-first) na wasifu salama wa majaribio, unaweza kufuta, kusitisha, au kuweka upya mpango wako wa premium moja kwa moja wakati wowote kwa kutembelea tabo ya "Subscription" na kubofya "Cancel Active Plan" ndani ya sehemu ya usimamizi wa bili, bila maswali yoyote na bila adhabu.'
                }
              ].map((faq) => {
                const isExpanded = expandedFaq === faq.id;
                return (
                  <div 
                    key={faq.id} 
                    className={`rounded-2xl border transition-all duration-350 overflow-hidden ${
                      isExpanded 
                        ? 'bg-zinc-900/60 border-emerald-500/30 shadow-lg shadow-emerald-500/5' 
                        : 'bg-zinc-950/40 border-zinc-900/60 hover:bg-zinc-900/20 hover:border-zinc-850'
                    }`}
                  >
                    <button
                      onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                      className="w-full flex items-center justify-between p-4 text-left cursor-pointer transition-colors"
                    >
                      <span className="text-xs font-sans font-bold text-white pr-4">
                        {faq.question}
                      </span>
                      <ChevronDown 
                        className={`w-3.5 h-3.5 text-emerald-400 shrink-0 transition-transform duration-300 ${
                          isExpanded ? 'rotate-180 text-emerald-300' : ''
                        }`} 
                      />
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                        >
                          <div className="px-4 pb-4 border-t border-zinc-900/30 pt-3">
                            <p className="text-[11px] leading-relaxed text-gray-400">
                              {faq.answer}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Disclaimer & Copyright */}
          <div className="pt-6 space-y-4">
            <p className="text-[10px] leading-relaxed text-gray-500 text-justify">
              {t.disclaimerText}
            </p>

            <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-gray-500 font-mono border-t pt-4 ${theme === 'high-contrast' ? 'border-slate-200' : 'border-zinc-900/60'}`}>
              <span>© 2026 Rafiki Predict Inc. All rights reserved.</span>
              <div className="flex items-center gap-4">
                <span>{t.versionLabel || 'Version 2.4.0'}</span>
                <span>•</span>
                <span className="text-emerald-500 font-bold">100% SECURE</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* AUTHENTICATION MODAL (Phone OTP, Email, Social Google/Apple/MS) */}
      <AuthModal
        isOpen={showAuthModal}
        initialMode={authMode}
        initialMethod="phone"
        onClose={() => setShowAuthModal(false)}
        onSuccess={(authUser, profile) => {
          setUser(authUser);
          if (profile) {
            setUserProfile(profile);
          }
          setShowAuthModal(false);
        }}
        language={language}
      />

      {/* MEMBER PROFILE & ACCOUNT MANAGEMENT MODAL */}
      <AccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        user={user}
        userProfile={userProfile}
        onProfileUpdated={(updated) => setUserProfile(updated)}
        onSignOut={handleLogout}
        language={language}
      />

      {/* Floating Triggers Container */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {/* Floating Customer Support AI Trigger Button */}
        <button
          onClick={() => setSupportOpen(true)}
          className="relative group p-3.5 bg-blue-500 hover:bg-blue-400 text-black shadow-2xl rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer border border-blue-350"
          title={language === 'en' ? 'AI Customer Support' : 'Msaada wa AI'}
        >
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500 border border-black"></span>
          </span>
          <MessageSquare className="w-5 h-5 text-black fill-black/10" />
          
          {/* Tooltip */}
          <div className="absolute right-14 bg-zinc-950 border border-zinc-800 text-[11px] font-sans text-gray-200 px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-xl flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span className="font-semibold">{language === 'en' ? 'AI Customer Support' : 'Huduma kwa Wateja (AI)'}</span>
          </div>
        </button>

        {/* Floating Betting Buddy Trigger Button */}
        <button
          onClick={() => setBuddyOpen(true)}
          className="relative group p-3.5 bg-emerald-500 hover:bg-emerald-400 text-black shadow-2xl rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer border border-emerald-350"
          title={translations[language].bettingBuddy}
        >
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-black"></span>
          </span>
          <Sparkles className="w-5 h-5" />
          
          {/* Tooltip */}
          <div className="absolute right-14 bg-zinc-950 border border-zinc-800 text-[11px] font-sans text-gray-200 px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-xl flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-semibold">{translations[language].bettingBuddy}</span>
          </div>
        </button>
      </div>

      {/* Betting Buddy AI Drawer */}
      <BettingBuddy 
        isOpen={buddyOpen} 
        onClose={() => setBuddyOpen(false)} 
        language={language} 
        translations={translations[language]} 
      />

      {/* AI Customer Support Agent Drawer */}
      <CustomerSupportAgent
        isOpen={supportOpen}
        onClose={() => setSupportOpen(false)}
        language={language}
      />

      {/* BADGES SHOWCASE MODAL */}
      <AnimatePresence>
        {isBadgesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBadgesModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative z-10 p-6 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold font-sans text-white uppercase tracking-wider">
                      {t.badgesTitle}
                    </h4>
                    <p className="text-[10px] text-gray-500 font-mono">
                      {t.badgesDesc}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsBadgesModalOpen(false)}
                  className="text-gray-500 hover:text-white text-xs bg-zinc-950 px-2 py-1.5 rounded-lg border border-zinc-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="py-6 space-y-6 overflow-y-auto flex-grow pr-1">
                
                {/* Active Badge Card */}
                <div className={`p-5 rounded-2xl bg-gradient-to-br ${currentBadge.bgGradient} border border-zinc-850 flex flex-col items-center text-center relative overflow-hidden group`}>
                  {/* Decorative glowing background */}
                  <div className="absolute inset-0 opacity-15 filter blur-xl transition-all duration-500 group-hover:scale-110 pointer-events-none" style={{ backgroundColor: currentBadge.glowColor }} />
                  
                  <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-400 mb-2 font-bold px-2 py-0.5 bg-emerald-950/40 border border-emerald-900/30 rounded-full">
                    {t.activeBadge}
                  </span>

                  <motion.div 
                    animate={{ 
                      y: [0, -6, 0],
                      rotate: [0, 2, -2, 0]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 4, 
                      ease: "easeInOut" 
                    }}
                    className={`w-16 h-16 rounded-2xl bg-zinc-950 flex items-center justify-center border border-zinc-850 shadow-xl ${currentBadge.colorClass} mb-3`}
                  >
                    {renderBadgeIcon(currentBadge.iconName, "w-8 h-8")}
                  </motion.div>

                  <h5 className="text-base font-bold text-white font-sans">
                    {language === 'en' ? currentBadge.name : currentBadge.nameSw}
                  </h5>

                  <p className="text-xs text-gray-400 max-w-sm mt-1.5 leading-relaxed">
                    {language === 'en' ? currentBadge.description : currentBadge.descriptionSw}
                  </p>

                  <div className="mt-4 font-mono text-[10px] text-gray-400 bg-zinc-950/60 px-3 py-1.5 rounded-xl border border-zinc-900 flex items-center gap-1.5">
                    <Trophy className="w-3 h-3 text-amber-500" />
                    <span>Current Streak: <strong>{stats?.streak || '5 Wins'}</strong></span>
                  </div>
                </div>

                {/* Milestone Progress Bar */}
                {nextBadge && (
                  <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center text-[11px] font-mono">
                      <span className="text-gray-500">{t.nextMilestone}:</span>
                      <span className="text-emerald-400 font-bold">
                        {language === 'en' ? nextBadge.name : nextBadge.nameSw} ({nextBadge.minStreak} {language === 'en' ? 'Wins' : 'Ushindi'})
                      </span>
                    </div>

                    <div className="relative w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                      <span>{currentBadge.minStreak} wins</span>
                      <span>{nextBadge.minStreak - winCount} wins left</span>
                      <span>{nextBadge.minStreak} wins</span>
                    </div>
                  </div>
                )}

                {/* Showcase List */}
                <div className="space-y-3">
                  <h6 className="text-[11px] font-mono text-gray-500 uppercase tracking-wider pl-1">
                    All Medal Milestones
                  </h6>
                  
                  <div className="grid grid-cols-1 gap-2.5">
                    {ALL_BADGES.map((badge) => {
                      const isUnlocked = winCount >= badge.minStreak;
                      return (
                        <div 
                          key={badge.id} 
                          className={`p-3.5 rounded-xl border flex items-center gap-4 transition-all ${
                            isUnlocked 
                              ? 'bg-zinc-950/40 border-zinc-800' 
                              : 'bg-zinc-950/10 border-zinc-900/60 opacity-45'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center justify-center ${isUnlocked ? badge.colorClass : 'text-gray-600'}`}>
                            {renderBadgeIcon(badge.iconName, "w-5 h-5")}
                          </div>

                          <div className="flex-grow space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">
                                {language === 'en' ? badge.name : badge.nameSw}
                              </span>
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${isUnlocked ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' : 'bg-zinc-900 text-gray-500'}`}>
                                {badge.minStreak}+ Wins
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-tight">
                              {language === 'en' ? badge.description : badge.descriptionSw}
                            </p>
                          </div>

                          <div className="text-right">
                            {isUnlocked ? (
                              <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/20 px-2 py-1 border border-emerald-900/20 rounded-lg">
                                Unlocked
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-gray-500 bg-zinc-900 px-2 py-1 rounded-lg">
                                Locked
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Simulation Control Panel */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
                    <Settings className="w-3.5 h-3.5" />
                    <span>SYSTEM STREAK SIMULATION (ADMIN MODE)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={handleSimulateWin}
                      className="px-3 py-2 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 hover:text-emerald-300 font-mono text-[10px] font-bold rounded-xl transition-all cursor-pointer text-center"
                    >
                      {t.testStreakBtn}
                    </button>
                    <button 
                      onClick={handleSimulateLoss}
                      className="px-3 py-2 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 hover:text-red-300 font-mono text-[10px] font-bold rounded-xl transition-all cursor-pointer text-center"
                    >
                      {t.resetStreakBtn}
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MILESTONE CELEBRATORY OVERLAY */}
      <AnimatePresence>
        {celebratingBadge && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCelebratingBadge(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl" 
            />
            
            {/* Confetti Explosion particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(24)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    x: "50vw", 
                    y: "50vh", 
                    scale: 0.5,
                    opacity: 1,
                    rotate: 0 
                  }}
                  animate={{ 
                    x: `${50 + (Math.random() * 80 - 40)}vw`, 
                    y: `${50 + (Math.random() * 80 - 40)}vh`,
                    scale: Math.random() * 1.5 + 0.5,
                    opacity: [1, 1, 0],
                    rotate: Math.random() * 720
                  }}
                  transition={{ 
                    duration: Math.random() * 2 + 1.5, 
                    ease: "easeOut" 
                  }}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: i % 4 === 0 ? '#10b981' : i % 4 === 1 ? '#e11d48' : i % 4 === 2 ? '#f59e0b' : '#c084fc',
                    boxShadow: '0 0 10px rgba(255,255,255,0.4)'
                  }}
                />
              ))}
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
              className="bg-zinc-950 border border-zinc-850 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.15)] relative z-10 p-8 flex flex-col items-center text-center space-y-6"
            >
              {/* Star bursts in background */}
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full filter blur-3xl -z-10 animate-pulse pointer-events-none" />

              <div className="space-y-1">
                <div className="text-[11px] font-mono tracking-widest text-emerald-400 font-bold uppercase animate-bounce">
                  {t.milestoneAchieved}
                </div>
                <h3 className="text-xl font-black font-sans text-white tracking-tight">
                  {language === 'en' ? celebratingBadge.name : celebratingBadge.nameSw}
                </h3>
              </div>

              {/* Giant Medal badge spinning and bouncing */}
              <motion.div
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 360, scale: 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.2 }}
                className={`w-24 h-24 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl flex items-center justify-center relative ${celebratingBadge.colorClass}`}
                style={{
                  boxShadow: `0 0 40px ${celebratingBadge.glowColor}`
                }}
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -top-2 -right-2 text-yellow-400"
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
                
                {renderBadgeIcon(celebratingBadge.iconName, "w-12 h-12")}
              </motion.div>

              <div className="space-y-2 max-w-sm">
                <p className="text-xs text-gray-300 font-sans leading-relaxed">
                  {t.congratsMsg}
                </p>
                <p className="text-[11px] text-gray-500 font-mono italic">
                  "{language === 'en' ? celebratingBadge.description : celebratingBadge.descriptionSw}"
                </p>
              </div>

              <div className="pt-2 w-full">
                <button
                  onClick={() => setCelebratingBadge(null)}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-black py-3 rounded-2xl text-xs transition-all cursor-pointer transform active:scale-95 shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)]"
                >
                  {t.dismissBtn}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LEGAL POLICIES MODAL */}
      <AnimatePresence>
        {showLegalModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLegalModal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className={`border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative z-[120] p-6 max-h-[85vh] flex flex-col ${theme === 'high-contrast' ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-white'}`}
            >
              {/* Header */}
              <div className={`flex justify-between items-center border-b pb-4 ${theme === 'high-contrast' ? 'border-slate-100' : 'border-zinc-800'}`}>
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-emerald-500 animate-pulse" />
                  <div>
                    <h4 className="text-sm font-bold font-sans uppercase tracking-wider">
                      {showLegalModal === 'terms' 
                        ? (language === 'en' ? 'Terms of Service' : 'Vigezo na Masharti')
                        : showLegalModal === 'privacy'
                        ? (language === 'en' ? 'Privacy Policy' : 'Sera ya Faragha')
                        : (language === 'en' ? 'Cookie Preferences' : 'Mapendeleo ya Kuki')
                      }
                    </h4>
                    <p className="text-[10px] text-gray-500 font-mono">
                      {language === 'en' ? 'Last updated: July 2026' : 'Ilisasishwa mwisho: Julai 2026'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowLegalModal(null)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer font-bold ${theme === 'high-contrast' ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800' : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-gray-400 hover:text-white'}`}
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="py-4 space-y-4 overflow-y-auto flex-grow pr-1 text-xs leading-relaxed text-gray-400">
                {showLegalModal === 'terms' && (
                  <>
                    <div className="space-y-1.5">
                      <h6 className={`font-bold font-sans ${theme === 'high-contrast' ? 'text-slate-900' : 'text-white'}`}>
                        1. {language === 'en' ? 'Acceptance of Terms' : 'Kukubali Masharti'}
                      </h6>
                      <p>
                        {language === 'en' 
                          ? 'By accessing Rafiki Predict, you agree to comply with our general conditions. Our platform utilizes custom mathematical AI models to analyze past performance indicators and produce daily football, basketball, and tennis predictions.' 
                          : 'Kwa kupata Rafiki Predict, unakubali kufuata masharti yetu. Jukwaa letu linatumia mifumo maalum ya AI ya hisabati ili kuchambua viashiria vya utendaji wa nyuma na kutoa utabiri wa kila siku wa soka, mpira vya kikapu, na tenisi.'
                        }
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h6 className={`font-bold font-sans ${theme === 'high-contrast' ? 'text-slate-900' : 'text-white'}`}>
                        2. {language === 'en' ? 'Analytical Accuracy & No Guarantees' : 'Usahihi wa Kiutafiti na Hakuna Dhamana'}
                      </h6>
                      <p>
                        {language === 'en'
                          ? 'Sports forecasting involves inherent uncertainties. All probability scores and predictions are simulated calculations. We do not provide financial betting recommendations or guaranteed outcomes. Wager solely at your own discretion.'
                          : 'Utabiri wa michezo unahusisha mabadiliko yasiyotabirika. Alama zote za uwezekano na utabiri ni hesabu zilizojengwa kwa mfano. Hatutoi ushauri wa kifedha au matokeo ya uhakika. Weka dau kwa hiari yako mwenyewe.'
                        }
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h6 className={`font-bold font-sans ${theme === 'high-contrast' ? 'text-slate-900' : 'text-white'}`}>
                        3. {language === 'en' ? 'Age Restrictions (18+)' : 'Vizuizi vya Umri (18+)'}
                      </h6>
                      <p>
                        {language === 'en'
                          ? 'Our predictive service is exclusively designed for mature audiences. Users must be at least 18 years of age (or the legal age in their specific legal jurisdiction) to browse active forecast accumulators or subscribe to analytics feeds.'
                          : 'Huduma yetu ya utabiri imeundwa mahususi kwa watu wazima. Watumiaji lazima wawe na umri wa angalau miaka 18 (au umri wa kisheria katika mamlaka yao) ili kuvinjari majamvi ya utabiri au kujiandikisha.'
                        }
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h6 className={`font-bold font-sans ${theme === 'high-contrast' ? 'text-slate-900' : 'text-white'}`}>
                        4. {language === 'en' ? 'Intellectual Property' : 'Miliki ya Kimaono'}
                      </h6>
                      <p>
                        {language === 'en'
                          ? 'The proprietary machine learning algorithms, database configurations, and UI designs of Rafiki Predict are copyrighted and protected globally. Unauthorized reproduction or API scrapings are strictly prohibited.'
                          : 'Algoridmu za kipekee za kujifunza kwa mashine, usanidi wa hifadhidata, na miundo ya UI ya Rafiki Predict inalindwa kisheria kote duniani. Kuzalisha upya bila ruhusa au kukwapua API ni marufuku kabisa.'
                        }
                      </p>
                    </div>
                  </>
                )}

                {showLegalModal === 'privacy' && (
                  <>
                    <div className="space-y-1.5">
                      <h6 className={`font-bold font-sans ${theme === 'high-contrast' ? 'text-slate-900' : 'text-white'}`}>
                        1. {language === 'en' ? 'Data We Collect' : 'Data Tunazokusanya'}
                      </h6>
                      <p>
                        {language === 'en'
                          ? 'We strictly collect and process minimal data parameters required for platform operations. This includes your secure authentication email, registration date, custom performance streak statistics, and active visual themes.'
                          : 'Tunakusanya na kuchakata vigezo vidogo vya data vinavyohitajika kwa uendeshaji wa jukwaa. Hii ni pamoja na barua pepe ya uthibitishaji salama, tarehe ya usajili, takwimu za mfululizo wa ushindi, na mandhari unayopendelea.'
                        }
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h6 className={`font-bold font-sans ${theme === 'high-contrast' ? 'text-slate-900' : 'text-white'}`}>
                        2. {language === 'en' ? 'Database Synchronization' : 'Ulandanishaji wa Hifadhidata'}
                      </h6>
                      <p>
                        {language === 'en'
                          ? 'Our app leverages secure cloud synchronization powered by Google Firebase. User profiles, subscription statuses, and local preferences are encrypted during transit and stored securely inside authenticated Firestore records.'
                          : 'Programu yetu inatumia ulandanishaji salama wa wingu unaowezeshwa na Google Firebase. Wasifu wa mtumiaji, hali ya usajili, na mapendeleo ya ndani yanasimbwa wakati wa kusafirishwa na kuhifadhiwa salama kwenye Firestore.'
                        }
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h6 className={`font-bold font-sans ${theme === 'high-contrast' ? 'text-slate-900' : 'text-white'}`}>
                        3. {language === 'en' ? 'No Commercial Share' : 'Hakuna Kushiriki kwa Biashara'}
                      </h6>
                      <p>
                        {language === 'en'
                          ? 'Your private analytics, wager logs, and email handles are never shared with or sold to third-party commercial marketing platforms. All profile data is handled with maximum privacy standards.'
                          : 'Uchambuzi wako wa kibinafsi, kumbukumbu za dau, na barua pepe hazishirikiwi kamwe au kuuzwa kwa jukwaa lolote la uuzaji wa kibiashara la upande wa tatu. Data zote zinashughulikiwa kwa siri kuu.'
                        }
                      </p>
                    </div>
                  </>
                )}

                {showLegalModal === 'cookies' && (
                  <>
                    <div className="space-y-1.5">
                      <h6 className={`font-bold font-sans ${theme === 'high-contrast' ? 'text-slate-900' : 'text-white'}`}>
                        1. {language === 'en' ? 'Essential Local Storage Usage' : 'Matumizi Muhimu ya Hifadhi ya Ndani'}
                      </h6>
                      <p>
                        {language === 'en'
                          ? 'Rafiki Predict does not use invasive tracker cookies. We utilize standard client-side LocalStorage to preserve your user configurations, visual theme choice, and Swahili/English language selections.'
                          : 'Rafiki Predict haitumii kuki vamizi za ufuatiliaji. Tunatumia LocalStorage ya kawaida ya kivinjari ili kuhifadhi usanidi wako, chaguo la mandhari ya kuona, na uteuzi wa lugha ya Kiswahili/Kiingereza.'
                        }
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h6 className={`font-bold font-sans ${theme === 'high-contrast' ? 'text-slate-900' : 'text-white'}`}>
                        2. {language === 'en' ? 'Offline Data Cache' : 'Data za Akiba Nje ya Mtandao'}
                      </h6>
                      <p>
                        {language === 'en'
                          ? 'We cache active analytical forecast models locally. This allows you to review sports accumulators and stats securely even during poor cellular network coverage or complete offline status.'
                          : 'Tunahifadhi mifumo ya utabiri ya uchambuzi kwenye kifaa chako. Hii inakuruhusu kukagua majamvi na takwimu za michezo kwa usalama hata wakati wa mtandao dhaifu au ukiwa nje ya mtandao.'
                        }
                      </p>
                    </div>

                    <div className="space-y-3 pt-3">
                      <button
                        onClick={() => setShowLegalModal(null)}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-bold py-2 rounded-xl text-xs transition-all cursor-pointer text-center"
                      >
                        {language === 'en' ? 'Accept All Preferences' : 'Kubali Mapendeleo Yote'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className={`border-t pt-4 flex justify-end ${theme === 'high-contrast' ? 'border-slate-100' : 'border-zinc-800'}`}>
                <button
                  onClick={() => setShowLegalModal(null)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-black px-6 py-2.5 rounded-2xl text-xs transition-all cursor-pointer transform active:scale-95"
                >
                  {language === 'en' ? 'Close Dialog' : 'Funga Dirisha'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Community & Social Hub Modal */}
      <CommunityModal 
        isOpen={communityModalOpen} 
        onClose={() => setCommunityModalOpen(false)} 
        language={language} 
      />

      {/* Screen Scroll Controls: Bottom Horizontal Scrollbar & Far-End Vertical Scrollbar */}
      <ScreenScrollControls theme={theme} />

    </div>
  );
}
