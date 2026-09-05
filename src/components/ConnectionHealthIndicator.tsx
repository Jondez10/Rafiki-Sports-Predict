import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ChevronDown, 
  Server, 
  Activity, 
  Clock,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { connectionHealth, ConnectionHealthState } from '../lib/connectionHealth';

interface ConnectionHealthIndicatorProps {
  language?: 'en' | 'sw';
  className?: string;
  showDetailsDropdown?: boolean;
}

export default function ConnectionHealthIndicator({
  language = 'en',
  className = '',
  showDetailsDropdown = true
}: ConnectionHealthIndicatorProps) {
  const [health, setHealth] = useState<ConnectionHealthState>(connectionHealth.getState());
  const [isOpen, setIsOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [justRestored, setJustRestored] = useState(false);
  const prevStatusRef = useRef(health.status);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = connectionHealth.subscribe((newState) => {
      // Check if we just transitioned from degraded/disconnected to connected
      if (
        (prevStatusRef.current === 'degraded' || prevStatusRef.current === 'disconnected') &&
        newState.status === 'connected'
      ) {
        setJustRestored(true);
        setTimeout(() => {
          setJustRestored(false);
        }, 4000);
      }
      prevStatusRef.current = newState.status;
      setHealth(newState);
    });

    return () => unsubscribe();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleManualRetry = async () => {
    setIsRetrying(true);
    await connectionHealth.checkHealth();
    setTimeout(() => {
      setIsRetrying(false);
    }, 400);
  };

  const isConnected = health.status === 'connected';
  const isChecking = health.status === 'checking' || isRetrying;
  const isProblem = health.status === 'degraded' || health.status === 'disconnected';

  // Quality of latency
  let latencyBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let latencyLabel = language === 'en' ? 'Excellent' : 'Nzuri Sana';
  if (health.latencyMs !== null) {
    if (health.latencyMs > 300) {
      latencyBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      latencyLabel = language === 'en' ? 'Slow' : 'Polepole';
    } else if (health.latencyMs > 150) {
      latencyBadge = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      latencyLabel = language === 'en' ? 'Good' : 'Nzuri';
    }
  }

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* COMPACT PILL BUTTON */}
      <button
        id="global-connection-health-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 rounded-xl border text-[11px] font-mono font-medium transition-all cursor-pointer select-none ${
          isProblem
            ? 'bg-rose-950/40 border-rose-500/60 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse'
            : isChecking
            ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
            : 'bg-zinc-900/90 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700 text-zinc-300'
        }`}
        title={
          isProblem
            ? `${language === 'en' ? 'Connection Interrupted' : 'Muunganisho Umekatika'}: ${health.interruptionReason || 'Click for diagnostic details'}`
            : `${language === 'en' ? 'Connection Status' : 'Hali ya Muunganisho'}: ${isConnected ? '100% Operational' : 'Checking...'}`
        }
      >
        {/* Animated Status Indicator Dot / Icon */}
        <span className="relative flex h-2 w-2 shrink-0">
          {isConnected && (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </>
          )}
          {isChecking && (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400 animate-pulse"></span>
          )}
          {isProblem && (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </>
          )}
        </span>

        {/* Text Label */}
        <span className="hidden sm:inline-block">
          {isProblem ? (
            <span className="text-rose-400 font-semibold">
              {health.reconnectCountdown !== null
                ? `${language === 'en' ? 'Retry in' : 'Jaribu baada ya'} ${health.reconnectCountdown}s`
                : language === 'en' ? 'Interrupted' : 'Imekatika'}
            </span>
          ) : isChecking ? (
            <span className="text-amber-400">{language === 'en' ? 'Checking...' : 'Inakagua...'}</span>
          ) : health.latencyMs !== null ? (
            <span className="text-zinc-300 font-medium">{health.latencyMs}ms</span>
          ) : (
            <span className="text-emerald-400 font-semibold">{language === 'en' ? 'Live' : 'Hewani'}</span>
          )}
        </span>

        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* DROPDOWN DIAGNOSTIC MODAL / POPOVER */}
      <AnimatePresence>
        {isOpen && showDetailsDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-88 bg-zinc-950/98 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl p-4 z-50 text-left text-xs font-sans divide-y divide-zinc-900"
          >
            {/* Header */}
            <div className="pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-sm">
                  {language === 'en' ? 'System Connection Health' : 'Hali ya Muunganisho wa Mfumo'}
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-zinc-500 hover:text-zinc-200 rounded-lg hover:bg-zinc-900 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Status Summary Banner */}
            <div className="py-3 space-y-2.5">
              <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                isConnected 
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                  : isChecking
                  ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                  : 'bg-rose-950/25 border-rose-500/40 text-rose-300'
              }`}>
                {isConnected ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : isChecking ? (
                  <RefreshCw className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-spin" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-xs leading-tight">
                    {isConnected 
                      ? (language === 'en' ? 'All Systems Connected & Live' : 'Mifumo Yote Imeunganishwa Hewani')
                      : isChecking
                      ? (language === 'en' ? 'Testing Connection...' : 'Inapima Muunganisho...')
                      : (language === 'en' ? 'Connection Interrupted' : 'Muunganisho Umekatizwa')}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    {isProblem 
                      ? (health.interruptionReason || (language === 'en' ? 'Connection to server was lost. Auto-reconnecting...' : 'Muunganisho na seva umepotea. Inajaribu tena...'))
                      : (language === 'en' 
                          ? 'Real-time prediction feeds, AI reasoning engine, and session tokens are synchronized.' 
                          : 'Utabiri, injini ya AI, na vipindi vya VIP viko sawa.')}
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {/* Latency */}
                <div className="p-2 bg-zinc-900/70 rounded-xl border border-zinc-800/80 flex flex-col">
                  <span className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
                    {language === 'en' ? 'Round-trip Latency' : 'Kasi ya Muunganisho'}
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono font-bold text-white text-xs">
                      {health.latencyMs !== null ? `${health.latencyMs} ms` : '—'}
                    </span>
                    {health.latencyMs !== null && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] border font-semibold ${latencyBadge}`}>
                        {latencyLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Network / Internet */}
                <div className="p-2 bg-zinc-900/70 rounded-xl border border-zinc-800/80 flex flex-col">
                  <span className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
                    {language === 'en' ? 'Device Internet' : 'Mtandao wa Kifaa'}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {health.isOnline ? (
                      <>
                        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-bold text-emerald-400 text-xs">{language === 'en' ? 'Online' : 'Upo Mtandaoni'}</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                        <span className="font-bold text-rose-400 text-xs">{language === 'en' ? 'Offline' : 'Haupo Mtandaoni'}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* API Gateway */}
                <div className="p-2 bg-zinc-900/70 rounded-xl border border-zinc-800/80 flex flex-col">
                  <span className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
                    {language === 'en' ? 'API Gateway' : 'Mlango wa API'}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Server className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-bold text-white text-xs">
                      {isConnected ? (language === 'en' ? 'Operational' : 'Inafanya Kazi') : (language === 'en' ? 'Unreachable' : 'Haipatikani')}
                    </span>
                  </div>
                </div>

                {/* Engine Uptime */}
                <div className="p-2 bg-zinc-900/70 rounded-xl border border-zinc-800/80 flex flex-col">
                  <span className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
                    {language === 'en' ? 'Last Check' : 'Ukaguzi wa Mwisho'}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-mono text-zinc-300 text-[10px]">
                      {health.lastChecked ? health.lastChecked.toLocaleTimeString() : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions & Reconnect Footer */}
            <div className="pt-3 flex items-center justify-between gap-2">
              <span className="text-[10px] text-zinc-500 font-mono">
                {health.serverInfo?.service || 'Rafiki API'} • v{health.serverInfo?.version || '2.5'}
              </span>

              <button
                id="connection-health-test-now-btn"
                onClick={handleManualRetry}
                disabled={isRetrying}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{language === 'en' ? 'Ping Connection' : 'Pima Muunganisho'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Top Global Floating Banner that gracefully alerts users when connections are degraded or offline,
 * and confirms restoration without throwing unhandled promise rejections.
 */
export function GlobalConnectionHealthBanner({
  language = 'en'
}: {
  language?: 'en' | 'sw';
}) {
  const [health, setHealth] = useState<ConnectionHealthState>(connectionHealth.getState());
  const [justRestored, setJustRestored] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const prevStatusRef = useRef(health.status);

  useEffect(() => {
    const unsubscribe = connectionHealth.subscribe((newState) => {
      // If we recovered from problem to connected
      if (
        (prevStatusRef.current === 'degraded' || prevStatusRef.current === 'disconnected') &&
        newState.status === 'connected'
      ) {
        setJustRestored(true);
        setDismissed(false);
        const timer = setTimeout(() => {
          setJustRestored(false);
        }, 4500);
        return () => clearTimeout(timer);
      }
      
      // If a new disconnection happened, un-dismiss
      if (
        (newState.status === 'degraded' || newState.status === 'disconnected') &&
        prevStatusRef.current === 'connected'
      ) {
        setDismissed(false);
      }

      prevStatusRef.current = newState.status;
      setHealth(newState);
    });

    return () => unsubscribe();
  }, []);

  const isProblem = (health.status === 'degraded' || health.status === 'disconnected') && !dismissed;

  const handleRetryNow = async () => {
    await connectionHealth.checkHealth();
  };

  return (
    <AnimatePresence>
      {/* 1. DISCONNECTION / DEGRADED NOTIFICATION BANNER */}
      {isProblem && (
        <motion.div
          key="connection-problem-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="bg-zinc-950/95 border-b border-amber-500/40 px-4 py-2.5 text-xs text-amber-200 shadow-xl backdrop-blur-md relative z-40"
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/40 shrink-0 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
              <div className="truncate">
                <span className="font-bold text-amber-300 mr-2">
                  {language === 'en' ? 'Connection Notice:' : 'Ilani ya Muunganisho:'}
                </span>
                <span className="text-zinc-300">
                  {health.interruptionReason || (language === 'en' ? 'Server API connection interrupted.' : 'Muunganisho wa seva umekatizwa.')}
                  {' '}
                  <span className="text-zinc-400 hidden sm:inline">
                    {language === 'en' ? 'Cached predictions and VIP keys remain safely accessible.' : 'Utabiri uliohifadhiwa unapatikana.'}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {health.reconnectCountdown !== null && (
                <span className="font-mono text-[11px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {language === 'en' ? 'Auto-retry in' : 'Inajaribu tena baada ya'} {health.reconnectCountdown}s
                </span>
              )}

              <button
                onClick={handleRetryNow}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{language === 'en' ? 'Retry Now' : 'Jaribu Sasa'}</span>
              </button>

              <button
                onClick={() => setDismissed(true)}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded-md transition-colors"
                title="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. RECONNECTED SUCCESS TOAST / BANNER */}
      {justRestored && !isProblem && (
        <motion.div
          key="connection-restored-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25 }}
          className="bg-emerald-950/90 border-b border-emerald-500/40 px-4 py-2 text-xs text-emerald-200 shadow-lg backdrop-blur-md relative z-40"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-white">
                {language === 'en' ? 'Connection Restored' : 'Muunganisho Umerudi'}
              </span>
              <span className="text-emerald-300/80 hidden sm:inline text-[11px]">
                {language === 'en' 
                  ? 'Real-time sync and API gateway are fully operational.' 
                  : 'Muunganisho na seva unafanya kazi kikamilifu.'}
              </span>
            </div>
            <button
              onClick={() => setJustRestored(false)}
              className="p-1 text-emerald-400/80 hover:text-white rounded-md"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
