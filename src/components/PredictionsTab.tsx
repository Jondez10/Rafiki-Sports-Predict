import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Prediction, Accumulator, UserProfile, SportMatch, SavedPrediction } from '../types';
import { translations } from '../translations';
import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell, 
  Tooltip, 
  XAxis, 
  YAxis,
  LineChart,
  Line
} from 'recharts';
import { 
  Trophy, 
  Flame, 
  Activity, 
  ShieldAlert, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Lock,
  Percent,
  TrendingUp,
  Info,
  Sparkles,
  Check,
  Calculator,
  Coins,
  Share2,
  Copy,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  X,
  Bookmark,
  Bell,
  Shield,
  Filter,
  Layers,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Volume2,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TiltCard from './TiltCard';
import { useAccessKeySession } from '../lib/accessKeySession';

const getOddsColorClass = (odds: number, defaultClass: string = "text-emerald-400") => {
  if (odds > 3.00) return "text-amber-400 font-extrabold";
  if (odds < 1.50) return "text-zinc-500 font-medium";
  return defaultClass;
};

const getHistoricalConfidenceData = (predId: string, currentConfidence: number) => {
  const seed = predId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const data = [];
  
  for (let i = 4; i >= 0; i--) {
    const matchNum = 5 - i;
    if (i === 0) {
      data.push({ 
        match: `M${matchNum}`, 
        matchNum, 
        confidence: currentConfidence 
      });
    } else {
      const fluctuation = ((seed + i * 13) % 15) - 8;
      const confidence = Math.min(100, Math.max(50, currentConfidence + fluctuation));
      data.push({ 
        match: `M${matchNum}`, 
        matchNum, 
        confidence 
      });
    }
  }
  return data;
};

const getHistoricalProbabilityData = (predId: string, currentProbability: number) => {
  const seed = predId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const data = [];
  
  for (let i = 4; i >= 0; i--) {
    const matchNum = 5 - i;
    if (i === 0) {
      data.push({ 
        match: `M${matchNum}`, 
        matchNum, 
        probability: currentProbability 
      });
    } else {
      const fluctuation = ((seed + i * 17) % 13) - 6;
      const probability = Math.min(95, Math.max(45, currentProbability + fluctuation));
      data.push({ 
        match: `M${matchNum}`, 
        matchNum, 
        probability 
      });
    }
  }
  return data;
};

const getRiskInfo = (odds: number, injuryImpact?: string, t?: any) => {
  const translations = t || { riskLevel: "Risk Level", low: "Low", medium: "Medium", high: "High" };
  
  // Risk determination logic:
  // - High Risk: Combined odds > 2.5 OR injury impact mentions significant player absences, injuries, or critical squad issues.
  // - Low Risk: Combined odds < 1.6 AND no major injury/missing players reported.
  // - Medium Risk: All other balanced cases.
  const hasInjuries = injuryImpact && 
    /injur|miss|absenc|out|majeruhi|umiza|pigo|pata jeraha/i.test(injuryImpact.toLowerCase());
    
  if (odds > 2.5 || hasInjuries) {
    return {
      label: translations.high || "High",
      colorClass: "bg-rose-500/10 border-rose-500/20 text-rose-400",
      dotClass: "bg-rose-500"
    };
  } else if (odds < 1.6 && !hasInjuries) {
    return {
      label: translations.low || "Low",
      colorClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      dotClass: "bg-emerald-500"
    };
  } else {
    return {
      label: translations.medium || "Medium",
      colorClass: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      dotClass: "bg-amber-500"
    };
  }
};

interface PredictionsTabProps {
  predictions: Prediction[];
  accumulators: Accumulator[];
  userProfile: UserProfile | null;
  guestPass?: any;
  onNavigateToBilling: () => void;
  onRefreshData?: () => void;
  language?: 'en' | 'sw';
  savedPredictions?: SavedPrediction[];
  theme?: 'midnight' | 'high-contrast';
  displayDensity?: 'comfortable' | 'compact';
  onToggleTheme?: (newTheme?: 'midnight' | 'high-contrast') => void;
  onToggleDensity?: (newDensity?: 'comfortable' | 'compact') => void;
  onRestoreDefaults?: () => void;
}

export default function PredictionsTab({ 
  predictions, 
  accumulators, 
  userProfile, 
  guestPass,
  onNavigateToBilling,
  onRefreshData,
  language = 'en',
  savedPredictions = [],
  theme = 'midnight',
  displayDensity = 'comfortable',
  onToggleTheme,
  onToggleDensity,
  onRestoreDefaults
}: PredictionsTabProps) {
  const t = translations[language];
  const [sportFilter, setSportFilter] = useLocalStorage<'all' | 'football' | 'basketball' | 'tennis'>('rafiki_sport_filter', 'all');
  const [sortBy, setSortBy] = useLocalStorage<'confidence' | 'odds-desc' | 'odds-asc' | 'date' | 'date-soonest' | 'date-latest' | 'league'>('rafiki_sort_by', 'confidence');
  const [dateSortOrder, setDateSortOrder] = useLocalStorage<'soonest' | 'latest'>('rafiki_date_sort_order', 'soonest');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>('rafiki_recent_fixture_searches', ['Arsenal', 'Real Madrid', 'Premier League', 'Champions League']);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);

  const handleAddRecentSearch = (query: string) => {
    if (!query || !query.trim()) return;
    const clean = query.trim();
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== clean.toLowerCase());
      return [clean, ...filtered].slice(0, 5);
    });
  };

  const handleRemoveRecentSearch = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches(prev => prev.filter(s => s !== item));
  };

  const handleClearRecentSearches = () => {
    setRecentSearches([]);
  };

  const handleToggleDateSort = () => {
    if (sortBy === 'date-soonest' || (sortBy === 'date' && dateSortOrder === 'soonest')) {
      setDateSortOrder('latest');
      setSortBy('date-latest' as any);
    } else if (sortBy === 'date-latest') {
      setDateSortOrder('soonest');
      setSortBy('date-soonest' as any);
    } else {
      setDateSortOrder('soonest');
      setSortBy('date-soonest' as any);
    }
  };

  // League & Team Subscriptions & Custom Toast Notifications
  const [subscribedLeagues, setSubscribedLeagues] = useLocalStorage<string[]>('rafiki_subscribed_leagues', []);
  const [subscribedTeams, setSubscribedTeams] = useLocalStorage<string[]>('rafiki_subscribed_teams', []);
  const [subscriptionSearchQuery, setSubscriptionSearchQuery] = useState<string>('');
  const [recentSubSearches, setRecentSubSearches] = useLocalStorage<string[]>('rafiki_recent_sub_searches', ['Premier League', 'La Liga', 'Arsenal', 'Manchester City']);
  const [subscriptionFilterMode, setSubscriptionFilterMode] = useState<'all' | 'leagues' | 'teams' | 'subscribed'>('all');
  
  // Collapsible and Dropdown Expand/Contract States
  const [isLeaguesCollapsed, setIsLeaguesCollapsed] = useState<boolean>(false);
  const [isTeamsCollapsed, setIsTeamsCollapsed] = useState<boolean>(false);
  const [isLeaguesExpanded, setIsLeaguesExpanded] = useState<boolean>(false);
  const [isTeamsExpanded, setIsTeamsExpanded] = useState<boolean>(false);
  const [expandedLeagueCard, setExpandedLeagueCard] = useState<string | null>(null);
  const [quickLeagueDropdown, setQuickLeagueDropdown] = useState<string>('');
  const [quickTeamDropdown, setQuickTeamDropdown] = useState<string>('');

  const [toasts, setToasts] = useState<{ id: string; title: string; message: string; type?: 'success' | 'info' | 'warning' }[]>([]);
  const [extraPredictions, setExtraPredictions] = useState<Prediction[]>([]);

  const addToast = (toast: { title: string; message: string; type?: 'success' | 'info' | 'warning' }) => {
    const id = Math.random().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const handleToggleLeagueSubscription = (league: string) => {
    setSubscribedLeagues(prev => {
      const isSubscribed = prev.includes(league);
      let updated;
      if (isSubscribed) {
        updated = prev.filter(l => l !== league);
        addToast({
          title: language === 'en' ? 'Unsubscribed' : 'Umejiondoa',
          message: language === 'en' 
            ? `You will no longer receive alerts for ${league}.` 
            : `Hutapokea tena arifa za ${league}.`,
          type: 'info'
        });
      } else {
        updated = [...prev, league];
        addToast({
          title: language === 'en' ? 'Subscribed!' : 'Umejiunga!',
          message: language === 'en' 
            ? `You will now receive alerts whenever new ${league} predictions are posted.` 
            : `Sasa utapokea arifa wakati wowote utabiri mpya wa ${league} unapowekwa.`,
          type: 'success'
        });
      }
      return updated;
    });
  };

  const handleToggleTeamSubscription = (team: string, league?: string) => {
    setSubscribedTeams(prev => {
      const isSubscribed = prev.includes(team);
      let updated;
      if (isSubscribed) {
        updated = prev.filter(t => t !== team);
        addToast({
          title: language === 'en' ? 'Unsubscribed' : 'Umejiondoa',
          message: language === 'en' 
            ? `You will no longer receive alerts for ${team}.` 
            : `Hutapokea tena arifa za ${team}.`,
          type: 'info'
        });
      } else {
        updated = [...prev, team];
        addToast({
          title: language === 'en' ? 'Subscribed!' : 'Umejiunga!',
          message: language === 'en' 
            ? `You will now receive alerts whenever new ${team}${league ? ` (${league})` : ''} predictions are posted.` 
            : `Sasa utapokea arifa wakati wowote utabiri mpya wa ${team} unapowekwa.`,
          type: 'success'
        });
      }
      return updated;
    });
  };

  const handleSubscribeAllFiltered = (leaguesToSub: string[], teamsToSub: string[]) => {
    if (leaguesToSub.length > 0) {
      setSubscribedLeagues(prev => Array.from(new Set([...prev, ...leaguesToSub])));
    }
    if (teamsToSub.length > 0) {
      setSubscribedTeams(prev => Array.from(new Set([...prev, ...teamsToSub])));
    }
    addToast({
      title: language === 'en' ? 'Bulk Subscribed' : 'Umejiunga na Zote',
      message: language === 'en'
        ? `Subscribed to ${leaguesToSub.length} league(s) and ${teamsToSub.length} team(s).`
        : `Umejiunga na ligi ${leaguesToSub.length} na timu ${teamsToSub.length}.`,
      type: 'success'
    });
  };

  const handleUnsubscribeAllFiltered = (leaguesToUnsub: string[], teamsToUnsub: string[]) => {
    if (leaguesToUnsub.length > 0) {
      setSubscribedLeagues(prev => prev.filter(l => !leaguesToUnsub.includes(l)));
    }
    if (teamsToUnsub.length > 0) {
      setSubscribedTeams(prev => prev.filter(t => !teamsToUnsub.includes(t)));
    }
    addToast({
      title: language === 'en' ? 'Subscriptions Cleared' : 'Arifa Zimeondolewa',
      message: language === 'en'
        ? `Removed alerts for filtered selections.`
        : `Arifa za zilizochaguliwa zimeondolewa.`,
      type: 'info'
    });
  };

  const handleSimulateNewPrediction = () => {
    // Pick a league or team to mock
    let targetLeague = 'Premier League';
    let targetHome = 'Man City';
    let targetAway = 'Liverpool';

    if (subscribedLeagues.length > 0) {
      targetLeague = subscribedLeagues[Math.floor(Math.random() * subscribedLeagues.length)];
    } else if (predictions.length > 0) {
      const activeLeagues = Array.from(new Set(predictions.filter(p => !p.id.startsWith('p-hist-')).map(p => p.match.league))).filter(Boolean);
      if (activeLeagues.length > 0) {
        targetLeague = activeLeagues[Math.floor(Math.random() * activeLeagues.length)];
      }
    }

    if (subscribedTeams.length > 0) {
      targetHome = subscribedTeams[Math.floor(Math.random() * subscribedTeams.length)];
      targetAway = targetHome === 'Arsenal' ? 'Chelsea' : 'Arsenal';
    }

    const teams = [
      { home: 'Man City', away: 'Liverpool' },
      { home: 'Arsenal', away: 'Man United' },
      { home: 'Lakers', away: 'Warriors' },
      { home: 'Real Madrid', away: 'Barcelona' }
    ];
    const matchPair = teams[Math.floor(Math.random() * teams.length)];
    
    const mockPred: Prediction = {
      id: `mock-sim-${Date.now()}`,
      matchId: `m-sim-${Date.now()}`,
      match: {
        id: `m-sim-${Date.now()}`,
        sport: targetLeague.toLowerCase().includes('nba') ? 'basketball' : 'football',
        homeTeam: matchPair.home,
        awayTeam: matchPair.away,
        league: targetLeague,
        startTime: new Date().toISOString(),
        status: 'upcoming'
      },
      pick: `${matchPair.home} to Win`,
      market: 'Match Winner',
      odds: 1.85,
      confidence: 89,
      riskLevel: 'Low',
      expectedValue: 1.35,
      probability: 89,
      suggestedBetType: 'Single / Accumulator Leg',
      aiExplanation: 'Simulated prediction analyzed by Rafiki Predict multi-criteria consensus modeling engine.',
      analysisCriteria: {
        formAnalysis: 'Strong form',
        injuryImpact: 'Low injury impact',
        tacticalMatchup: 'Favorable tactical matchup',
        oddsMovement: 'Stable odds',
        otherFactors: 'Favorable conditions'
      }
    };

    addToast({
      title: language === 'en' ? 'AI Analysis Triggered' : 'Uchambuzi wa AI Umeanzishwa',
      message: language === 'en' 
        ? `Consensus model is analyzing new data for ${targetLeague}...` 
        : `Mifano inachambua data mpya ya ${targetLeague}...`,
      type: 'info'
    });

    // After 1.5 seconds, append to local predictions state
    setTimeout(() => {
      setExtraPredictions(prev => [mockPred, ...prev]);
    }, 1500);
  };

  // Quick Bet Selection States
  const [selectedPredictionIds, setSelectedPredictionIds] = useState<string[]>([]);
  const [quickBetStake, setQuickBetStake] = useState<string>('50');
  const [customAccaCopied, setCustomAccaCopied] = useState<boolean>(false);

  // Accumulator Return Calculator States
  const [selectedAccaId, setSelectedAccaId] = useState<string>('');
  const [stakeInput, setStakeInput] = useState<string>('50');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('$');

  // Share States
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeShareMenuId, setActiveShareMenuId] = useState<string | null>(null);

  // AI Kelly Bankroll Sizing States
  const [customKellyBankroll, setCustomKellyBankroll] = useState<string>('1000');
  const [kellyFraction, setKellyFraction] = useState<0.25 | 0.5 | 1.0>(0.5);

  // User Feedback States
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackHoverRating, setFeedbackHoverRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeAccaFeedbackId, setActiveAccaFeedbackId] = useState<string | null>(null);

  React.useEffect(() => {
    setFeedbackRating(0);
    setFeedbackHoverRating(0);
    setFeedbackComment('');
    setFeedbackStatus('idle');
  }, [selectedPrediction?.id]);

  const handleSubmitFeedback = async (itemId: string, itemType: 'prediction' | 'accumulator', itemTitle: string) => {
    if (feedbackRating === 0) {
      return;
    }
    setIsFeedbackSubmitting(true);
    setFeedbackStatus('idle');
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          itemType,
          itemTitle,
          rating: feedbackRating,
          comment: feedbackComment,
          userId: userProfile?.uid || 'anonymous',
          userEmail: userProfile?.email || 'anonymous@rafikipredict.com'
        })
      });
      if (response.ok) {
        setFeedbackStatus('success');
        setFeedbackComment('');
        setFeedbackRating(0);
        if (onRefreshData) {
          onRefreshData();
        }
      } else {
        setFeedbackStatus('error');
      }
    } catch (err) {
      setFeedbackStatus('error');
    } finally {
      setIsFeedbackSubmitting(false);
    }
  };

  const handleToggleBookmark = async (prediction: Prediction) => {
    const userId = auth.currentUser?.uid || userProfile?.uid || 'usr_guest_vip';
    const bookmarkId = `saved_${userId}_${prediction.id}`;
    const isCurrentlyBookmarked = savedPredictions.some(sp => sp.predictionId === prediction.id);
    const localKey = `rafiki_saved_preds_${userId}`;

    // Optimistically update localStorage
    try {
      let updated: SavedPrediction[];
      if (isCurrentlyBookmarked) {
        updated = savedPredictions.filter(sp => sp.predictionId !== prediction.id);
      } else {
        const savedData: SavedPrediction = {
          id: bookmarkId,
          predictionId: prediction.id,
          userId,
          savedAt: new Date().toISOString(),
          prediction: prediction
        };
        updated = [savedData, ...savedPredictions];
      }
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch (_) {}

    // Sync with Firestore (rules now permit read/write)
    try {
      if (isCurrentlyBookmarked) {
        await deleteDoc(doc(db, 'saved', bookmarkId));
      } else {
        const savedData: SavedPrediction = {
          id: bookmarkId,
          predictionId: prediction.id,
          userId,
          savedAt: new Date().toISOString(),
          prediction: prediction
        };
        await setDoc(doc(db, 'saved', bookmarkId), savedData);
      }
    } catch (err) {
      console.warn("Bookmark Firestore sync notice:", err);
    }
  };

  const handleCopyPrediction = (pred: Prediction, e: React.MouseEvent) => {
    e.stopPropagation();
    const risk = getRiskInfo(pred.odds, pred.analysisCriteria?.injuryImpact, t);
    
    let shareText = "";
    if (language === 'sw') {
      shareText = `🏆 *Rafiki Predict Premium AI Consensus* 🏆\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚽ *Mechi*: ${pred.match.homeTeam} vs ${pred.match.awayTeam}\n🏆 *Ligi*: ${pred.match.league}\n🎯 *Utabiri*: ${pred.pick}\n📈 *Odds*: @${pred.odds.toFixed(2)}\n🔥 *Kujiamini*: ${pred.confidence}%\n🔒 *Kiwango cha Hatari*: ${risk.label}\n\n🧠 *Uchambuzi wa AI*:\n"${pred.aiExplanation}"\n\n🌟 Jiunge na Rafiki Predict leo kupata utabiri wa kila siku wa kiwango cha juu wa AI!`;
    } else {
      shareText = `🏆 *Rafiki Predict Premium AI Consensus* 🏆\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚽ *Match*: ${pred.match.homeTeam} vs ${pred.match.awayTeam}\n🏆 *League*: ${pred.match.league}\n🎯 *Prediction Pick*: ${pred.pick}\n📈 *Decimal Odds*: @${pred.odds.toFixed(2)}\n🔥 *AI Confidence Score*: ${pred.confidence}%\n🔒 *Risk Level*: ${risk.label}\n\n🧠 *Expert AI Insight*:\n"${pred.aiExplanation}"\n\n🌟 Join Rafiki Predict today for daily high-accuracy AI sport consensus predictions!`;
    }

    navigator.clipboard.writeText(shareText);
    setCopiedId(pred.id);
    setTimeout(() => setCopiedId(null), 2000);
    setActiveShareMenuId(null);
  };

  const handleShareWhatsApp = (pred: Prediction, e: React.MouseEvent) => {
    e.stopPropagation();
    const risk = getRiskInfo(pred.odds, pred.analysisCriteria?.injuryImpact, t);
    
    let shareText = "";
    if (language === 'sw') {
      shareText = `🏆 *Rafiki Predict Premium AI Consensus* 🏆\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚽ *Mechi*: ${pred.match.homeTeam} vs ${pred.match.awayTeam}\n🏆 *Ligi*: ${pred.match.league}\n🎯 *Utabiri*: ${pred.pick}\n📈 *Odds*: @${pred.odds.toFixed(2)}\n🔥 *Kujiamini*: ${pred.confidence}%\n🔒 *Kiwango cha Hatari*: ${risk.label}\n\n🧠 *Uchambuzi wa AI*:\n"${pred.aiExplanation}"\n\n🌟 Jiunge na Rafiki Predict leo kupata utabiri wa kila siku wa kiwango cha juu wa AI!`;
    } else {
      shareText = `🏆 *Rafiki Predict Premium AI Consensus* 🏆\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚽ *Match*: ${pred.match.homeTeam} vs ${pred.match.awayTeam}\n🏆 *League*: ${pred.match.league}\n🎯 *Prediction Pick*: ${pred.pick}\n📈 *Decimal Odds*: @${pred.odds.toFixed(2)}\n🔥 *AI Confidence Score*: ${pred.confidence}%\n🔒 *Risk Level*: ${risk.label}\n\n🧠 *Expert AI Insight*:\n"${pred.aiExplanation}"\n\n🌟 Join Rafiki Predict today for daily high-accuracy AI sport consensus predictions!`;
    }

    const encodedText = encodeURIComponent(shareText);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
    setActiveShareMenuId(null);
  };

  // Combine real database predictions with any local simulated predictions
  const allPredictions = React.useMemo(() => {
    return [...predictions, ...extraPredictions];
  }, [predictions, extraPredictions]);

  // Combine all active predictions from props, extra simulations, and accumulator legs for global betslip lookup
  const allPoolPredictions = React.useMemo(() => {
    const map = new Map<string, Prediction>();
    predictions.forEach(p => map.set(p.id, p));
    extraPredictions.forEach(p => map.set(p.id, p));
    accumulators.forEach(a => a.predictions.forEach(p => map.set(p.id, p)));
    return Array.from(map.values());
  }, [predictions, extraPredictions, accumulators]);

  const togglePredictionSelection = (predOrId: string | Prediction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const predId = typeof predOrId === 'string' ? predOrId : predOrId.id;
    const targetPred = allPoolPredictions.find(p => p.id === predId) || (typeof predOrId === 'object' ? predOrId : null);

    setSelectedPredictionIds(prev => {
      const isAlreadySelected = prev.includes(predId);
      if (isAlreadySelected) {
        addToast({
          title: language === 'en' ? 'Removed from Betslip' : 'Imeondolewa kwenye Jamvi',
          message: targetPred 
            ? (language === 'en' ? `Removed ${targetPred.match.homeTeam} vs ${targetPred.match.awayTeam} (${targetPred.pick})` : `Imeondoa ${targetPred.match.homeTeam} vs ${targetPred.match.awayTeam}`)
            : (language === 'en' ? 'Selection removed from betslip' : 'Uchaguzi umeondolewa kwenye jamvi'),
          type: 'info'
        });
        return prev.filter(id => id !== predId);
      } else {
        addToast({
          title: language === 'en' ? 'Added to Betslip!' : 'Imeongezwa kwenye Jamvi!',
          message: targetPred 
            ? (language === 'en' ? `Added ${targetPred.match.homeTeam} vs ${targetPred.match.awayTeam} • ${targetPred.pick} (@${(targetPred.modelFairOdds || targetPred.odds).toFixed(2)})` : `Imeongeza ${targetPred.match.homeTeam} vs ${targetPred.match.awayTeam} • ${targetPred.pick}`)
            : (language === 'en' ? 'Selection added to custom betslip builder' : 'Uchaguzi umeongezwa kwenye jamvi'),
          type: 'success'
        });
        return [...prev, predId];
      }
    });
  };

  const accessKeySession = useAccessKeySession();

  // Check if subscription, trial, admin or guest pass is active
  const isPremium = userProfile?.subscriptionStatus === 'premium';
  const isTrial = userProfile?.subscriptionStatus === 'trial';
  const isAdmin = userProfile?.role === 'admin';

  const isGuestValid = React.useMemo(() => {
    if (accessKeySession.isActive) return true;
    if (guestPass && guestPass.expiresAt && new Date(guestPass.expiresAt).getTime() > Date.now()) {
      return true;
    }
    try {
      const saved = localStorage.getItem('rafiki_guest_pass');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.expiresAt && new Date(parsed.expiresAt).getTime() > Date.now();
      }
    } catch {}
    return false;
  }, [guestPass, accessKeySession.isActive]);

  const isUnlocked = isPremium || isTrial || isAdmin || isGuestValid || accessKeySession.isActive;

  // Comprehensive extraction of available leagues with metadata & participating teams
  const availableLeaguesData = React.useMemo(() => {
    const activePreds = allPredictions.filter(p => !p.id.startsWith('p-hist-'));
    const leagueMap = new Map<string, { name: string; sport: string; count: number; teams: Set<string> }>();

    activePreds.forEach(p => {
      const l = p.match.league;
      if (!l) return;
      if (!leagueMap.has(l)) {
        leagueMap.set(l, {
          name: l,
          sport: p.match.sport || 'football',
          count: 0,
          teams: new Set<string>()
        });
      }
      const entry = leagueMap.get(l)!;
      entry.count += 1;
      if (p.match.homeTeam) entry.teams.add(p.match.homeTeam);
      if (p.match.awayTeam) entry.teams.add(p.match.awayTeam);
    });

    return Array.from(leagueMap.values()).map(entry => ({
      ...entry,
      teamsList: Array.from(entry.teams)
    }));
  }, [allPredictions]);

  // Comprehensive extraction of available unique teams with their leagues & match count
  const availableTeamsData = React.useMemo(() => {
    const activePreds = allPredictions.filter(p => !p.id.startsWith('p-hist-'));
    const teamMap = new Map<string, { name: string; league: string; sport: string; matchCount: number }>();

    activePreds.forEach(p => {
      const sport = p.match.sport || 'football';
      const league = p.match.league || '';
      
      if (p.match.homeTeam) {
        const key = p.match.homeTeam;
        if (!teamMap.has(key)) {
          teamMap.set(key, { name: p.match.homeTeam, league, sport, matchCount: 0 });
        }
        teamMap.get(key)!.matchCount += 1;
      }
      if (p.match.awayTeam) {
        const key = p.match.awayTeam;
        if (!teamMap.has(key)) {
          teamMap.set(key, { name: p.match.awayTeam, league, sport, matchCount: 0 });
        }
        teamMap.get(key)!.matchCount += 1;
      }
    });

    return Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allPredictions]);

  // Real-time filtered available leagues based on typing in the search bar
  const filteredAvailableLeagues = React.useMemo(() => {
    const q = subscriptionSearchQuery.toLowerCase().trim();
    return availableLeaguesData.filter(league => {
      // If filtering by subscribed only
      if (subscriptionFilterMode === 'subscribed' && !subscribedLeagues.includes(league.name)) {
        return false;
      }
      if (!q) return true;
      // Real-time filter: matches league name OR any of its active teams OR sport
      const matchesLeagueName = league.name.toLowerCase().includes(q);
      const matchesTeamName = league.teamsList.some(team => team.toLowerCase().includes(q));
      const matchesSport = league.sport.toLowerCase().includes(q);
      return matchesLeagueName || matchesTeamName || matchesSport;
    });
  }, [availableLeaguesData, subscriptionSearchQuery, subscriptionFilterMode, subscribedLeagues]);

  // Real-time filtered available teams based on typing in the search bar
  const filteredAvailableTeams = React.useMemo(() => {
    const q = subscriptionSearchQuery.toLowerCase().trim();
    return availableTeamsData.filter(team => {
      // If filtering by subscribed only
      if (subscriptionFilterMode === 'subscribed' && !subscribedTeams.includes(team.name)) {
        return false;
      }
      if (!q) return true;
      // Real-time filter: matches team name OR its league name OR sport
      const matchesTeamName = team.name.toLowerCase().includes(q);
      const matchesLeague = team.league.toLowerCase().includes(q);
      const matchesSport = team.sport.toLowerCase().includes(q);
      return matchesTeamName || matchesLeague || matchesSport;
    });
  }, [availableTeamsData, subscriptionSearchQuery, subscriptionFilterMode, subscribedTeams]);

  const activeUniqueLeagues = React.useMemo(() => {
    return availableLeaguesData.map(l => l.name);
  }, [availableLeaguesData]);

  // Watch for newly posted predictions to trigger notifications for subscribed leagues and teams
  const prevPredictionsIdsRef = React.useRef<Set<string>>(new Set(allPredictions.map(p => p.id)));

  React.useEffect(() => {
    const currentIds = new Set(allPredictions.map(p => p.id));
    const newPredictions = allPredictions.filter(p => !prevPredictionsIdsRef.current.has(p.id));

    if (newPredictions.length > 0) {
      newPredictions.forEach(pred => {
        const isLeagueSubscribed = subscribedLeagues.includes(pred.match.league);
        const isHomeSubscribed = subscribedTeams.includes(pred.match.homeTeam);
        const isAwaySubscribed = subscribedTeams.includes(pred.match.awayTeam);

        if (isLeagueSubscribed || isHomeSubscribed || isAwaySubscribed) {
          const matchContext = isLeagueSubscribed 
            ? pred.match.league 
            : isHomeSubscribed 
            ? pred.match.homeTeam 
            : pred.match.awayTeam;

          addToast({
            title: language === 'en' ? `🔔 Alert: ${matchContext} Prediction!` : `🔔 Arifa: Utabiri wa ${matchContext}!`,
            message: `${pred.match.homeTeam} vs ${pred.match.awayTeam} (${pred.match.league}) - Pick: ${pred.pick} (Odds: @${pred.odds.toFixed(2)})`,
            type: 'success'
          });

          // Play a delightful audio notification chime
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const audioCtx = new AudioContextClass();
              const oscillator = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
              oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
              gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
              oscillator.start();
              oscillator.stop(audioCtx.currentTime + 0.4);
            }
          } catch (soundErr) {
            console.warn('Audio feedback failed:', soundErr);
          }
        }
      });
    }

    prevPredictionsIdsRef.current = currentIds;
  }, [allPredictions, subscribedLeagues, subscribedTeams, language]);

  // Filter and sort single matches
  const filteredPredictions = allPredictions
    .filter(p => {
      // Only show active predictions (not historical completed logs)
      if (p.id.startsWith('p-hist-')) return false;
      
      // Sport Filter
      const matchesSport = sportFilter === 'all' || p.match.sport === sportFilter;
      if (!matchesSport) return false;

      // Search Query Filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const homeTeam = p.match.homeTeam.toLowerCase();
        const awayTeam = p.match.awayTeam.toLowerCase();
        const league = p.match.league.toLowerCase();
        return homeTeam.includes(query) || awayTeam.includes(query) || league.includes(query);
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'confidence') {
        return b.confidence - a.confidence; // Highest confidence score first
      }
      if (sortBy === 'odds-desc') {
        return b.odds - a.odds; // Highest odds first
      }
      if (sortBy === 'odds-asc') {
        return a.odds - b.odds; // Lowest odds first
      }
      if (sortBy === 'date' || sortBy === 'date-soonest') {
        const dateA = new Date(a.match.startTime).getTime();
        const dateB = new Date(b.match.startTime).getTime();
        if (dateA !== dateB) return dateA - dateB; // Soonest kickoff first
        return a.id.localeCompare(b.id);
      }
      if (sortBy === 'date-latest') {
        const dateA = new Date(a.match.startTime).getTime();
        const dateB = new Date(b.match.startTime).getTime();
        if (dateA !== dateB) return dateB - dateA; // Latest kickoff first
        return a.id.localeCompare(b.id);
      }
      if (sortBy === 'league') {
        return a.match.league.localeCompare(b.match.league); // League alphabetically
      }
      return 0;
    });

  // Highlight top-trending bets across all sports (e.g., top 3 by confidence or expected value)
  const trendingTips = [...allPredictions.filter(p => !p.id.startsWith('p-hist-'))]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  return (
    <div className="space-y-10" id="predictions-section">
      
      {/* GUEST 1-DAY PASS ACTIVE BANNER */}
      {isGuestValid && (
        <div className="bg-gradient-to-r from-amber-500/20 via-emerald-500/10 to-amber-500/20 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-amber-500/5 animate-fadeIn" id="guest-pass-active-banner">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-xl shrink-0">
              🎫
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-sans font-bold text-sm">1-Day Guest VIP Pass Active</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">UNLOCKED</span>
              </div>
              <p className="text-xs text-gray-300">
                Direct guest access verified. All today's matches, tactical confidence scores, and high-value VIP accumulators are unlocked on this device!
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToBilling}
            className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
          >
            Upgrade to Monthly VIP
          </button>
        </div>
      )}

      {/* 0. HEADER AREA WITH FILTER DROPDOWN, SORT TOGGLES & RECENT SEARCHES */}
      <div className="flex flex-col gap-4 bg-zinc-900/40 border border-zinc-800/80 p-5 sm:p-6 rounded-2xl shadow-xl relative overflow-hidden" id="predictions-header-area">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">Rafiki Consensus Hub</span>
            </div>
            <h2 className="text-xl font-sans font-black text-white tracking-tight">{t.predictionsFeedTitle}</h2>
            <p className="text-xs text-gray-400 max-w-xl">
              {t.predictionsFeedDesc}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2.5 shrink-0 w-full lg:w-auto">
            {/* Search Input for fixture teams/leagues */}
            <div className="relative w-full sm:w-60">
              <label htmlFor="predictions-search" className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">
                🔍 {t.searchLabel}
              </label>
              <div className="relative">
                <input
                  id="predictions-search"
                  name="predictions_search_filter"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      handleAddRecentSearch(searchQuery.trim());
                    }
                  }}
                  onBlur={() => {
                    if (searchQuery.trim()) {
                      handleAddRecentSearch(searchQuery.trim());
                    }
                  }}
                  placeholder={t.searchPlaceholder}
                  className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-white pl-9 pr-8 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-600 shadow-inner"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                  <Search className="w-3.5 h-3.5" />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-500 hover:text-white cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Sort by Date Toggle Button */}
            <div className="relative w-full sm:w-auto">
              <label htmlFor="sort-by-date-btn" className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">
                🕒 {language === 'sw' ? 'Muda wa Mechi' : 'Kickoff Order'}
              </label>
              <button
                id="sort-by-date-btn"
                type="button"
                onClick={handleToggleDateSort}
                className={`w-full sm:w-auto px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-2 select-none active:scale-95 ${
                  (sortBy === 'date-soonest' || (sortBy === 'date' && dateSortOrder === 'soonest'))
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] font-bold'
                    : sortBy === 'date-latest'
                      ? 'bg-amber-950/30 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)] font-bold'
                      : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-gray-300 hover:text-white'
                }`}
                title={
                  (sortBy === 'date-soonest' || (sortBy === 'date' && dateSortOrder === 'soonest'))
                    ? (language === 'sw' ? 'Mechi za karibu kwanza (Bonyeza kubadili za mwisho)' : 'Order fixtures by kickoff time: Soonest kickoff first (Click to toggle Latest)')
                    : sortBy === 'date-latest'
                      ? (language === 'sw' ? 'Mechi za mwisho kwanza (Bonyeza kubadili za karibu)' : 'Order fixtures by kickoff time: Latest kickoff first (Click to toggle Soonest)')
                      : (language === 'sw' ? 'Panga kwa tarehe ya kuanza (Karibu vs Mwisho)' : 'Order fixtures by kickoff time: Click to sort Soonest kickoff first')
                }
              >
                <ArrowUpDown className={`w-3.5 h-3.5 transition-transform duration-300 ${
                  sortBy === 'date-latest' ? 'rotate-180 text-amber-400' : 'text-emerald-400'
                }`} />
                <span>
                  {language === 'sw' ? 'Panga kwa Tarehe' : 'Sort by Date'}
                  <span className="ml-1 text-[10px] font-mono opacity-80">
                    ({sortBy === 'date-latest' ? (language === 'sw' ? 'Mwisho' : 'Latest') : (language === 'sw' ? 'Karibu' : 'Soonest')})
                  </span>
                </span>
              </button>
            </div>

            {/* Dropdown Menu for Quick Category Toggle */}
            <div className="relative w-full sm:w-[150px]">
              <label htmlFor="header-sport-filter" className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">
                ⚡ {t.quickSportCategory}
              </label>
              <div className="relative">
                <select
                  id="header-sport-filter"
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-white px-3 py-2.5 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all pr-8 animate-fadeIn"
                >
                  <option value="all">🌍 {t.allSports}</option>
                  <option value="football">⚽ {t.football}</option>
                  <option value="basketball">🏀 {t.basketball}</option>
                  <option value="tennis">🎾 {t.tennis}</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Dropdown Menu for Sort Options */}
            <div className="relative w-full sm:w-[155px]">
              <label htmlFor="header-sort-by" className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">
                📶 {t.sortByLabel || "Sort Predictions"}
              </label>
              <div className="relative">
                <select
                  id="header-sort-by"
                  value={sortBy}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setSortBy(val);
                    if (val === 'date-soonest' || val === 'date') setDateSortOrder('soonest');
                    if (val === 'date-latest') setDateSortOrder('latest');
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-white px-3 py-2.5 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all pr-8"
                >
                  <option value="confidence">{t.sortByConfidence || "🔥 AI Confidence"}</option>
                  <option value="date-soonest">📅 {language === 'sw' ? 'Tarehe (Karibu Kwanza)' : 'Date: Soonest First'}</option>
                  <option value="date-latest">📅 {language === 'sw' ? 'Tarehe (Mwisho Kwanza)' : 'Date: Latest First'}</option>
                  <option value="league">{t.sortByLeague || "🏆 League"}</option>
                  <option value="odds-desc">{t.sortByOddsHigh || "📈 Highest Odds"}</option>
                  <option value="odds-asc">{t.sortByOddsLow || "📉 Lowest Odds"}</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Searches Chips in Predictions Header */}
        {recentSearches.length > 0 && (
          <div className="w-full pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                {language === 'sw' ? 'Utafutaji wa Hivi Karibuni:' : 'Recent Searches:'}
              </span>
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setSearchQuery(item);
                    handleAddRecentSearch(item);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-gray-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-all cursor-pointer group shadow-sm"
                >
                  <span>{item}</span>
                  <span
                    onClick={(e) => handleRemoveRecentSearch(item, e)}
                    className="text-gray-500 hover:text-rose-400 ml-0.5 p-0.5 rounded transition-colors"
                    title="Remove from search history"
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleClearRecentSearches}
              className="text-[10px] font-mono text-gray-500 hover:text-gray-300 underline cursor-pointer transition-colors"
            >
              {language === 'sw' ? 'Futa Zote' : 'Clear All'}
            </button>
          </div>
        )}
      </div>

      {/* LEAGUE & TEAM ALERT SUBSCRIPTIONS PANEL WITH REAL-TIME FILTERING */}
      <div className="bg-zinc-950/60 border border-zinc-800/90 p-5 sm:p-6 rounded-2xl space-y-5 relative overflow-hidden shadow-2xl" id="league-subscriptions-panel">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Bell className="w-4 h-4 animate-pulse" />
              </div>
              <h3 className="text-sm sm:text-base font-sans font-black text-white tracking-tight flex items-center gap-2">
                {language === 'en' ? 'League & Team Alert Subscriptions' : 'Vinasaba vya Arifa za Ligi na Timu'}
                <span className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  ⚡ Real-Time Alerts
                </span>
              </h3>
            </div>
            <p className="text-xs text-gray-400 max-w-2xl">
              {language === 'en' 
                ? 'Type in the search bar below to instantly narrow down available teams and leagues. Subscribe to receive instant audio chimes and high-contrast alerts as soon as AI predictions are published.' 
                : 'Andika kwenye upau wa utafutaji hapa chini ili kuchuja papo hapo timu na ligi zinazopatikana. Jiunge ili kupokea sauti za arifa na jumbe mara tu utabiri wa AI unapowekwa.'}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Subscribed Counts Pill */}
            <div className="bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-mono text-gray-300">
              <span className="text-emerald-400 font-bold">●</span>
              <span>
                {language === 'en' 
                  ? `${subscribedLeagues.length} Leagues, ${subscribedTeams.length} Teams Active` 
                  : `Ligi ${subscribedLeagues.length}, Timu ${subscribedTeams.length} Hai`}
              </span>
            </div>

            <button
              onClick={handleSimulateNewPrediction}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
              title="Post a mock prediction to test the notification sound & toast"
            >
              <Sparkles className="w-3.5 h-3.5 fill-black" />
              {language === 'en' ? 'Simulate AI Post' : 'Uigaji wa AI'}
            </button>
          </div>
        </div>

        {/* REAL-TIME SEARCH BAR & FILTER TABS */}
        <div className="space-y-3 pt-1 border-t border-zinc-800/80">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Instant Search Bar */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="league-subscription-search-input"
                type="text"
                value={subscriptionSearchQuery}
                onChange={(e) => setSubscriptionSearchQuery(e.target.value)}
                placeholder={
                  language === 'en'
                    ? 'Search leagues & teams in real-time (e.g. Premier League, Arsenal, Lakers, Real Madrid)...'
                    : 'Tafuta ligi na timu papo hapo (mfano Premier League, Arsenal, Lakers)...'
                }
                className="w-full bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder:text-gray-500 font-sans transition-all outline-none"
              />
              {subscriptionSearchQuery && (
                <button
                  type="button"
                  onClick={() => setSubscriptionSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white cursor-pointer"
                  title="Clear filter"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Bulk Sub/Unsub for Filtered Items */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleSubscribeAllFiltered(
                  filteredAvailableLeagues.map(l => l.name),
                  filteredAvailableTeams.map(t => t.name)
                )}
                disabled={filteredAvailableLeagues.length === 0 && filteredAvailableTeams.length === 0}
                className="bg-emerald-950/50 hover:bg-emerald-900/70 border border-emerald-500/40 text-emerald-300 disabled:opacity-40 text-xs font-semibold py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                title="Subscribe to all currently visible filtered leagues and teams"
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                {language === 'en' ? 'Sub All Shown' : 'Jiunge Zote'}
              </button>

              {(subscribedLeagues.length > 0 || subscribedTeams.length > 0) && (
                <button
                  type="button"
                  onClick={() => handleUnsubscribeAllFiltered(
                    filteredAvailableLeagues.map(l => l.name),
                    filteredAvailableTeams.map(t => t.name)
                  )}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-gray-400 hover:text-rose-400 text-xs font-semibold py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  title="Unsubscribe from visible filtered leagues and teams"
                >
                  <Square className="w-3.5 h-3.5" />
                  {language === 'en' ? 'Unsub Shown' : 'Ondoa Zote'}
                </button>
              )}
            </div>
          </div>

          {/* Filter Mode Pills & Dynamic Result Counts */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSubscriptionFilterMode('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  subscriptionFilterMode === 'all'
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-gray-400 hover:text-gray-200 bg-transparent'
                }`}
              >
                {language === 'en' ? 'All' : 'Zote'} ({filteredAvailableLeagues.length + filteredAvailableTeams.length})
              </button>

              <button
                type="button"
                onClick={() => setSubscriptionFilterMode('leagues')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  subscriptionFilterMode === 'leagues'
                    ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30'
                    : 'text-gray-400 hover:text-gray-200 bg-transparent'
                }`}
              >
                🏆 {language === 'en' ? 'Leagues' : 'Ligi'} ({filteredAvailableLeagues.length})
              </button>

              <button
                type="button"
                onClick={() => setSubscriptionFilterMode('teams')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  subscriptionFilterMode === 'teams'
                    ? 'bg-zinc-800 text-blue-400 border border-blue-500/30'
                    : 'text-gray-400 hover:text-gray-200 bg-transparent'
                }`}
              >
                🛡️ {language === 'en' ? 'Teams' : 'Timu'} ({filteredAvailableTeams.length})
              </button>

              <button
                type="button"
                onClick={() => setSubscriptionFilterMode('subscribed')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  subscriptionFilterMode === 'subscribed'
                    ? 'bg-amber-950/50 text-amber-300 border border-amber-500/40'
                    : 'text-gray-400 hover:text-gray-200 bg-transparent'
                }`}
              >
                ⭐ {language === 'en' ? 'Subscribed' : 'Zilizojiunga'} ({subscribedLeagues.length + subscribedTeams.length})
              </button>
            </div>

            {subscriptionSearchQuery && (
              <span className="text-[11px] font-mono text-emerald-400/90 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                {language === 'en' 
                  ? `Filtering for: "${subscriptionSearchQuery}"` 
                  : `Inachuja: "${subscriptionSearchQuery}"`}
              </span>
            )}
          </div>
        </div>

        {/* QUICK DROPDOWN SELECTORS BAR */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Quick League Dropdown Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-3 h-3" />
              {language === 'en' ? 'Quick League Dropdown' : 'Chagua Ligi kwa Haraka'}
            </label>
            <div className="flex items-center gap-2">
              <select
                value={quickLeagueDropdown}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuickLeagueDropdown(val);
                  if (val) {
                    handleToggleLeagueSubscription(val);
                    setQuickLeagueDropdown('');
                  }
                }}
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">{language === 'en' ? '-- Select League to Subscribe/Unsub --' : '-- Chagua Ligi Kujiunga/Kujiondoa --'}</option>
                {availableLeaguesData.map((l) => (
                  <option key={`opt-l-${l.name}`} value={l.name}>
                    {subscribedLeagues.includes(l.name) ? '🔔 [Subscribed] ' : '➕ '}
                    {l.name} ({l.count} {l.count === 1 ? 'match' : 'matches'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Team Dropdown Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              {language === 'en' ? 'Quick Team Dropdown' : 'Chagua Timu kwa Haraka'}
            </label>
            <div className="flex items-center gap-2">
              <select
                value={quickTeamDropdown}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuickTeamDropdown(val);
                  if (val) {
                    const found = availableTeamsData.find(t => t.name === val);
                    handleToggleTeamSubscription(val, found?.league);
                    setQuickTeamDropdown('');
                  }
                }}
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">{language === 'en' ? '-- Select Team to Subscribe/Unsub --' : '-- Chagua Timu Kujiunga/Kujiondoa --'}</option>
                {availableTeamsData.map((t) => (
                  <option key={`opt-t-${t.name}`} value={t.name}>
                    {subscribedTeams.includes(t.name) ? '🔔 [Subscribed] ' : '➕ '}
                    {t.name} {t.league ? `(${t.league})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* DISPLAYED LIST OF FILTERED LEAGUES & TEAMS WITH EXPAND / CONTRACT CONTROLS */}
        <div className="space-y-4 pt-1">
          {/* 1. Filtered Leagues Section */}
          {(subscriptionFilterMode === 'all' || subscriptionFilterMode === 'leagues') && filteredAvailableLeagues.length > 0 && (
            <div className="space-y-2 bg-zinc-900/30 border border-zinc-850 rounded-xl p-3 transition-all">
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 uppercase tracking-wider font-bold">
                <button
                  type="button"
                  onClick={() => setIsLeaguesCollapsed(!isLeaguesCollapsed)}
                  className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 cursor-pointer transition-colors"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Available Leagues' : 'Ligi Zinazopatikana'} ({filteredAvailableLeagues.length})</span>
                  {isLeaguesCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-[10px] font-normal lowercase hidden sm:inline">click badge to toggle / expand teams</span>
                  <button
                    type="button"
                    onClick={() => setIsLeaguesCollapsed(!isLeaguesCollapsed)}
                    className="text-[10px] font-mono text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 cursor-pointer"
                  >
                    {isLeaguesCollapsed ? (language === 'en' ? 'Expand Section' : 'Panua') : (language === 'en' ? 'Contract Section' : 'Funga')}
                  </button>
                </div>
              </div>

              {!isLeaguesCollapsed && (
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap gap-2">
                    {(isLeaguesExpanded ? filteredAvailableLeagues : filteredAvailableLeagues.slice(0, 8)).map((league) => {
                      const isSubscribed = subscribedLeagues.includes(league.name);
                      const isCardExpanded = expandedLeagueCard === league.name;
                      const sportEmoji = league.sport === 'basketball' ? '🏀' : league.sport === 'tennis' ? '🎾' : '⚽';
                      
                      return (
                        <div key={`sub-league-wrap-${league.name}`} className="flex flex-col gap-1.5">
                          <div className="flex items-center rounded-xl overflow-hidden border border-zinc-800 transition-all bg-zinc-900/90 hover:border-zinc-700">
                            {/* Main subscribe button */}
                            <button
                              type="button"
                              onClick={() => handleToggleLeagueSubscription(league.name)}
                              className={`px-3 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-2 ${
                                isSubscribed
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'text-gray-400 hover:text-white'
                              }`}
                              title={isSubscribed ? "Subscribed! Click to remove" : "Click to subscribe"}
                            >
                              <span>{sportEmoji}</span>
                              <span>{league.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-gray-400 border border-white/5">
                                {league.count} {league.count === 1 ? 'match' : 'matches'}
                              </span>
                              <span className="text-xs">{isSubscribed ? '🔔' : '🔕'}</span>
                            </button>

                            {/* Dropdown Expand Chevron for participating teams */}
                            {league.teamsList && league.teamsList.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedLeagueCard(isCardExpanded ? null : league.name)}
                                className={`px-2 py-1.5 border-l border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer text-gray-400 hover:text-white flex items-center gap-1 text-[10px] font-mono ${
                                  isCardExpanded ? 'bg-zinc-800 text-emerald-400' : ''
                                }`}
                                title={isCardExpanded ? "Contract League Teams" : `Expand ${league.teamsList.length} Teams in ${league.name}`}
                              >
                                <span>{league.teamsList.length}T</span>
                                {isCardExpanded ? <ChevronUp className="w-3 h-3 text-emerald-400" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}
                          </div>

                          {/* Expanded Nested Dropdown Card for this league's clubs */}
                          {isCardExpanded && (
                            <div className="bg-zinc-950 border border-emerald-500/30 rounded-xl p-2.5 shadow-lg space-y-1.5 max-w-sm">
                              <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 font-bold border-b border-zinc-850 pb-1">
                                <span>🏆 {league.name} Clubs</span>
                                <button
                                  type="button"
                                  onClick={() => setExpandedLeagueCard(null)}
                                  className="text-gray-400 hover:text-white"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                                {league.teamsList.map(teamName => {
                                  const isTeamSub = subscribedTeams.includes(teamName);
                                  return (
                                    <button
                                      key={`nested-team-${teamName}`}
                                      type="button"
                                      onClick={() => handleToggleTeamSubscription(teamName, league.name)}
                                      className={`px-2 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                                        isTeamSub 
                                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' 
                                          : 'bg-zinc-900 border-zinc-800 text-gray-300 hover:text-white'
                                      }`}
                                    >
                                      <span>🛡️ {teamName}</span>
                                      <span className="text-[10px]">{isTeamSub ? '🔔' : '➕'}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Expand / Contract List Toggle Button for Leagues */}
                  {filteredAvailableLeagues.length > 8 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setIsLeaguesExpanded(!isLeaguesExpanded)}
                        className="w-full sm:w-auto px-4 py-1.5 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 text-emerald-400 hover:text-emerald-300 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isLeaguesExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>{language === 'en' ? `Contract (Show Fewer Leagues)` : `Funga (Onyesha Ligi Chache)`}</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>{language === 'en' ? `Expand (Show All ${filteredAvailableLeagues.length} Leagues)` : `Panua (Onyesha Ligi Zote ${filteredAvailableLeagues.length})`}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. Filtered Teams Section */}
          {(subscriptionFilterMode === 'all' || subscriptionFilterMode === 'teams') && filteredAvailableTeams.length > 0 && (
            <div className="space-y-2 bg-zinc-900/30 border border-zinc-850 rounded-xl p-3 transition-all">
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 uppercase tracking-wider font-bold">
                <button
                  type="button"
                  onClick={() => setIsTeamsCollapsed(!isTeamsCollapsed)}
                  className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Available Teams' : 'Timu Zinazopatikana'} ({filteredAvailableTeams.length})</span>
                  {isTeamsCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-[10px] font-normal lowercase hidden sm:inline">click team to subscribe/unsubscribe</span>
                  <button
                    type="button"
                    onClick={() => setIsTeamsCollapsed(!isTeamsCollapsed)}
                    className="text-[10px] font-mono text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 cursor-pointer"
                  >
                    {isTeamsCollapsed ? (language === 'en' ? 'Expand Section' : 'Panua') : (language === 'en' ? 'Contract Section' : 'Funga')}
                  </button>
                </div>
              </div>

              {!isTeamsCollapsed && (
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap gap-2">
                    {(isTeamsExpanded ? filteredAvailableTeams : filteredAvailableTeams.slice(0, 12)).map((team) => {
                      const isSubscribed = subscribedTeams.includes(team.name);
                      return (
                        <button
                          key={`sub-team-${team.name}`}
                          type="button"
                          onClick={() => handleToggleTeamSubscription(team.name, team.league)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-2 border ${
                            isSubscribed
                              ? 'bg-blue-500/15 border-blue-500/50 text-blue-300 shadow-[0_0_12px_-2px_rgba(59,130,246,0.3)] hover:bg-blue-500/25'
                              : 'bg-zinc-900/90 border-zinc-800 text-gray-400 hover:text-white hover:border-zinc-700'
                          }`}
                        >
                          <span className="text-blue-400 font-mono">🛡️</span>
                          <span>{team.name}</span>
                          {team.league && (
                            <span className="text-[10px] font-mono text-gray-500 truncate max-w-[90px]">
                              {team.league}
                            </span>
                          )}
                          <span className="text-xs">{isSubscribed ? '🔔' : '🔕'}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Expand / Contract List Toggle Button for Teams */}
                  {filteredAvailableTeams.length > 12 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setIsTeamsExpanded(!isTeamsExpanded)}
                        className="w-full sm:w-auto px-4 py-1.5 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 text-blue-400 hover:text-blue-300 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isTeamsExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>{language === 'en' ? `Contract (Show Fewer Teams)` : `Funga (Onyesha Timu Chache)`}</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>{language === 'en' ? `Expand (Show All ${filteredAvailableTeams.length} Teams)` : `Panua (Onyesha Timu Zote ${filteredAvailableTeams.length})`}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty State when Search Query has no matches */}
          {filteredAvailableLeagues.length === 0 && filteredAvailableTeams.length === 0 && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 text-center space-y-2">
              <div className="text-2xl">🔍</div>
              <div className="text-xs font-semibold text-gray-300">
                {subscriptionSearchQuery 
                  ? (language === 'en' ? `No leagues or teams found matching "${subscriptionSearchQuery}"` : `Hakuna ligi au timu zilizopatikana zenye jina "${subscriptionSearchQuery}"`)
                  : (language === 'en' ? 'No active leagues or teams available to subscribe' : 'Hakuna ligi au timu hai zilizopo kwa sasa')}
              </div>
              {subscriptionSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSubscriptionSearchQuery('');
                    setSubscriptionFilterMode('all');
                  }}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-semibold rounded-lg border border-zinc-700 transition-colors cursor-pointer"
                >
                  {language === 'en' ? 'Clear Search & Show All' : 'Futa Utafutaji & Onyesha Zote'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 1. DAILY ACCUMULATORS ROW */}
      <div className="space-y-4">
        <div className="flex justify-between items-baseline">
          <div>
            <h3 className="text-xl font-sans font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              {t.eliteAccas}
            </h3>
            <p className="text-xs text-gray-400">{t.eliteAccasDesc}</p>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30">
            {t.combinedOddsBoosted}
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {accumulators.map((acca) => {
            // All accumulators are masked and locked until payment is verified or user has active pass
            const isAccaLocked = !isUnlocked;

            return (
              <div 
                key={acca.id}
                className={`relative overflow-hidden rounded-2xl border transition-all flex flex-col justify-between h-full bg-zinc-900 ${
                  acca.type === 'safe' 
                    ? 'border-emerald-500/20 hover:border-emerald-500/30'
                    : acca.type === 'balanced'
                    ? 'border-blue-500/20 hover:border-blue-500/30'
                    : 'border-purple-500/20 hover:border-purple-500/30'
                }`}
              >
                {/* Header detail */}
                <div className={`p-5 border-b border-zinc-800 space-y-1 ${
                  acca.type === 'safe' 
                    ? 'bg-gradient-to-r from-emerald-950/20 to-transparent'
                    : acca.type === 'balanced'
                    ? 'bg-gradient-to-r from-blue-950/20 to-transparent'
                    : 'bg-gradient-to-r from-purple-950/20 to-transparent'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-bold font-mono tracking-wider uppercase px-2 py-0.5 rounded-full ${
                      acca.type === 'safe'
                        ? 'bg-emerald-950 text-emerald-400'
                        : acca.type === 'balanced'
                        ? 'bg-blue-950 text-blue-400'
                        : 'bg-purple-950 text-purple-400'
                    }`}>
                      {acca.type.replace('_', ' ')} ACCA
                    </span>
                    <span className="text-xs font-mono text-gray-500">
                      {acca.date}
                    </span>
                  </div>
                  <h4 className="text-base font-sans font-bold text-white mt-1">
                    {acca.title}
                  </h4>
                </div>

                {/* List of matches in accumulator */}
                <div className="p-5 space-y-4 flex-grow relative">
                  {isAccaLocked ? (
                    /* Blur lock overlay */
                    <div className="absolute inset-0 backdrop-blur-[6px] bg-zinc-950/70 flex flex-col items-center justify-center p-6 text-center z-10 space-y-4">
                      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-full">
                        <Lock className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="space-y-1.5">
                        <h5 className="text-sm font-bold text-white">VIP Accumulator Locked</h5>
                        <p className="text-[11px] text-gray-400 max-w-[200px] leading-relaxed mx-auto">
                          Unlock daily odds between 3.50 and 10.00 by activating Premium.
                        </p>
                      </div>
                      <button
                        onClick={onNavigateToBilling}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold py-1.5 px-3.5 rounded-lg transition-all cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
                      >
                        Unlock VIP Predictions
                      </button>
                    </div>
                  ) : null}

                  {/* Leg details */}
                  <div className="space-y-3.5">
                    {acca.predictions.map((leg, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => !isAccaLocked && setSelectedPrediction(leg)}
                        className={`text-left border border-zinc-800/80 p-3 rounded-xl flex justify-between items-center transition-colors ${
                          !isAccaLocked ? 'hover:bg-zinc-800/40 cursor-pointer hover:border-zinc-700/60' : 'opacity-85'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {leg.match.league}
                          </div>
                          <div className="text-xs font-semibold text-gray-200">
                            {leg.match.homeTeam} vs {leg.match.awayTeam}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center flex-wrap gap-x-2 gap-y-1">
                            {isAccaLocked ? (
                              <span className="text-amber-400 font-mono text-[11px] flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>{language === 'sw' ? 'Uchaguzi Umefungwa' : 'Pick Locked (VIP)'}</span>
                              </span>
                            ) : (
                              <>
                                <span>Pick: <span className="text-emerald-400 font-medium">{leg.pick}</span></span>
                                {(() => {
                                  const risk = getRiskInfo(leg.odds, leg.analysisCriteria?.injuryImpact, t);
                                  return (
                                    <span className={`text-[8px] font-mono font-bold px-1 rounded-sm border ${risk.colorClass} flex items-center gap-0.5`}>
                                      {risk.label}
                                    </span>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-right">
                            {isAccaLocked ? (
                              <span className="text-xs font-mono font-bold text-amber-400">
                                🔒 VIP
                              </span>
                            ) : (
                              <>
                                <div className={`text-xs font-mono font-bold ${getOddsColorClass(leg.odds, "text-white")}`}>
                                  @{leg.odds.toFixed(2)}
                                </div>
                                <div className="text-[9px] text-emerald-500 font-mono">
                                  {leg.confidence}% Conf
                                </div>
                              </>
                            )}
                          </div>

                          {!isAccaLocked && (
                            <button
                              type="button"
                              onClick={(e) => {
                                togglePredictionSelection(leg, e);
                              }}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                                selectedPredictionIds.includes(leg.id)
                                  ? 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-sm shadow-emerald-500/30 scale-105'
                                  : 'bg-zinc-950 hover:bg-emerald-500/20 text-emerald-400 border-zinc-800 hover:border-emerald-500/50'
                              }`}
                              title={selectedPredictionIds.includes(leg.id) ? (language === 'sw' ? "Ondoa kwenye jamvi" : "Remove from custom betslip") : (language === 'sw' ? "Weka mechi hii kwenye jamvi lako (+)" : "Add this pick to custom betslip builder (+)")}
                            >
                              {selectedPredictionIds.includes(leg.id) ? (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              ) : (
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Leg Rating trigger / Inline Form */}
                  {!isAccaLocked && (
                    <div className="mt-4 pt-4 border-t border-zinc-800/60 space-y-3">
                      {activeAccaFeedbackId === acca.id ? (
                        <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 space-y-3 text-left">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-300 font-sans uppercase">
                              {language === 'sw' ? 'Tathmini ACCA Hii' : 'Rate this ACCA'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveAccaFeedbackId(null);
                                setFeedbackRating(0);
                                setFeedbackComment('');
                                setFeedbackStatus('idle');
                              }}
                              className="text-[10px] text-gray-500 hover:text-white cursor-pointer bg-transparent border-0"
                            >
                              {language === 'sw' ? 'Ghairi' : 'Cancel'}
                            </button>
                          </div>

                          {feedbackStatus === 'success' ? (
                            <div className="text-center py-2 space-y-1">
                              <span className="text-xs text-emerald-400 font-bold block">✓ {language === 'sw' ? 'Imetumwa!' : 'Feedback Saved!'}</span>
                              <p className="text-[9px] text-gray-400">
                                {language === 'sw' ? 'Asante kwa kutoa maoni yako.' : 'Thank you for helping train our AI.'}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {/* Star Row */}
                              <div className="flex justify-center gap-1.5">
                                {[1, 2, 3, 4, 5].map((star) => {
                                  const isLit = star <= (feedbackHoverRating || feedbackRating);
                                  return (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => setFeedbackRating(star)}
                                      onMouseEnter={() => setFeedbackHoverRating(star)}
                                      onMouseLeave={() => setFeedbackHoverRating(0)}
                                      className="text-xl transition-all cursor-pointer duration-150 bg-transparent border-0"
                                    >
                                      <span className={isLit ? 'text-amber-400' : 'text-zinc-800'}>★</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Comment Box */}
                              <input
                                type="text"
                                value={feedbackComment}
                                onChange={(e) => setFeedbackComment(e.target.value)}
                                maxLength={100}
                                placeholder={language === 'sw' ? 'Maoni yako (Hiari)...' : 'Optional comments...'}
                                className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-[11px] text-white transition-colors placeholder-gray-600"
                              />

                              {/* Submit button */}
                              <button
                                type="button"
                                disabled={isFeedbackSubmitting || feedbackRating === 0}
                                onClick={() => handleSubmitFeedback(acca.id, 'accumulator', acca.title)}
                                className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all border-0 ${
                                  feedbackRating === 0
                                    ? 'bg-zinc-800 text-gray-500 cursor-not-allowed'
                                    : 'bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer'
                                }`}
                              >
                                {isFeedbackSubmitting ? (language === 'sw' ? 'Inatuma...' : 'Sending...') : (language === 'sw' ? 'Tuma Tathmini' : 'Submit Rating')}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAccaFeedbackId(acca.id);
                            setFeedbackRating(0);
                            setFeedbackComment('');
                            setFeedbackStatus('idle');
                          }}
                          className="w-full flex items-center justify-center gap-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-gray-300 hover:text-white text-[10px] font-semibold py-1.5 px-3 rounded-xl transition-all cursor-pointer"
                        >
                          <span className="text-amber-400">★</span>
                          <span>{language === 'sw' ? 'Tathmini ACCA Hii' : 'Rate this ACCA'}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer totals */}
                <div className="p-5 border-t border-zinc-800 bg-zinc-950/40 rounded-b-2xl flex justify-between items-center text-sm">
                  <div>
                    <span className="text-xs text-gray-500">Combined Odds:</span>
                    <div className="text-lg font-mono font-bold text-white">
                      @{acca.totalOdds.toFixed(2)}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-500">Combined Confidence:</span>
                    <div className="text-sm font-mono font-bold text-emerald-400">
                      {acca.combinedConfidence}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ACCUMULATOR RETURN CALCULATOR WIDGET */}
        {accumulators && accumulators.length > 0 && (() => {
          const currentCalcAcca = accumulators.find(a => a.id === selectedAccaId) || accumulators[0];
          const isAccaLocked = !isUnlocked;
          const odds = currentCalcAcca?.totalOdds || 1.0;
          const parsedStake = parseFloat(stakeInput) || 0;
          const potentialReturns = parsedStake * odds;
          const potentialProfit = Math.max(0, potentialReturns - parsedStake);

          return (
            <div className="bg-gradient-to-br from-zinc-950 to-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 mt-6 space-y-6 shadow-xl" id="acca-calculator-widget">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-950/50 border border-emerald-900/30 rounded-xl text-emerald-400">
                    <Calculator className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-sans font-extrabold text-white flex items-center gap-1.5">
                      Acca Staking & Returns Simulator
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">UTILITY</span>
                    </h4>
                    <p className="text-[11px] text-gray-400">Simulate stakes, check total multipliers, and forecast net profit yields on elite combinations.</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800 w-fit">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  Dynamic Multipliers Active
                </div>
              </div>

              <div className="grid md:grid-cols-12 gap-6">
                {/* Left controls column */}
                <div className="md:col-span-7 space-y-5">
                  {/* Step 1: Select Accumulator */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold font-mono uppercase tracking-wider text-gray-400 block">
                      1. Select Your Target Accumulator
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {accumulators.map((acca) => {
                        const isSelected = selectedAccaId 
                          ? selectedAccaId === acca.id 
                          : accumulators[0].id === acca.id;
                        const isLocked = !isUnlocked;
                        return (
                          <button
                            key={`calc-select-${acca.id}`}
                            onClick={() => setSelectedAccaId(acca.id)}
                            className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all flex flex-col justify-between gap-1.5 h-full ${
                              isSelected
                                ? acca.type === 'safe'
                                  ? 'bg-emerald-950/30 border-emerald-500 text-emerald-300'
                                  : acca.type === 'balanced'
                                  ? 'bg-blue-950/30 border-blue-500 text-blue-300'
                                  : 'bg-purple-950/30 border-purple-500 text-purple-300'
                                : 'bg-zinc-900/30 border-zinc-800/80 hover:border-zinc-750 text-gray-400'
                            }`}
                          >
                            <span className="text-[8px] font-bold font-mono uppercase tracking-wider block leading-none">
                              {acca.type.replace('_', ' ')}
                            </span>
                            <div className="flex items-center justify-between gap-1 w-full mt-0.5">
                              <span className="text-[11px] font-bold truncate max-w-[80%] leading-none text-white">
                                {acca.title.replace('Aggregated Live ', '').replace('Consensus Expert ', '')}
                              </span>
                              {isLocked && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                            </div>
                            <span className="text-[10px] font-mono mt-1 font-extrabold leading-none text-gray-300">
                              @{acca.totalOdds.toFixed(2)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Currency & Stake Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[10px] font-bold font-mono uppercase tracking-wider text-gray-400 block">
                        2. Set Your Stake Size
                      </label>
                      <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded border border-zinc-850">
                        {['$', '€', '£', 'KES', 'GHS', 'NGN'].map((curr) => (
                          <button
                            key={curr}
                            onClick={() => setSelectedCurrency(curr)}
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                              selectedCurrency === curr
                                ? 'bg-emerald-500 text-black font-extrabold'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            {curr}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-mono font-bold text-sm">
                        {selectedCurrency}
                      </div>
                      <input
                        name="accumulator_stake_amount"
                        type="number"
                        min="1"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-form-type="other"
                        value={stakeInput}
                        onChange={(e) => setStakeInput(e.target.value)}
                        placeholder="Enter simulated stake..."
                        className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                      />
                    </div>

                    {/* Quick preset pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[10, 20, 50, 100, 200, 500].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setStakeInput(preset.toString())}
                          className="text-[10px] font-mono font-medium px-2.5 py-1 bg-zinc-900/80 hover:bg-zinc-800 text-gray-300 rounded-lg border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
                        >
                          +{selectedCurrency}{preset}
                        </button>
                      ))}
                      <button
                        onClick={() => setStakeInput('')}
                        className="text-[10px] font-mono font-medium px-2.5 py-1 bg-red-950/20 hover:bg-red-950/40 text-red-400 rounded-lg border border-red-900/20 cursor-pointer transition-colors ml-auto"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right yield column */}
                <div className="md:col-span-5 bg-zinc-950/40 border border-zinc-850 p-5 rounded-xl flex flex-col justify-between gap-4 relative overflow-hidden">
                  <div className="space-y-4">
                    <span className="text-[9px] font-bold font-mono text-gray-500 uppercase tracking-wider block">
                      Forecasted Return Breakdown
                    </span>

                    {/* Return breakdown */}
                    <div className="grid grid-cols-2 gap-4 border-b border-zinc-900 pb-3">
                      <div>
                        <span className="text-[9px] text-gray-400 font-mono">Combined Multiplier</span>
                        <div className="text-base font-mono font-extrabold text-white mt-0.5">
                          @{odds.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 font-mono">Combined Confidence</span>
                        <div className="text-base font-mono font-extrabold text-emerald-400 mt-0.5">
                          {currentCalcAcca?.combinedConfidence}%
                        </div>
                      </div>
                    </div>

                    {/* Payout highlights */}
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-gray-400">Potential Payout:</span>
                        <span className="text-sm font-mono font-extrabold text-white">
                          {selectedCurrency}{potentialReturns.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline border-t border-zinc-900/60 pt-2">
                        <span className="text-xs text-gray-400">Simulated Net Profit:</span>
                        <span className="text-base font-mono font-extrabold text-emerald-400">
                          {selectedCurrency}{potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Locked status banner & upsell */}
                  {isAccaLocked ? (
                    <div className="bg-amber-950/20 border border-amber-900/20 rounded-lg p-2.5 text-center space-y-1.5">
                      <div className="text-[10px] text-amber-400 font-medium leading-normal">
                        🔒 VIP Leg Details are locked for your account level.
                      </div>
                      <button
                        onClick={onNavigateToBilling}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-extrabold py-1 rounded transition-colors cursor-pointer"
                      >
                        Unlock VIP Predictions
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-950/20 border border-emerald-900/20 rounded-lg p-2.5 flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-[9px] text-gray-400 leading-normal">
                        <span className="text-emerald-400 font-bold block">Consensus legs verified.</span>
                        Stake wisely. Staking Guard suggests keeping high-confidence accumulators under 5% of total bankroll.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 2. DAILY TRENDING TIPS HIGHLIGHT */}
      {trendingTips.length > 0 && (
        <div className="space-y-4 animate-fadeIn" id="daily-tips-section">
          <div className="flex justify-between items-baseline">
            <div>
              <h3 className="text-xl font-sans font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Today's Top-Trending Daily Tips
              </h3>
              <p className="text-xs text-gray-400">High-momentum, mathematically optimized selections trending across all sports</p>
            </div>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 px-2.5 py-0.5 rounded border border-amber-900/30 flex items-center gap-1">
              <Activity className="w-3 h-3 text-amber-400 animate-pulse" /> Hot Picks
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {trendingTips.map((tip) => (
              <TiltCard 
                key={`trending-${tip.id}`}
                className="bg-zinc-900 border border-zinc-800/80 hover:border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden group cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] bg-emerald-950/60 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded border border-emerald-900/40 uppercase tracking-wider">
                        {tip.match.sport} • {tip.match.league}
                      </span>
                      {tip.dataSource === 'statistical-engine' && (
                        <span className="text-[8px] bg-emerald-950/80 text-emerald-300 font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-800/60">
                          📊 Poisson
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const risk = getRiskInfo(tip.odds, tip.analysisCriteria?.injuryImpact, t);
                        return (
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${risk.colorClass} flex items-center gap-1`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${risk.dotClass} animate-pulse`}></span>
                            {risk.label}
                          </span>
                        );
                      })()}
                      <span className="text-[10px] font-mono text-amber-400 font-semibold bg-amber-950/20 px-2 py-0.5 rounded">
                        🔥 {tip.confidence}% Conf
                      </span>
                      
                      {/* Bookmark Icon Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBookmark(tip);
                        }}
                        className={`p-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer ${
                          savedPredictions.some(sp => sp.predictionId === tip.id)
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                            : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                        }`}
                        title={savedPredictions.some(sp => sp.predictionId === tip.id) ? 'Bookmarked' : 'Bookmark prediction'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${savedPredictions.some(sp => sp.predictionId === tip.id) ? 'fill-current animate-pulse' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-grow min-w-0">
                      <h4 className="text-sm font-bold text-white font-sans truncate">
                        {tip.match.homeTeam} vs {tip.match.awayTeam}
                      </h4>
                      {isUnlocked ? (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2 min-h-[2rem] leading-relaxed">
                          {tip.aiExplanation}
                        </p>
                      ) : (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-400/90 font-mono bg-amber-950/20 border border-amber-900/30 p-2 rounded-lg min-h-[2rem]">
                          <Lock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                          <span>{language === 'sw' ? 'Uchambuzi umefungwa. Lipa kupata utabiri kamili.' : 'AI analysis locked. Pay or activate pass to reveal verdict.'}</span>
                        </div>
                      )}
                    </div>
                    {/* Circular Progress Confidence Gauge */}
                    <div className="shrink-0 flex flex-col items-center gap-1">
                      <div className="relative w-10 h-10 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle
                            cx="18"
                            cy="18"
                            r="15"
                            className="text-zinc-800"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="transparent"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="15"
                            className="text-emerald-400 transition-all duration-500 ease-out"
                            strokeWidth="3.5"
                            strokeDasharray="94.25"
                            strokeDashoffset={94.25 - (94.25 * tip.confidence) / 100}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] font-mono font-bold text-white leading-none">
                            {tip.confidence}%
                          </span>
                        </div>
                      </div>
                      <span className="text-[7px] font-mono text-gray-500 uppercase tracking-wider">
                        {language === 'sw' ? 'UHAKIKA' : 'CONF'}
                      </span>
                    </div>
                  </div>

                  {/* Win Probability Bar */}
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-gray-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                        {t.winProbability || "Win Probability"}
                      </span>
                      <span className="font-bold text-emerald-400 font-mono flex items-center gap-1 bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded text-[10px]">
                        {tip.probability || tip.confidence}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden p-[1px] relative">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 transition-all duration-500 relative"
                        style={{ width: `${tip.probability || tip.confidence}%` }}
                      >
                        {/* Glow effect at the tip of the progress bar */}
                        <span className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full blur-[1px] animate-pulse" />
                      </div>
                    </div>

                    {/* Momentum Sparkline Line Chart */}
                    <div className="pt-2.5 space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                        <span>{language === 'sw' ? 'Mwelekeo wa Ushindi (Mechi 5)' : 'Win Probability Momentum (Last 5)'}</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          {language === 'sw' ? 'Kasi' : 'Momentum'}
                        </span>
                      </div>
                      <div className="h-10 w-full bg-zinc-950/40 border border-zinc-900 rounded-xl p-2 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-zinc-500">
                            {getHistoricalProbabilityData(tip.id, tip.probability || tip.confidence)[0].probability}%
                          </span>
                          <span className="text-[10px] text-zinc-600 font-mono">→</span>
                          <span className="text-[10px] font-mono font-extrabold text-emerald-400">
                            {tip.probability || tip.confidence}%
                          </span>
                        </div>
                        <div className="h-full flex-grow max-w-[140px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={getHistoricalProbabilityData(tip.id, tip.probability || tip.confidence)}>
                              <XAxis dataKey="match" hide />
                              <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
                              <Tooltip
                                cursor={false}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-zinc-950 border border-zinc-850 text-[10px] px-2 py-1 rounded-lg font-mono text-white shadow-2xl">
                                        Match {payload[0].payload.matchNum}: <span className="text-emerald-400 font-bold">{payload[0].value}%</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="probability" 
                                stroke="#10b981" 
                                strokeWidth={2} 
                                dot={{ r: 2.5, stroke: '#10b981', strokeWidth: 1, fill: '#09090b' }}
                                activeDot={{ r: 3.5, stroke: '#10b981', strokeWidth: 1.5, fill: '#10b981' }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Expert Insight Panel */}
                    {tip.analysisCriteria && (
                      <div className="pt-2.5 border-t border-zinc-800/40 mt-2.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                          <Sparkles className="w-3 h-3 text-emerald-400 shrink-0 animate-pulse" />
                          <span>{t.expertInsight || "Expert AI Insight"}</span>
                        </div>
                        {isUnlocked ? (
                          <div className="bg-zinc-950/40 border border-zinc-850/60 p-2.5 rounded-xl space-y-1.5 text-[10.5px] leading-relaxed text-gray-300 font-sans">
                            <div>
                              <span className="text-emerald-400 font-bold mr-1">{language === 'sw' ? 'Fomu:' : 'Form:'}</span>
                              <span>{tip.analysisCriteria.formAnalysis}</span>
                            </div>
                            {tip.analysisCriteria.injuryImpact && (
                              <div>
                                <span className="text-amber-400 font-bold mr-1">{language === 'sw' ? 'Majeruhi:' : 'Injuries:'}</span>
                                <span>{tip.analysisCriteria.injuryImpact}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-zinc-950/40 border border-zinc-850/60 p-2.5 rounded-xl flex items-center justify-between text-[10px] font-mono text-gray-400">
                            <span className="flex items-center gap-1 text-amber-400">
                              <Lock className="w-3 h-3" />
                              {language === 'sw' ? 'Mchanganuo wa Fomu & Majeruhi Umefungwa' : 'Form & Tactical Model Locked'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-zinc-800/80 pt-4 flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isUnlocked && (
                      <button
                        type="button"
                        onClick={(e) => {
                          togglePredictionSelection(tip, e);
                        }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
                          selectedPredictionIds.includes(tip.id)
                            ? 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-sm shadow-emerald-500/40 scale-105'
                            : 'bg-zinc-950 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:border-emerald-400'
                        }`}
                        title={selectedPredictionIds.includes(tip.id) ? (language === 'sw' ? "Ondoa kwenye jamvi" : "Remove from custom betslip") : (language === 'sw' ? "Weka mechi hii kwenye jamvi lako (+)" : "Add this pick to custom betslip builder (+)")}
                      >
                        {selectedPredictionIds.includes(tip.id) ? (
                          <Check className="w-4 h-4 text-current stroke-[3]" />
                        ) : (
                          <Plus className="w-4 h-4 text-current stroke-[2.5]" />
                        )}
                      </button>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-gray-500 truncate">
                        Selection {tip.modelFairOdds ? '• Fair Odds' : ''}
                      </span>
                      {isUnlocked ? (
                        <span className="text-xs font-bold text-emerald-400 truncate" title={tip.pick}>
                          {tip.pick} <span className={getOddsColorClass(tip.modelFairOdds || tip.odds, "text-white")}>@{(tip.modelFairOdds || tip.odds).toFixed(2)}</span>
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                            <Lock className="w-3 h-3 text-amber-400" />
                            <span>{language === 'sw' ? 'Utabiri Umefungwa' : 'Pick Locked'}</span>
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToBilling();
                            }}
                            className="text-[10px] bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-2 py-0.5 rounded cursor-pointer shadow-sm transition-transform active:scale-95"
                          >
                            {language === 'sw' ? 'Fungua' : 'Unlock'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Share Action */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveShareMenuId(activeShareMenuId === tip.id ? null : tip.id);
                        }}
                        className="text-gray-400 hover:text-white p-2 bg-zinc-950 hover:bg-zinc-800 rounded-xl transition-all border border-zinc-800/60 cursor-pointer flex items-center justify-center"
                        title="Share Prediction"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                      </button>

                      {activeShareMenuId === tip.id && (
                        <div className="absolute bottom-full right-0 mb-2 bg-zinc-950 border border-zinc-800 rounded-xl p-1.5 shadow-2xl z-20 min-w-[170px] space-y-0.5">
                          <button
                            onClick={(e) => handleCopyPrediction(tip, e)}
                            className="w-full text-left text-[11px] font-medium font-sans text-gray-300 hover:text-white hover:bg-zinc-900 px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3 h-3 text-emerald-400" />
                            {copiedId === tip.id 
                              ? (language === 'sw' ? 'Imenakiliwa!' : 'Copied!') 
                              : (language === 'sw' ? 'Nakili Ujumbe' : 'Copy formatted text')}
                          </button>
                          <button
                            onClick={(e) => handleShareWhatsApp(tip, e)}
                            className="w-full text-left text-[11px] font-medium font-sans text-gray-300 hover:text-white hover:bg-zinc-900 px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            WhatsApp
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        if (!isUnlocked) {
                          e.stopPropagation();
                          onNavigateToBilling();
                          return;
                        }
                        togglePredictionSelection(tip, e);
                      }}
                      className={`text-xs font-sans font-semibold py-2 px-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        !isUnlocked
                          ? 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-amber-400'
                          : selectedPredictionIds.includes(tip.id)
                          ? 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-md shadow-emerald-500/20'
                          : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-gray-200 hover:border-emerald-500/50 hover:text-emerald-400'
                      }`}
                      title={!isUnlocked ? "Unlock to add to betslip" : (selectedPredictionIds.includes(tip.id) ? (language === 'sw' ? "Ondoa kwenye jamvi" : "Remove from custom betslip") : (language === 'sw' ? "Weka kwenye kibandiko cha dau (+)" : "Add to custom betslip builder (+)"))}
                    >
                      {!isUnlocked ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>VIP Bet</span>
                        </>
                      ) : selectedPredictionIds.includes(tip.id) ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>{t.inBetslip || t.selected}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                          <span>{t.addToBetslip || t.quickBet}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setSelectedPrediction(tip)}
                      className="bg-zinc-950 hover:bg-emerald-500 hover:text-black border border-zinc-800 hover:border-emerald-500 text-xs text-gray-300 font-sans font-semibold py-2 px-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 group-hover:border-emerald-500/40"
                    >
                      Analysis
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      )}

      {/* 3. TODAY'S INDIVIDUAL SPORTS PICKS */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-sans font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500" />
              Today's Best Matches & AI Analysis
            </h3>
            <p className="text-xs text-gray-400">Deep technical analysis of single matches. Click to view detailed criteria breakdown.</p>
          </div>

          {/* Sport Selector & Display Options Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Display Options Toggles */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={() => onToggleTheme()}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  theme === 'high-contrast'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20 font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-gray-300 hover:text-white'
                }`}
                title="Toggle High-Contrast Light vs Midnight Dark Theme"
              >
                {theme === 'high-contrast' ? '☀️ High Contrast' : '🌙 Midnight Dark'}
              </button>
            )}

            {onToggleDensity && (
              <button
                type="button"
                onClick={() => onToggleDensity()}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  displayDensity === 'compact'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-gray-300 hover:text-white'
                }`}
                title="Toggle Comfortable Spacing vs Compact Grid Density"
              >
                {displayDensity === 'compact' ? '⚡ Compact Grid' : '📐 Comfortable View'}
              </button>
            )}

            {onRestoreDefaults && (
              <button
                type="button"
                onClick={onRestoreDefaults}
                className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-gray-400 hover:text-white text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                title="Restore Default Display Mode (High Contrast & Comfortable Spacing)"
              >
                <span>↺</span>
                <span>{t.restoreDefaults || 'Restore Defaults'}</span>
              </button>
            )}

            {/* Sport Selector Pills */}
            <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl gap-1 overflow-x-auto">
              {[
                { id: 'all', label: 'All Matches' },
                { id: 'football', label: '⚽ Football' },
                { id: 'basketball', label: '🏀 Basketball' },
                { id: 'tennis', label: '🎾 Tennis' }
              ].map(pill => (
                <button
                  key={pill.id}
                  onClick={() => setSportFilter(pill.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    sportFilter === pill.id
                      ? 'bg-zinc-800 text-white font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List of individual match prediction cards */}
        <div className={`grid ${displayDensity === 'compact' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-5'}`}>
          {filteredPredictions.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto text-xl">
                🏟️
              </div>
              <h3 className="text-base font-bold text-white font-sans">
                {language === 'sw' ? 'Hakuna mechi halisi zijazo kwa sasa' : 'No verified upcoming games available'}
              </h3>
              <p className="text-xs text-gray-400 font-mono max-w-md mx-auto leading-relaxed">
                {language === 'sw' 
                  ? 'Mfumo wetu unathibitisha mechi zote kutoka kwenye vyanzo vya kuaminika vya michezo. Mechi zilizokamilika huondolewa kiotomatiki.' 
                  : 'Predictions are strictly connected to verified upcoming fixtures from live sports data providers. Completed, elapsed, or postponed fixtures are automatically retired.'}
              </p>
            </div>
          ) : (
            filteredPredictions.map((pred) => (
              <TiltCard 
                key={pred.id}
                onClick={() => setSelectedPrediction(pred)}
                className={`bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 ${displayDensity === 'compact' ? 'p-3.5 rounded-xl' : 'p-5 rounded-2xl'} relative overflow-hidden cursor-pointer`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] bg-zinc-950 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded border border-zinc-800 uppercase">
                        {pred.match.sport}
                      </span>
                      {pred.dataSource === 'statistical-engine' ? (
                        <span className="text-[9px] bg-emerald-950/80 text-emerald-300 font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1" title="Computed via Poisson distribution from verified match results">
                          📊 Poisson Engine
                        </span>
                      ) : pred.dataSource === 'api-football' ? (
                        <span className="text-[9px] bg-blue-950/80 text-blue-300 font-mono font-bold px-1.5 py-0.5 rounded border border-blue-800/60 flex items-center gap-1" title="Real-time fixture data from API-Football">
                          ⚡ API-Football
                        </span>
                      ) : (
                        <span className="text-[9px] bg-purple-950/80 text-purple-300 font-mono font-bold px-1.5 py-0.5 rounded border border-purple-800/60 flex items-center gap-1">
                          🤖 Verified Real Data
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 font-mono truncate max-w-[150px]">
                        {pred.match.league}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLeagueSubscription(pred.match.league);
                        }}
                        className={`p-1 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center border ${
                          subscribedLeagues.includes(pred.match.league)
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-zinc-950/60 border-zinc-850/80 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                        }`}
                        title={subscribedLeagues.includes(pred.match.league) ? 'Unsubscribe from league' : 'Subscribe to league'}
                      >
                        <Bell className={`w-3 h-3 ${subscribedLeagues.includes(pred.match.league) ? 'fill-emerald-400 text-emerald-400' : ''}`} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const risk = getRiskInfo(pred.odds, pred.analysisCriteria?.injuryImpact, t);
                        return (
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${risk.colorClass} flex items-center gap-1`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${risk.dotClass} animate-pulse`}></span>
                            {risk.label}
                          </span>
                        );
                      })()}
                      {pred.match.status === 'live' && (
                        <span className="bg-red-950/50 border border-red-500/20 text-red-500 text-[10px] font-bold font-mono px-2 py-0.5 rounded flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                          LIVE score: {pred.match.homeScore} - {pred.match.awayScore}
                        </span>
                      )}
                      
                      {/* Bookmark Icon Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBookmark(pred);
                        }}
                        className={`p-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer ${
                          savedPredictions.some(sp => sp.predictionId === pred.id)
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                            : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                        }`}
                        title={savedPredictions.some(sp => sp.predictionId === pred.id) ? 'Bookmarked' : 'Bookmark prediction'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${savedPredictions.some(sp => sp.predictionId === pred.id) ? 'fill-current animate-pulse' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Kickoff Date & Local Time Badge */}
                  {pred.match.startTime && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400/90 bg-zinc-950/70 border border-zinc-850/80 px-2 py-0.5 rounded-md w-fit">
                      <span className="text-zinc-500">🕒 Kickoff:</span>
                      <span className="font-semibold text-zinc-200">
                        {new Date(pred.match.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}, {new Date(pred.match.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[9px] text-zinc-500 uppercase">
                        ({Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace('_', ' ') || 'Local'})
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-grow min-w-0">
                      <h4 className="text-base font-bold text-white font-sans flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTeamSubscription(pred.match.homeTeam, pred.match.league);
                          }}
                          className={`text-left hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1 ${
                            subscribedTeams.includes(pred.match.homeTeam) ? 'text-emerald-400 font-black' : ''
                          }`}
                          title={subscribedTeams.includes(pred.match.homeTeam) ? 'Subscribed to team alerts (click to unsub)' : 'Click to subscribe to team alerts'}
                        >
                          <span>{pred.match.homeTeam}</span>
                          {subscribedTeams.includes(pred.match.homeTeam) && (
                            <span className="text-[10px] text-emerald-400">🔔</span>
                          )}
                        </button>
                        <span className="text-gray-500 font-normal text-xs px-0.5">vs</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTeamSubscription(pred.match.awayTeam, pred.match.league);
                          }}
                          className={`text-left hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1 ${
                            subscribedTeams.includes(pred.match.awayTeam) ? 'text-emerald-400 font-black' : ''
                          }`}
                          title={subscribedTeams.includes(pred.match.awayTeam) ? 'Subscribed to team alerts (click to unsub)' : 'Click to subscribe to team alerts'}
                        >
                          <span>{pred.match.awayTeam}</span>
                          {subscribedTeams.includes(pred.match.awayTeam) && (
                            <span className="text-[10px] text-emerald-400">🔔</span>
                          )}
                        </button>
                      </h4>
                      {isUnlocked ? (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                          {pred.aiExplanation}
                        </p>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-amber-400/90 font-mono bg-amber-950/20 border border-amber-900/30 p-2 rounded-lg mt-1">
                          <Lock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                          <span>{language === 'sw' ? 'Utabiri na odds zimefichwa hadi uthibitisho wa malipo.' : 'Prediction verdict & odds hidden until payment activation.'}</span>
                        </div>
                      )}
                    </div>
                    {/* Circular Progress Confidence Gauge */}
                    <div className="shrink-0 flex flex-col items-center gap-1">
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle
                            cx="18"
                            cy="18"
                            r="15"
                            className="text-zinc-800"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="transparent"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="15"
                            className="text-emerald-400 transition-all duration-500 ease-out"
                            strokeWidth="3.5"
                            strokeDasharray="94.25"
                            strokeDashoffset={94.25 - (94.25 * pred.confidence) / 100}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[11px] font-mono font-extrabold text-white leading-none">
                            {pred.confidence}%
                          </span>
                        </div>
                      </div>
                      <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider">
                        {language === 'sw' ? 'UHAKIKA' : 'CONFIDENCE'}
                      </span>
                    </div>
                  </div>

                  {/* Win Probability Bar */}
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-gray-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                        {t.winProbability || "Win Probability"}
                      </span>
                      <span className="font-bold text-emerald-400 font-mono flex items-center gap-1 bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded text-[10px]">
                        {pred.probability || pred.confidence}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden p-[1px] relative">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 transition-all duration-500 relative"
                        style={{ width: `${pred.probability || pred.confidence}%` }}
                      >
                        {/* Glow effect at the tip of the progress bar */}
                        <span className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full blur-[1px] animate-pulse" />
                      </div>
                    </div>

                    {/* Momentum Sparkline Line Chart */}
                    <div className="pt-2.5 space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                        <span>{language === 'sw' ? 'Mwelekeo wa Ushindi (Mechi 5)' : 'Win Probability Momentum (Last 5)'}</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          {language === 'sw' ? 'Kasi' : 'Momentum'}
                        </span>
                      </div>
                      <div className="h-10 w-full bg-zinc-950/40 border border-zinc-900 rounded-xl p-2 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-zinc-500">
                            {getHistoricalProbabilityData(pred.id, pred.probability || pred.confidence)[0].probability}%
                          </span>
                          <span className="text-[10px] text-zinc-600 font-mono">→</span>
                          <span className="text-[10px] font-mono font-extrabold text-emerald-400">
                            {pred.probability || pred.confidence}%
                          </span>
                        </div>
                        <div className="h-full flex-grow max-w-[140px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={getHistoricalProbabilityData(pred.id, pred.probability || pred.confidence)}>
                              <XAxis dataKey="match" hide />
                              <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
                              <Tooltip
                                cursor={false}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-zinc-950 border border-zinc-850 text-[10px] px-2 py-1 rounded-lg font-mono text-white shadow-2xl">
                                        Match {payload[0].payload.matchNum}: <span className="text-emerald-400 font-bold">{payload[0].value}%</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="probability" 
                                stroke="#10b981" 
                                strokeWidth={2} 
                                dot={{ r: 2.5, stroke: '#10b981', strokeWidth: 1, fill: '#09090b' }}
                                activeDot={{ r: 3.5, stroke: '#10b981', strokeWidth: 1.5, fill: '#10b981' }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Expert Insight Panel */}
                    {pred.analysisCriteria && (
                      <div className="pt-2.5 border-t border-zinc-800/40 mt-2.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                          <Sparkles className="w-3 h-3 text-emerald-400 shrink-0 animate-pulse" />
                          <span>{t.expertInsight || "Expert AI Insight"}</span>
                        </div>
                        {isUnlocked ? (
                          <div className="bg-zinc-950/40 border border-zinc-850/60 p-2.5 rounded-xl space-y-1.5 text-[10.5px] leading-relaxed text-gray-300 font-sans">
                            <div>
                              <span className="text-emerald-400 font-bold mr-1">{language === 'sw' ? 'Fomu:' : 'Form:'}</span>
                              <span>{pred.analysisCriteria.formAnalysis}</span>
                            </div>
                            {pred.analysisCriteria.injuryImpact && (
                              <div>
                                <span className="text-amber-400 font-bold mr-1">{language === 'sw' ? 'Majeruhi:' : 'Injuries:'}</span>
                                <span>{pred.analysisCriteria.injuryImpact}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-zinc-950/40 border border-zinc-850/60 p-2.5 rounded-xl flex items-center justify-between text-[10px] font-mono text-gray-400">
                            <span className="flex items-center gap-1 text-amber-400">
                              <Lock className="w-3 h-3" />
                              {language === 'sw' ? 'Mchanganuo wa Fomu & Majeruhi Umefungwa' : 'Form & Tactical Model Locked'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Statistical Model Key Factors */}
                    {pred.plainLanguageFactors && pred.plainLanguageFactors.length > 0 && (
                      <div className="pt-2 border-t border-zinc-850/50 mt-2 space-y-1">
                        <div className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <span>📐 Statistical Model Drivers:</span>
                        </div>
                        {isUnlocked ? (
                          <div className="space-y-0.5 pl-1 text-[10.5px] text-gray-300">
                            {pred.plainLanguageFactors.slice(0, 3).map((factor, fIdx) => (
                              <div key={fIdx} className="flex items-start gap-1.5 leading-snug">
                                <span className="text-emerald-400 text-xs font-bold shrink-0">•</span>
                                <span>{factor}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="pl-1 text-[10px] font-mono text-amber-400/80 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>{language === 'sw' ? 'Takwimu za Poisson zimefungwa' : 'Poisson parameters locked'}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-zinc-800/80 pt-3.5 flex justify-between items-center">
                  {isUnlocked ? (
                    <div className="grid grid-cols-3 gap-4 text-left items-center">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            if (!isUnlocked) {
                              e.stopPropagation();
                              onNavigateToBilling();
                              return;
                            }
                            togglePredictionSelection(pred, e);
                          }}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
                            selectedPredictionIds.includes(pred.id)
                              ? 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-sm shadow-emerald-500/40 scale-105'
                              : 'bg-zinc-950 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:border-emerald-400'
                          }`}
                          title={selectedPredictionIds.includes(pred.id) ? (language === 'sw' ? "Ondoa kwenye jamvi" : "Remove from custom betslip") : (language === 'sw' ? "Weka mechi hii kwenye jamvi lako (+)" : "Add this pick to custom betslip builder (+)")}
                        >
                          {selectedPredictionIds.includes(pred.id) ? (
                            <Check className="w-3.5 h-3.5 text-current stroke-[3]" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-current stroke-[2.5]" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <span className="text-[10px] text-gray-500 block leading-tight">Selection</span>
                          <span className="text-xs font-bold text-white truncate max-w-[95px] block leading-tight" title={pred.pick}>
                            {pred.pick}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">
                          {pred.modelFairOdds ? 'Model Fair Odds' : 'Odds'}
                        </span>
                        <span className={`text-xs font-mono font-bold ${getOddsColorClass(pred.modelFairOdds || pred.odds, "text-emerald-400")}`}>
                          @{ (pred.modelFairOdds || pred.odds).toFixed(2) }
                        </span>
                        {pred.impliedProbability && (
                          <span className="block text-[8px] font-mono text-gray-500">
                            {pred.impliedProbability}% imp.
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">Confidence</span>
                        <span className="text-xs font-mono font-bold text-white">
                          {pred.confidence}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-900/40">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{language === 'sw' ? 'Uchaguzi & Odds Zimefungwa' : 'Pick & Odds Locked'}</span>
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToBilling();
                        }}
                        className="text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-3 py-1 rounded-lg cursor-pointer shadow-sm transition-transform active:scale-95"
                      >
                        {language === 'sw' ? 'Lipa Kufungua' : 'Unlock Access'}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {/* Share Action */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveShareMenuId(activeShareMenuId === pred.id ? null : pred.id);
                        }}
                        className="text-gray-400 hover:text-white p-1.5 bg-zinc-950 hover:bg-zinc-800 rounded-lg transition-all border border-zinc-800/60 cursor-pointer flex items-center justify-center gap-1 text-[11px] font-sans"
                        title="Share Prediction"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline text-xs">Share</span>
                      </button>

                      {activeShareMenuId === pred.id && (
                        <div className="absolute bottom-full right-0 mb-2 bg-zinc-950 border border-zinc-800 rounded-xl p-1.5 shadow-2xl z-20 min-w-[170px] animate-fadeIn space-y-0.5">
                          <button
                            onClick={(e) => handleCopyPrediction(pred, e)}
                            className="w-full text-left text-[11px] font-medium font-sans text-gray-300 hover:text-white hover:bg-zinc-900 px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3 h-3 text-emerald-400" />
                            {copiedId === pred.id 
                              ? (language === 'sw' ? 'Imenakiliwa!' : 'Copied!') 
                              : (language === 'sw' ? 'Nakili Ujumbe' : 'Copy formatted text')}
                          </button>
                          <button
                            onClick={(e) => handleShareWhatsApp(pred, e)}
                            className="w-full text-left text-[11px] font-medium font-sans text-gray-300 hover:text-white hover:bg-zinc-900 px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            WhatsApp
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        if (!isUnlocked) {
                          e.stopPropagation();
                          onNavigateToBilling();
                          return;
                        }
                        togglePredictionSelection(pred, e);
                      }}
                      className={`text-[11px] font-sans font-semibold py-1.5 px-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        !isUnlocked
                          ? 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-amber-400'
                          : selectedPredictionIds.includes(pred.id)
                          ? 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-md shadow-emerald-500/20'
                          : 'bg-zinc-950 hover:bg-zinc-800 border-zinc-800/80 text-gray-200 hover:border-emerald-500/50 hover:text-emerald-400'
                      }`}
                      title={!isUnlocked ? "Unlock VIP Access" : (selectedPredictionIds.includes(pred.id) ? (language === 'sw' ? "Ondoa kwenye jamvi" : "Remove from custom betslip") : (language === 'sw' ? "Weka kwenye kibandiko cha dau (+)" : "Add to custom betslip builder (+)"))}
                    >
                      {!isUnlocked ? (
                        <>
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span>VIP Bet</span>
                        </>
                      ) : selectedPredictionIds.includes(pred.id) ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>{t.inBetslip || t.selected}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                          <span>{t.addToBetslip || t.quickBet}</span>
                        </>
                      )}
                    </button>

                    <span className="text-emerald-400 p-1.5 bg-zinc-950 rounded-lg hover:bg-zinc-800 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </TiltCard>
            ))
          )}
        </div>
      </div>

      {/* QUICK BET COMBINATOR & SUMMARY CARD */}
      {(() => {
        const selectedPredictions = allPoolPredictions.filter(p => selectedPredictionIds.includes(p.id));
        const combinedOdds = selectedPredictions.length > 0 
          ? selectedPredictions.reduce((acc, p) => acc * (p.modelFairOdds || p.odds), 1) 
          : 0;
        const avgConfidence = selectedPredictions.length > 0 
          ? Math.round(selectedPredictions.reduce((acc, p) => acc + p.confidence, 0) / selectedPredictions.length) 
          : 0;
        const parsedQuickBetStake = parseFloat(quickBetStake) || 0;
        const quickBetReturns = parsedQuickBetStake * combinedOdds;
        const quickBetProfit = Math.max(0, quickBetReturns - parsedQuickBetStake);

        return (
          <div className="bg-gradient-to-br from-zinc-950 to-zinc-900/80 border border-zinc-800/80 rounded-2xl p-6 mt-8 space-y-6 shadow-2xl relative overflow-hidden" id="custom-betslip-combinator">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-950/50 border border-emerald-900/30 rounded-xl text-emerald-400">
                  <Trophy className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-sans font-extrabold text-white flex items-center gap-1.5">
                    {t.quickBetSummaryTitle}
                    <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">
                      {selectedPredictions.length} {selectedPredictions.length === 1 ? (language === 'sw' ? 'MCHEZO' : 'LEG') : (language === 'sw' ? 'MICHEZO' : 'LEGS')}
                    </span>
                  </h4>
                  <p className="text-[11px] text-gray-400 font-sans">{t.quickBetSummaryDesc}</p>
                </div>
              </div>
              
              {selectedPredictions.length > 0 && (
                <button
                  onClick={() => setSelectedPredictionIds([])}
                  className="text-[10px] font-mono font-bold text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 px-3 py-1.5 rounded-lg border border-red-900/20 cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  {t.clearSelections}
                </button>
              )}
            </div>

            {selectedPredictions.length === 0 ? (
              <div className="text-center py-10 px-4 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-2">
                <Sparkles className="w-8 h-8 text-emerald-500/40 mx-auto" />
                <p className="text-xs font-sans text-gray-400 max-w-md mx-auto leading-relaxed">
                  {t.quickBetEmpty}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-12 gap-6">
                {/* Selections List Column (7/12) */}
                <div className="md:col-span-7 space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-gray-500 block">
                    {t.selectedLegs}
                  </span>
                  <div className="space-y-2">
                    {selectedPredictions.map((pred) => (
                      <div 
                        key={`quick-bet-item-${pred.id}`}
                        className="bg-zinc-950/50 border border-zinc-800/80 p-3.5 rounded-xl flex items-center justify-between gap-4 transition-all hover:border-zinc-750/60"
                      >
                        <div className="space-y-1 min-w-0 flex-grow">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] bg-zinc-900 text-gray-400 font-mono font-bold px-1.5 py-0.5 rounded uppercase border border-zinc-800">
                              {pred.match.sport}
                            </span>
                            <span className="text-[9px] text-gray-500 font-mono truncate">{pred.match.league}</span>
                          </div>
                          <h5 className="text-xs font-bold text-white truncate font-sans">
                            {pred.match.homeTeam} vs {pred.match.awayTeam}
                          </h5>
                          <p className="text-[11px] text-gray-400 font-sans">
                            Recommendation: <span className="text-emerald-400 font-bold">{pred.pick}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-[9px] text-gray-500 block uppercase font-mono leading-none mb-1">Odds</span>
                            <span className={`text-xs font-mono font-bold ${getOddsColorClass(pred.odds, "text-emerald-400")}`}>
                              @{pred.odds.toFixed(2)}
                            </span>
                          </div>
                          <button
                            onClick={(e) => togglePredictionSelection(pred.id, e)}
                            className="p-1.5 bg-red-950/10 hover:bg-red-950/30 border border-red-900/10 hover:border-red-900/30 text-red-400 hover:text-red-300 rounded-lg cursor-pointer transition-colors"
                            title="Remove selection"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Odds & Calculations Column (5/12) */}
                <div className="md:col-span-5 bg-zinc-950/40 border border-zinc-850 p-5 rounded-xl flex flex-col justify-between gap-4">
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold font-mono text-gray-500 uppercase tracking-wider block">
                      {t.simulatedAccaReturn}
                    </span>

                    {/* Return breakdown */}
                    <div className="grid grid-cols-2 gap-4 border-b border-zinc-900 pb-3">
                      <div>
                        <span className="text-[9px] text-gray-400 font-mono">{t.combinedOdds}</span>
                        <div className="text-lg font-mono font-extrabold text-white mt-0.5">
                          @{combinedOdds.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 font-mono">{t.avgConfidence}</span>
                        <div className="text-lg font-mono font-extrabold text-emerald-400 mt-0.5">
                          {avgConfidence}%
                        </div>
                      </div>
                    </div>

                    {/* Stake Input */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <label className="text-[9px] font-bold font-mono uppercase tracking-wider text-gray-400">
                          {t.simulatedStake}
                        </label>
                        <span className="text-[9px] font-mono text-gray-400">Currency: {selectedCurrency}</span>
                      </div>
                      <input
                        name="quick_bet_stake_amount"
                        type="number"
                        min="1"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-form-type="other"
                        value={quickBetStake}
                        onChange={(e) => setQuickBetStake(e.target.value)}
                        placeholder="Enter custom stake..."
                        className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                      />
                      {/* Preset quick pills */}
                      <div className="flex flex-wrap gap-1">
                        {[10, 20, 50, 100, 250, 500].map((preset) => (
                          <button
                            key={`quick-bet-preset-${preset}`}
                            onClick={() => setQuickBetStake(preset.toString())}
                            className="text-[9px] font-mono px-2 py-0.5 bg-zinc-900/80 hover:bg-zinc-800 text-gray-300 rounded-md border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
                          >
                            +{selectedCurrency}{preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Return values */}
                    <div className="space-y-2 pt-2 border-t border-zinc-900/60">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-gray-400">{t.potentialPayout}:</span>
                        <span className="text-xs font-mono font-extrabold text-white">
                          {selectedCurrency}{quickBetReturns.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline border-t border-zinc-900/40 pt-2">
                        <span className="text-xs text-gray-400">{t.simulatedNetProfit}:</span>
                        <span className="text-sm font-mono font-extrabold text-emerald-400">
                          {selectedCurrency}{quickBetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Share Slip Button */}
                  <button
                    onClick={() => {
                      const legTexts = selectedPredictions.map(p => `• ${p.match.homeTeam} vs ${p.match.awayTeam} (${p.pick} @ ${p.odds.toFixed(2)})`).join('\n');
                      const shareText = `🎯 My Custom Quick Bet Accumulator (${selectedPredictions.length} Legs)\n\n${legTexts}\n\n🔥 Combined Odds: @${combinedOdds.toFixed(2)}\n📊 Average Confidence: ${avgConfidence}%\n\nCreated on Rafiki Predict! Join today for premium AI-powered consensus tips.`;
                      navigator.clipboard.writeText(shareText);
                      setCustomAccaCopied(true);
                      setTimeout(() => setCustomAccaCopied(false), 3000);
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(16,185,129,0.15)] hover:shadow-[0_4px_14px_rgba(16,185,129,0.3)]"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    {customAccaCopied ? t.copiedSlip : t.shareCustomAcca}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 3. AI EXPLANATION MODAL (DEEP CRITERIA BREAKDOWN) */}
      <AnimatePresence>
        {selectedPrediction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPrediction(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-10"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-800 flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] bg-zinc-950 border border-zinc-800 font-mono px-2 py-0.5 rounded text-emerald-400 font-bold uppercase tracking-wide">
                    {selectedPrediction.match.sport} AI analysis
                  </span>
                  <h4 className="text-lg font-bold text-white font-sans mt-1.5">
                    {selectedPrediction.match.homeTeam} vs {selectedPrediction.match.awayTeam}
                  </h4>
                  <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">{selectedPrediction.match.league}</p>
                </div>
                <button 
                  onClick={() => setSelectedPrediction(null)}
                  className="text-gray-400 hover:text-white bg-zinc-950 hover:bg-zinc-800 p-1.5 rounded-lg text-sm transition-colors cursor-pointer border border-zinc-800"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 max-h-[450px] overflow-y-auto">
                {!isUnlocked && (
                  <div className="bg-gradient-to-br from-zinc-900 to-amber-950/30 border border-amber-500/30 p-5 rounded-2xl text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold text-white">
                        {language === 'sw' ? 'Uchambuzi Kamili wa Kina Umefungwa' : 'Full In-Depth AI Breakdown Locked'}
                      </h5>
                      <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                        {language === 'sw'
                          ? 'Ili kuona uchaguzi rasmi, formula ya Poisson, orodha ya majeruhi, na mkakati wa Kelly Criterion, fungua akaunti yako ya VIP.'
                          : 'To view the exact selection verdict, Poisson goal rates, injury reports, and Kelly Criterion staking bankroll recommendations, activate your VIP access.'
                        }
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPrediction(null);
                        onNavigateToBilling();
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs py-2 px-5 rounded-xl cursor-pointer shadow-lg transition-transform active:scale-95 inline-flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{language === 'sw' ? 'Lipa Kufungua VIP' : 'Unlock VIP Access'}</span>
                    </button>
                  </div>
                )}
                
                {/* Gauge Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-950 border border-zinc-800/60 p-3 rounded-xl text-center space-y-0.5">
                    <span className="text-[10px] text-gray-500 block">AI Probability</span>
                    <span className="text-base font-mono font-bold text-emerald-400">{selectedPrediction.probability}%</span>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800/60 p-3 rounded-xl text-center space-y-0.5">
                    <span className="text-[10px] text-gray-500 block">Risk Matrix</span>
                    <span className={`text-base font-sans font-bold ${
                      selectedPrediction.riskLevel === 'Low' ? 'text-emerald-400' : 'text-amber-500'
                    }`}>
                      {selectedPrediction.riskLevel}
                    </span>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800/60 p-3 rounded-xl text-center space-y-0.5">
                    <span className="text-[10px] text-gray-500 block">Expected Value (EV)</span>
                    <span className="text-base font-mono font-bold text-blue-400">{isUnlocked ? `+${selectedPrediction.expectedValue}` : '🔒 VIP'}</span>
                  </div>
                </div>

                {/* Data Source & Mathematical Foundation Badge */}
                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <span>⚡ Calculation Engine:</span>
                      {selectedPrediction.dataSource === 'statistical-engine' ? (
                        <span className="text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                          Poisson Goal Expectancy Model
                        </span>
                      ) : selectedPrediction.dataSource === 'api-football' ? (
                        <span className="text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60">
                          API-Football Live Integration
                        </span>
                      ) : (
                        <span className="text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60">
                          Consensus AI Grounded
                        </span>
                      )}
                    </span>
                    <span className="text-[9px] font-mono text-gray-500">
                      Verified Data Only
                    </span>
                  </div>

                  {selectedPrediction.modelFairOdds && (
                    <div className="p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-850 text-xs text-gray-300 space-y-1">
                      <div className="flex justify-between items-center font-mono">
                        <span className="text-gray-400">Model Fair Odds (True Probability):</span>
                        {isUnlocked ? (
                          <span className="text-emerald-400 font-bold">@{selectedPrediction.modelFairOdds.toFixed(2)} ({selectedPrediction.impliedProbability || selectedPrediction.probability}%)</span>
                        ) : (
                          <span className="text-amber-400 font-bold">🔒 Locked (VIP)</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 leading-normal">
                        *Note on honesty: The fair odds above are derived strictly from our Bayesian goal rate equations, not scraped from bookmakers.
                      </p>
                    </div>
                  )}

                  {selectedPrediction.statisticalMetrics && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div className="bg-zinc-900/40 p-2 rounded-lg border border-zinc-850 text-center">
                        <span className="text-[9px] text-gray-400 block font-mono">Home Goal Rate (λ)</span>
                        <span className="text-xs font-mono font-bold text-white">{isUnlocked ? selectedPrediction.statisticalMetrics.lambdaHome.toFixed(2) : '🔒'}</span>
                      </div>
                      <div className="bg-zinc-900/40 p-2 rounded-lg border border-zinc-850 text-center">
                        <span className="text-[9px] text-gray-400 block font-mono">Away Goal Rate (λ)</span>
                        <span className="text-xs font-mono font-bold text-white">{isUnlocked ? selectedPrediction.statisticalMetrics.lambdaAway.toFixed(2) : '🔒'}</span>
                      </div>
                      <div className="bg-zinc-900/40 p-2 rounded-lg border border-zinc-850 text-center">
                        <span className="text-[9px] text-gray-400 block font-mono">Bayes Shrinkage</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">{isUnlocked ? `${(selectedPrediction.statisticalMetrics.shrinkageFactor * 100).toFixed(0)}%` : '🔒'}</span>
                      </div>
                      <div className="bg-zinc-900/40 p-2 rounded-lg border border-zinc-850 text-center">
                        <span className="text-[9px] text-gray-400 block font-mono">Sample Size</span>
                        <span className="text-xs font-mono font-bold text-white">{selectedPrediction.statisticalMetrics.sampleSizeHome + selectedPrediction.statisticalMetrics.sampleSizeAway} matches</span>
                      </div>
                    </div>
                  )}

                  {selectedPrediction.plainLanguageFactors && selectedPrediction.plainLanguageFactors.length > 0 && (
                    <div className="pt-2 border-t border-zinc-900 space-y-1">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-400 block">
                        Model Drivers:
                      </span>
                      {isUnlocked ? (
                        <ul className="space-y-1 text-[11px] text-gray-300">
                          {selectedPrediction.plainLanguageFactors.map((fact, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-400 font-bold">•</span>
                              <span>{fact}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-amber-400/80 font-mono">🔒 Statistical drivers available to VIP subscribers.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Main AI opinion */}
                <div className="bg-emerald-950/10 border border-emerald-500/20 p-4 rounded-xl space-y-2">
                  <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-400" />
                    AI Analyst Primary Recommendation
                  </h5>
                  {isUnlocked ? (
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {selectedPrediction.aiExplanation}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-400/90 font-mono">
                      🔒 {language === 'sw' ? 'Maelezo kamili yamefichwa hadi malipo yathibitishwe.' : 'AI rationale locked until payment verification.'}
                    </p>
                  )}
                </div>

                {/* 5-Model Ensemble Statistical Architecture Breakdown */}
                {selectedPrediction.ensembleBreakdown && (
                  <div className="bg-zinc-950/90 border border-violet-900/40 rounded-xl p-4 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-violet-950/80 border border-violet-500/30 text-violet-400 rounded-lg">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                            5-Model Ensemble Prediction Architecture
                          </h5>
                          <p className="text-[10px] text-gray-400 font-mono">
                            Sub-Model Consensus: <strong className="text-violet-400 font-sans">{selectedPrediction.ensembleBreakdown.modelAgreement}%</strong> agreement
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                        {selectedPrediction.ensembleBreakdown.confidenceCategory}
                      </span>
                    </div>

                    {isUnlocked ? (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(selectedPrediction.ensembleBreakdown.models).map(([key, modelData]) => {
                            const model = modelData as { name: string; probability: number; weight: number; [k: string]: any };
                            return (
                              <div key={key} className="bg-zinc-900/70 border border-zinc-800/80 rounded-lg p-2.5 space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-300 font-medium">{model.name}</span>
                                  <span className="font-mono font-bold text-violet-400">{model.probability}%</span>
                                </div>
                                <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className="bg-violet-500 h-full rounded-full transition-all" 
                                    style={{ width: `${Math.min(model.probability, 100)}%` }}
                                  />
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                                  <span>Weight: {Math.round(model.weight * 100)}%</span>
                                  <span>
                                    {model.edgeScore !== undefined ? `Edge: ${model.edgeScore > 0 ? '+' : ''}${model.edgeScore}` :
                                     model.ratingDiff !== undefined ? `Elo Δ: ${model.ratingDiff > 0 ? '+' : ''}${model.ratingDiff}` :
                                     model.xgDiff !== undefined ? `xG Δ: ${model.xgDiff > 0 ? '+' : ''}${model.xgDiff}` :
                                     model.formTrend !== undefined ? `Trend: ${model.formTrend}` :
                                     model.featureScore !== undefined ? `Score: ${model.featureScore}` : ''}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-gray-400 border-t border-zinc-900 pt-2 gap-2">
                          <span>Data Reliability: <strong className="text-emerald-400 font-sans">{selectedPrediction.ensembleBreakdown.sourceReliabilityScore}%</strong></span>
                          <span>Telemetry Age: <strong className="text-zinc-200">{selectedPrediction.ensembleBreakdown.dataFreshnessMinutes}m ago</strong></span>
                          {selectedPrediction.ensembleBreakdown.brierScoreTarget && (
                            <span>Brier Target: <strong className="text-zinc-300">{selectedPrediction.ensembleBreakdown.brierScoreTarget}</strong></span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-zinc-900/40 rounded-lg border border-zinc-800 text-center">
                        <p className="text-xs text-amber-400 font-mono">🔒 Individual 5-model distribution matrix unlocked with VIP subscription.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 10+ Multi-Variables Breakdown Checklist */}
                {isUnlocked ? (
                  <div className="space-y-4">
                    <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 border-b border-zinc-800 pb-2">
                      Multi-Variable Match Analysis Reports
                    </h5>

                    <div className="space-y-3.5">
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-white flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Form, Momentum & xG Trends
                        </div>
                        <p className="text-gray-400 leading-relaxed text-[11px] pl-5.5">
                          {selectedPrediction.analysisCriteria.formAnalysis}
                        </p>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-white flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Injuries, Suspensions & Squad Rotations
                        </div>
                        <p className="text-gray-400 leading-relaxed text-[11px] pl-5.5">
                          {selectedPrediction.analysisCriteria.injuryImpact}
                        </p>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-white flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Tactical Matchup & Performance Ratings
                        </div>
                        <p className="text-gray-400 leading-relaxed text-[11px] pl-5.5">
                          {selectedPrediction.analysisCriteria.tacticalMatchup}
                        </p>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-white flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Betting Market Odds & Steam movement
                        </div>
                        <p className="text-gray-400 leading-relaxed text-[11px] pl-5.5">
                          {selectedPrediction.analysisCriteria.oddsMovement}
                        </p>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-white flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Environmental Factors, Weather, Rest Days & Surface Prep
                        </div>
                        <p className="text-gray-400 leading-relaxed text-[11px] pl-5.5">
                          {selectedPrediction.analysisCriteria.otherFactors}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-center space-y-2">
                    <Lock className="w-4 h-4 text-amber-400 mx-auto" />
                    <p className="text-xs text-gray-400 font-mono">
                      {language === 'sw' ? 'Ripoti za vigezo 10+ za mechi zimefungwa' : '10+ Multi-variable match reports locked for VIP subscribers'}
                    </p>
                  </div>
                )}

                {/* Additional Match telemetry */}
                {selectedPrediction.match.additionalStats && (
                  <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-2">
                    <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">
                      Telemetry Data Logged
                    </h5>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      {Object.entries(selectedPrediction.match.additionalStats).map(([key, val]) => (
                        <div key={key} className="flex justify-between border-b border-zinc-900 pb-1">
                          <span className="text-gray-400">{key}:</span>
                          <span className="text-white font-medium font-mono">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Kelly Criterion Bankroll Planner */}
                {(() => {
                  const oddsVal = selectedPrediction.odds;
                  const probVal = selectedPrediction.probability / 100;
                  const netOdds = oddsVal - 1;
                  const p = probVal;
                  const q = 1 - p;
                  // Kelly % formula: (p*b - q)/b
                  const rawKelly = netOdds > 0 ? (p * netOdds - q) / netOdds : 0;
                  const finalKellyFraction = Math.max(0, rawKelly);
                  const userBankroll = parseFloat(customKellyBankroll) || 1000;
                  const recommendedPercentage = finalKellyFraction * kellyFraction * 100;
                  const recommendedStakeAmount = userBankroll * (recommendedPercentage / 100);

                  return (
                    <div className="bg-zinc-950 border border-zinc-800/80 p-5 rounded-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-950 border border-emerald-500/20 text-emerald-400 rounded-lg">
                            <Calculator className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-white font-sans">
                              {t.bankrollAdvisor || "AI Bankroll & Kelly Stake Planner"}
                            </h5>
                            <p className="text-[10px] text-gray-500 font-mono">
                              MATH-MODELLED RISK CONTROL
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded">
                          Kelly Sizing
                        </span>
                      </div>

                      {/* Explanation */}
                      <p className="text-[10px] text-gray-400 leading-relaxed font-sans">
                        {t.kellyExplanation || "The Kelly Criterion formula calculates the mathematically optimal percentage of your bankroll to wager on a given event to maximize long-term wealth growth while minimizing risk of ruin. Quarter or Half Kelly is highly recommended to control variance."}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        {/* Input Bankroll */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-wider block">
                            💰 {t.bankrollLabel || "Your Total Betting Bankroll"} ({selectedCurrency})
                          </label>
                          <input
                            name="custom_kelly_bankroll_input"
                            type="number"
                            min="10"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            data-lpignore="true"
                            data-1p-ignore="true"
                            data-form-type="other"
                            value={customKellyBankroll}
                            onChange={(e) => setCustomKellyBankroll(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 focus:border-emerald-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono text-white transition-colors"
                            placeholder="e.g. 1000"
                          />
                        </div>

                        {/* Sizing Toggles */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-wider block">
                            🛡️ {t.riskLevelPill || "Kelly Sizing Fraction"}
                          </label>
                          <div className="grid grid-cols-3 gap-1">
                            <button
                              type="button"
                              onClick={() => setKellyFraction(0.25)}
                              className={`text-[9px] font-mono py-2 rounded-lg border transition-all cursor-pointer ${
                                kellyFraction === 0.25
                                  ? 'bg-emerald-950 border-emerald-500 text-emerald-400 font-bold'
                                  : 'bg-zinc-900/40 border-zinc-800/80 text-gray-400 hover:text-white'
                              }`}
                              title="25% of Kelly sizing for optimal safety"
                            >
                              1/4 Kelly
                            </button>
                            <button
                              type="button"
                              onClick={() => setKellyFraction(0.5)}
                              className={`text-[9px] font-mono py-2 rounded-lg border transition-all cursor-pointer ${
                                kellyFraction === 0.5
                                  ? 'bg-emerald-950 border-emerald-500 text-emerald-400 font-bold'
                                  : 'bg-zinc-900/40 border-zinc-800/80 text-gray-400 hover:text-white'
                              }`}
                              title="50% of Kelly sizing - Recommended balance"
                            >
                              1/2 Kelly
                            </button>
                            <button
                              type="button"
                              onClick={() => setKellyFraction(1.0)}
                              className={`text-[9px] font-mono py-2 rounded-lg border transition-all cursor-pointer ${
                                kellyFraction === 1.0
                                  ? 'bg-rose-950 border-rose-500/50 text-rose-400 font-bold'
                                  : 'bg-zinc-900/40 border-zinc-800/80 text-gray-400 hover:text-white'
                              }`}
                              title="100% of Kelly sizing - Maximum growth / Aggressive"
                            >
                              Full Kelly
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Display Results */}
                      <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                            {t.recommendedStake || "Recommended Stake"}
                          </span>
                          <div className="flex items-baseline gap-1.5">
                            {isUnlocked ? (
                              <>
                                <span className="text-sm text-gray-500 font-mono font-semibold">
                                  {recommendedPercentage > 0 ? `${selectedCurrency}` : ''}
                                </span>
                                <span className="text-lg font-mono font-black text-white">
                                  {recommendedPercentage > 0
                                    ? recommendedStakeAmount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                                    : '0.00'}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm font-mono font-bold text-amber-400">
                                🔒 Locked (VIP)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right space-y-0.5">
                          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                            Pct Sizing
                          </span>
                          {isUnlocked ? (
                            <div className={`text-base font-mono font-black ${recommendedPercentage > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {recommendedPercentage > 0 ? `+${recommendedPercentage.toFixed(1)}%` : '0.0%'}
                            </div>
                          ) : (
                            <span className="text-xs font-mono font-bold text-amber-400">
                              🔒 VIP
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-[10px] font-mono text-zinc-500 text-center flex items-center justify-center gap-1.5">
                        <Info className="w-3 h-3 text-emerald-500/40" />
                        <span>
                          {isUnlocked ? (
                            recommendedPercentage > 0 
                              ? (language === 'sw' ? 'Dau hili limebuniwa kitaalamu ili kupunguza hatari.' : 'This sizing is mathematically optimized for long-term bankroll growth.')
                              : (language === 'sw' ? 'Hakuna Edge ya kutosha kuweka dau hili kulingana na fomula ya Kelly.' : 'No active betting edge predicted for this selection according to Kelly Sizing.')
                          ) : (
                            language === 'sw' ? 'Ushauri wa hisabati wa Kelly Criterion umefungwa kwa wanachama wa VIP.' : 'Mathematical Kelly Criterion sizing recommendations locked for VIP subscribers.'
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* USER FEEDBACK SYSTEM */}
                <div className="bg-zinc-950 border border-zinc-800/80 p-5 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-950/40 border border-amber-500/20 text-amber-400 rounded-lg">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white font-sans">
                          {language === 'sw' ? 'Tathmini Utabiri Huu' : 'Rate this Prediction'}
                        </h5>
                        <p className="text-[10px] text-gray-500 font-mono">
                          {language === 'sw' ? 'SAIDIA KUBORESHA MODELI YA AI' : 'HELP IMPROVE THE AI PREDICTION MODEL'}
                        </p>
                      </div>
                    </div>
                    {feedbackStatus === 'success' && (
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded">
                        {language === 'sw' ? 'Imepokelewa!' : 'Submitted!'}
                      </span>
                    )}
                  </div>

                  {feedbackStatus === 'success' ? (
                    <div className="text-center py-4 space-y-2">
                      <div className="text-emerald-400 text-2xl font-bold">🎉</div>
                      <p className="text-xs text-gray-200 font-medium">
                        {language === 'sw' ? 'Asante kwa maoni yako!' : 'Thank you for your valuable feedback!'}
                      </p>
                      <p className="text-[10px] text-gray-400 max-w-sm mx-auto">
                        {language === 'sw' ? 'Maoni yako yamehifadhiwa na yatafanyiwa uchambuzi ili kuboresha usahihi wa utabiri wa AI.' : 'Your ratings and comments are logged directly in our analytics engine to refine model weights and parameters.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setFeedbackStatus('idle')}
                        className="text-[10px] text-emerald-400 underline hover:text-emerald-300 mt-2 font-mono cursor-pointer bg-transparent border-0"
                      >
                        {language === 'sw' ? 'Tathmini tena' : 'Submit another feedback'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-[10px] text-gray-400 leading-relaxed font-sans">
                        {language === 'sw' ? 'Je, utabiri huu na mchanganuo wake umekusaidia? Toa tathmini yako kuanzia nyota 1 (mbaya sana) hadi 5 (nzuri sana) ili kuboresha mifumo yetu.' : 'Did you find this prediction analysis helpful? Rate it from 1 to 5 stars and let us know your preferences. Your feedback directly trains our models.'}
                      </p>

                      {/* Stars input */}
                      <div className="flex items-center gap-1.5 py-1 justify-center">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isLit = star <= (feedbackHoverRating || feedbackRating);
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFeedbackRating(star)}
                              onMouseEnter={() => setFeedbackHoverRating(star)}
                              onMouseLeave={() => setFeedbackHoverRating(0)}
                              className="text-2xl transition-all hover:scale-125 focus:outline-none cursor-pointer duration-150 bg-transparent border-0"
                              title={`${star} Stars`}
                            >
                              <span className={isLit ? 'text-amber-400' : 'text-zinc-700'}>★</span>
                            </button>
                          );
                        })}
                        {feedbackRating > 0 && (
                          <span className="text-xs font-mono font-bold text-amber-500 ml-2">
                            {feedbackRating}/5
                          </span>
                        )}
                      </div>

                      {/* Comment inputs */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-wider block">
                          ✍️ {language === 'sw' ? 'Maoni ya Ziada (Hiari)' : 'Optional Comments'}
                        </label>
                        <textarea
                          rows={2}
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          maxLength={300}
                          className="w-full bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 focus:border-emerald-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-white transition-colors placeholder-gray-600 resize-none"
                          placeholder={language === 'sw' ? 'Mfano: Mchanganuo bora, au maelezo yafafanuliwe zaidi...' : 'e.g. Excellent xG breakdown, or make explanations shorter...'}
                        />
                      </div>

                      {/* Submit */}
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          disabled={isFeedbackSubmitting || feedbackRating === 0}
                          onClick={() => handleSubmitFeedback(
                            selectedPrediction.id,
                            'prediction',
                            `${selectedPrediction.match.homeTeam} vs ${selectedPrediction.match.awayTeam}`
                          )}
                          className={`flex items-center gap-1.5 text-xs font-bold py-2 px-4 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer ${
                            feedbackRating === 0
                              ? 'bg-zinc-800 text-gray-500 cursor-not-allowed border border-zinc-700/30'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                          }`}
                        >
                          {isFeedbackSubmitting ? (
                            <span>{language === 'sw' ? 'Inatuma...' : 'Submitting...'}</span>
                          ) : (
                            <span>{language === 'sw' ? 'Tuma Tathmini' : 'Submit Feedback'}</span>
                          )}
                        </button>
                      </div>

                      {feedbackStatus === 'error' && (
                        <p className="text-[10px] text-rose-400 font-mono text-center">
                          {language === 'sw' ? 'Hitilafu ilitokea wakati wa kutuma. Jaribu tena.' : 'Failed to submit feedback. Please try again.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-zinc-800 bg-zinc-950/70 rounded-b-2xl flex flex-wrap justify-between items-center gap-3 text-xs">
                {isUnlocked ? (
                  <>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          togglePredictionSelection(selectedPrediction, e);
                        }}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          selectedPredictionIds.includes(selectedPrediction.id)
                            ? 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-md shadow-emerald-500/20'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border-zinc-700/80 hover:border-emerald-500/50'
                        }`}
                        title={selectedPredictionIds.includes(selectedPrediction.id) ? (language === 'sw' ? "Ondoa kwenye jamvi" : "Remove from custom betslip") : (language === 'sw' ? "Weka kwenye jamvi lako (+)" : "Add this pick to custom betslip builder (+)")}
                      >
                        {selectedPredictionIds.includes(selectedPrediction.id) ? (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span className="font-semibold">{t.inBetslip || "In Betslip"}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                            <span className="font-semibold">{t.addToBetslip || "Add to Betslip"}</span>
                          </>
                        )}
                      </button>

                      <span className="text-gray-400">
                        Pick: <strong className="text-white font-bold ml-1">{selectedPrediction.pick}</strong>
                      </span>
                    </div>

                    <span className={`bg-emerald-950 border border-emerald-800/40 font-mono font-bold px-3 py-1.5 rounded-lg ${getOddsColorClass(selectedPrediction.odds, "text-emerald-400")}`}>
                      Odds @{selectedPrediction.odds.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-amber-400 font-mono flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{language === 'sw' ? 'Uchaguzi & Odds Zimefichwa' : 'Selection Verdict & Odds Locked'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPrediction(null);
                        onNavigateToBilling();
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs py-1.5 px-3 rounded-lg cursor-pointer transition-all"
                    >
                      {language === 'sw' ? 'Lipa Kufungua' : 'Unlock Now'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING QUICK BETSLIP BAR WHEN PICKS SELECTED */}
      {selectedPredictionIds.length > 0 && (
        <aside aria-label="Quick betslip summary" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/95 border border-emerald-500/40 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-black font-bold font-mono text-xs flex items-center justify-center shadow-sm">
              {selectedPredictionIds.length}
            </span>
            <span className="text-xs font-bold text-white hidden sm:inline">
              {language === 'sw' ? 'Mechi kwenye Jamvi' : 'Picks in Custom Betslip'}
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-800"></div>

          <div className="text-xs font-mono text-emerald-400 font-bold">
            @{allPoolPredictions.filter(p => selectedPredictionIds.includes(p.id)).reduce((acc, p) => acc * (p.modelFairOdds || p.odds), 1).toFixed(2)} Total Odds
          </div>

          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('custom-betslip-combinator');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs px-3 py-1.5 rounded-xl transition-transform active:scale-95 cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-500/20"
          >
            <span>{t.viewBetslip || "View Betslip"}</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </aside>
      )}

      {/* FLOATING TOAST NOTIFICATIONS PORTAL */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: 10, transition: { duration: 0.15 } }}
              className="pointer-events-auto bg-zinc-950/95 border border-emerald-500/30 text-white rounded-2xl p-4 shadow-2xl flex gap-3 items-start relative overflow-hidden backdrop-blur-md"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-sans font-black tracking-tight text-white flex items-center gap-1.5">
                  {toast.title}
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </h4>
                <p className="text-[11px] text-gray-300 font-medium leading-relaxed">{toast.message}</p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="ml-auto text-gray-500 hover:text-white transition-all p-1 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
