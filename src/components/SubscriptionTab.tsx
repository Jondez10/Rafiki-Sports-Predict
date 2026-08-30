import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Smartphone, Mail, CreditCard, ShieldCheck, CheckCircle2, Lock, Globe, Coins, HelpCircle, Building2 } from 'lucide-react';
import { authFetch } from '../lib/api';

interface SubscriptionTabProps {
  user: any;
  userProfile: UserProfile | null;
  onPaymentSuccess: (updatedProfile: UserProfile) => void;
  onGuestPassActivated?: (pass: any) => void;
  onRequestLogin?: () => void;
  onRequestRegister?: () => void;
}

type CurrencyCode = 'KES' | 'USD' | 'EUR' | 'GBP' | 'NGN' | 'GHS' | 'ZAR' | 'UGX' | 'TZS';

const currencyConfigs: Record<CurrencyCode, {
  symbol: string;
  name: string;
  flag: string;
  prices: { 
    daily: number; 
    weekly: number; 
    '15days': number; 
    monthly: number; 
    '2months': number; 
    '3months': number; 
    '6months': number; 
    yearly: number 
  };
}> = {
  KES: {
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    flag: '🇰🇪',
    prices: { daily: 250, weekly: 1200, '15days': 2200, monthly: 3500, '2months': 6000, '3months': 8000, '6months': 14000, yearly: 24000 }
  },
  USD: {
    symbol: '$',
    name: 'US Dollar',
    flag: '🇺🇸',
    prices: { daily: 2.5, weekly: 10, '15days': 18, monthly: 28, '2months': 48, '3months': 65, '6months': 110, yearly: 200 }
  },
  EUR: {
    symbol: '€',
    name: 'Euro',
    flag: '🇪🇺',
    prices: { daily: 2.3, weekly: 9.5, '15days': 17, monthly: 26, '2months': 45, '3months': 60, '6months': 100, yearly: 185 }
  },
  GBP: {
    symbol: '£',
    name: 'British Pound',
    flag: '🇬🇧',
    prices: { daily: 1.8, weekly: 8.5, '15days': 15, monthly: 23, '2months': 40, '3months': 52, '6months': 90, yearly: 165 }
  },
  NGN: {
    symbol: '₦',
    name: 'Nigerian Naira',
    flag: '🇳🇬',
    prices: { daily: 3800, weekly: 15000, '15days': 26000, monthly: 42000, '2months': 72000, '3months': 98000, '6months': 170000, yearly: 300000 }
  },
  GHS: {
    symbol: 'GH₵',
    name: 'Ghanaian Cedi',
    flag: '🇬🇭',
    prices: { daily: 38, weekly: 150, '15days': 260, monthly: 420, '2months': 720, '3months': 980, '6months': 1700, yearly: 3000 }
  },
  ZAR: {
    symbol: 'R',
    name: 'South African Rand',
    flag: '🇿🇦',
    prices: { daily: 45, weekly: 180, '15days': 320, monthly: 500, '2months': 850, '3months': 1150, '6months': 2000, yearly: 3600 }
  },
  UGX: {
    symbol: 'USh',
    name: 'Ugandan Shilling',
    flag: '🇺🇬',
    prices: { daily: 9000, weekly: 36000, '15days': 64000, monthly: 100000, '2months': 170000, '3months': 230000, '6months': 400000, yearly: 720000 }
  },
  TZS: {
    symbol: 'TSh',
    name: 'Tanzanian Shilling',
    flag: '🇹🇿',
    prices: { daily: 6500, weekly: 26000, '15days': 46000, monthly: 72000, '2months': 125000, '3months': 170000, '6months': 290000, yearly: 520000 }
  }
};

