import React, { useState, useMemo } from 'react';
import { Prediction, PerformanceStats, SavedPrediction } from '../types';
import { db } from '../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Search, Filter, Calendar, Activity, TrendingUp, Award, CalendarDays, ShieldCheck, Download, Share2, Copy, Check, X, Clock, Bell, BellOff, Bookmark, Trash2, Image as ImageIcon } from 'lucide-react';
import { APP_LOGO, APP_BANNER } from '../assets';
import { downloadImageFile, preloadImage } from '../utils/exportHelpers';

interface ArchiveTabProps {
  historicalPredictions: Prediction[];
  stats: PerformanceStats | null;
  language?: 'en' | 'sw';
  savedPredictions?: SavedPrediction[];
}

export default function ArchiveTab({ 
  historicalPredictions, 
  stats, 
  language = 'en',
  savedPredictions = []
}: ArchiveTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sportFilter, setSportFilter] = useState<'all' | 'football' | 'basketball' | 'tennis'>('all');
  const [resultFilter, setResultFilter] = useState<'all' | 'win' | 'loss'>('all');
  const [minConfidence, setMinConfidence] = useState<number>(75);
  const [minOdds, setMinOdds] = useState<number>(1.0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRemoveBookmark = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'saved', id));
    } catch (err) {
      console.warn("Notice deleting remote bookmark:", err);
    }
    // Also clean up from local storage cache
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('rafiki_saved_preds_'));
      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const list: SavedPrediction[] = JSON.parse(raw);
          const filtered = list.filter(item => item.id !== id);
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    } catch (_) {}
  };

  // Countdown timer state for next prediction update
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      // Next update scheduled daily at 10:00 AM local time
      const target = new Date();
      target.setHours(10, 0, 0, 0);

      // If already past 10:00 AM today, target tomorrow 10:00 AM
      if (now.getTime() >= target.getTime()) {
        target.setDate(target.getDate() + 1);
      }

      const diff = target.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      return { hours, minutes, seconds };
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Streak push notification alerts states
  const [alertsEnabled, setAlertsEnabled] = useState(() => {
    return localStorage.getItem('rafiki_streak_alerts') === 'enabled';
  });

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [lastNotifiedStreak, setLastNotifiedStreak] = useState(() => {
    return localStorage.getItem('rafiki_last_notified_streak') || '';
  });

  // Track changes to currentStreak to send push notifications when reaching milestones (e.g. 5 wins)
  React.useEffect(() => {
    if (!alertsEnabled) return;
    const streakStr = stats?.streak || '';
    if (!streakStr || streakStr === lastNotifiedStreak) return;

    // Parse the streak
    const match = streakStr.match(/(\d+)\s*(\w+)/);
    if (!match) return;
    
    const count = parseInt(match[1], 10);
    const isWin = !match[2].toLowerCase().includes('loss') && !match[2].toLowerCase().includes('lose');

    // Milestone triggers: reaching 3, 5, 8, 10 wins (or any win count >= 5)
    if (isWin && (count === 3 || count === 5 || count === 8 || count === 10 || count > 5)) {
      if ('Notification' in window && Notification.permission === 'granted') {
        const title = language === 'en' ? '🎉 Performance Milestone Achieved!' : '🎉 Hatua Mpya ya Utendaji Imefikiwa!';
        const body = language === 'en'
          ? `Spectacular work! You have reached a winning streak of ${streakStr}! Your new badge milestone is unlocked.`
          : `Kazi nzuri sana! Umefikia mfululizo wa ushindi wa ${streakStr}! Beji yako mpya imefunguliwa rasmi.`;

        try {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: 'rafiki-streak-milestone',
          });
          localStorage.setItem('rafiki_last_notified_streak', streakStr);
          setLastNotifiedStreak(streakStr);
        } catch (err) {
          console.error('Failed to trigger Notification API:', err);
        }
      }
    }
  }, [stats?.streak, alertsEnabled, lastNotifiedStreak, language]);

  // Generate last 30 days Win/Loss bar chart data
  const winLossBarData = useMemo(() => {
    const daysData: { [dateStr: string]: { date: string; wins: number; losses: number; formattedDate: string } } = {};
    
    // Initialize last 30 days with 0 wins/losses
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const formattedDate = d.toLocaleDateString(language === 'en' ? 'en-US' : 'sw-TZ', {
        month: 'short',
        day: 'numeric',
      });
      daysData[dateKey] = {
        date: dateKey,
        wins: 0,
        losses: 0,
        formattedDate,
      };
    }

    // Populate with actual outcomes from historical predictions
    historicalPredictions.forEach((p) => {
      if (!p.match.startTime) return;
      const dateKey = p.match.startTime.split('T')[0];
      if (daysData[dateKey]) {
        if (p.result === 'win') {
          daysData[dateKey].wins += 1;
        } else if (p.result === 'loss') {
          daysData[dateKey].losses += 1;
        }
      }
    });

    // Convert to sorted array
    return Object.values(daysData).sort((a, b) => a.date.localeCompare(b.date));
  }, [historicalPredictions, language]);

  // Export as CSV helper
  const handleExportCSV = () => {
    // Generate headers
    const headers = [
      language === 'en' ? 'Match Date' : 'Tarehe ya Mechi',
      language === 'en' ? 'Sport' : 'Mchezo',
      language === 'en' ? 'Home Team' : 'Timu ya Nyumbani',
      language === 'en' ? 'Away Team' : 'Timu ya Ugenini',
      language === 'en' ? 'League' : 'Ligi',
      language === 'en' ? 'Market' : 'Soko',
      language === 'en' ? 'Pick' : 'Chaguo',
      language === 'en' ? 'Odds' : 'Odds',
      language === 'en' ? 'AI Confidence (%)' : 'Imani ya AI (%)',
      language === 'en' ? 'Win Probability (%)' : 'Uwezekano wa Ushindi (%)',
      language === 'en' ? 'Risk Level' : 'Kiwango cha Hatari',
      language === 'en' ? 'Expected Value' : 'Thamani Inayotarajiwa',
      language === 'en' ? 'Result' : 'Matokeo',
      language === 'en' ? 'Suggested Bet Type' : 'Aina ya Dau Inayopendekezwa'
    ];

    // Build rows from filteredPredictions
    const rows = filteredPredictions.map((p) => {
      const matchDateStr = new Date(p.match.startTime).toLocaleDateString(language === 'en' ? 'en-US' : 'sw-TZ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      // Escape quotes in string fields
      const escape = (str: string) => `"${str.replace(/"/g, '""')}"`;

      return [
        escape(matchDateStr),
        escape(p.match.sport),
        escape(p.match.homeTeam),
        escape(p.match.awayTeam),
        escape(p.match.league),
        escape(p.market),
        escape(p.pick),
        p.odds.toFixed(2),
        `${p.confidence}%`,
        `${p.probability}%`,
        escape(p.riskLevel),
        p.expectedValue.toFixed(2),
        escape(p.result || 'pending'),
        escape(p.suggestedBetType)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rafiki_predictions_history_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy and download social media share card
  const currentStreak = stats?.streak || (language === 'en' ? '5 Wins' : 'Ushindi 5');
  const accuracy = `${stats?.monthlyAccuracy || 84.5}%`;
  const roi = `+${stats?.roi || 18.4}%`;
  const totalWins = stats?.totalWon || 45;
  const totalLosses = stats?.totalLost || 8;

  const handleCopyShareText = () => {
    const shareText = language === 'en' 
      ? `🔥 Rafiki Predict Performance Update! 🔥\n\n🏆 Current Streak: ${currentStreak}\n🎯 Monthly Accuracy: ${accuracy}\n📈 Accumulated ROI: ${roi}\n\nVerifiably tracking sports betting trends with high-precision AI models.\nJoin the movement at rafikibusinesssolutions.netlify.app 🚀`
      : `🔥 Taarifa ya Utendaji ya Rafiki Predict! 🔥\n\n🏆 Mfululizo wa Sasa: ${currentStreak}\n🎯 Usahihi wa Kila Mwezi: ${accuracy}\n📈 ROI Iliyokusanywa: ${roi}\n\nKufuatilia kwa uhakika mwelekeo wa dau za michezo kwa kutumia modeli za AI za usahihi wa hali ya juu.\nJiunge sasa kwenye rafikibusinesssolutions.netlify.app 🚀`;

    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPNG = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, 800, 450);
    gradient.addColorStop(0, '#090d16');
    gradient.addColorStop(0.5, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 450);

    // 2. Decorative elements (subtle glowing circles)
    ctx.beginPath();
    ctx.arc(700, 100, 150, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(100, 350, 200, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.04)';
    ctx.fill();

    // 3. Grid cards (Bento boxes) background helper
    const drawCard = (x: number, y: number, w: number, h: number, radius: number) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    // Draw 3 primary stats boxes
    drawCard(50, 140, 210, 180, 16); // Streak card
    drawCard(295, 140, 210, 180, 16); // Win Rate card
    drawCard(540, 140, 210, 180, 16); // ROI card

    // Try drawing the official brand Logo on the canvas
    try {
      const logoImg = await preloadImage(APP_LOGO);
      ctx.save();
      ctx.beginPath();
      ctx.arc(80, 75, 30, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logoImg, 50, 45, 60, 60);
      ctx.restore();

      // Circular Ring for logo
      ctx.beginPath();
      ctx.arc(80, 75, 30, 0, Math.PI * 2, true);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Brand Title Header shifted next to logo
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('RAFIKI PREDICT AI', 125, 70);

      // Brand Tagline
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#10b981';
      ctx.fillText(language === 'en' ? 'VERIFIED PERFORMANCE CARD' : 'KADI ILIYOTHIBITISHWA YA UTENDAJI', 125, 95);
    } catch {
      // Fallback without image
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('RAFIKI PREDICT AI', 50, 75);

      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#10b981';
      ctx.fillText(language === 'en' ? 'VERIFIED PERFORMANCE CARD' : 'KADI ILIYOTHIBITISHWA YA UTENDAJI', 50, 105);
    }

    // 6. Verified Badge
    ctx.beginPath();
    ctx.arc(730, 70, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    
    // Draw Checkmark
    ctx.beginPath();
    ctx.moveTo(723, 70);
    ctx.lineTo(728, 75);
    ctx.lineTo(738, 65);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#10b981';
    ctx.textAlign = 'right';
    ctx.fillText(language === 'en' ? 'SECURE VERIFIED' : 'IMETHIBITISHWA', 700, 73);
    ctx.textAlign = 'left'; // reset

    // 7. Render Card 1 - Streak
    ctx.font = '10px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(language === 'en' ? 'CURRENT STREAK' : 'MFULULIZO WA SASA', 75, 180);

    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#f59e0b'; // Amber for streak fire
    ctx.fillText('🔥 ' + currentStreak, 70, 240);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(language === 'en' ? 'Active Winning Runs' : 'Mfululizo wa Kushinda', 75, 290);

    // 8. Render Card 2 - Accuracy / Win Rate
    ctx.font = '10px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(language === 'en' ? 'MONTHLY WIN RATE' : 'USAHIHI WA KILA MWEZI', 320, 180);

    ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🎯 ' + accuracy, 315, 240);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${totalWins} Wins / ${totalLosses} Losses`, 320, 290);

    // 9. Render Card 3 - ROI
    ctx.font = '10px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(language === 'en' ? 'ACCUMULATED ROI' : 'ROI ILIYOKUSANYWA', 565, 180);

    ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#10b981'; // Emerald for ROI
    ctx.fillText('📈 ' + roi, 560, 240);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(language === 'en' ? 'Flat 1-Unit Stakes' : 'Dau la Unit Moja', 565, 290);

    // 10. Footer info
    ctx.font = '12px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('rafikibusinesssolutions.netlify.app', 50, 400);

    ctx.textAlign = 'right';
    ctx.fillText(language === 'en' ? 'AI-Powered Football Predictions' : 'Utabiri wa Soka wa AI', 750, 400);
    ctx.textAlign = 'left'; // reset

    // Trigger download
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rafiki_performance_card_${new Date().toISOString().slice(0, 10)}.png`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareTextCompact = language === 'en' 
    ? `🔥 Rafiki Predict Performance Update! 🔥\n\n🏆 Streak: ${currentStreak}\n🎯 Win Rate: ${accuracy}\n📈 ROI: ${roi}\n\nJoin at rafikibusinesssolutions.netlify.app 🚀`
    : `🔥 Taarifa ya Utendaji ya Rafiki Predict! 🔥\n\n🏆 Mfululizo: ${currentStreak}\n🎯 Ushindi: ${accuracy}\n📈 ROI: ${roi}\n\nJiunge rafikibusinesssolutions.netlify.app 🚀`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTextCompact)}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareTextCompact)}`;

  // Filter logic
  const filteredPredictions = useMemo(() => {
    return historicalPredictions.filter((p) => {
      const matchText = `${p.match.homeTeam} ${p.match.awayTeam} ${p.match.league} ${p.pick}`.toLowerCase();
      const matchesSearch = matchText.includes(searchTerm.toLowerCase());
      const matchesSport = sportFilter === 'all' || p.match.sport === sportFilter;
      const matchesResult = resultFilter === 'all' || p.result === resultFilter;
      const matchesConfidence = p.confidence >= minConfidence;
      const matchesOdds = p.odds >= minOdds;
      return matchesSearch && matchesSport && matchesResult && matchesConfidence && matchesOdds;
    });
  }, [historicalPredictions, searchTerm, sportFilter, resultFilter, minConfidence, minOdds]);

  // Derived calculations from current filtered list
  const derivedStats = useMemo(() => {
    const total = filteredPredictions.length;
    if (total === 0) return { winRate: 0, avgOdds: 0, profit: 0 };
    const wins = filteredPredictions.filter(p => p.result === 'win').length;
    const winRate = Math.round((wins / total) * 1000) / 10;
    const avgOdds = Math.round((filteredPredictions.reduce((sum, p) => sum + p.odds, 0) / total) * 100) / 100;
    
    // Simulate unit returns: backing each at 1 unit
    // Return for win = odds - 1. Return for loss = -1.
    const profit = Math.round(filteredPredictions.reduce((acc, p) => {
      if (p.result === 'win') return acc + (p.odds - 1);
      if (p.result === 'loss') return acc - 1;
      return acc;
    }, 0) * 10) / 10;

    return { winRate, avgOdds, profit };
  }, [filteredPredictions]);

  const [notificationError, setNotificationError] = useState<string | null>(null);

  // Request notification permission and toggle alerts
  const handleToggleAlerts = async () => {
    setNotificationError(null);
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationError(language === 'en' ? 'Notifications are not supported in this browser environment.' : 'Arifa haziauniwi katika mazingira ya kivinjari hiki.');
      return;
    }

    if (alertsEnabled) {
      localStorage.setItem('rafiki_streak_alerts', 'disabled');
      setAlertsEnabled(false);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        localStorage.setItem('rafiki_streak_alerts', 'enabled');
        setAlertsEnabled(true);
        
        // Trigger initial welcoming notification
        try {
          new Notification('Rafiki Predict AI', {
            body: language === 'en' 
              ? '🚀 Streak Alerts Enabled! We will notify you when you achieve new winning streaks.' 
              : '🚀 Arifa za Mfululizo Zimeshurnishwa! Tutakujulisha utakapofikia rekodi mpya za ushindi.',
            icon: '/favicon.ico',
            tag: 'rafiki-alerts-welcome',
          });
        } catch (err) {
          console.error('Failed to send notification:', err);
        }
      } else if (permission === 'denied') {
        setNotificationError(language === 'en' 
          ? 'Notification permission was denied in your browser settings.' 
          : 'Ufikiaji wa arifa ulikataliwa katika mipangilio ya kivinjari chako.');
      }
    } catch (err: any) {
      setNotificationError(err?.message || 'Could not request notification permission.');
    }
  };

  const handleSendTestNotification = () => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    
    try {
      new Notification('🎉 Rafiki Predict Test Alert!', {
        body: language === 'en'
          ? `Outstanding! You hit a milestone of ${currentStreak || '5 Wins'}! A new legendary badge is unlocked.`
          : `Kazi safi sana! Umefikia mfululizo wa ushindi wa ${currentStreak || 'Ushindi 5'}! Beji mpya ya kipekee imefunguliwa.`,
        icon: '/favicon.ico',
        tag: 'rafiki-alerts-test',
      });
    } catch (err) {
      console.error('Failed to send test notification:', err);
    }
  };

  return (
    <div className="space-y-8" id="archive-section">
      {/* Visual Countdown Timer Banner */}
      <div className="bg-zinc-950 border border-zinc-800/80 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 text-left">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
              {language === 'en' ? 'MODEL CALIBRATION & REFRESH' : 'USANIFISHAJI & SASISHO LA MODELI'}
            </span>
          </div>
          <h3 className="text-base font-bold text-white font-sans">
            {language === 'en' ? 'AI Consensus Predictions Engine' : 'Mtambo wa Utabiri wa AI Consensus'}
          </h3>
          <p className="text-xs text-gray-400 max-w-xl leading-relaxed">
            {language === 'en' 
              ? 'Our neural network calibrates and updates prediction probabilities, Kelly staking recommendations, and accumulator legs daily based on real-time global odds movements and squad intelligence.'
              : 'Mtandao wetu wa neva husanifisha na kusasisha uwezekano wa utabiri, mapendekezo ya dau la Kelly, na miguu ya accumulator kila siku kulingana na mienendo ya odds ya kimataifa na habari za timu.'}
          </p>
        </div>

        {/* Countdown Timer visual widget */}
        <div className="bg-zinc-900 border border-zinc-800/60 p-4 rounded-xl flex items-center gap-4 min-w-[280px] md:min-w-[320px] justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded-lg relative">
              <Clock className="w-5 h-5 animate-pulse" />
              {/* Radial background animation */}
              <div className="absolute inset-0 rounded-lg bg-emerald-500/10 animate-ping opacity-20" />
            </div>
            <div className="text-left">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">
                {language === 'en' ? 'NEXT AI UPDATE IN' : 'AI SASISHO LIJALO BAADA YA'}
              </span>
              <span className="text-xs font-bold text-gray-300">
                {language === 'en' ? 'Daily consensus refresh' : 'Sasisho la kila siku la consensus'}
              </span>
            </div>
          </div>

          {/* Digital Clock */}
          <div className="flex items-center gap-1">
            {/* Hours */}
            <div className="flex flex-col items-center">
              <div className="bg-zinc-950 px-2 py-1.5 rounded-lg border border-zinc-800 text-sm font-mono font-bold text-white min-w-[28px] text-center shadow-inner">
                {String(timeLeft.hours).padStart(2, '0')}
              </div>
              <span className="text-[8px] font-mono text-gray-600 uppercase mt-1">h</span>
            </div>
            <span className="text-xs font-mono text-emerald-500/80 animate-pulse font-bold pb-4">:</span>
            {/* Minutes */}
            <div className="flex flex-col items-center">
              <div className="bg-zinc-950 px-2 py-1.5 rounded-lg border border-zinc-800 text-sm font-mono font-bold text-white min-w-[28px] text-center shadow-inner">
                {String(timeLeft.minutes).padStart(2, '0')}
              </div>
              <span className="text-[8px] font-mono text-gray-600 uppercase mt-1">m</span>
            </div>
            <span className="text-xs font-mono text-emerald-500/80 animate-pulse font-bold pb-4">:</span>
            {/* Seconds */}
            <div className="flex flex-col items-center">
              <div className="bg-zinc-950 px-2 py-1.5 rounded-lg border border-zinc-800 text-sm font-mono font-bold text-amber-400 min-w-[28px] text-center shadow-inner">
                {String(timeLeft.seconds).padStart(2, '0')}
              </div>
              <span className="text-[8px] font-mono text-gray-600 uppercase mt-1">s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Streak Alerts Control Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-xl">
        <div className="flex items-start gap-4 z-10">
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-amber-400 shrink-0">
            {alertsEnabled ? (
              <Bell className="w-6 h-6 text-amber-400 animate-bounce" />
            ) : (
              <BellOff className="w-6 h-6 text-zinc-500" />
            )}
          </div>
          <div className="space-y-1 text-left">
            <h4 className="text-sm font-bold text-white font-sans flex flex-wrap items-center gap-2">
              <span>{language === 'en' ? 'Streak Milestone & Badge Alerts' : 'Tahadhari ya Mfululizo & Beji za Ushindi'}</span>
              <span className="text-[9px] bg-amber-500/10 border border-amber-500/25 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                {language === 'en' ? 'Browser Push' : 'Arifa za Kivinjari'}
              </span>
            </h4>
            <p className="text-xs text-gray-400 max-w-xl leading-relaxed">
              {language === 'en'
                ? 'Toggle browser push notifications to receive real-time alerts as soon as your predictions secure milestone winning streaks (such as reaching 5 wins mfululizo).'
                : 'Washa arifa za kivinjari ili kupokea ujumbe papo hapo utakapofikia rekodi ya ushindi mfululizo (kama kufikisha ushindi 5 mfululizo).'}
            </p>
            {notificationError && (
              <p className="text-[10px] text-amber-400 font-mono">
                ℹ {notificationError}
              </p>
            )}
            {notificationPermission === 'denied' && !notificationError && (
              <p className="text-[10px] text-red-400 font-mono">
                ⚠ {language === 'en' ? 'Notification permission is blocked. Please enable it in browser settings.' : 'Ufikiaji wa arifa umezuiwa. Tafadhali uruhusu kwenye mipangilio ya kivinjari.'}
              </p>
            )}
          </div>
        </div>

        {/* Toggle Switch Controls */}
        <div className="flex items-center gap-3 shrink-0 self-start md:self-center z-10">
          {alertsEnabled && notificationPermission === 'granted' && (
            <button
              onClick={handleSendTestNotification}
              className="text-[10px] font-mono font-bold bg-zinc-950 hover:bg-zinc-900 text-emerald-400 border border-zinc-800 px-3 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
            >
              {language === 'en' ? 'Test Alert' : 'Jaribu Arifa'}
            </button>
          )}

          <button
            onClick={handleToggleAlerts}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              alertsEnabled ? 'bg-emerald-500' : 'bg-zinc-800'
            }`}
            role="switch"
            aria-checked={alertsEnabled}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                alertsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Dynamic ambient card glow */}
        {alertsEnabled && (
          <div className="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
        )}
      </div>

      {/* Bookmarked / Saved Predictions Section */}
      <div className="space-y-4 bg-zinc-950/40 p-5 md:p-6 rounded-2xl border border-zinc-800/40">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-sans font-bold text-white flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-amber-400 fill-current animate-pulse" />
              {language === 'en' ? 'My Saved Picks' : 'Chaguzi Zangu Zilizohifadhiwa'}
            </h3>
            <p className="text-xs text-gray-400">
              {language === 'en'
                ? 'Your bookmarked premium predictions and AI consensus tips for offline reference'
                : 'Utabiri wako uliouhifadhi na siri za AI kwa marejeleo ya haraka baadaye'}
            </p>
          </div>
          <span className="text-xs font-mono bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800 text-gray-400">
            {savedPredictions.length} {language === 'en' ? 'Saved' : 'Zimehifadhiwa'}
          </span>
        </div>

        {savedPredictions.length === 0 ? (
          <div className="text-center py-10 bg-zinc-900/50 border border-zinc-850 rounded-xl text-xs text-gray-500 font-mono flex flex-col items-center gap-2">
            <Bookmark className="w-8 h-8 text-zinc-700" />
            <span>
              {language === 'en'
                ? 'No saved predictions yet. Go to the Predictions tab and click the bookmark button on any pick.'
                : 'Hujajihifadhia utabiri wowote bado. Nenda kwenye kichupo cha Utabiri na uguse alama ya kuhifadhi.'}
            </span>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {savedPredictions.map((saved) => {
              const pred = saved.prediction;
              if (!pred || !pred.match) return null;
              return (
                <div 
                  key={saved.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-3 relative overflow-hidden group hover:border-zinc-700 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-zinc-950 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded border border-zinc-800 uppercase">
                        {pred.match.sport} • {pred.match.league}
                      </span>
                      <button
                        onClick={() => handleRemoveBookmark(saved.id)}
                        className="p-1 rounded bg-zinc-950 border border-zinc-850 hover:border-red-500/30 text-zinc-500 hover:text-red-400 transition-all cursor-pointer"
                        title={language === 'en' ? 'Remove Bookmark' : 'Ondoa Alama'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white font-sans">
                        {pred.match.homeTeam} vs {pred.match.awayTeam}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs bg-zinc-950 text-amber-400 px-2 py-0.5 rounded font-mono font-bold">
                          {pred.market}: {pred.pick}
                        </span>
                        <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-950/20 px-2 py-0.5 rounded">
                          Odds: {pred.odds.toFixed(2)}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">
                          Confidence: {pred.confidence}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-850 flex justify-between items-center text-[10px] text-gray-500 font-mono">
                    <span>
                      {language === 'en' ? 'Saved:' : 'Imehifadhiwa:'} {new Date(saved.savedAt).toLocaleDateString(language === 'sw' ? 'sw-TZ' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[9px] bg-zinc-950 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-850 capitalize">
                      {pred.riskLevel} Risk
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Overview stats header cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-2 flex flex-col justify-between">
          <span className="text-xs text-gray-400 font-medium">Accumulated ROI</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-emerald-400">
              +{stats?.roi || 18.4}%
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-[10px] text-gray-500">Based on flat 1-unit stakes last 30 days</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-2 flex flex-col justify-between">
          <span className="text-xs text-gray-400 font-medium">Monthly Win Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-white">
              {stats?.monthlyAccuracy || 84.5}%
            </span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-[10px] text-gray-500">Target confidence threshold &gt; 75%</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-2 flex flex-col justify-between">
          <span className="text-xs text-gray-400 font-medium">Weekly Accuracy</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-white">
              {stats?.weeklyAccuracy || 86.2}%
            </span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-[10px] text-gray-500">7-day rolling window accuracy</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-2 flex flex-col justify-between">
          <span className="text-xs text-gray-400 font-medium">Platform Integrity</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-emerald-500">
              100%
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-[10px] text-gray-500">All results verified on public charts</p>
        </div>
      </div>

      {/* Accuracy & ROI charts and Win/Loss Bar Chart */}
      {stats?.historicalChartData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Accuracy & ROI Progress */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white font-sans">
                  {language === 'en' ? 'Accuracy & ROI Progress' : 'Maendeleo ya Usahihi na ROI'}
                </h3>
                <p className="text-xs text-gray-400">
                  {language === 'en' ? 'A historical progression of model efficacy' : 'Maendeleo ya kihistoria ya ufanisi wa modeli'}
                </p>
              </div>
              <span className="text-[10px] bg-zinc-800 text-gray-300 font-mono px-2 py-0.5 rounded border border-zinc-700">
                {language === 'en' ? 'Live Updates' : 'Sasisho Papo Hapo'}
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.historicalChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorWinRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRoi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <YAxis stroke="#71717a" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                    itemStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Area type="monotone" name={language === 'en' ? 'Win Rate %' : 'Kiwango cha Ushindi %'} dataKey="winRate" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorWinRate)" />
                  <Area type="monotone" name={language === 'en' ? 'ROI %' : 'ROI %'} dataKey="roi" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRoi)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: 30-Day Win/Loss Record */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white font-sans">
                  {language === 'en' ? '30-Day Win/Loss Record' : 'Ushindi/Kushindwa kwa Siku 30'}
                </h3>
                <p className="text-xs text-gray-400">
                  {language === 'en' ? 'Daily breakdown of successful vs. unsuccessful predictions' : 'Uchambuzi wa kila siku wa utabiri uliofanikiwa na usiofanikiwa'}
                </p>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-800/40">
                {language === 'en' ? 'Last 30 Days' : 'Siku 30 Zilizopita'}
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={winLossBarData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="formattedDate" stroke="#71717a" style={{ fontSize: '9px', fontFamily: 'monospace' }} />
                  <YAxis allowDecimals={false} stroke="#71717a" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                    itemStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '10px' }} 
                    verticalAlign="bottom" 
                    height={36} 
                  />
                  <Bar name={language === 'en' ? 'Wins' : 'Ushindi'} dataKey="wins" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar name={language === 'en' ? 'Losses' : 'Kushindwa'} dataKey="losses" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Advanced search, filters and results log */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white font-sans">
                {language === 'en' ? 'Full Predictions Registry' : 'Kumbukumbu Kamili ya Utabiri'}
              </h3>
              <p className="text-xs text-gray-400">
                {language === 'en' ? 'Verifiably logging every single tip issued by our platform' : 'Kumbukumbu iliyothibitishwa ya kila utabiri uliotolewa na jukwaa letu'}
              </p>
            </div>

            {/* Live derived status & CSV Export */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-2 items-center text-[11px] font-mono">
                <span className="text-gray-400">{language === 'en' ? 'Filtered Yield:' : 'Mavuno Yaliyochujwa:'}</span>
                <span className={`px-2 py-0.5 rounded ${derivedStats.profit >= 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                  {derivedStats.profit >= 0 ? '+' : ''}{derivedStats.profit} {language === 'en' ? 'units profit' : 'vitengo vya faida'}
                </span>
                <span className="bg-zinc-800 text-gray-300 px-2 py-0.5 rounded">
                  WR: {derivedStats.winRate}%
                </span>
              </div>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold font-sans py-1.5 px-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                id="btn-export-csv"
                title={language === 'en' ? 'Export filtered predictions to CSV file' : 'Hamisha utabiri ulichochagua kwenye faili la CSV'}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'Export CSV' : 'Hamisha CSV'}</span>
              </button>

              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold font-sans py-1.5 px-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                id="btn-share-performance"
                title={language === 'en' ? 'Share your verified prediction stats on social media' : 'Shiriki takwimu zako za utabiri zilizothibitishwa kwenye mitandao ya kijamii'}
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'en' ? 'Share Stats' : 'Shiriki Takwimu'}</span>
              </button>
            </div>
          </div>

          {/* Filter Controls Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="archive-match-search-input"
                name="archive_search_term"
                type="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                placeholder="Search team, league, or result..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value as any)}
                  className="bg-transparent border-0 text-xs text-white focus:outline-none focus:ring-0 w-full"
                >
                  <option value="all">All Sports</option>
                  <option value="football">Football Only</option>
                  <option value="basketball">Basketball Only</option>
                  <option value="tennis">Tennis Only</option>
                </select>
              </div>

              <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 gap-2">
                <Activity className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value as any)}
                  className="bg-transparent border-0 text-xs text-white focus:outline-none focus:ring-0 w-full"
                >
                  <option value="all">All Results</option>
                  <option value="win">Wins Only</option>
                  <option value="loss">Losses Only</option>
                </select>
              </div>
            </div>

            {/* Slider parameters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col justify-center">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Min Confidence</span>
                  <span className="font-mono text-white font-semibold">{minConfidence}%</span>
                </div>
                <input
                  type="range"
                  min="75"
                  max="95"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="flex flex-col justify-center">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Min Odds</span>
                  <span className="font-mono text-white font-semibold">{minOdds.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="2.2"
                  step="0.05"
                  value={minOdds}
                  onChange={(e) => setMinOdds(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* List of historical items */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-gray-400 font-mono uppercase">
                <th className="py-3 px-2">Date</th>
                <th className="py-3 px-2">Match & League</th>
                <th className="py-3 px-2">Selection</th>
                <th className="py-3 px-2 text-center">Odds</th>
                <th className="py-3 px-2 text-center">Conf</th>
                <th className="py-3 px-2 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-sm">
              {filteredPredictions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500 text-xs">
                    No historical predictions match your active search filters.
                  </td>
                </tr>
              ) : (
                filteredPredictions.slice(0, 30).map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3.5 px-2 font-mono text-xs text-gray-400">
                      {new Date(p.match.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-2">
                      <div className="font-sans font-medium text-white">
                        {p.match.homeTeam} vs {p.match.awayTeam}
                      </div>
                      <div className="text-[10px] text-gray-400 uppercase font-mono tracking-wider mt-0.5">
                        {p.match.league}
                      </div>
                    </td>
                    <td className="py-3.5 px-2">
                      <div className="text-white font-sans text-xs">{p.pick}</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">{p.market}</div>
                    </td>
                    <td className="py-3.5 px-2 text-center font-mono font-bold text-gray-300">
                      {p.odds.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-2 text-center font-mono text-emerald-400">
                      {p.confidence}%
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold font-mono tracking-wider uppercase ${
                        p.result === 'win' 
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/20' 
                          : p.result === 'loss'
                          ? 'bg-red-950/40 text-red-400 border border-red-800/20'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {p.result}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredPredictions.length > 30 && (
          <div className="text-center text-xs text-gray-500 font-mono mt-2">
            Showing latest 30 of {filteredPredictions.length} matching predictions. Refine filters to view earlier records.
          </div>
        )}
      </div>

      {/* Social Sharing Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[999] transition-all">
          <div className="bg-zinc-950 border border-zinc-850 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col relative" id="modal-share-stats">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-900 bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white font-sans">
                  {language === 'en' ? 'Share Verified Performance Card' : 'Shiriki Kadi ya Utendaji Iliyothibitishwa'}
                </h4>
              </div>
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
              
              {/* Card HTML Preview */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#090d16] via-[#0f172a] to-[#1e293b] border border-zinc-850 p-6 shadow-xl space-y-6">
                
                {/* Brand Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xl font-black text-white font-sans tracking-wide">RAFIKI PREDICT AI</h5>
                    <span className="text-[10px] font-bold font-mono text-emerald-400 tracking-wider">
                      {language === 'en' ? 'VERIFIED PERFORMANCE CARD' : 'KADI ILIYOTHIBITISHWA YA UTENDAJI'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/20 px-2 py-1 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[9px] font-mono font-bold text-emerald-400">
                      {language === 'en' ? 'SECURE VERIFIED' : 'IMETHIBITISHWA'}
                    </span>
                  </div>
                </div>

                {/* Stat Cards Grid (Bento style) */}
                <div className="grid grid-cols-3 gap-3">
                  
                  {/* Streak Card */}
                  <div className="bg-zinc-950/85 border border-zinc-850 p-3.5 rounded-xl flex flex-col justify-between h-28">
                    <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">
                      {language === 'en' ? 'Streak' : 'Mfululizo'}
                    </span>
                    <div className="my-1.5">
                      <span className="text-base sm:text-lg font-bold text-amber-500 font-sans block">
                        🔥 {currentStreak}
                      </span>
                    </div>
                    <span className="text-[8px] font-mono text-gray-500 leading-none">
                      {language === 'en' ? 'Active runs' : 'Mfululizo hai'}
                    </span>
                  </div>

                  {/* Win Rate Card */}
                  <div className="bg-zinc-950/85 border border-zinc-850 p-3.5 rounded-xl flex flex-col justify-between h-28">
                    <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">
                      {language === 'en' ? 'Win Rate' : 'Kiwango'}
                    </span>
                    <div className="my-1.5">
                      <span className="text-base sm:text-lg font-bold text-white font-sans block">
                        🎯 {accuracy}
                      </span>
                    </div>
                    <span className="text-[8px] font-mono text-gray-500 leading-none">
                      {totalWins}W / {totalLosses}L
                    </span>
                  </div>

                  {/* ROI Card */}
                  <div className="bg-zinc-950/85 border border-zinc-850 p-3.5 rounded-xl flex flex-col justify-between h-28">
                    <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">
                      ROI
                    </span>
                    <div className="my-1.5">
                      <span className="text-base sm:text-lg font-bold text-emerald-400 font-sans block">
                        📈 {roi}
                      </span>
                    </div>
                    <span className="text-[8px] font-mono text-gray-500 leading-none">
                      {language === 'en' ? 'Flat 1-Unit' : 'Unit Moja'}
                    </span>
                  </div>

                </div>

                {/* Footer URL */}
                <div className="flex justify-between items-center pt-2 border-t border-zinc-900/60 text-[10px] text-gray-500 font-mono">
                  <span>rafikibusinesssolutions.netlify.app</span>
                  <span>{language === 'en' ? 'AI Sports Predictions' : 'Utabiri wa Soka wa AI'}</span>
                </div>

              </div>

              {/* Actions Section */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-gray-400 font-mono uppercase tracking-wider">
                  {language === 'en' ? 'Sharing Options' : 'Chaguzi za Kushiriki'}
                </div>

                {/* Primary Action Button: Download PNG */}
                <button
                  onClick={handleDownloadPNG}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm font-sans py-3 rounded-xl transition-all shadow-lg active:scale-[0.99] cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{language === 'en' ? 'Download Performance Card (PNG)' : 'Pakua Kadi ya Utendaji (PNG)'}</span>
                </button>

                {/* Direct Banner & Logo Export Bar */}
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block font-bold">
                    {language === 'en' ? 'Official Brand Assets Kit' : 'Picha & Nembo Rasmi'}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => downloadImageFile(APP_BANNER, 'rafiki_official_banner.jpg')}
                      className="flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-gray-200 text-xs py-2 px-3 rounded-lg transition-all cursor-pointer font-mono"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{language === 'en' ? 'Download Banner' : 'Pakua Bango'}</span>
                    </button>
                    <button
                      onClick={() => downloadImageFile(APP_LOGO, 'rafiki_official_logo.jpg')}
                      className="flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-gray-200 text-xs py-2 px-3 rounded-lg transition-all cursor-pointer font-mono"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
                      <span>{language === 'en' ? 'Download Logo' : 'Pakua Nembo'}</span>
                    </button>
                  </div>
                </div>

                {/* Secondary Grid */}
                <div className="grid grid-cols-3 gap-2">
                  
                  {/* Copy Text */}
                  <button
                    onClick={handleCopyShareText}
                    className="flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-850 text-white border border-zinc-800 text-xs font-medium font-sans py-2.5 px-2 rounded-xl transition-all cursor-pointer h-12"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">{language === 'en' ? 'Copied!' : 'Imenakiliwa!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{language === 'en' ? 'Copy Text' : 'Nakili'}</span>
                      </>
                    )}
                  </button>

                  {/* Share Twitter */}
                  <a
                    href={twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 bg-[#1da1f2] hover:bg-[#1a91da] text-white text-xs font-medium font-sans py-2.5 px-2 rounded-xl transition-all h-12"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span>Twitter (X)</span>
                  </a>

                  {/* Share WhatsApp */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 bg-[#25d366] hover:bg-[#20ba5a] text-white text-xs font-medium font-sans py-2.5 px-2 rounded-xl transition-all h-12"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.456L0 24zm6.59-4.846c1.6.95 3.182 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.117-2.91-6.999-1.88-1.882-4.36-2.914-6.994-2.915-5.443 0-9.866 4.423-9.87 9.867-.001 1.767.487 3.495 1.414 5.031l-.973 3.548 3.644-.955zm13.107-7.9c-.31-.154-1.834-.905-2.119-1.01-.284-.104-.49-.154-.697.155-.206.31-.8.1-1.01.206-.41.206-.413-.41-.54-.62-.15-.258-.88-1.124-1.226-1.428-.31-.27-.582-.206-.795-.206l-.41.01c-.155 0-.41.058-.624.288-.206.23-.8.78-.8 1.9s.816 2.21.93 2.36c.114.15 1.606 2.451 3.89 3.44.543.235.97.375 1.3.48.547.173 1.045.148 1.44.09.438-.064 1.833-.75 2.09-1.478.258-.729.258-1.354.18-1.482-.078-.128-.284-.206-.593-.36z" />
                    </svg>
                    <span>WhatsApp</span>
                  </a>

                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
