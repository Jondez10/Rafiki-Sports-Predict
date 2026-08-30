import React, { useState } from 'react';
import { SportMatch, Prediction, Article, NotificationLog, PerformanceStats } from '../types';
import { Play, Plus, Trash2, Check, Radio, Send, BookOpen, Coins, BarChart3, Bell, Settings, MessageSquare, Star, Sparkles, TrendingUp, AlertTriangle, ShieldCheck, Activity, Cpu, Lock, Key, Eye, EyeOff, ShieldAlert, KeyRound } from 'lucide-react';
import { authFetch } from '../lib/api';
import SystemHealthTab from './SystemHealthTab';

interface AdminDashboardProps {
  predictions: Prediction[];
  articles: Article[];
  notifications: NotificationLog[];
  stats: PerformanceStats | null;
  onRefreshData: () => Promise<void>;
}

export default function AdminDashboard({ predictions, articles, notifications, stats, onRefreshData }: AdminDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'system' | 'matches' | 'payments' | 'notifications' | 'articles' | 'stats' | 'revenue' | 'feedback'>('system');
  
  // Feedback states
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isFeedbacksLoading, setIsFeedbacksLoading] = useState(false);

  // Pending Payments states & Master Admin Secret Security
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  
  // Dedicated Admin Password / Secret Key State
  const [adminSecretKey, setAdminSecretKey] = useState<string>(() => {
    return localStorage.getItem('rafiki_admin_secret_key') || '';
  });
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [secretValidationStatus, setSecretValidationStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [secretKeyError, setSecretKeyError] = useState('');

  // Action Interceptor Modal State
  const [unlockModal, setUnlockModal] = useState<{
    isOpen: boolean;
    actionTitle: string;
    pendingCallback?: () => Promise<void> | void;
  }>({
    isOpen: false,
    actionTitle: '',
    pendingCallback: undefined
  });
  const [tempSecretKey, setTempSecretKey] = useState('');
  const [showModalKey, setShowModalKey] = useState(false);
  const [isVerifyingModalKey, setIsVerifyingModalKey] = useState(false);
  const [modalKeyError, setModalKeyError] = useState('');

  const handleSecretKeyChange = (val: string) => {
    setAdminSecretKey(val);
    localStorage.setItem('rafiki_admin_secret_key', val);
    setSecretValidationStatus('idle');
    setSecretKeyError('');
  };

  const handleClearSecretKey = () => {
    setAdminSecretKey('');
    localStorage.removeItem('rafiki_admin_secret_key');
    setSecretValidationStatus('idle');
    setSecretKeyError('');
    setActionMessage('🔒 Admin session locked. Master Secret Key removed.');
  };

  const handleTestSecretKey = async (overrideKey?: string) => {
    const keyToTest = (overrideKey !== undefined ? overrideKey : adminSecretKey).trim();
    if (!keyToTest) {
      setSecretKeyError('Please enter an admin secret key to verify.');
      return false;
    }
    setSecretValidationStatus('testing');
    setSecretKeyError('');
    try {
      const response = await authFetch('/api/admin/verify-secret', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Secret': keyToTest
        },
        body: JSON.stringify({ adminSecretKey: keyToTest })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSecretValidationStatus('valid');
        setSecretKeyError('');
        return true;
      } else {
        setSecretValidationStatus('invalid');
        setSecretKeyError(data.error || 'Invalid Admin Secret Key.');
        return false;
      }
    } catch {
      setSecretValidationStatus('invalid');
      setSecretKeyError('Network connection error while validating key.');
      return false;
    }
  };

  // Intercept any administrative modification if secret key is missing or not yet verified
  const requireAdminAuthorization = async (
    actionTitle: string, 
    actionFn: () => Promise<void> | void
  ) => {
    // If key is present and already verified, run immediately
    if (adminSecretKey.trim() && secretValidationStatus === 'valid') {
      try {
        await actionFn();
      } catch (err: any) {
        setActionMessage(`❌ Action error: ${err.message || 'Unknown error'}`);
      }
      return;
    }

    // If key is stored in session but unverified, test it first
    if (adminSecretKey.trim() && secretValidationStatus !== 'invalid') {
      setSecretValidationStatus('testing');
      try {
        const response = await authFetch('/api/admin/verify-secret', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Admin-Secret': adminSecretKey.trim()
          },
          body: JSON.stringify({ adminSecretKey: adminSecretKey.trim() })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setSecretValidationStatus('valid');
          setSecretKeyError('');
          await actionFn();
          return;
        }
      } catch (_) {}
    }

    // Open the authorization modal interceptor
    setTempSecretKey(adminSecretKey || '');
    setModalKeyError('');
    setUnlockModal({
      isOpen: true,
      actionTitle,
      pendingCallback: actionFn
    });
  };

  const handleVerifyModalKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const key = tempSecretKey.trim();
    if (!key) {
      setModalKeyError('Please enter the Master Admin Secret Key.');
      return;
    }

    setIsVerifyingModalKey(true);
    setModalKeyError('');
    try {
      const response = await authFetch('/api/admin/verify-secret', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Secret': key
        },
        body: JSON.stringify({ adminSecretKey: key })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setAdminSecretKey(key);
        localStorage.setItem('rafiki_admin_secret_key', key);
        setSecretValidationStatus('valid');
        setSecretKeyError('');
        
        const cb = unlockModal.pendingCallback;
        setUnlockModal({ isOpen: false, actionTitle: '' });
        
        if (cb) {
          setTimeout(async () => {
            try {
              await cb();
            } catch (err: any) {
              setActionMessage(`❌ Action error: ${err.message || 'Execution failed'}`);
            }
          }, 100);
        }
      } else {
        setModalKeyError(data.error || 'Access Denied: Invalid Master Admin Secret Key.');
      }
    } catch {
      setModalKeyError('Connection error while validating Secret Key.');
    } finally {
      setIsVerifyingModalKey(false);
    }
  };

  const fetchPendingPayments = async () => {
    setIsPaymentsLoading(true);
    try {
      const response = await authFetch('/api/admin/payments');
      if (response.ok) {
        const data = await response.json();
        setPendingPayments(data);
      }
    } catch (err) {
      console.error("Failed to fetch pending payments", err);
    } finally {
      setIsPaymentsLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeSubTab === 'feedback') {
      const fetchFeedbacks = async () => {
        setIsFeedbacksLoading(true);
        try {
          const response = await authFetch('/api/feedback');
          if (response.ok) {
            const data = await response.json();
            setFeedbacks(data);
          }
        } catch (err) {
          console.error("Failed to fetch feedbacks", err);
        } finally {
          setIsFeedbacksLoading(false);
        }
      };
      fetchFeedbacks();
    } else if (activeSubTab === 'payments') {
      fetchPendingPayments();
    }
  }, [activeSubTab]);

  const handleApprovePayment = (paymentId: string, uid: string) => {
    requireAdminAuthorization(`Approve Payment #${paymentId} & Activate VIP`, async () => {
      setActionMessage('Verifying admin secret key and approving payment...');
      try {
        const currentKey = adminSecretKey.trim();
        const response = await authFetch('/api/admin/payments/approve', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Admin-Secret': currentKey
          },
          body: JSON.stringify({ 
            paymentId, 
            uid, 
            adminEmail: 'rafikibc1000@gmail.com',
            adminSecretKey: currentKey
          })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setActionMessage(`✅ Payment ${paymentId} verified & approved! User account upgraded to VIP Premium.`);
          setSecretValidationStatus('valid');
          setSecretKeyError('');
          await fetchPendingPayments();
          await onRefreshData();
        } else {
          setActionMessage(`❌ Approval failed: ${data.message || data.error || 'Authentication denied. Check your Admin Secret Key.'}`);
          if (data.error?.includes('Secret Key')) {
            setSecretValidationStatus('invalid');
            setSecretKeyError(data.message || 'Invalid Admin Secret Key.');
          }
        }
      } catch (err) {
        setActionMessage('❌ Network error approving payment.');
      }
    });
  };

  const handleRejectPayment = (paymentId: string, uid: string) => {
    const reason = prompt('Enter rejection reason for this payment:', 'Transaction reference could not be verified in statement.');
    if (!reason) return;

    requireAdminAuthorization(`Reject Payment #${paymentId}`, async () => {
      setActionMessage('');
      try {
        const currentKey = adminSecretKey.trim();
        const response = await authFetch('/api/admin/payments/reject', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Admin-Secret': currentKey
          },
          body: JSON.stringify({ 
            paymentId, 
            uid, 
            reason, 
            adminEmail: 'rafikibc1000@gmail.com',
            adminSecretKey: currentKey
          })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setActionMessage(`Payment ${paymentId} rejected.`);
          setSecretValidationStatus('valid');
          setSecretKeyError('');
          await fetchPendingPayments();
        } else {
          setActionMessage(`❌ Rejection failed: ${data.message || data.error || 'Check Admin Secret Key.'}`);
          if (data.error?.includes('Secret Key')) {
            setSecretValidationStatus('invalid');
            setSecretKeyError(data.message || 'Invalid Admin Secret Key.');
          }
        }
      } catch (err) {
        setActionMessage('❌ Network error rejecting payment.');
      }
    });
  };

  // AI trigger state
  const [runningAI, setRunningAI] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  
  // Add prediction states
  const [sport, setSport] = useState<'football' | 'basketball' | 'tennis'>('football');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [league, setLeague] = useState('');
  const [pick, setPick] = useState('');
  const [market, setMarket] = useState('1X2 Match Winner');
  const [marketCategory, setMarketCategory] = useState<'goals' | 'corners' | 'yellow_cards' | 'fouls' | 'shots_on_target' | 'shots_off_target'>('goals');
  const [marketOptionType, setMarketOptionType] = useState<'over' | 'under' | '1x2_winner' | 'handicap' | 'both_teams_to_score' | 'double_chance'>('1x2_winner');
  const [odds, setOdds] = useState('1.50');
  const [confidence, setConfidence] = useState('85');
  const [explanation, setExplanation] = useState('');
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  
  // Create notification states
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'alert' | 'success' | 'system' | 'streak'>('alert');
  
  // Create article states
  const [articleTitle, setArticleTitle] = useState('');
  const [articleSummary, setArticleSummary] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [articleAuthor, setArticleAuthor] = useState('Rafiki Predict Admin');
  const [articleSport, setArticleSport] = useState<'football' | 'basketball' | 'tennis'>('football');
  
  // System Stats edit states
  const [statsWinRate, setStatsWinRate] = useState(stats?.winRate?.toString() || '84.4');
  const [statsRoi, setStatsRoi] = useState(stats?.roi?.toString() || '18.4');
  const [statsMonthly, setStatsMonthly] = useState(stats?.monthlyAccuracy?.toString() || '84.5');
  const [statsWeekly, setStatsWeekly] = useState(stats?.weeklyAccuracy?.toString() || '86.2');

  const handleTriggerAI = () => {
    requireAdminAuthorization('Run Gemini AI Prediction Core', async () => {
      setRunningAI(true);
      setAiMessage('Starting Rafiki Predict Core AI engine with Master Admin Authorization...');
      try {
        const currentKey = adminSecretKey.trim();
        const response = await authFetch('/api/predictions/generate-ai', { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Secret': currentKey
          },
          body: JSON.stringify({ adminSecretKey: currentKey })
        });
        const data = await response.json();
        if (response.ok) {
          setAiMessage('Success! Gemini successfully analyzed the upcoming fixtures and deployed 3 new accumulators!');
          await onRefreshData();
        } else {
          setAiMessage(`AI Error: ${data.message || 'Analysis failed. Master Secret Key may be invalid.'}`);
        }
      } catch (err) {
        setAiMessage('Failed to connect to AI generation server.');
      } finally {
        setRunningAI(false);
      }
    });
  };

  const handleCreatePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeam || !awayTeam || !league || !pick || !explanation) {
      alert('Please fill out all match and prediction fields.');
      return;
    }

    requireAdminAuthorization(`Deploy Match Prediction: ${homeTeam} vs ${awayTeam}`, async () => {
      setIsSubmitLoading(true);
      try {
        const currentKey = adminSecretKey.trim();
        const matchId = `m-admin-${Date.now()}`;
        const predId = `p-admin-${Date.now()}`;
        
        const newMatch: SportMatch = {
          id: matchId,
          sport,
          homeTeam,
          awayTeam,
          league,
          startTime: new Date(Date.now() + 5 * 3600000).toISOString(),
          status: 'upcoming'
        };

        const newPrediction: Prediction = {
          id: predId,
          matchId,
          match: newMatch,
          pick,
          market,
          marketCategory,
          marketOptionType,
          odds: Number(odds),
          confidence: Number(confidence),
          riskLevel: Number(odds) > 1.8 ? 'Medium' : 'Low',
          expectedValue: Math.round(Number(odds) * (Number(confidence) / 100) * 100) / 100,
          probability: Number(confidence),
          suggestedBetType: 'Single / Acca Leg',
          aiExplanation: explanation,
          analysisCriteria: {
            formAnalysis: 'Team is playing with optimized form indices.',
            injuryImpact: 'Lineup reports support strong tactical continuity.',
            tacticalMatchup: 'Defensive structures align well to counter opponent traits.',
            oddsMovement: 'Steady market line movement points to smart-money confidence.',
            otherFactors: 'Favorable surrounding environment and team motivation.'
          }
        };

        const response = await authFetch('/api/admin/predictions', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Admin-Secret': currentKey
          },
          body: JSON.stringify({ 
            prediction: newPrediction,
            adminSecretKey: currentKey 
          })
        });

        if (response.ok) {
          alert('Prediction deployed successfully!');
          setHomeTeam('');
          setAwayTeam('');
          setPick('');
          setExplanation('');
          await onRefreshData();
        } else {
          const errData = await response.json().catch(() => ({}));
          alert(`Error adding prediction: ${errData.message || 'Unauthorized. Verify Secret Key.'}`);
        }
      } catch (err) {
        alert('Connectivity error deploying prediction.');
      } finally {
        setIsSubmitLoading(false);
      }
    });
  };

  const handleDeletePrediction = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this prediction?')) return;
    
    requireAdminAuthorization(`Delete Prediction #${id}`, async () => {
      try {
        const currentKey = adminSecretKey.trim();
        const response = await authFetch(`/api/admin/predictions/${id}`, { 
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Secret': currentKey
          },
          body: JSON.stringify({ adminSecretKey: currentKey })
        });
        if (response.ok) {
          await onRefreshData();
        } else {
          const errData = await response.json().catch(() => ({}));
          alert(`Failed to delete prediction: ${errData.message || 'Unauthorized. Check Secret Key.'}`);
        }
      } catch (err) {
        alert('Connectivity error deleting prediction.');
      }
    });
  };

  const handlePostNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle || !notifMessage) return;

    requireAdminAuthorization(`Publish Push Notification: "${notifTitle}"`, async () => {
      try {
        const currentKey = adminSecretKey.trim();
        const response = await authFetch('/api/admin/notifications', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Admin-Secret': currentKey
          },
          body: JSON.stringify({
            notification: { title: notifTitle, message: notifMessage, type: notifType },
            adminSecretKey: currentKey
          })
        });
        if (response.ok) {
          alert('Notification broadcast successfully!');
          setNotifTitle('');
          setNotifMessage('');
          await onRefreshData();
        } else {
          const errData = await response.json().catch(() => ({}));
          alert(`Failed to publish notification: ${errData.message || 'Unauthorized. Check Secret Key.'}`);
        }
      } catch (err) {
        alert('Failed to connect to notification server.');
      }
    });
  };

  const handlePostArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleTitle || !articleSummary || !articleContent) return;

    requireAdminAuthorization(`Publish Educational Article: "${articleTitle}"`, async () => {
      try {
        const currentKey = adminSecretKey.trim();
        const response = await authFetch('/api/admin/articles', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Admin-Secret': currentKey
          },
          body: JSON.stringify({
            article: {
              title: articleTitle,
              summary: articleSummary,
              content: articleContent,
              author: articleAuthor,
              sport: articleSport,
              readTime: '4 min read'
            },
            adminSecretKey: currentKey
          })
        });
        if (response.ok) {
          alert('Article published successfully!');
          setArticleTitle('');
          setArticleSummary('');
          setArticleContent('');
          await onRefreshData();
        } else {
          const errData = await response.json().catch(() => ({}));
          alert(`Failed to publish article: ${errData.message || 'Unauthorized. Check Secret Key.'}`);
        }
      } catch (err) {
        alert('Failed to connect to article server.');
      }
    });
  };

  const handleUpdateStats = (e: React.FormEvent) => {
    e.preventDefault();
    requireAdminAuthorization('Update Platform Performance Metrics', async () => {
      try {
        const currentKey = adminSecretKey.trim();
        const updatedStats: PerformanceStats = {
          winRate: Number(statsWinRate),
          roi: Number(statsRoi),
          monthlyAccuracy: Number(statsMonthly),
          weeklyAccuracy: Number(statsWeekly),
          totalWon: stats?.totalWon || 38,
          totalLost: stats?.totalLost || 7,
          totalActive: stats?.totalActive || 4,
          historicalChartData: stats?.historicalChartData || []
        };
        const response = await authFetch('/api/admin/stats', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Admin-Secret': currentKey
          },
          body: JSON.stringify({ 
            stats: updatedStats,
            adminSecretKey: currentKey
          })
        });
        if (response.ok) {
          alert('Platform statistics updated successfully!');
          await onRefreshData();
        } else {
          const errData = await response.json().catch(() => ({}));
          alert(`Failed to update stats: ${errData.message || 'Unauthorized. Check Secret Key.'}`);
        }
      } catch (err) {
        alert('Failed to connect to stats server.');
      }
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-8" id="admin-section">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
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
            <h2 className="text-xl font-bold font-sans text-white flex items-center gap-2">
              <span>Rafiki Predict Admin HQ</span>
            </h2>
            <p className="text-xs text-gray-400">Manage platform data, trigger AI generators, and control subscription logs.</p>
          </div>
        </div>

        {/* AI Prediction Core trigger */}
        <button
          onClick={handleTriggerAI}
          disabled={runningAI}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)] disabled:opacity-50"
        >
          <Radio className={`w-4 h-4 ${runningAI ? 'animate-pulse text-red-700' : ''}`} />
          {runningAI ? 'AI Analyzing...' : 'Run Gemini AI Analysis'}
        </button>
      </div>

      {aiMessage && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-emerald-400 flex items-start gap-2.5">
          <Play className="w-3.5 h-3.5 mt-0.5 text-emerald-500" />
          <span>{aiMessage}</span>
        </div>
      )}

      {/* UNIVERSAL MASTER ADMIN SECRET KEY VERIFICATION LAYER */}
      <div className="bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-zinc-950 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3 relative overflow-hidden" id="admin-secret-verification-layer">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Admin Master Secret Key Verification Layer
                </h4>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold">
                  Zero-Trust Guard Active
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Required for all sensitive operations (payment approvals, fixture syncs, auto/manual grading, AI runs, predictions deployment, stats updates).
              </p>
            </div>
          </div>

          {/* Security Status Badge */}
          <div className="shrink-0 flex items-center gap-2">
            {secretValidationStatus === 'valid' ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 text-xs font-mono font-bold px-3 py-1.5 rounded-xl shadow-[0_0_12px_-2px_rgba(16,185,129,0.35)]">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Authorized & Verified
              </span>
            ) : adminSecretKey ? (
              <span className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 text-amber-300 text-xs font-mono font-bold px-3 py-1.5 rounded-xl">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Key Loaded in Session
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono font-bold px-3 py-1.5 rounded-xl animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Secret Key Required
              </span>
            )}

            {adminSecretKey && (
              <button
                type="button"
                onClick={handleClearSecretKey}
                className="text-[11px] font-mono text-gray-400 hover:text-rose-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                title="Clear key from local browser storage"
              >
                Lock Session
              </button>
            )}
          </div>
        </div>

        {/* Input and actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Key className="w-4 h-4" />
            </div>
            <input
              id="admin-secret-key-input"
              type={showSecretKey ? 'text' : 'password'}
              value={adminSecretKey}
              onChange={(e) => handleSecretKeyChange(e.target.value)}
              placeholder="Enter Master ADMIN_SECRET_KEY to authorize administrative actions..."
              className="w-full bg-zinc-900/90 border border-zinc-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder-gray-500 font-mono transition-all outline-none"
            />
            <button
              type="button"
              onClick={() => setShowSecretKey(!showSecretKey)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white cursor-pointer"
              title={showSecretKey ? "Hide key" : "Show key"}
            >
              {showSecretKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleTestSecretKey()}
            disabled={secretValidationStatus === 'testing' || !adminSecretKey.trim()}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-mono text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            {secretValidationStatus === 'testing' ? (
              <>Verifying Key...</>
            ) : secretValidationStatus === 'valid' ? (
              <>
                <Check className="w-3.5 h-3.5 text-black" />
                Re-Verify
              </>
            ) : (
              <>
                <Key className="w-3.5 h-3.5 text-black" />
                Authorize Session
              </>
            )}
          </button>
        </div>

        {/* Error or validation message */}
        {secretKeyError && (
          <div className="bg-rose-950/50 border border-rose-500/40 rounded-xl p-3 text-xs font-mono text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">{secretKeyError}</div>
              <div className="text-[11px] text-rose-400/80 mt-0.5">
                Check that your secret key matches <code>ADMIN_SECRET_KEY</code> defined in your platform environment.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Admin tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-3 overflow-x-auto">
        {[
          { id: 'system', label: 'Engine & Health ⚡', icon: Activity },
          { id: 'matches', label: 'Predictions Panel', icon: Plus },
          { id: 'payments', label: 'Payment Approvals ⌛', icon: ShieldCheck },
          { id: 'notifications', label: 'Push Notifications', icon: Bell },
          { id: 'articles', label: 'Publish Articles', icon: BookOpen },
          { id: 'stats', label: 'Efficacy Statistics', icon: BarChart3 },
          { id: 'revenue', label: 'Subscription Logs', icon: Coins },
          { id: 'feedback', label: 'AI Feedback & Tuning', icon: MessageSquare }
        ].map(subTab => {
          const Icon = subTab.icon;
          return (
            <button
              key={subTab.id}
              onClick={() => setActiveSubTab(subTab.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                activeSubTab === subTab.id
                  ? 'bg-zinc-800 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {subTab.label}
            </button>
          );
        })}
      </div>

      {/* CONTENT: SYSTEM HEALTH & POISSON ENGINE */}
      {activeSubTab === 'system' && (
        <SystemHealthTab 
          onRefreshPlatformData={onRefreshData}
          adminSecretKey={adminSecretKey}
          isSecretKeyVerified={secretValidationStatus === 'valid'}
          onRequestUnlock={(title, cb) => requireAdminAuthorization(title, cb || (() => {}))}
        />
      )}

      {/* CONTENT: PAYMENTS */}
      {activeSubTab === 'payments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-950 border border-zinc-800 p-5 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Pending Payment Approval Requests
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Under the <strong>Payment-First Policy</strong>, users cannot access any protected predictions or tools until an administrator approves their submitted payment receipt.
              </p>
            </div>
            <button
              onClick={fetchPendingPayments}
              disabled={isPaymentsLoading}
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs py-2 px-4 rounded-xl border border-zinc-700 transition-all cursor-pointer shrink-0"
            >
              {isPaymentsLoading ? 'Refreshing...' : '🔄 Refresh Requests'}
            </button>
          </div>

          {/* DEDICATED ADMIN SECURITY PASSWORD / SECRET KEY SECTION */}
          <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                    Master Admin Authorization Secret Key
                    <span className="bg-amber-500/20 text-amber-400 text-[10px] font-normal px-2 py-0.5 rounded-full border border-amber-500/30">
                      Zero-Trust Guard
                    </span>
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    This password is required by backend APIs to authorize payment verification and VIP upgrades. Even with client bypass, approvals will fail without this master secret.
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {secretValidationStatus === 'valid' ? (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold px-3 py-1.5 rounded-xl shadow-[0_0_10px_-2px_rgba(16,185,129,0.3)]">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Key Verified & Active
                  </span>
                ) : adminSecretKey ? (
                  <span className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 text-amber-300 text-xs font-mono font-bold px-3 py-1.5 rounded-xl">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Key Loaded in Session
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold px-3 py-1.5 rounded-xl animate-pulse">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    Secret Key Required
                  </span>
                )}
              </div>
            </div>

            {/* Input and actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  id="admin-secret-key-input"
                  type={showSecretKey ? 'text' : 'password'}
                  value={adminSecretKey}
                  onChange={(e) => handleSecretKeyChange(e.target.value)}
                  placeholder="Enter Master Admin Secret Key (e.g. from ADMIN_SECRET_KEY in .env)"
                  className="w-full bg-zinc-900/90 border border-zinc-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-gray-500 font-mono transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white cursor-pointer"
                  title={showSecretKey ? "Hide password" : "Show password"}
                >
                  {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleTestSecretKey}
                disabled={secretValidationStatus === 'testing' || !adminSecretKey.trim()}
                className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-mono text-xs font-bold py-2.5 px-4 rounded-xl border border-zinc-700 hover:border-amber-500/50 transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
              >
                {secretValidationStatus === 'testing' ? (
                  <>Verifying...</>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    Verify Key
                  </>
                )}
              </button>
            </div>

            {/* Error or validation message */}
            {secretKeyError && (
              <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3 text-xs font-mono text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">{secretKeyError}</div>
                  <div className="text-[11px] text-rose-400/80 mt-0.5">
                    Ensure your key matches <code>ADMIN_SECRET_KEY</code> in environment variables or default master keys (e.g. <code>rafiki-admin-pass</code>).
                  </div>
                </div>
              </div>
            )}
          </div>

          {actionMessage && (
            <div className={`p-4 rounded-xl border text-xs font-mono font-bold ${actionMessage.startsWith('✅') ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' : 'bg-rose-950/40 border-rose-500/40 text-rose-400'}`}>
              {actionMessage}
            </div>
          )}

          {isPaymentsLoading ? (
            <div className="text-center py-12 text-xs font-mono text-gray-500">
              Loading pending payment logs from Firestore...
            </div>
          ) : pendingPayments.length === 0 ? (
            <div className="text-center py-12 space-y-3 bg-zinc-950 border border-zinc-800 rounded-2xl">
              <span className="text-3xl">🎉</span>
              <h4 className="text-sm font-bold text-white">No Pending Payments Awaiting Review</h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                All submitted payment requests have been verified and processed. New user submissions will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs font-mono text-gray-400 font-bold">
                Pending Verification Requests ({pendingPayments.length})
              </div>

              <div className="grid gap-4">
                {pendingPayments.map((p) => (
                  <div key={p.id} className="bg-zinc-950 border border-amber-500/30 p-5 rounded-2xl space-y-4 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-amber-500/20 text-amber-400 text-[10px] font-mono px-3 py-1 rounded-bl-xl border-l border-b border-amber-500/30 uppercase font-bold">
                      Pending Review
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-gray-500 uppercase">User Account</span>
                        <div className="font-bold text-white text-sm">{p.email}</div>
                        <div className="text-gray-400 font-mono text-[11px]">UID: {p.uid}</div>
                        {p.phone && <div className="text-emerald-400 font-mono text-[11px]">Phone: {p.phone}</div>}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-gray-500 uppercase">Payment Details</span>
                        <div className="font-bold text-emerald-400 text-sm">
                          {p.currency} {p.amount} ({p.plan?.toUpperCase()} PLAN)
                        </div>
                        <div className="text-gray-300">Method: <strong className="text-white">{p.method}</strong></div>
                        <div className="text-gray-300 font-mono">
                          Receipt/Code: <span className="bg-zinc-900 border border-zinc-800 text-amber-300 px-2 py-0.5 rounded font-bold">{p.reference}</span>
                        </div>
                      </div>

                      <div className="space-y-1 md:text-right">
                        <span className="text-[10px] font-mono text-gray-500 uppercase">Submission Time</span>
                        <div className="text-gray-300 font-mono">
                          {p.submittedAt ? new Date(p.submittedAt).toLocaleString() : 'Recently'}
                        </div>
                        <div className="text-[10px] text-amber-400">
                          Status: Pending Admin Approval
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-900 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {p.phone && (
                          <a
                            href={`https://wa.me/${p.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello, regarding your payment reference ${p.reference} for Rafiki Predict...`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-zinc-900 hover:bg-zinc-800 text-emerald-400 text-xs py-2 px-3 rounded-xl border border-zinc-800 font-mono flex items-center gap-1.5"
                          >
                            💬 WhatsApp User
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleRejectPayment(p.id, p.uid)}
                          className="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-bold text-xs py-2 px-4 rounded-xl border border-rose-800/50 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          ✕ Reject Payment
                        </button>
                        <button
                          onClick={() => handleApprovePayment(p.id, p.uid)}
                          className={`font-sans font-bold text-xs py-2 px-5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                            adminSecretKey.trim()
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)]'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {adminSecretKey.trim() ? (
                            <>
                              <ShieldCheck className="w-4 h-4" />
                              Approve Payment & Activate VIP
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                              Enter Key to Approve
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTENT: MATCHES */}
      {activeSubTab === 'matches' && (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Create prediction form */}
          <form onSubmit={handleCreatePrediction} className="space-y-4 bg-zinc-950 border border-zinc-800/60 p-5 rounded-2xl">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-emerald-400">
              Create Manual Prediction
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {['football', 'basketball', 'tennis'].map((sp) => (
                <button
                  type="button"
                  key={sp}
                  onClick={() => setSport(sp as any)}
                  className={`py-2 px-1 text-xs font-bold rounded-lg capitalize border transition-all ${
                    sport === sp 
                      ? 'bg-emerald-950/40 border-emerald-500 text-white' 
                      : 'bg-zinc-900 border-zinc-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Home Team / Player</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Manchester City"
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Away Team / Player</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liverpool"
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Market Category Selector */}
            <div>
              <label className="block text-[11px] text-gray-400 mb-1 font-bold">Market Category</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'goals', label: '⚽ Goals' },
                  { id: 'corners', label: '🚩 Corners' },
                  { id: 'yellow_cards', label: '🟨 Cards' },
                  { id: 'fouls', label: '🛑 Fouls' },
                  { id: 'shots_on_target', label: '🎯 SoT' },
                  { id: 'shots_off_target', label: '💨 Soff' }
                ].map(cat => (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => {
                      setMarketCategory(cat.id as any);
                      if (cat.id === 'corners') setMarket('Corners - Over/Under');
                      else if (cat.id === 'yellow_cards') setMarket('Yellow Cards - Over/Under');
                      else if (cat.id === 'fouls') setMarket('Fouls - Over/Under');
                      else if (cat.id === 'shots_on_target') setMarket('Shots on Target - Over/Under');
                      else if (cat.id === 'shots_off_target') setMarket('Shots off Target - Over/Under');
                      else setMarket('1X2 Match Winner');
                    }}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all ${
                      marketCategory === cat.id
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-900 border-zinc-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Market Option Type (Over/Under, 1X2, Handicap) */}
            <div>
              <label className="block text-[11px] text-gray-400 mb-1 font-bold">Option Type</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'over', label: 'Over (>)' },
                  { id: 'under', label: 'Under (<)' },
                  { id: '1x2_winner', label: '1X2 Winner' },
                  { id: 'handicap', label: 'Handicap (±)' }
                ].map(opt => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => {
                      setMarketOptionType(opt.id as any);
                      if (opt.id === 'over') {
                        if (marketCategory === 'corners') setPick('Over 9.5 Corners');
                        else if (marketCategory === 'yellow_cards') setPick('Over 4.5 Yellow Cards');
                        else if (marketCategory === 'fouls') setPick('Over 22.5 Fouls');
                        else if (marketCategory === 'shots_on_target') setPick('Over 8.5 Shots on Target');
                        else if (marketCategory === 'shots_off_target') setPick('Over 12.5 Shots off Target');
                        else setPick('Over 2.5 Goals');
                      } else if (opt.id === 'under') {
                        if (marketCategory === 'corners') setPick('Under 9.5 Corners');
                        else if (marketCategory === 'yellow_cards') setPick('Under 4.5 Yellow Cards');
                        else if (marketCategory === 'fouls') setPick('Under 22.5 Fouls');
                        else if (marketCategory === 'shots_on_target') setPick('Under 8.5 Shots on Target');
                        else if (marketCategory === 'shots_off_target') setPick('Under 12.5 Shots off Target');
                        else setPick('Under 2.5 Goals');
                      } else if (opt.id === 'handicap') {
                        setPick(`${homeTeam || 'Home'} -1.5 Handicap`);
                      } else if (opt.id === '1x2_winner') {
                        setPick(`${homeTeam || 'Home'} to Win`);
                      }
                    }}
                    className={`py-1.5 px-1.5 text-[10px] font-bold rounded-lg border transition-all text-center ${
                      marketOptionType === opt.id
                        ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                        : 'bg-zinc-900 border-zinc-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">League / Tournament</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premier League"
                  value={league}
                  onChange={(e) => setLeague(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Betting Market</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Corners - Over/Under"
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Selection Pick</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BTTS (Yes)"
                  value={pick}
                  onChange={(e) => setPick(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Decimal Odds</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 1.75"
                  value={odds}
                  onChange={(e) => setOdds(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">AI Confidence %</label>
                <input
                  type="number"
                  min="75"
                  max="100"
                  required
                  placeholder="e.g. 88"
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">AI Analytical Reasoning</label>
              <textarea
                required
                rows={3}
                placeholder="Describe tactical matchups, injury news, weather patterns, and other supporting factors..."
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitLoading ? 'Saving...' : 'Deploy Prediction'}
            </button>
          </form>

          {/* Active prediction listing with deletions */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-emerald-400">
              Active Predictions Registry
            </h3>

            <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
              {predictions.filter(p => !p.id.startsWith('p-hist-')).map((p) => (
                <div key={p.id} className="bg-zinc-950 border border-zinc-800/80 p-3.5 rounded-xl flex items-center justify-between gap-3 hover:border-zinc-700 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-emerald-400 border border-zinc-800">
                        {p.match.sport}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {p.match.league}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {p.match.homeTeam} vs {p.match.awayTeam}
                    </div>
                    <div className="text-xs text-gray-300">
                      Pick: <strong className="text-white font-medium">{p.pick}</strong> @ {p.odds} ({p.confidence}% conf)
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeletePrediction(p.id)}
                    className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-red-950/40 hover:text-red-400 text-gray-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONTENT: NOTIFICATIONS */}
      {activeSubTab === 'notifications' && (
        <div className="grid md:grid-cols-2 gap-8">
          <form onSubmit={handlePostNotification} className="space-y-4 bg-zinc-950 border border-zinc-800 p-5 rounded-2xl">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-emerald-400">
              Publish Push Notification
            </h3>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Notification Title</label>
              <input
                type="text"
                required
                placeholder="e.g. 🚀 High Odds Safe Double Active"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Notification Type</label>
              <select
                value={notifType}
                onChange={(e) => setNotifType(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="alert">Alert (Dynamic Tips Published)</option>
                <option value="success">Success (Payment/Winning confirmation)</option>
                <option value="system">System (Operational updates)</option>
                <option value="streak">Winning Streak (Profit alerts)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Alert Message</label>
              <textarea
                required
                rows={3}
                placeholder="Describe the critical announcement or alert..."
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
            >
              Send Notification Log
            </button>
          </form>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-emerald-400">
              Active Alerts Feed
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">{n.title}</span>
                    <span className="text-[9px] font-mono text-gray-500">
                      {new Date(n.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONTENT: ARTICLES */}
      {activeSubTab === 'articles' && (
        <div className="grid md:grid-cols-2 gap-8">
          <form onSubmit={handlePostArticle} className="space-y-4 bg-zinc-950 border border-zinc-800 p-5 rounded-2xl">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-emerald-400">
              Write Strategy Article
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Article Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. xG Analysis Mismatches"
                  value={articleTitle}
                  onChange={(e) => setArticleTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Sport Filter</label>
                <select
                  value={articleSport}
                  onChange={(e) => setArticleSport(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="football">Football</option>
                  <option value="basketball">Basketball</option>
                  <option value="tennis">Tennis</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Article Summary</label>
              <input
                type="text"
                required
                placeholder="One-line summary for feed card previews..."
                value={articleSummary}
                onChange={(e) => setArticleSummary(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Markdown Body Content</label>
              <textarea
                required
                rows={6}
                placeholder="Write the comprehensive analysis, paragraphs, and lists..."
                value={articleContent}
                onChange={(e) => setArticleContent(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
            >
              Publish Article
            </button>
          </form>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-emerald-400">
              Published Strategy Blogs
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {articles.map((art) => (
                <div key={art.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-1.5">
                  <div className="text-xs font-bold text-white">{art.title}</div>
                  <p className="text-xs text-gray-400 line-clamp-2">{art.summary}</p>
                  <div className="text-[10px] text-gray-500 font-mono">
                    Published: {new Date(art.publishedAt).toLocaleDateString()} by {art.author}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONTENT: STATISTICS */}
      {activeSubTab === 'stats' && (
        <form onSubmit={handleUpdateStats} className="space-y-4 bg-zinc-950 border border-zinc-800 p-6 rounded-2xl max-w-xl">
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-emerald-400">
            Edit Global Platform Stats
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Global Win Rate %</label>
              <input
                type="number"
                step="0.1"
                required
                value={statsWinRate}
                onChange={(e) => setStatsWinRate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Global ROI %</label>
              <input
                type="number"
                step="0.1"
                required
                value={statsRoi}
                onChange={(e) => setStatsRoi(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Monthly Accuracy %</label>
              <input
                type="number"
                step="0.1"
                required
                value={statsMonthly}
                onChange={(e) => setStatsMonthly(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Weekly Accuracy %</label>
              <input
                type="number"
                step="0.1"
                required
                value={statsWeekly}
                onChange={(e) => setStatsWeekly(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
          >
            Apply New Performance Statistics
          </button>
        </form>
      )}

      {/* CONTENT: REVENUE */}
      {activeSubTab === 'revenue' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-1">
              <span className="text-[10px] text-gray-400">Simulated Revenue (USD)</span>
              <div className="text-xl font-mono font-bold text-white">$1,480.00</div>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-1">
              <span className="text-[10px] text-gray-400">Total Premium Users</span>
              <div className="text-xl font-mono font-bold text-white">42 Active</div>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-1">
              <span className="text-[10px] text-gray-400">Verification Rate</span>
              <div className="text-xl font-mono font-bold text-emerald-400">100% Instant</div>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              Live Checkout logs
            </h4>
            
            <p className="text-xs text-gray-500 leading-relaxed">
              Every checkout logged via M-Pesa (Till 6881472 / Send Money 0716483642), Airtel Money (0735309361), Telkom T-Kash (0773266691), Equity Bank (0620187419406), Payoneer/Pesapal/Skrill (johnmushira@gmail.com), or Visa Card (4478 **** **** 9885) is verifiably logged below in real-time. Simulated logs are instantly approved for sandbox testing, updating the user profile.
            </p>

            <div className="text-xs text-gray-400 text-center py-4 bg-zinc-900/40 rounded-xl border border-dashed border-zinc-800">
              Connection stable. Ready to register active client billing webhooks.
            </div>
          </div>
        </div>
      )}

      {/* CONTENT: USER FEEDBACK & AI TUNING */}
      {activeSubTab === 'feedback' && (
        <div className="space-y-6">
          {isFeedbacksLoading ? (
            <div className="text-center py-12 text-xs font-mono text-gray-500">
              Fetching user ratings and feedback data from Firestore...
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-12 space-y-3 bg-zinc-950 border border-zinc-800 rounded-2xl">
              <span className="text-2xl">⭐</span>
              <h4 className="text-sm font-bold text-white">No Feedback Collected Yet</h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Once users rate prediction detail modals or accumulator tickets, their rating aggregates, comments, and item associations will sync here automatically.
              </p>
            </div>
          ) : (() => {
            const totalRatings = feedbacks.length;
            const avgRating = feedbacks.reduce((acc, f) => acc + f.rating, 0) / totalRatings;
            const predictionFeedbacks = feedbacks.filter(f => f.itemType === 'prediction');
            const accumulatorFeedbacks = feedbacks.filter(f => f.itemType === 'accumulator');
            const avgPredictionRating = predictionFeedbacks.length > 0 
              ? predictionFeedbacks.reduce((acc, f) => acc + f.rating, 0) / predictionFeedbacks.length 
              : 0;
            const avgAccumulatorRating = accumulatorFeedbacks.length > 0 
              ? accumulatorFeedbacks.reduce((acc, f) => acc + f.rating, 0) / accumulatorFeedbacks.length 
              : 0;

            // Rating counts for 1-5 stars
            const counts = [0, 0, 0, 0, 0];
            feedbacks.forEach(f => {
              if (f.rating >= 1 && f.rating <= 5) {
                counts[f.rating - 1]++;
              }
            });

            // AI Model Parameter Advice & Analysis
            let aiAdviceTitle = "AI Model Performance Optimal";
            let aiAdviceText = "Average user rating is excellent. The current combination of xG momentum analysis and odds-weighted consensus operates with solid alignment with user preferences.";
            let aiAdviceColor = "border-emerald-500/20 bg-emerald-950/10 text-emerald-400";

            if (avgRating < 3.0) {
              aiAdviceTitle = "Model Calibration Advised (Low Rating Alert)";
              aiAdviceText = "Average rating has dropped below 3.0. Users are reporting variance in risk assessments. Recommend lowering the confidence weighting on Basketball or Tennis predictions until models stabilize.";
              aiAdviceColor = "border-rose-500/20 bg-rose-950/10 text-rose-400";
            } else if (avgRating < 4.0) {
              aiAdviceTitle = "Model Fine-Tuning Recommended";
              aiAdviceText = "Ratings indicate slight mismatch between user odds preferences and published value bets. Recommended adjustment: Increase the Kelly Sizing constraint default parameter to Quarter-Kelly (0.25) to prevent over-leverage.";
              aiAdviceColor = "border-amber-500/20 bg-amber-950/10 text-amber-400";
            }

            // User preferences analysis based on textual reviews
            const commentsWithKeywords = feedbacks.filter(f => f.comment && f.comment.trim() !== "");
            const preferredFeatures = [];
            if (commentsWithKeywords.some(f => f.comment.toLowerCase().includes('kelly') || f.comment.toLowerCase().includes('bankroll') || f.comment.toLowerCase().includes('stake'))) {
              preferredFeatures.push("Kelly Bankroll Calculator");
            }
            if (commentsWithKeywords.some(f => f.comment.toLowerCase().includes('odds') || f.comment.toLowerCase().includes('value') || f.comment.toLowerCase().includes('high'))) {
              preferredFeatures.push("High-Value/Odds tips");
            }
            if (commentsWithKeywords.some(f => f.comment.toLowerCase().includes('safe') || f.comment.toLowerCase().includes('low risk') || f.comment.toLowerCase().includes('sure'))) {
              preferredFeatures.push("Safe/Low-Risk Accumulators");
            }
            if (preferredFeatures.length === 0) {
              preferredFeatures.push("AI Detailed Explanations", "Low-Odds Safety Tips");
            }

            return (
              <div className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-1 text-left">
                    <span className="text-[10px] text-gray-500 font-mono">TOTAL RATINGS</span>
                    <div className="text-2xl font-mono font-bold text-white">{totalRatings}</div>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-1 text-left">
                    <span className="text-[10px] text-gray-500 font-mono">GLOBAL SATISFACTION</span>
                    <div className="text-2xl font-mono font-bold text-amber-400 flex items-center gap-1.5">
                      ★ {avgRating.toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-1 text-left">
                    <span className="text-[10px] text-gray-500 font-mono">PREDICTION RATING</span>
                    <div className="text-2xl font-mono font-bold text-blue-400">
                      ★ {avgPredictionRating > 0 ? avgPredictionRating.toFixed(1) : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-1 text-left">
                    <span className="text-[10px] text-gray-500 font-mono">ACCUMULATOR RATING</span>
                    <div className="text-2xl font-mono font-bold text-purple-400">
                      ★ {avgAccumulatorRating > 0 ? avgAccumulatorRating.toFixed(1) : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Star rating bar breakdown and AI diagnosis */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Rating distribution bar graph */}
                  <div className="bg-zinc-950 border border-zinc-800/80 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 text-left">
                      Rating Distribution
                    </h4>
                    <div className="space-y-2.5">
                      {[5, 4, 3, 2, 1].map(stars => {
                        const count = counts[stars - 1];
                        const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                        return (
                          <div key={stars} className="flex items-center gap-3 text-xs">
                            <span className="w-12 text-gray-400 font-mono flex items-center justify-end gap-1">
                              {stars} <span className="text-amber-400">★</span>
                            </span>
                            <div className="flex-grow bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-850">
                              <div className="bg-amber-400 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="w-8 text-gray-500 font-mono text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Prediction Models tuning advisor */}
                  <div className="bg-zinc-950 border border-zinc-800/80 p-5 rounded-2xl flex flex-col justify-between text-left">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                          AI Model Calibration Advisor
                        </h4>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        User satisfaction signals are continuously analyzed to feedback weights into our multi-criteria consensus modeling logic.
                      </p>

                      <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${aiAdviceColor}`}>
                        <div className="font-bold flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {aiAdviceTitle}
                        </div>
                        <p className="text-[11px] text-gray-300 leading-relaxed">{aiAdviceText}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-900 mt-4 text-[10px] text-gray-500 font-sans">
                      Detected User Preference Trends: <strong className="text-emerald-400">{preferredFeatures.join(", ")}</strong>
                    </div>
                  </div>
                </div>

                {/* Feedbacks list */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 text-left">
                      Recent Qualitative Feedback Logs
                    </h4>
                    <span className="text-[10px] font-mono text-gray-500">
                      Latest submissions
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {feedbacks.map((fb) => (
                      <div key={fb.id} className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2 text-left">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 text-gray-400">
                              {fb.itemType.toUpperCase()}
                            </span>
                            <span className="text-xs font-bold text-white ml-2">
                              {fb.itemTitle}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: fb.rating }).map((_, i) => (
                              <span key={i} className="text-xs text-amber-400">★</span>
                            ))}
                            {Array.from({ length: 5 - fb.rating }).map((_, i) => (
                              <span key={i} className="text-xs text-zinc-800 font-bold opacity-20">★</span>
                            ))}
                          </div>
                        </div>

                        {fb.comment ? (
                          <p className="text-xs text-gray-300 leading-relaxed bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900">
                            "{fb.comment}"
                          </p>
                        ) : (
                          <p className="text-[11px] text-gray-500 italic pl-1">
                            No text comment provided.
                          </p>
                        )}

                        <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                          <span>User: {fb.userEmail || "Anonymous"}</span>
                          <span>{new Date(fb.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* MASTER SECRET KEY AUTHORIZATION INTERCEPT MODAL */}
      {unlockModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-950 border border-amber-500/50 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                  Admin Master Authorization Required
                </h3>
                <p className="text-[11px] text-gray-400">
                  Zero-Trust security gate protecting core platform mutation.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-2">
              <div className="text-[10px] font-mono uppercase text-gray-400">Target Administrative Action:</div>
              <div className="text-xs font-bold text-amber-300 font-mono flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{unlockModal.actionTitle}</span>
              </div>
            </div>

            <form onSubmit={handleVerifyModalKey} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-gray-300 mb-1.5 font-bold">
                  Enter Master Admin Secret Key:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type={showModalKey ? 'text' : 'password'}
                    value={tempSecretKey}
                    onChange={(e) => {
                      setTempSecretKey(e.target.value);
                      setModalKeyError('');
                    }}
                    autoFocus
                    placeholder="Enter ADMIN_SECRET_KEY..."
                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-gray-500 font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalKey(!showModalKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white cursor-pointer"
                  >
                    {showModalKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {modalKeyError && (
                <div className="bg-rose-950/60 border border-rose-500/50 rounded-xl p-3 text-xs font-mono text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">{modalKeyError}</div>
                    <div className="text-[10px] text-rose-400/80 mt-0.5">
                      Verify the value of <code>ADMIN_SECRET_KEY</code> in the platform environment.
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setUnlockModal({ isOpen: false, actionTitle: '' })}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-gray-300 font-bold font-mono text-xs py-2.5 px-4 rounded-xl border border-zinc-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingModalKey || !tempSecretKey.trim()}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold font-mono text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5"
                >
                  {isVerifyingModalKey ? (
                    <>Verifying...</>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Verify & Execute
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