const getPaymentMethodsForCurrency = (currency: CurrencyCode) => {
  const commonOnlineAndBank = [
    { id: 'Bank Transfer', label: 'Equity Bank Transfer', icon: Building2 },
    { id: 'Visa', label: 'Visa Card', icon: CreditCard },
    { id: 'Pesapal', label: 'Pesapal', icon: Mail },
    { id: 'Skrill', label: 'Skrill Wallet', icon: Mail },
    { id: 'Payoneer', label: 'Payoneer', icon: Mail }
  ];

  switch (currency) {
    case 'KES':
    case 'TZS':
    case 'UGX':
      return [
        { id: 'M-Pesa', label: 'M-Pesa', icon: Smartphone },
        { id: 'Airtel Money', label: 'Airtel Money', icon: Smartphone },
        { id: 'Telkom (T-Kash)', label: 'Telkom (T-Kash)', icon: Smartphone },
        ...commonOnlineAndBank
      ];
    case 'NGN':
    case 'GHS':
    case 'ZAR':
    default:
      return [
        ...commonOnlineAndBank,
        { id: 'M-Pesa', label: 'M-Pesa', icon: Smartphone },
        { id: 'Airtel Money', label: 'Airtel Money', icon: Smartphone },
        { id: 'Telkom (T-Kash)', label: 'Telkom (T-Kash)', icon: Smartphone }
      ];
  }
};

export type SubscriptionPlanKey = 'daily' | 'weekly' | '15days' | 'monthly' | '2months' | '3months' | '6months' | 'yearly';

