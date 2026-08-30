import React, { useState } from 'react';
import { 
  X, 
  User as UserIcon, 
  Mail, 
  Smartphone, 
  ShieldCheck, 
  ShieldAlert, 
  Crown, 
  LogOut, 
  KeyRound, 
  CheckCircle2, 
  Calendar, 
  CreditCard, 
  Save, 
  RefreshCw,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { 
  auth, 
  signOut, 
  sendPasswordResetEmail, 
  sendEmailVerification 
} from '../lib/firebase';
import { UserProfile } from '../types';
import { authFetch } from '../lib/api';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  userProfile: UserProfile | null;
  onProfileUpdated: (updated: UserProfile) => void;
  onSignOut: () => void;
  language?: 'en' | 'sw';
}

export default function AccountModal({
  isOpen,
  onClose,
  user,
  userProfile,
  onProfileUpdated,
  onSignOut,
  language = 'en'
}: AccountModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'security'>('overview');

  // Edit form state
  const [editUsername, setEditUsername] = useState(userProfile?.username || user?.displayName || '');
  const [editPhone, setEditPhone] = useState(userProfile?.phone || user?.phoneNumber || '');
  
  // Feedback state
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !user) return null;

  const isEmailVerified = user?.emailVerified || userProfile?.emailVerified;
  const isPhoneVerified = !!(user?.phoneNumber || userProfile?.phoneVerified || userProfile?.phone);
  const plan = userProfile?.subscriptionPlan || 'free';
  const subStatus = userProfile?.subscriptionStatus || 'trial';

  // 1. Handle Update Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await authFetch('/api/user/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: editUsername.trim(),
          phone: editPhone.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(language === 'sw' ? 'Wasifu umesasishwa kikamilifu.' : 'Account profile updated successfully.');
        if (data.profile) {
          onProfileUpdated(data.profile);
        }
        setTimeout(() => setActiveTab('overview'), 1200);
      } else {
        setErrorMsg(data.message || data.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setErrorMsg('Network error updating profile.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Send Email Verification
  const handleSendEmailVerification = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setSuccessMsg(
          language === 'sw'
            ? 'Kiungo cha uthibitisho kimetumwa kwenye barua pepe yako.'
            : 'Verification link sent to your email! Please click the link to verify.'
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch verification email.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Send Password Reset
  const handlePasswordReset = async () => {
    const userEmail = user?.email || userProfile?.email;
    if (!userEmail) {
      setErrorMsg(language === 'sw' ? 'Hakuna barua pepe iliyounganishwa na akaunti hii.' : 'No email address linked to this account.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, userEmail);
      setSuccessMsg(
        language === 'sw'
          ? `Kiungo cha kubadilisha nenosiri kimetumwa kwa ${userEmail}.`
          : `Password reset instructions sent to ${userEmail}.`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Sign Out
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (_) {}
    onSignOut();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose} 
      />

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden p-6 shadow-2xl relative z-10 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
              {userProfile?.username?.[0]?.toUpperCase() || user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-sans">
                  {userProfile?.username || user?.displayName || 'Registered Member'}
                </h3>
                {subStatus === 'premium' && (
                  <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    VIP
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 font-mono">
                {user?.email || userProfile?.phone || user?.phoneNumber || `UID: ${user?.uid?.slice(0, 8)}...`}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 border border-zinc-850 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'overview' ? 'bg-zinc-800 text-white font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'edit' ? 'bg-zinc-800 text-white font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'security' ? 'bg-zinc-800 text-white font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Security</span>
          </button>
        </div>

        {/* Feedback Banners */}
        {errorMsg && (
          <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-xl text-xs flex items-start gap-2 animate-fadeIn">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-start gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* VIP / Subscription Status Card */}
            <div className="p-4 bg-gradient-to-br from-zinc-950 to-zinc-900 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-gray-400">Subscription Status</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                  subStatus === 'premium' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : subStatus === 'pending_approval'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-zinc-800 text-gray-300'
                }`}>
                  {subStatus === 'premium' ? 'ACTIVE VIP' : subStatus === 'pending_approval' ? 'VERIFICATION PENDING' : 'STANDARD / TRIAL'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-800/80">
                <div>
                  <span className="text-gray-500 block text-[10px]">CURRENT PACKAGE</span>
                  <strong className="text-white capitalize">{plan} Package</strong>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">EXPIRES ON</span>
                  <strong className="text-emerald-400">
                    {userProfile?.premiumExpiresAt 
                      ? new Date(userProfile.premiumExpiresAt).toLocaleDateString()
                      : 'N/A (Active Session)'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Account Details & Verification Badges */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-gray-400">Account Credentials</h4>
              
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl divide-y divide-zinc-850 text-xs">
                {/* Email Row */}
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <div>
                      <span className="text-gray-400 block text-[10px]">Email Address</span>
                      <span className="text-white font-medium">{user?.email || userProfile?.email || 'Not connected'}</span>
                    </div>
                  </div>
                  {user?.email && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isEmailVerified 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {isEmailVerified ? '✓ Verified' : 'Unverified'}
                    </span>
                  )}
                </div>

                {/* Phone Row */}
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-gray-500" />
                    <div>
                      <span className="text-gray-400 block text-[10px]">Phone Number</span>
                      <span className="text-white font-mono font-medium">{userProfile?.phone || user?.phoneNumber || 'Not provided'}</span>
                    </div>
                  </div>
                  {(userProfile?.phone || user?.phoneNumber) && (
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">
                      ✓ Verified
                    </span>
                  )}
                </div>

                {/* Member Since */}
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <div>
                      <span className="text-gray-400 block text-[10px]">Registered Date</span>
                      <span className="text-gray-300">
                        {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'Active Member'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EDIT PROFILE */}
        {activeTab === 'edit' && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                Display Name / Username
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-gray-500 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="e.g. Victor Predictor"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                Mobile Phone (for SMS / WhatsApp predictions)
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-gray-500 absolute left-3.5 top-2.5" />
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+254 712 345 678"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-2 text-sm text-white font-mono focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-sans font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)]"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </form>
        )}

        {/* TAB 3: SECURITY & PASSWORD */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            {/* Email Verification Action */}
            {user?.email && !isEmailVerified && (
              <div className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Email Verification Pending</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Verify your email to secure your account and receive instant prediction updates.
                </p>
                <button
                  type="button"
                  onClick={handleSendEmailVerification}
                  disabled={loading}
                  className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-semibold border border-amber-500/30 cursor-pointer"
                >
                  Send Verification Link to {user.email}
                </button>
              </div>
            )}

            {/* Password Reset Action */}
            <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>Password Recovery & Update</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Receive a secure password reset link directly in your registered inbox.
              </p>
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={loading}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium border border-zinc-700 cursor-pointer"
              >
                Send Password Reset Email
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-[10px] text-gray-500 font-mono">Rafiki Auth Engine v2.4</span>
          
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-lg hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
