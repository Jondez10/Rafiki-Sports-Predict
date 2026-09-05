import React, { useState, useEffect } from 'react';
import { 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  Lock, 
  Smartphone, 
  Copy, 
  Check, 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  LogOut, 
  Share2, 
  HelpCircle, 
  Building2, 
  CreditCard, 
  MessageSquare,
  Flame,
  Zap,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { useAccessKeySession } from '../lib/accessKeySession';
import { SubscriptionPlan } from '../types';

interface SubscriptionTabProps {
  onPaymentSuccess?: (updatedProfile?: any) => void;
  onGuestPassActivated?: (pass?: any) => void;
}

type CurrencyCode = 'KES' | 'USD' | 'EUR' | 'GBP' | 'NGN' | 'GHS' | 'ZAR' | 'UGX' | 'TZS';

const CURRENCY_CONFIGS: Record<CurrencyCode, { symbol: string; name: string; flag: string; rateKES: number }> = {
  KES: { symbol: 'KSh', name: 'Kenyan Shilling', flag: '🇰🇪', rateKES: 1 },
  USD: { symbol: '$', name: 'US Dollar', flag: '🇺🇸', rateKES: 130 },
  EUR: { symbol: '€', name: 'Euro', flag: '🇪🇺', rateKES: 140 },
  GBP: { symbol: '£', name: 'British Pound', flag: '🇬🇧', rateKES: 165 },
  NGN: { symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬', rateKES: 0.085 },
  GHS: { symbol: 'GH₵', name: 'Ghanaian Cedi', flag: '🇬🇭', rateKES: 8.5 },
  ZAR: { symbol: 'R', name: 'South African Rand', flag: '🇿🇦', rateKES: 7.2 },
  UGX: { symbol: 'USh', name: 'Ugandan Shilling', flag: '🇺🇬', rateKES: 0.035 },
  TZS: { symbol: 'TSh', name: 'Tanzanian Shilling', flag: '🇹🇿', rateKES: 0.05 }
};

export default function SubscriptionTab({}: SubscriptionTabProps) {
  const session = useAccessKeySession();

  // Plans state
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('KES');
  const [isPlansLoading, setIsPlansLoading] = useState(true);

  // Key Activation Input
  const [keyCodeInput, setKeyCodeInput] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Selected Plan for Payment
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('M-Pesa Till');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentEmail, setPaymentEmail] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSubmitStatus, setPaymentSubmitStatus] = useState<'idle' | 'submitted' | 'polling' | 'approved' | 'rejected'>('idle');
  const [approvedKeyResult, setApprovedKeyResult] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState('');

  // Fetch available plans from server
  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch('/api/plans');
        const data = await res.json();
        if (res.ok && data.plans && data.plans.length > 0) {
          setPlans(data.plans);
        }
      } catch (err) {
        console.warn('Failed to fetch plans:', err);
      } finally {
        setIsPlansLoading(false);
      }
    }
    loadPlans();
  }, []);

  // Format currency price
  const formatPrice = (plan: SubscriptionPlan) => {
    const config = CURRENCY_CONFIGS[selectedCurrency];
    if (selectedCurrency === 'KES') {
      return `${config.symbol} ${plan.priceKES.toLocaleString()}`;
    }
    if (plan.currencyPrices && plan.currencyPrices[selectedCurrency]) {
      return `${config.symbol} ${plan.currencyPrices[selectedCurrency].toLocaleString()}`;
    }
    const converted = Math.round((plan.priceKES / config.rateKES) * 10) / 10;
    return `${config.symbol} ${converted.toLocaleString()}`;
  };

  // Handle manual Key activation
  const handleActivateKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const candidate = keyCodeInput.trim().toUpperCase();
    if (!candidate) {
      setActivationError('Please enter your VIP Access Key.');
      return;
    }

    setIsActivating(true);
    setActivationError('');
    setActivationSuccess('');

    const res = await session.activate(candidate);
    setIsActivating(false);

    if (res.success) {
      setActivationSuccess(res.message);
      setKeyCodeInput('');
    } else {
      setActivationError(res.message);
    }
  };

  // Handle paste from clipboard
  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setKeyCodeInput(text.trim().toUpperCase());
        setActivationError('');
      }
    } catch {
      // Fallback
    }
  };

  // Copy key to clipboard
  const handleCopyCurrentKey = () => {
    if (session.keyCode) {
      navigator.clipboard.writeText(session.keyCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  // Handle payment submission
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPlan) return;
    const refClean = paymentRef.trim().toUpperCase();
    if (!refClean || refClean.length < 5) {
      setPaymentError('Please enter a valid M-Pesa / Bank confirmation code (min 5 characters).');
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentError('');

    try {
      const config = CURRENCY_CONFIGS[selectedCurrency];
      const amount = (selectedCurrency === 'KES' ? checkoutPlan.priceKES : (checkoutPlan.currencyPrices?.[selectedCurrency] || Math.round(checkoutPlan.priceKES / config.rateKES)));

      const response = await fetch('/api/payment/submit-accountless', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: checkoutPlan.id,
          amount,
          currency: selectedCurrency,
          method: paymentMethod,
          reference: refClean,
          phone: paymentPhone,
          email: paymentEmail
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPaymentSubmitStatus('polling');
        // Start polling for instant automatic activation
        pollPaymentStatus(refClean);
      } else {
        setPaymentError(data.message || 'Failed to submit payment details.');
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Network error submitting payment.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Poll payment status
  const pollPaymentStatus = (reference: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/payment/check-status/${encodeURIComponent(reference)}`);
        const data = await res.json();

        if (res.ok && data.success && data.isApproved && data.keyCode) {
          clearInterval(interval);
          setPaymentSubmitStatus('approved');
          setApprovedKeyResult(data.keyCode);
          // Auto activate!
          await session.activate(data.keyCode);
        } else if (attempts >= 40) {
          // Stop after 2 minutes
          clearInterval(interval);
          setPaymentSubmitStatus('submitted');
        }
      } catch {
        if (attempts >= 40) clearInterval(interval);
      }
    }, 3000);
  };

  // WhatsApp manual confirmation link
  const getWhatsAppSupportLink = (plan?: SubscriptionPlan, ref?: string) => {
    const p = plan || checkoutPlan;
    const refCode = ref || paymentRef || 'PENDING';
    const text = `Hello Rafiki Predict Admin,\nI have made payment for ${p ? p.name : 'VIP Access'}.\nReference: ${refCode}\nPhone: ${paymentPhone || 'N/A'}\nPlease verify and send my VIP Access Key.`;
    return `https://wa.me/254716483642?text=${encodeURIComponent(text)}`;
  };

  return (
    <div id="subscription-tab-container" className="max-w-6xl mx-auto px-4 py-6 space-y-8 animate-fadeIn">
      
      {/* 1. TOP HERO BANNER: ACCOUNTLESS SIMPLICITY & PRIVACY */}
      <div id="accountless-hero-banner" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/30 p-6 md:p-8 shadow-xl text-white">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              100% Accountless VIP Access
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Instant Temporary VIP Access via <span className="text-emerald-400">Access Key</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              No account creation or password needed. Simply choose a plan, complete payment, and use your unique Access Key to unlock all high-confidence AI predictions immediately on your device.
            </p>
          </div>

          {/* Quick Security Badges */}
          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              No Registration Needed
            </div>
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-200">
              <Zap className="w-4 h-4 text-amber-400" />
              Instant Device Activation
            </div>
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-200">
              <Lock className="w-4 h-4 text-cyan-400" />
              Encrypted Server-Side Expiry
            </div>
          </div>
        </div>
      </div>

      {/* 2. ACTIVE SESSION STATUS OR ACTIVATION BOX */}
      {session.isActive ? (
        /* ACTIVE KEY DASHBOARD CARD */
        <div id="active-session-card" className="relative rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 border-2 border-emerald-500/50 p-6 md:p-7 shadow-xl shadow-emerald-950/30">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            
            {/* Left: Active Key Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  {session.planName || 'VIP Pass'} • Active
                </span>
                {session.isExpiringSoon && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/30 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    Expiring Soon
                  </span>
                )}
              </div>

              <div>
                <div className="text-xs text-slate-400 font-medium">Your Active VIP Access Key:</div>
                <div className="flex items-center gap-3 mt-1">
                  <code className="text-xl md:text-2xl font-mono font-black text-emerald-300 tracking-wider bg-slate-950/80 px-3.5 py-1.5 rounded-lg border border-emerald-500/30">
                    {session.keyCode}
                  </code>
                  <button
                    id="copy-active-key-btn"
                    onClick={handleCopyCurrentKey}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold transition-colors border border-emerald-500/30"
                    title="Copy Key Code"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {isCopied ? 'Copied!' : 'Copy Key'}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Expires: <strong className="text-slate-200">{session.expiresAt ? new Date(session.expiresAt).toLocaleString() : 'N/A'}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Device: <span className="text-emerald-400 font-medium">Authorized</span>
                </span>
              </div>
            </div>

            {/* Right: Live Countdown Clock & Actions */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-4 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800">
              <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl px-5 py-3 text-center w-full sm:w-auto">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Time Remaining</div>
                <div className="text-2xl md:text-3xl font-mono font-black text-emerald-400">
                  {session.remainingFormatted || 'Active'}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  id="disconnect-key-btn"
                  onClick={session.disconnect}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-rose-900/30 text-slate-300 hover:text-rose-300 text-xs font-semibold transition-colors border border-slate-700 hover:border-rose-700/40"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Disconnect
                </button>
                <button
                  id="refresh-key-btn"
                  onClick={() => session.refresh()}
                  className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors border border-slate-700"
                  title="Re-verify Session"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* ENTER ACCESS KEY ACTIVATION FORM */
        <div id="key-activation-box" className="rounded-2xl bg-slate-900 border border-slate-800 p-6 md:p-7 shadow-lg">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Have an Access Key? Activate VIP Access</h2>
                  <p className="text-xs text-slate-400">Enter your key code to unlock premium predictions on this device immediately.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleActivateKey} className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative flex-1">
                <input
                  id="access-key-input-field"
                  name="vip_token_access_key"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  value={keyCodeInput}
                  onChange={(e) => {
                    setKeyCodeInput(e.target.value.toUpperCase());
                    setActivationError('');
                  }}
                  placeholder="e.g. PP-XXXX-XXXX-XXXX"
                  className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-white font-mono text-base tracking-wider uppercase placeholder:text-slate-600 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={handlePasteKey}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-emerald-400 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md transition-colors"
                >
                  Paste
                </button>
              </div>

              <button
                id="activate-key-submit-btn"
                type="submit"
                disabled={isActivating || !keyCodeInput.trim()}
                className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-emerald-500/20 text-sm whitespace-nowrap cursor-pointer"
              >
                {isActivating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-slate-950" />
                    ACTIVATE VIP ACCESS
                  </>
                )}
              </button>
            </form>

            {activationError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium animate-fadeIn">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                {activationError}
              </div>
            )}

            {activationSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                {activationSuccess}
              </div>
            )}

            {session.isExpired && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  Your previous Access Key has expired. Please select a plan below to renew.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. CHOOSE SUBSCRIPTION PLAN SECTION */}
      <div id="subscription-plans-section" className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Flame className="w-6 h-6 text-amber-400" />
              Select VIP Subscription Plan
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              Choose your preferred duration. All plans include 100% verified AI predictions and consensus odds.
            </p>
          </div>

          {/* Currency Switcher */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-xs text-slate-400 font-medium">Currency:</span>
            <select
              id="currency-selector"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
              className="bg-slate-950 text-emerald-400 text-xs font-bold rounded-lg px-2 py-1 border border-slate-700 focus:outline-none cursor-pointer"
            >
              {Object.entries(CURRENCY_CONFIGS).map(([code, cfg]) => (
                <option key={code} value={code}>
                  {cfg.flag} {code} ({cfg.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => {
            const isSelected = checkoutPlan?.id === plan.id;
            return (
              <div
                key={plan.id}
                id={`plan-card-${plan.id}`}
                className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-200 border-2 ${
                  plan.isPopular
                    ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-950/30'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider shadow-md ${
                      plan.isPopular 
                        ? 'bg-emerald-500 text-slate-950' 
                        : 'bg-slate-800 text-emerald-400 border border-slate-700'
                    }`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="pt-1">
                    <div className="text-xs uppercase font-bold tracking-wider text-slate-400">
                      {plan.durationDays === 1 ? '1 Day Access' : `${plan.durationDays} Days Access`}
                    </div>
                    <h3 className="text-lg font-extrabold text-white mt-0.5">{plan.name}</h3>
                  </div>

                  <div className="py-2 border-y border-slate-800/80">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl md:text-3xl font-black text-emerald-400">
                        {formatPrice(plan)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {plan.durationDays === 1 ? 'Valid for 24 hours' : `Valid for ${plan.durationDays} days`}
                    </div>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-800/60">
                  <button
                    id={`select-plan-btn-${plan.id}`}
                    onClick={() => {
                      setCheckoutPlan(plan);
                      setPaymentSubmitStatus('idle');
                      setPaymentError('');
                      // Scroll to checkout form
                      document.getElementById('checkout-payment-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      plan.isPopular
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-white hover:text-emerald-300 border border-slate-700'
                    }`}
                  >
                    Select Plan
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. CHECKOUT & PAYMENT MODAL / INLINE DRAWER */}
      {checkoutPlan && (
        <div id="checkout-payment-section" className="rounded-2xl bg-slate-900 border-2 border-emerald-500/40 p-6 md:p-8 shadow-2xl animate-fadeIn space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Step 2: Payment & Instant Key Generation
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white">
                Pay for <span className="text-emerald-400">{checkoutPlan.name}</span> ({formatPrice(checkoutPlan)})
              </h3>
            </div>
            <button
              onClick={() => setCheckoutPlan(null)}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700"
            >
              Cancel / Change Plan
            </button>
          </div>

          {paymentSubmitStatus === 'approved' && approvedKeyResult ? (
            /* CELEBRATORY APPROVAL SCREEN */
            <div className="rounded-2xl bg-emerald-950/60 border border-emerald-500/40 p-6 text-center space-y-4 animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-white">Payment Verified! Your VIP Access Key is Ready</h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Your Access Key has been generated and activated on this device. Save this code to use on other devices:
              </p>
              <div className="flex items-center justify-center gap-3 max-w-sm mx-auto">
                <code className="text-xl font-mono font-black text-emerald-300 bg-slate-950 px-4 py-2 rounded-xl border border-emerald-500/40 tracking-widest">
                  {approvedKeyResult}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(approvedKeyResult);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className="p-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold"
                  title="Copy Key"
                >
                  {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={() => setCheckoutPlan(null)}
                className="mt-4 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider"
              >
                Done & View Predictions
              </button>
            </div>
          ) : paymentSubmitStatus === 'polling' ? (
            /* POLLING / VERIFICATION IN PROGRESS */
            <div className="rounded-2xl bg-slate-950/80 border border-emerald-500/30 p-8 text-center space-y-4 animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto animate-pulse">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <h4 className="text-lg font-bold text-white">Verifying Payment Reference: {paymentRef.toUpperCase()}</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Your payment submission is being processed. As soon as the server verifies the transaction, your Access Key will appear right here and auto-activate!
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={getWhatsAppSupportLink(checkoutPlan, paymentRef)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg"
                >
                  <MessageSquare className="w-4 h-4" />
                  Speed Up via WhatsApp Admin
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => setPaymentSubmitStatus('idle')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Edit Reference
                </button>
              </div>
            </div>
          ) : (
            /* PAYMENT INSTRUCTIONS & SUBMISSION FORM */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Payment Instructions */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  1. Send Payment via M-Pesa / Bank
                </h4>

                {/* M-Pesa Details Box */}
                <div className="bg-slate-950/90 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-bold text-white">M-Pesa Buy Goods Till</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Instant Verification
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                      <div className="text-[11px] text-slate-400">Buy Goods Till No:</div>
                      <div className="text-lg font-mono font-black text-emerald-400 tracking-wider">6881472</div>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                      <div className="text-[11px] text-slate-400">Till Name:</div>
                      <div className="text-sm font-mono font-bold text-emerald-300 truncate mt-1">John Mushira</div>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                      <div className="text-[11px] text-slate-400">Amount to Pay:</div>
                      <div className="text-lg font-mono font-black text-white">{formatPrice(checkoutPlan)}</div>
                    </div>
                  </div>

                  <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside pt-1 leading-relaxed">
                    <li>Open M-Pesa &gt; <strong>Lipa na M-Pesa</strong> &gt; <strong>Buy Goods and Services</strong></li>
                    <li>Enter Till Number: <strong className="text-emerald-400 font-mono">6881472</strong> (Till Name: <strong className="text-white font-medium">John Mushira</strong>)</li>
                    <li>Enter Amount: <strong className="text-white font-mono">{formatPrice(checkoutPlan)}</strong></li>
                    <li>Enter PIN and complete payment</li>
                    <li>Copy the 10-character confirmation code (e.g., <span className="text-slate-400 font-mono">SDF78912KL</span>)</li>
                  </ol>
                </div>

                {/* Additional Payment Methods Breakdown */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
                  <span className="font-bold text-slate-200 block text-[11px] uppercase tracking-wider font-mono">
                    All Verified Payment Channels
                  </span>
                  <div className="space-y-1.5 text-slate-300 font-mono text-[11px]">
                    <div className="flex justify-between border-b border-slate-900 pb-1">
                      <span className="text-slate-400">M-Pesa Send Money:</span>
                      <span className="text-emerald-400 font-bold">0716483642 (+254716483642)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 pb-1">
                      <span className="text-slate-400">Airtel Money:</span>
                      <span className="text-emerald-400 font-bold">0735309361 (+254735309361)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 pb-1">
                      <span className="text-slate-400">Telkom (T-Kash):</span>
                      <span className="text-emerald-400 font-bold">0773266691 (+254773266691)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 pb-1">
                      <span className="text-slate-400">Online (Payoneer / Pesapal / Skrill):</span>
                      <span className="text-emerald-400 font-bold">johnmushira@gmail.com</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 pb-1">
                      <span className="text-slate-400">Equity Bank Transfer:</span>
                      <span className="text-emerald-400 font-bold">0620187419406</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Visa Card:</span>
                      <span className="text-emerald-400 font-bold">4478150001579885</span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Support Direct Contact */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>Need instant assistance? Contact WhatsApp Admin:</span>
                  </div>
                  <a
                    href={getWhatsAppSupportLink(checkoutPlan)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 font-bold hover:underline"
                  >
                    +254 716 483 642
                  </a>
                </div>
              </div>

              {/* Right Column: Reference Submission Form */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  2. Enter Confirmation Details
                </h4>

                <form onSubmit={handleSubmitPayment} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      M-Pesa / Transaction Reference Code <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      id="payment-ref-input"
                      name="mpesa_confirmation_ref_code"
                      type="text"
                      required
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value.toUpperCase())}
                      placeholder="e.g. SDF78912KL or QW981290KL"
                      className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm uppercase placeholder:text-slate-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Phone Number (Optional)
                      </label>
                      <input
                        id="payment-phone-input"
                        name="mpesa_contact_phone_number"
                        type="tel"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-form-type="other"
                        value={paymentPhone}
                        onChange={(e) => setPaymentPhone(e.target.value)}
                        placeholder="e.g. 0712345678"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-white text-xs placeholder:text-slate-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Email Address (Optional)
                      </label>
                      <input
                        id="payment-email-input"
                        name="mpesa_receipt_email_address"
                        type="email"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-form-type="other"
                        value={paymentEmail}
                        onChange={(e) => setPaymentEmail(e.target.value)}
                        placeholder="For receipt backup"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-white text-xs placeholder:text-slate-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {paymentError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                      {paymentError}
                    </div>
                  )}

                  <button
                    id="submit-payment-confirmation-btn"
                    type="submit"
                    disabled={isSubmittingPayment || !paymentRef.trim()}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmittingPayment ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Submitting Confirmation...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-slate-950" />
                        SUBMIT &amp; GENERATE ACCESS KEY
                      </>
                    )}
                  </button>
                </form>
              </div>

            </div>
          )}

        </div>
      )}

      {/* 5. FREQUENTLY ASKED QUESTIONS */}
      <div id="faq-section" className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 md:p-8 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-emerald-400" />
          Frequently Asked Questions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
            <h4 className="font-bold text-slate-200">How do Access Keys work?</h4>
            <p className="text-slate-400 leading-relaxed">
              When you purchase a plan, you receive a unique code formatted like <code className="text-emerald-400">PP-XXXX-XXXX-XXXX</code>. Entering this key on the app activates your temporary VIP pass without requiring an email or password.
            </p>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
            <h4 className="font-bold text-slate-200">When does the timer start?</h4>
            <p className="text-slate-400 leading-relaxed">
              The subscription countdown starts the exact moment you activate the key on your device, giving you full value for every hour you paid for.
            </p>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
            <h4 className="font-bold text-slate-200">Can I use my key on another device?</h4>
            <p className="text-slate-400 leading-relaxed">
              Yes! Your key can be entered on a new device. The system seamlessly binds your active session to your new device while maintaining your exact expiration time.
            </p>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
            <h4 className="font-bold text-slate-200">What happens when my pass expires?</h4>
            <p className="text-slate-400 leading-relaxed">
              Once expired, premium predictions are securely locked. You can easily purchase a new plan or enter a new Access Key anytime to continue enjoying winning picks.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