export default function SubscriptionTab({ 
  user, 
  userProfile, 
  onPaymentSuccess,
  onGuestPassActivated,
  onRequestLogin,
  onRequestRegister
}: SubscriptionTabProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanKey>('daily');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('KES');
  const [paymentMethod, setPaymentMethod] = useState<string>('M-Pesa');
  
  // Form States
  const [phoneNo, setPhoneNo] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [emailAccount, setEmailAccount] = useState('');
  const [cardNo, setCardNo] = useState('4478 **** **** 9885');
  
  // Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const activeCurrencyConfig = currencyConfigs[selectedCurrency];

  const getPlanDetails = (planKey: SubscriptionPlanKey) => {
    const config = currencyConfigs[selectedCurrency];
    const price = config.prices[planKey];
    const name = {
      daily: 'Daily Access Pass 🎫',
      weekly: 'Weekly Premium Tier 🛡️',
      '15days': '15 Days VIP Bracket ⚡',
      monthly: 'Monthly Gold Elite 🏆',
      '2months': '2-Month VIP Core ✨',
      '3months': 'Quarterly Pro Tier ⭐',
      '6months': 'Bi-Annual Master Premium 💎',
      yearly: 'Yearly Pro Legend 🚀'
    }[planKey];
    
    const desc = {
      daily: 'Full 24-hour instant VIP access. No account registration required! Access all AI accumulators, VIP insights, and predictions immediately.',
      weekly: '7 days of premium coverage, direct alerts, and deep statistical analysis. (Account required).',
      '15days': '15 days of high-win-rate football, basketball & tennis selections. (Account required).',
      monthly: '30 days of full coverage. Highly recommended for regular sportsbook players. (Account required).',
      '2months': '60 days of complete access to premium tips and analytical charts. (Account required).',
      '3months': '90 days of VIP value bets, consensus tips, and automated accumulators. (Account required).',
      '6months': '180 days of top-tier AI predictions, priority alerts, and deep data insight. (Account required).',
      yearly: '365 days of ultimate VIP selections, historical trends, and priority admin care. (Account required).'
    }[planKey];

    return { name, price, currency: selectedCurrency, symbol: config.symbol, desc };
  };

  const handleCurrencyChange = (curr: CurrencyCode) => {
    setSelectedCurrency(curr);
    const methods = getPaymentMethodsForCurrency(curr);
    if (methods.length > 0) {
      setPaymentMethod(methods[0].id);
    }
    setError('');
    setSuccess('');
  };

  const getPriceString = (planKey: SubscriptionPlanKey) => {
    const details = getPlanDetails(planKey);
    return `${details.symbol} ${details.price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const getPlanSavingsPercent = (planKey: SubscriptionPlanKey): number => {
    if (planKey === 'daily') return 0;
    const config = currencyConfigs[selectedCurrency];
    const dailyPrice = config.prices.daily;
    const daysInPlan: Record<SubscriptionPlanKey, number> = {
      daily: 1,
      weekly: 7,
      '15days': 15,
      monthly: 30,
      '2months': 60,
      '3months': 90,
      '6months': 180,
      yearly: 365
    };

    const standardCost = dailyPrice * daysInPlan[planKey];
    const actualCost = config.prices[planKey];
    if (standardCost <= actualCost) return 0;
    return Math.round(((standardCost - actualCost) / standardCost) * 100);
  };

  const handleSimulatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!paymentRef.trim()) {
      setError('Please provide a valid transaction reference code or receipt number.');
      setLoading(false);
      return;
    }

    const currentDetails = getPlanDetails(selectedPlan);

    // If user is guest and selected daily plan: Guest 1-Day Instant Pass!
    if (!user && selectedPlan === 'daily') {
      try {
        const response = await fetch('/api/payment/guest-daily-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phoneNo.trim() || emailAccount.trim() || 'Guest User',
            method: paymentMethod,
            reference: paymentRef.trim(),
            amount: currentDetails.price,
            currency: selectedCurrency
          })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          setSuccess(`🎉 1-Day VIP Access Activated! Transaction code (${paymentRef.trim()}) verified. All today's games and predictions are now unlocked on this device!`);
          if (data.guestPass) {
            onGuestPassActivated?.(data.guestPass);
          }
          setPaymentRef('');
        } else {
          setError(data.error || 'Payment verification failed. Please double-check your receipt code.');
        }
      } catch (err: any) {
        setError('Connection to billing system failed. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // If user is not logged in and selected a multi-day plan:
    if (!user && selectedPlan !== 'daily') {
      setError('Multi-day VIP plans require an account to secure and sync your predictions across all your devices. Please log in or register free below.');
      setLoading(false);
      return;
    }

    // Authenticated user submitting subscription
    try {
      const response = await authFetch('/api/payment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          username: userProfile?.username || user.email.split('@')[0],
          phone: phoneNo,
          method: paymentMethod,
          reference: paymentRef.trim(),
          plan: selectedPlan,
          amount: currentDetails.price,
          currency: selectedCurrency
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess(`Payment submitted for Administrator Approval! Your reference code (${paymentRef.trim()}) and payment details have been logged and sent to Administrator rafikibc1000@gmail.com / WhatsApp 0716483642.`);
        if (data.profile) {
          onPaymentSuccess(data.profile);
        }
        setPaymentRef('');
      } else {
        setError(data.error || 'Payment submission failed. Please check your transaction details.');
      }
    } catch (err: any) {
      setError('Connection to billing system failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/user/status/${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        onPaymentSuccess(data);
      }
    } catch (err) {
      console.error("Failed to refresh status", err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateTrial = async () => {
    if (!user) {
      setError('Please log in or register to claim your 1-day Free Trial.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await authFetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          method: 'Visa',
          reference: `TRIAL-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          plan: 'daily',
          amount: 0,
          currency: selectedCurrency
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess('1-Day Free Trial activated successfully! Enjoy all premium sections.');
        onPaymentSuccess(data.profile);
      } else {
        setError(data.error || 'Failed to claim trial.');
      }
    } catch (err) {
      setError('Error initiating trial.');
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentInstructions = (priceStr: string) => {
    switch (paymentMethod) {
      case 'M-Pesa':
        return (
          <div className="space-y-2.5 text-xs text-gray-300">
            <p className="font-bold text-emerald-400">📲 M-Pesa Payment Methods:</p>
            
            <div className="p-3 bg-zinc-900/90 border border-zinc-800/90 rounded-xl space-y-1.5">
              <div className="font-bold text-white flex items-center justify-between">
                <span>Option 1: M-Pesa Buy Goods (Till Number)</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-mono">Till</span>
              </div>
              <p className="text-gray-300">1. Open M-Pesa &gt; <strong className="text-white">Lipa na M-Pesa</strong> &gt; <strong className="text-white">Buy Goods and Services</strong>.</p>
              <p className="text-gray-300">2. Enter Till Number: <span className="bg-emerald-950 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded border border-emerald-800/30 text-sm">6881472</span></p>
              <p className="text-gray-300">3. Enter Amount: <strong className="text-white">{priceStr}</strong> & enter PIN.</p>
            </div>

            <div className="p-3 bg-zinc-900/90 border border-zinc-800/90 rounded-xl space-y-1.5">
              <div className="font-bold text-white flex items-center justify-between">
                <span>Option 2: M-Pesa Send Money</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-mono">Send Money</span>
              </div>
              <p className="text-gray-300">1. Open M-Pesa &gt; <strong className="text-white">Send Money</strong>.</p>
              <p className="text-gray-300">2. Local Phone Number: <span className="text-white font-mono font-bold">0716483642</span></p>
              <p className="text-gray-300">3. International Format: <span className="text-white font-mono font-bold">+254716483642</span></p>
              <p className="text-gray-300">4. Enter Amount: <strong className="text-white">{priceStr}</strong> & enter PIN.</p>
            </div>
          </div>
        );
      case 'Airtel Money':
        return (
          <div className="space-y-2 text-xs text-gray-300">
            <p className="font-bold text-emerald-400">📲 Airtel Money Payment Instructions:</p>
            <div className="p-3 bg-zinc-900/90 border border-zinc-800/90 rounded-xl space-y-1.5">
              <p className="text-gray-300">1. Access your Airtel Money menu (*334# or Airtel App).</p>
              <p className="text-gray-300">2. Select <strong className="text-white">Send Money</strong> or <strong className="text-white">Make Payments</strong>.</p>
              <p className="text-gray-300">3. Local Phone Number: <span className="bg-emerald-950 text-emerald-300 font-mono font-bold px-2.5 py-1 rounded border border-emerald-800/30 text-sm">0735309361</span></p>
              <p className="text-gray-300">4. International Format: <span className="text-white font-mono font-bold">+254735309361</span></p>
              <p className="text-gray-300">5. Enter Amount: <strong className="text-white">{priceStr}</strong> & enter PIN to complete payment.</p>
            </div>
          </div>
        );
      case 'Telkom (T-Kash)':
        return (
          <div className="space-y-2 text-xs text-gray-300">
            <p className="font-bold text-emerald-400">📲 Telkom (T-Kash) Payment Instructions:</p>
            <div className="p-3 bg-zinc-900/90 border border-zinc-800/90 rounded-xl space-y-1.5">
              <p className="text-gray-300">1. Access your T-Kash Menu (*160# or Telkom App).</p>
              <p className="text-gray-300">2. Select <strong className="text-white">Send Money</strong>.</p>
              <p className="text-gray-300">3. Local Phone Number: <span className="bg-emerald-950 text-emerald-300 font-mono font-bold px-2.5 py-1 rounded border border-emerald-800/30 text-sm">0773266691</span></p>
              <p className="text-gray-300">4. International Format: <span className="text-white font-mono font-bold">+254773266691</span></p>
              <p className="text-gray-300">5. Enter Amount: <strong className="text-white">{priceStr}</strong> & enter PIN to complete payment.</p>
            </div>
          </div>
        );
      case 'Bank Transfer':
        return (
          <div className="space-y-2 text-xs text-gray-300">
            <p className="font-bold text-emerald-400">🏦 Equity Bank Transfer Instructions:</p>
            <div className="p-3 bg-zinc-900/90 border border-zinc-800/90 rounded-xl space-y-1.5">
              <p className="text-gray-300">1. Open your banking app or Equity Bank mobile banking.</p>
              <p className="text-gray-300">2. Bank: <strong className="text-white font-bold">Equity Bank</strong></p>
              <p className="text-gray-300">3. Account Number:</p>
              <p className="bg-zinc-950 border border-zinc-800 font-mono px-3 py-1.5 rounded text-emerald-300 text-sm select-all text-center font-bold">0620187419406</p>
              <p className="text-gray-300">4. Transfer exactly <strong className="text-white">{priceStr}</strong> and enter your transaction reference below.</p>
            </div>
          </div>
        );
      case 'Pesapal':
        return (
          <div className="space-y-2 text-xs text-gray-300">
            <p className="font-bold text-emerald-400">💳 Pesapal Payment Instructions:</p>
            <div className="p-3 bg-zinc-900/90 border border-zinc-800/90 rounded-xl space-y-1.5">
              <p className="text-gray-300">1. Sign in to your Pesapal account.</p>
              <p className="text-gray-300">2. Send payment of <strong className="text-white">{priceStr}</strong> to our account email:</p>
              <p className="bg-zinc-950 border border-zinc-800 font-mono px-3 py-1.5 rounded text-emerald-300 text-sm select-all text-center font-bold">johnmushira@gmail.com</p>
              <p className="text-gray-300">3. Enter your payment reference ID in the field below.</p>
            </div>
          </div>
        );
      case 'Skrill':
        return (
          <div className="space-y-2 text-xs text-gray-300">
            <p className="font-bold text-emerald-400">📧 Skrill Payment Instructions:</p>
            <div className="p-3 bg-zinc-900/90 border border-zinc-800/90 rounded-xl space-y-1.5">
              <p className="text-gray-300">1. Sign in to your Skrill Wallet account.</p>
              <p className="text-gray-300">2. Send exactly <strong className="text-white">{priceStr}</strong> to our recipient email address:</p>
              <p className="bg-zinc-950 border border-zinc-800 font-mono px-3 py-1.5 rounded text-emerald-300 text-sm select-all text-center font-bold">johnmushira@gmail.com</p>
              <p className="text-gray-300">3. Enter your transaction reference code in the field below.</p>
            </div>
          </div>
        );
      case 'Payoneer':
        return (
          <div className="space-y-2 text-xs text-gray-300">
            <p className="font-bold text-emerald-400">💳 Payoneer Payment Instructions:</p>
            <div className="p-3 bg-zinc-900/90 border border-zinc-800/90 rounded-xl space-y-1.5">
              <p className="text-gray-300">1. Sign in to your Payoneer account.</p>
              <p className="text-gray-300">2. Transfer payment of <strong className="text-white">{priceStr}</strong> to our account email:</p>
              <p className="bg-zinc-950 border border-zinc-800 font-mono px-3 py-1.5 rounded text-emerald-300 text-sm select-all text-center font-bold">johnmushira@gmail.com</p>
              <p className="text-gray-300">3. Enter your payment reference ID in the field below.</p>
            </div>
          </div>
        );
      case 'Visa':
      default:
        return (
          <div className="space-y-1 text-xs text-gray-300">
            <p className="font-bold text-emerald-400">💳 Visa/Mastercard Payment Instructions:</p>
            <p>We support immediate credit card transfers. Enter our official receiver details:</p>
            <p className="text-gray-400">Visa card number:</p>
            <p className="bg-zinc-900 border border-zinc-800 font-mono px-3 py-1 rounded text-white select-all text-center text-xs font-bold">4478 **** **** 9885</p>
            <p>Please send <strong className="text-white">{priceStr}</strong> via card-to-card transfer in your banking app.</p>
          </div>
        );
    }
  };

  const isMobileMoney = ['M-Pesa', 'Airtel Money', 'Telkom (T-Kash)'].includes(paymentMethod);

  return (
    <div className="max-w-4xl mx-auto space-y-8" id="subscription-section">
      <div className="text-center space-y-3" id="sub-header-container">
        <h2 className="text-3xl font-sans font-bold tracking-tight text-white" id="sub-title">
          Unlock Premium AI Accumulators & VIP Picks
        </h2>
        <p className="text-gray-400 max-w-xl mx-auto text-sm" id="sub-desc">
          Join hundreds of profitable sports investors globally. Choose an elite plan, make a deposit, and receive instant access to predictions with combined odds between 2.00 and 10.00.
        </p>
      </div>

      {userProfile?.subscriptionStatus === 'premium' || userProfile?.paymentStatus === 'approved' ? (
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-4" id="active-sub-banner">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" id="active-sub-icon" />
          <h3 className="text-xl font-bold text-white font-sans" id="active-sub-title">You are an Active VIP Premium Member</h3>
          <p className="text-emerald-300/90 text-sm max-w-md mx-auto" id="active-sub-desc">
            Your Premium subscription is fully verified and approved by Administrator. You have full unrestricted access to all protected AI predictions, accumulators, and tools.
          </p>
          <div className="bg-emerald-900/40 px-4 py-2 rounded-lg max-w-xs mx-auto text-xs font-mono text-emerald-200" id="active-sub-expiry">
            Expires: {new Date(userProfile.premiumExpiresAt || '').toLocaleDateString()}
          </div>
        </div>
      ) : (
        <>
          {userProfile?.paymentStatus === 'pending_approval' || userProfile?.subscriptionStatus === 'pending_approval' ? (
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-6 text-center space-y-5" id="pending-sub-banner">
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400 animate-pulse">
                ⌛
              </div>
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest bg-amber-950/60 px-3 py-1 rounded-full border border-amber-800/40">
                  Payment Status: Pending Approval
                </span>
                <h3 className="text-xl font-bold text-white font-sans">Payment Submitted for Review</h3>
              </div>
              
              <p className="text-amber-200/90 text-sm max-w-xl mx-auto leading-relaxed">
                Your payment for <strong className="text-white">{userProfile.subscriptionPlan?.toUpperCase() || 'VIP'} Plan</strong> via <strong className="text-white">{userProfile.paymentMethod || 'Mobile Money'}</strong> (Ref: <span className="font-mono font-bold text-white">{userProfile.paymentReference}</span>) was recorded on {userProfile.paymentSubmittedAt ? new Date(userProfile.paymentSubmittedAt).toLocaleString() : 'today'} and is currently <strong className="text-amber-300">Pending Administrator Approval</strong>.
              </p>

              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 max-w-md mx-auto space-y-3 text-xs text-left">
                <div className="font-bold text-white flex items-center justify-between">
                  <span>Administrator Contact Details</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Notification Dispatched</span>
                </div>
                <div className="space-y-1 text-gray-300 font-mono">
                  <p>Email: <strong className="text-emerald-400 select-all">rafikibc1000@gmail.com</strong></p>
                  <p>WhatsApp: <strong className="text-emerald-400 select-all">0716483642 (+254716483642)</strong></p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <a
                  href={`https://wa.me/254716483642?text=${encodeURIComponent(`Hello Admin, I have submitted payment for Rafiki Predict.\nUser: ${userProfile.email}\nRef Code: ${userProfile.paymentReference}\nPlan: ${userProfile.subscriptionPlan}\nPlease verify and approve my access!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
                >
                  💬 Contact Admin on WhatsApp (0716483642)
                </a>
                <button
                  onClick={handleRefreshStatus}
                  disabled={loading}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all border border-zinc-700 cursor-pointer"
                >
                  🔄 Refresh Approval Status
                </button>
              </div>
            </div>
          ) : userProfile?.paymentStatus === 'rejected' ? (
            <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-6 text-center space-y-4" id="rejected-sub-banner">
              <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto text-rose-400 font-bold text-2xl">
                ✕
              </div>
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-widest bg-rose-950/60 px-3 py-1 rounded-full border border-rose-800/40">
                  Payment Status: Rejected
                </span>
                <h3 className="text-lg font-bold text-white font-sans">Payment Verification Declined</h3>
              </div>
              <p className="text-rose-200/90 text-xs max-w-md mx-auto">
                Reason: <strong className="text-white">{userProfile.rejectionReason || 'Transaction code or payment details could not be verified by Administrator.'}</strong>
              </p>
              <p className="text-xs text-gray-400">
                Please re-check your payment receipt reference and re-submit your payment details below.
              </p>
            </div>
          ) : null}

          <div className="grid md:grid-cols-3 gap-6" id="subscription-grid">
          <div className="md:col-span-2 space-y-6" id="subscription-left-column">
            
            {/* Currency Selector */}
            <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 space-y-4" id="currency-selector-card">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  Step 1: Choose Your Billing Currency
                </h3>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30">
                  9 Key Currencies Supported
                </span>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2" id="currencies-button-grid">
                {(Object.keys(currencyConfigs) as Array<keyof typeof currencyConfigs>).map((curr) => {
                  const conf = currencyConfigs[curr];
                  const isSelected = selectedCurrency === curr;
                  return (
                    <button
                      key={curr}
                      id={`currency-btn-${curr}`}
                      onClick={() => handleCurrencyChange(curr)}
                      className={`py-2 px-1 rounded-xl border text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all ${
                        isSelected
                          ? 'bg-emerald-950/30 border-emerald-500 text-white shadow-sm'
                          : 'bg-zinc-950/60 border-zinc-800 text-gray-400 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-lg leading-none">{conf.flag}</span>
                      <span className="font-mono font-bold text-[11px]">{curr}</span>
                      <span className="text-[9px] text-gray-500 truncate max-w-full px-1">{conf.symbol}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Select Plan */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4" id="plan-selector-card">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="bg-emerald-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">2</span>
                Select Subscription Duration
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" id="plans-button-grid">
                {(['daily', 'weekly', '15days', 'monthly', '2months', '3months', '6months', 'yearly'] as const).map((planKey) => {
                  const details = getPlanDetails(planKey);
                  const isSelected = selectedPlan === planKey;
                  const savings = getPlanSavingsPercent(planKey);

                  return (
                    <button
                      key={planKey}
                      id={`plan-btn-${planKey}`}
                      onClick={() => setSelectedPlan(planKey)}
                      className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between relative group cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-950/30 border-emerald-500 text-white shadow-[0_0_15px_-3px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/50' 
                          : 'bg-zinc-950/60 border-zinc-800 text-gray-300 hover:border-zinc-700 hover:bg-zinc-900/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 flex-wrap mb-1">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                            {planKey === '15days' ? '15 Days' : planKey === '2months' ? '2 Months' : planKey === '3months' ? '3 Months' : planKey === '6months' ? '6 Months' : planKey}
                          </span>
                          {savings > 0 ? (
                            <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              -{savings}%
                            </span>
                          ) : planKey === 'daily' ? (
                            <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Guest
                            </span>
                          ) : null}
                        </div>
                        <div className="font-sans font-bold text-xs text-white leading-tight">
                          {details.name}
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-zinc-900/90 flex items-end justify-between">
                        <div>
                          <span className="text-sm font-mono font-bold text-white block">
                            {getPriceString(planKey)}
                          </span>
                          <span className="text-[9px] text-gray-500 block mt-0.5">
                            {planKey === 'daily' ? 'No signup needed' : 'Account linked'}
                          </span>
                        </div>
                        {planKey === 'monthly' && (
                          <span className="text-[9px] font-bold text-amber-400">★ Popular</span>
                        )}
                        {planKey === 'yearly' && (
                          <span className="text-[9px] font-bold text-emerald-400">💎 Best Value</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-zinc-950/80 rounded-lg text-xs text-gray-400" id="active-plan-description-box">
                <strong className="text-white">Active Plan Description:</strong> {getPlanDetails(selectedPlan).desc}
              </div>
            </div>

            {/* Step 3: Choose Payment & Complete */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4" id="payment-method-card">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="bg-emerald-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">3</span>
                Choose Payment Method & Pay
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" id="payment-methods-grid">
                {getPaymentMethodsForCurrency(selectedCurrency).map((item) => {
                  const Icon = item.icon;
                  const isSelected = paymentMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`pay-method-btn-${item.id.replace(/\s+/g, '-')}`}
                      onClick={() => setPaymentMethod(item.id)}
                      className={`py-3 px-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-2 transition-all ${
                        isSelected 
                          ? 'bg-emerald-950/30 border-emerald-500 text-white shadow-sm' 
                          : 'bg-zinc-950/50 border-zinc-800 text-gray-400 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-emerald-400" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic instruction box based on payment provider */}
              <div className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-xl space-y-3" id="payment-instructions-box">
                {renderPaymentInstructions(getPriceString(selectedPlan))}
              </div>

              {/* Account Status / Guest Mode Badge */}
              {!user ? (
                selectedPlan === 'daily' ? (
                  <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block">Instant 1-Day Pass (No Account Required)</strong>
                      <span>Pay and enter your transaction receipt code below to unlock all today's predictions and high-value accumulators instantly on this device.</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs space-y-3">
                    <div className="flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-200 block text-sm">Account Required for Multi-Day Subscriptions</strong>
                        <span className="text-gray-300">
                          To protect your subscription and allow you to access predictions across all your devices, multi-day plans ({getPlanDetails(selectedPlan).name}) require a free account.
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={onRequestLogin}
                        className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold text-xs border border-zinc-700 cursor-pointer transition-colors"
                      >
                        Log In to Account
                      </button>
                      <button
                        type="button"
                        onClick={onRequestRegister}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                      >
                        <span>Create Free Account (Phone / Google / Email)</span>
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                      {userProfile?.username?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-gray-300">
                      Logged in as <strong className="text-white">{userProfile?.username || user.email}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/40">
                    {userProfile?.paymentStatus === 'pending_approval' ? '⏳ Pending Approval' : 'Trial / Member'}
                  </span>
                </div>
              )}

              {/* Submit Verification Form */}
              <form onSubmit={handleSimulatePayment} className="space-y-4" id="checkout-form">
                <div className="grid md:grid-cols-2 gap-4">
                  {isMobileMoney ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1" htmlFor="phone-number-input">
                        Registered Mobile Number
                      </label>
                      <input
                        id="phone-number-input"
                        type="tel"
                        required
                        placeholder="e.g. 0712345678"
                        value={phoneNo}
                        onChange={(e) => setPhoneNo(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm text-white"
                      />
                    </div>
                  ) : paymentMethod === 'Visa' ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1" htmlFor="card-number-input">
                        Your Card Number
                      </label>
                      <input
                        id="card-number-input"
                        type="text"
                        required
                        placeholder="4478 **** **** 9885"
                        value={cardNo}
                        onChange={(e) => setCardNo(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm font-mono text-white"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1" htmlFor="sender-email-input">
                        Your Sender Account Email
                      </label>
                      <input
                        id="sender-email-input"
                        type="email"
                        required
                        placeholder="your-account@example.com"
                        value={emailAccount}
                        onChange={(e) => setEmailAccount(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm text-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1" htmlFor="transaction-ref-input">
                      {isMobileMoney ? 'Transaction Code (e.g., SK89HF32D)' : 'Transaction Reference / Hash'}
                    </label>
                    <input
                      id="transaction-ref-input"
                      type="text"
                      required
                      placeholder="Enter the transaction receipt code"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm font-mono uppercase text-white"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-950/30 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl" id="payment-error-alert">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs p-3 rounded-xl flex items-center gap-2" id="payment-success-alert">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                <button
                  type="submit"
                  id="submit-payment-btn"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-bold py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_20px_-3px_rgba(16,185,129,0.3)] disabled:opacity-50"
                >
                  <ShieldCheck className="w-5 h-5" />
                  {loading ? 'Verifying payment...' : `Submit Receipt & Activate ${selectedPlan.toUpperCase()}`}
                </button>
              </form>
            </div>
          </div>

          {/* Pricing Features Sidebar */}
          <div className="space-y-6" id="subscription-right-column">
            <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-6" id="premium-features-card">
              <h4 className="text-white font-sans font-bold text-lg flex items-center gap-2" id="premium-features-title">
                Premium Core Features Included:
              </h4>

              <ul className="space-y-3 text-sm text-gray-300" id="premium-features-list">
                {[
                  'Daily Safe Accumulators (Odds 2.00–3.50)',
                  'Daily Balanced Accumulators (Odds 3.50–6.00)',
                  'VIP High Value Accumulators (Odds 6.00–10.00)',
                  'AI confidence rating analysis (above 75%)',
                  'Match tactical criteria checklist reports',
                  'Early prediction alerts & updates',
                  'Comprehensive 30-day prediction archive'
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5" id={`feature-item-${idx}`}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-zinc-800 pt-6 space-y-4" id="trial-section">
                <div className="text-xs text-gray-400 text-center">
                  Unsure? Start with our standard access first.
                </div>
                
                <button
                  id="activate-trial-btn"
                  onClick={handleActivateTrial}
                  disabled={loading}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-sans font-medium py-2.5 px-4 rounded-xl border border-zinc-700/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4 text-emerald-400" />
                  Activate 1-Day Free Trial
                </button>
              </div>
            </div>

            <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300/90 leading-relaxed" id="responsible-betting-banner">
              <strong className="text-white">Responsible Betting:</strong> Rafiki Predict generates projections using machine learning. We advise staking with care. High odds carry variance. Sports contain statistical luck. Must be 18+.
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
