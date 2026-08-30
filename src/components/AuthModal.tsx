import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  Smartphone, 
  User as UserIcon, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signInWithGoogle,
  signInWithApple,
  signInWithMicrosoft,
  signInWithCustomToken
} from '../lib/firebase';
import { UserProfile } from '../types';

export type AuthMode = 'signin' | 'signup' | 'reset';
export type AuthMethod = 'username' | 'phone' | 'email';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: AuthMode;
  initialMethod?: AuthMethod;
  onClose: () => void;
  onSuccess: (user: any, profile?: UserProfile) => void;
  language?: 'en' | 'sw';
}

export default function AuthModal({
  isOpen,
  initialMode = 'signin',
  initialMethod = 'username',
  onClose,
  onSuccess,
  language = 'en'
}: AuthModalProps) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [authMethod, setAuthMethod] = useState<AuthMethod>(initialMethod);

  // Username form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [optionalEmail, setOptionalEmail] = useState('');
  const [optionalPhone, setOptionalPhone] = useState('');

  // Email form state
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Phone OTP state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+254');
  const [otpCode, setOtpCode] = useState('');
  const [otpSessionId, setOtpSessionId] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [demoOtpHint, setDemoOtpHint] = useState('');

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

  // Reset form when modal opens / mode changes
  useEffect(() => {
    if (isOpen) {
      setAuthMode(initialMode);
      setAuthMethod(initialMethod);
      setError('');
      setSuccess('');
      setEmailVerificationSent(false);
    }
  }, [isOpen, initialMode, initialMethod]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

  const fullPhone = phoneNumber.startsWith('+') ? phoneNumber : `${countryCode}${phoneNumber.replace(/^0+/, '')}`;

  // 1. Username & Password Authentication
  const handleUsernameAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || username.trim().length < 3) {
      setError(language === 'sw' ? 'Jina la mtumiaji lazima liwe na angalau herufi 3.' : 'Username must be at least 3 characters.');
      return;
    }

    if (!password || password.length < 6) {
      setError(language === 'sw' ? 'Nenosiri lazima liwe na angalau herufi 6.' : 'Password must be at least 6 characters.');
      return;
    }

    if (authMode === 'signup' && confirmPassword && password !== confirmPassword) {
      setError(language === 'sw' ? 'Manenosiri hayafanani.' : 'Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      if (authMode === 'signup') {
        const res = await fetch('/api/auth/username-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password,
            email: optionalEmail.trim(),
            phone: optionalPhone.trim()
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || 'Failed to create account with username.');
          return;
        }

        // Sign in with Firebase custom token if available
        if (data.customToken) {
          try {
            const userCred = await signInWithCustomToken(auth, data.customToken);
            onSuccess(userCred.user, data.profile);
            onClose();
            return;
          } catch (customErr) {
            console.warn("Custom token client login warning:", customErr);
          }
        }

        const simulatedUser = {
          uid: data.uid,
          displayName: data.profile?.username || username.trim(),
          email: data.profile?.email || `${username.trim()}@rafikipredict.user`
        };
        onSuccess(simulatedUser, data.profile);
        onClose();

      } else {
        // Sign In
        const res = await fetch('/api/auth/username-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || 'Invalid username or password.');
          return;
        }

        if (data.customToken) {
          try {
            const userCred = await signInWithCustomToken(auth, data.customToken);
            onSuccess(userCred.user, data.profile);
            onClose();
            return;
          } catch (customErr) {
            console.warn("Custom token client login warning:", customErr);
          }
        }

        const simulatedUser = {
          uid: data.uid,
          displayName: data.profile?.username || username.trim(),
          email: data.profile?.email || `${username.trim()}@rafikipredict.user`
        };
        onSuccess(simulatedUser, data.profile);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check network connectivity.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Phone OTP Dispatch
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!cleaned || cleaned.length < 7) {
      setError(language === 'sw' ? 'Tafadhali weka nambari sahihi ya simu.' : 'Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'signup') {
        try {
          const checkRes = await fetch('/api/auth/check-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: fullPhone })
          });
          const checkData = await checkRes.json();
          if (checkData.phoneExists) {
            setError(language === 'sw'
              ? 'Nambari hii ya simu tayari imesajiliwa. Tafadhali Ingia (Sign In).' 
              : 'An account with this phone number already exists. Please switch to Sign In.'
            );
            setLoading(false);
            return;
          }
        } catch (_) {}
      }

      const res = await fetch('/api/auth/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: fullPhone,
          purpose: authMode === 'signup' ? 'register' : 'login',
          displayName: displayName || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setOtpSessionId(data.sessionId);
        setOtpSent(true);
        setCountdown(60);
        if (data.demoOtp) {
          setDemoOtpHint(data.demoOtp);
        }
        setSuccess(
          language === 'sw'
            ? `Msimbo wa uthibitishaji umetumwa kwa ${fullPhone}`
            : `Verification code sent to ${fullPhone}`
        );
      } else {
        setError(data.message || data.error || 'Failed to dispatch verification SMS.');
      }
    } catch (err: any) {
      setError('Unable to connect to verification server.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (otpCode.length !== 6) {
      setError(language === 'sw' ? 'Weka msimbo wa tarakimu 6.' : 'Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: otpSessionId,
          phone: fullPhone,
          otp: otpCode,
          displayName: displayName || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.customToken) {
          try {
            const userCred = await signInWithCustomToken(auth, data.customToken);
            onSuccess(userCred.user, data.profile);
            onClose();
            return;
          } catch (customErr) {
            console.warn("Custom token login warning:", customErr);
          }
        }
        
        const simulatedUser = {
          uid: data.uid,
          phoneNumber: data.phone,
          displayName: data.profile?.username || displayName || `Member ${data.phone.slice(-4)}`,
          email: data.profile?.email || ''
        };
        onSuccess(simulatedUser, data.profile);
        onClose();
      } else {
        setError(data.message || data.error || 'Incorrect OTP code entered.');
      }
    } catch (err: any) {
      setError('Verification service unavailable. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Email & Password Authentication
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !email.includes('@')) {
      setError(language === 'sw' ? 'Tafadhali weka barua pepe sahihi.' : 'Please enter a valid email address.');
      return;
    }

    // Password reset flow
    if (authMode === 'reset') {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, email.trim());
        setSuccess(
          language === 'sw'
            ? 'Kiungo cha kuweka upya nenosiri kimetumwa kwenye barua pepe yako!'
            : 'Password reset link sent to your email! Please check your inbox and spam folder.'
        );
      } catch (err: any) {
        setError(err?.message || 'Failed to send password reset email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      setError(language === 'sw' ? 'Nenosiri lazima liwe na angalau herufi 6.' : 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'signup') {
        try {
          const checkRes = await fetch('/api/auth/check-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim() })
          });
          const checkData = await checkRes.json();
          if (checkData.emailExists) {
            setError(language === 'sw' 
              ? 'Barua pepe hii tayari imesajiliwa. Tafadhali Ingia (Sign In).' 
              : 'An account with this email already exists. Please switch to Sign In.'
            );
            setLoading(false);
            return;
          }
        } catch (_) {}

        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          try {
            await updateProfile(userCred.user, { displayName: displayName.trim() });
          } catch (_) {}
        }

        try {
          await sendEmailVerification(userCred.user);
          setEmailVerificationSent(true);
        } catch (emailErr) {
          console.warn("Email verification dispatch notice:", emailErr);
        }

        onSuccess(userCred.user);
        onClose();
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        onSuccess(userCred.user);
        onClose();
      }
    } catch (err: any) {
      let msg = err?.message || 'Authentication failed. Please check credentials.';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        msg = language === 'sw' ? 'Barua pepe au nenosiri si sahihi.' : 'Invalid email or password.';
      } else if (msg.includes('email-already-in-use')) {
        msg = language === 'sw' ? 'Barua pepe hii tayari inatumika. Tafadhali Ingia.' : 'This email is already in use. Please sign in.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 5. OAuth Sign-In (Google, Apple, Microsoft)
  const handleOAuthSignIn = async (provider: 'google' | 'apple' | 'microsoft') => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      let res;
      if (provider === 'google') {
        res = await signInWithGoogle();
      } else if (provider === 'apple') {
        res = await signInWithApple();
      } else {
        res = await signInWithMicrosoft();
      }
      if (res?.user) {
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      console.warn(`${provider} OAuth notice:`, err);
      let msg = err?.message || `Failed to sign in with ${provider}.`;
      if (err?.code === 'auth/popup-closed-by-user') {
        msg = 'Sign in popup was closed before completing.';
      } else if (err?.code === 'auth/popup-blocked') {
        msg = 'Sign-in popup was blocked by your browser. Please allow popups for Rafiki Predict.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose} 
      />

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden p-6 shadow-2xl relative z-10 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full ring-2 ring-emerald-500/40 overflow-hidden bg-zinc-950 shrink-0 shadow-lg shadow-emerald-500/20">
              <img 
                src="/src/assets/images/rafiki_app_logo_1787728334689.jpg" 
                alt="Rafiki Predict Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-mono font-bold">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>
                  {authMode === 'signup' 
                    ? (language === 'sw' ? 'Usajili Mpya wa Akaunti' : 'Create Account')
                    : authMode === 'reset' 
                    ? (language === 'sw' ? 'Weka Upya Nenosiri' : 'Reset Password')
                    : (language === 'sw' ? 'Ingia Kwenye Akaunti' : 'Sign In')}
                </span>
              </div>
              <h4 className="text-base font-bold font-sans text-white">
                {authMode === 'signup' 
                  ? (language === 'sw' ? 'Jiunge na Rafiki Predict' : 'Join Rafiki Predict')
                  : authMode === 'reset' 
                  ? (language === 'sw' ? 'Rejesha Nenosiri Lako' : 'Recover Your Account')
                  : (language === 'sw' ? 'Karibu Tena' : 'Welcome Back')}
              </h4>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer shrink-0 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher: Sign In vs Sign Up Tabs */}
        {authMode !== 'reset' && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950 border border-zinc-850 rounded-xl text-xs font-semibold">
            <button
              type="button"
              id="auth-tab-signin"
              onClick={() => {
                setAuthMode('signin');
                setError('');
                setSuccess('');
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'signin' 
                  ? 'bg-zinc-800 text-white shadow-sm font-bold border border-zinc-700/50' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>{language === 'sw' ? 'Ingia' : 'Sign In'}</span>
            </button>
            <button
              type="button"
              id="auth-tab-signup"
              onClick={() => {
                setAuthMode('signup');
                setError('');
                setSuccess('');
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'signup' 
                  ? 'bg-emerald-500 text-black shadow-sm font-bold' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === 'sw' ? 'Sajili Bure' : 'Register Free'}</span>
            </button>
          </div>
        )}

        {/* Feedback Banners */}
        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-xl text-xs flex items-start gap-2 animate-fadeIn">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-start gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Auth Method Tabs (Username vs Phone OTP vs Email) */}
        {authMode !== 'reset' && (
          <div className="grid grid-cols-3 border-b border-zinc-800/80 pb-2 gap-1.5 text-xs">
            <button
              type="button"
              id="auth-method-username-btn"
              onClick={() => {
                setAuthMethod('username');
                setError('');
              }}
              className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1 font-medium transition-all cursor-pointer ${
                authMethod === 'username'
                  ? 'bg-zinc-800 text-emerald-400 border-emerald-500/40 font-bold shadow-sm'
                  : 'bg-zinc-950/60 text-gray-400 border-zinc-850 hover:text-white'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="truncate">{language === 'sw' ? 'Username' : 'Username'}</span>
            </button>

            <button
              type="button"
              id="auth-method-phone-btn"
              onClick={() => {
                setAuthMethod('phone');
                setError('');
              }}
              className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1 font-medium transition-all cursor-pointer ${
                authMethod === 'phone'
                  ? 'bg-zinc-800 text-emerald-400 border-emerald-500/40 font-bold shadow-sm'
                  : 'bg-zinc-950/60 text-gray-400 border-zinc-850 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="truncate">{language === 'sw' ? 'Simu (OTP)' : 'Phone OTP'}</span>
            </button>

            <button
              type="button"
              id="auth-method-email-btn"
              onClick={() => {
                setAuthMethod('email');
                setError('');
              }}
              className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1 font-medium transition-all cursor-pointer ${
                authMethod === 'email'
                  ? 'bg-zinc-800 text-emerald-400 border-emerald-500/40 font-bold shadow-sm'
                  : 'bg-zinc-950/60 text-gray-400 border-zinc-850 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="truncate">{language === 'sw' ? 'Barua Pepe' : 'Email'}</span>
            </button>
          </div>
        )}

        {/* 1. Username & Password Form */}
        {authMethod === 'username' && authMode !== 'reset' && (
          <form onSubmit={handleUsernameAuthSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                {language === 'sw' ? 'Jina la Mtumiaji (Username)' : 'Username or Alias'}
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-gray-500 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                  placeholder="e.g. bet_master_254"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2 text-sm text-white font-mono focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">
                {authMode === 'signup' 
                  ? (language === 'sw' ? 'Herufi na tarakimu pekee (angalau herufi 3).' : 'Letters, numbers, and underscores only (min 3 characters).')
                  : (language === 'sw' ? 'Ingiza username yako uliyojisajili nayo.' : 'Enter your registered username.')}
              </span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  {language === 'sw' ? 'Nenosiri' : 'Password'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            {authMode === 'signup' && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                  {language === 'sw' ? 'Thibitisha Nenosiri' : 'Confirm Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              id="username-auth-btn"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-sans font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)] mt-1"
            >
              <UserIcon className="w-4 h-4" />
              <span>
                {loading ? 'Processing...' : authMode === 'signup' ? 'Create Account with Username' : 'Sign In with Username'}
              </span>
            </button>
          </form>
        )}

        {/* 2. Phone + OTP Method Form */}
        {authMethod === 'phone' && authMode !== 'reset' && (
          <div className="space-y-3">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-3">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                      {language === 'sw' ? 'Jina Kamili / Lakabu' : 'Full Name / Alias'}
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-gray-500 absolute left-3.5 top-2.5" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2 text-sm text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                    {language === 'sw' ? 'Nambari ya Simu ya Mkononi' : 'Mobile Phone Number'}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none font-mono"
                    >
                      <option value="+254">🇰🇪 +254 (KE)</option>
                      <option value="+255">🇹🇿 +255 (TZ)</option>
                      <option value="+256">🇺🇬 +256 (UG)</option>
                      <option value="+234">🇳🇬 +234 (NG)</option>
                      <option value="+233">🇬🇭 +233 (GH)</option>
                      <option value="+27">🇿🇦 +27 (ZA)</option>
                      <option value="+1">🇺🇸 +1 (US)</option>
                      <option value="+44">🇬🇧 +44 (UK)</option>
                      <option value="+971">🇦🇪 +971 (AE)</option>
                    </select>

                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="0712 345 678"
                      className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    {language === 'sw' 
                      ? 'Tutatuma msimbo salama wa uthibitishaji wa tarakimu 6 (OTP).' 
                      : 'We will dispatch a secure 6-digit verification code.'}
                  </span>
                </div>

                <button
                  type="submit"
                  id="send-otp-btn"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-sans font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)] mt-1"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>
                    {loading 
                      ? (language === 'sw' ? 'Inatuma...' : 'Dispatching Code...') 
                      : (language === 'sw' ? 'Tuma Msimbo wa OTP' : 'Send Verification Code (OTP)')}
                  </span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3 animate-fadeIn">
                <div className="bg-zinc-950/80 border border-zinc-850 p-3 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Verifying Phone:</span>
                    <strong className="text-emerald-400 font-mono">{fullPhone}</strong>
                  </div>
                  {demoOtpHint && (
                    <div className="flex items-center justify-between text-[11px] bg-emerald-950/30 border border-emerald-800/40 p-1.5 rounded-lg text-emerald-300">
                      <span>Test Verification OTP:</span>
                      <button
                        type="button"
                        onClick={() => setOtpCode(demoOtpHint)}
                        className="font-mono font-bold bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-400 hover:bg-emerald-500/30 cursor-pointer"
                      >
                        {demoOtpHint} (Auto-Fill)
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                    {language === 'sw' ? 'Weka Msimbo wa Tarakimu 6' : 'Enter 6-Digit OTP Code'}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-emerald-400 absolute left-3.5 top-2.5" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2.5 text-base font-mono text-center tracking-widest text-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="verify-otp-btn"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-sans font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {loading 
                      ? (language === 'sw' ? 'Inathibitisha...' : 'Verifying...') 
                      : (language === 'sw' ? 'Thibitisha na Uingie' : 'Verify & Access Account')}
                  </span>
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                    }}
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    ← Change Phone
                  </button>

                  <button
                    type="button"
                    disabled={countdown > 0 || loading}
                    onClick={handleSendOtp}
                    className={`font-semibold cursor-pointer ${
                      countdown > 0 ? 'text-gray-500 cursor-not-allowed' : 'text-emerald-400 hover:underline'
                    }`}
                  >
                    {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* 3. Email + Password Method Form */}
        {(authMethod === 'email' || authMode === 'reset') && (
          <form onSubmit={handleEmailAuthSubmit} className="space-y-3">
            {authMode === 'signup' && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                  {language === 'sw' ? 'Jina Kamili / Lakabu' : 'Full Name / Alias'}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-gray-500 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                {language === 'sw' ? 'Barua Pepe' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            {authMode !== 'reset' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400">
                    {language === 'sw' ? 'Nenosiri' : 'Password'}
                  </label>
                  {authMode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('reset');
                        setError('');
                        setSuccess('');
                      }}
                      className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                    >
                      {language === 'sw' ? 'Umesahau Nenosiri?' : 'Forgot Password?'}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-sans font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)] mt-1"
            >
              {loading ? (
                <span>Processing...</span>
              ) : authMode === 'signup' ? (
                <span>Create Verified Account</span>
              ) : authMode === 'reset' ? (
                <span>Send Password Reset Email</span>
              ) : (
                <span>Sign In</span>
              )}
            </button>

            {authMode === 'reset' && (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setError('');
                  setSuccess('');
                }}
                className="w-full text-center text-xs text-gray-400 hover:text-white py-1 cursor-pointer"
              >
                ← Back to Sign In
              </button>
            )}
          </form>
        )}

        {/* 4. 1-Click Social Sign In Options */}
        {authMode !== 'reset' && (
          <div className="space-y-3 pt-2 border-t border-zinc-800/80">
            <div className="relative flex items-center justify-center">
              <span className="bg-zinc-900 px-2.5 text-[9px] font-mono text-gray-500 uppercase tracking-widest relative">
                or continue with 1-click social
              </span>
            </div>

            {/* Google Sign-In Primary Button */}
            <button
              type="button"
              id="google-auth-popup-btn"
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-900 font-sans font-bold rounded-xl text-xs flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{authMode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}</span>
            </button>

            {/* Apple & Microsoft OAuth */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOAuthSignIn('apple')}
                disabled={loading}
                className="py-2 px-3 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs text-gray-200 font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.3-9.57-11.16-20.73-14.59-33.48-3.43-12.75-5.14-24.32-5.14-34.71 0-14.54 3.73-26.63 11.2-36.26 7.46-9.63 16.9-14.52 28.3-14.68 5.75 0 11.75 1.48 18 4.43 6.25 2.95 10.15 4.51 11.72 4.68 1.25-.17 5.36-1.8 12.33-4.89 6.97-3.09 13.06-4.51 18.27-4.26 13.78.65 24.59 5.86 32.44 15.64-12.08 7.33-18.01 17.38-17.78 30.15.22 10.02 4.09 18.39 11.61 25.1 7.52 6.72 16.47 10.45 26.85 11.19-2.29 6.84-4.83 13.43-7.63 19.78zm-28.78-105.4c0-7.39 2.65-14.34 7.95-20.85 5.3-6.51 11.83-10.49 19.6-11.93.22 1.44.33 2.81.33 4.1 0 7.39-2.73 14.49-8.19 21.3-5.46 6.81-12.07 10.87-19.83 12.18-.32-1.63-.48-3.23-.48-4.8z"/>
                </svg>
                <span>Apple</span>
              </button>

              <button
                type="button"
                onClick={() => handleOAuthSignIn('microsoft')}
                disabled={loading}
                className="py-2 px-3 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs text-gray-200 font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                <span>Microsoft</span>
              </button>
            </div>
          </div>
        )}

        {/* 1-Day Guest Pass Notice */}
        <div className="p-3 bg-zinc-950/80 border border-zinc-850 rounded-xl text-[11px] text-gray-400 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <span>💡 1-Day Access Rule:</span>
          </div>
          <p>
            {language === 'sw'
              ? 'Kununua utabiri wa siku 1 (Daily Pass) hakuhitaji akaunti. Unaweza kulipa na kufungua papo hapo bila kusajili!'
              : 'Purchasing 1-day daily predictions does NOT require an account. Multi-day subscriptions require account registration for syncing.'}
          </p>
        </div>
      </div>
    </div>
  );
}
