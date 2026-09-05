import React, { useState, useEffect } from 'react';
import { 
  Key, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  Search, 
  Filter, 
  Check, 
  Copy, 
  Plus, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Slash, 
  AlertTriangle, 
  Smartphone, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Coins, 
  Calendar, 
  ExternalLink,
  History,
  TrendingUp,
  Settings,
  Edit2,
  Trash2,
  Users
} from 'lucide-react';
import { authFetch } from '../lib/api';
import { AccessKey, AccessKeyStatus, SubscriptionPlan, AccountlessPaymentSubmission, KeyAuditLog } from '../types';

interface AdminAccessKeysTabProps {
  adminSecretKey?: string;
  onRefresh?: () => void;
}

export default function AdminAccessKeysTab({ adminSecretKey }: AdminAccessKeysTabProps) {
  // Navigation inside Access Keys Admin
  const [subView, setSubView] = useState<'overview' | 'keys' | 'payments' | 'plans' | 'audit'>('overview');

  // Overview metrics state
  const [overview, setOverview] = useState<any>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);

  // Keys list state
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [isKeysLoading, setIsKeysLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Payments queue state
  const [payments, setPayments] = useState<AccountlessPaymentSubmission[]>([]);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);

  // Plans state
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isPlansLoading, setIsPlansLoading] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<KeyAuditLog[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);

  // Modals state
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [genForm, setGenForm] = useState({
    planId: 'plan_7days',
    isComplimentary: true,
    reason: 'VIP Promotional Pass',
    clientContact: '',
    customDurationHours: 168,
    adminNotes: ''
  });
  const [genResult, setGenResult] = useState<AccessKey | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Plan Edit Modal
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  // History/Audit Modal
  const [selectedKeyHistory, setSelectedKeyHistory] = useState<AccessKey | null>(null);

  // Feedback & Copy states
  const [actionMessage, setActionMessage] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Dedicated In-UI Action Confirmation Modal (Block, Unblock, Revoke, Reset, Reject)
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'block' | 'unblock' | 'revoke' | 'reset-session' | 'reject-payment';
    id: string;
    title: string;
    description: string;
    requiresReason?: boolean;
    reason: string;
    presetReasons?: string[];
    isProcessing: boolean;
    errorMessage: string | null;
  }>({
    isOpen: false,
    type: 'block',
    id: '',
    title: '',
    description: '',
    requiresReason: false,
    reason: '',
    isProcessing: false,
    errorMessage: null,
  });

  // Approved Payment WhatsApp Share Prompt (in-UI modal instead of window.confirm)
  const [paymentApprovedShare, setPaymentApprovedShare] = useState<{
    keyCode: string;
    clientContact: string;
    waUrl: string;
  } | null>(null);

  // Fetch Overview
  const fetchOverview = async () => {
    setIsOverviewLoading(true);
    try {
      const res = await authFetch('/api/admin/keys/overview');
      const data = await res.json();
      if (res.ok && data.overview) {
        setOverview(data.overview);
      }
    } catch (err) {
      console.warn('Failed to load keys overview:', err);
    } finally {
      setIsOverviewLoading(false);
    }
  };

  // Fetch Keys
  const fetchKeys = async () => {
    setIsKeysLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        search: searchQuery,
        page: currentPage.toString(),
        limit: '25'
      });
      const res = await authFetch(`/api/admin/keys/list?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.keys) {
        setKeys(data.keys);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.warn('Failed to load keys:', err);
    } finally {
      setIsKeysLoading(false);
    }
  };

  // Fetch Payments
  const fetchPayments = async () => {
    setIsPaymentsLoading(true);
    try {
      const res = await authFetch('/api/admin/keys/payments');
      const data = await res.json();
      if (res.ok && data.payments) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.warn('Failed to load payments:', err);
    } finally {
      setIsPaymentsLoading(false);
    }
  };

  // Fetch Plans
  const fetchPlans = async () => {
    setIsPlansLoading(true);
    try {
      const res = await authFetch('/api/admin/plans');
      const data = await res.json();
      if (res.ok && data.plans) {
        setPlans(data.plans);
      }
    } catch (err) {
      console.warn('Failed to load plans:', err);
    } finally {
      setIsPlansLoading(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    setIsAuditLoading(true);
    try {
      const res = await authFetch('/api/admin/keys/audit-logs');
      const data = await res.json();
      if (res.ok && data.logs) {
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    } finally {
      setIsAuditLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchKeys();
    fetchPayments();
    fetchPlans();
  }, [statusFilter, currentPage]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Key Actions - Open In-UI Modals (Guaranteed to work in sandboxed iframes)
  const handleBlockKey = (keyCode: string) => {
    setActionModal({
      isOpen: true,
      type: 'block',
      id: keyCode,
      title: 'Block VIP Access Key',
      description: 'Blocking this key immediately suspends VIP access and invalidates all current browser sessions for this subscriber.',
      requiresReason: true,
      reason: 'Account sharing violation',
      presetReasons: [
        'Account sharing violation',
        'Suspicious device activity',
        'Policy violation',
        'Fraudulent transaction',
        'Manual admin block'
      ],
      isProcessing: false,
      errorMessage: null,
    });
  };

  const handleUnblockKey = (keyCode: string) => {
    setActionModal({
      isOpen: true,
      type: 'unblock',
      id: keyCode,
      title: 'Unblock Access Key',
      description: 'Reactivate this VIP access key so the client can resume accessing premium VIP tips and predictions.',
      requiresReason: false,
      reason: '',
      isProcessing: false,
      errorMessage: null,
    });
  };

  const handleRevokeKey = (keyCode: string) => {
    setActionModal({
      isOpen: true,
      type: 'revoke',
      id: keyCode,
      title: 'Permanently Revoke Access Key',
      description: 'Revoking is permanent and irreversible. This access key will be cancelled and cannot be reactivated.',
      requiresReason: true,
      reason: 'Fraudulent transaction',
      presetReasons: [
        'Fraudulent transaction',
        'Chargeback / refund dispute',
        'Violation of terms of service'
      ],
      isProcessing: false,
      errorMessage: null,
    });
  };

  const handleResetSession = (keyCode: string) => {
    setActionModal({
      isOpen: true,
      type: 'reset-session',
      id: keyCode,
      title: 'Reset Active Device Sessions',
      description: 'This will unbind all active devices and clear cached session tokens for this key, requiring the user to re-authenticate.',
      requiresReason: false,
      reason: '',
      isProcessing: false,
      errorMessage: null,
    });
  };

  const handleRejectPayment = (paymentId: string) => {
    setActionModal({
      isOpen: true,
      type: 'reject-payment',
      id: paymentId,
      title: 'Reject Payment Submission',
      description: 'Mark this transaction submission as rejected and record the rejection reason in the audit logs.',
      requiresReason: true,
      reason: 'Invalid or unverified transaction code',
      presetReasons: [
        'Invalid or unverified transaction code',
        'Payment amount mismatch',
        'Transaction code already redeemed',
        'Fake or test submission'
      ],
      isProcessing: false,
      errorMessage: null,
    });
  };

  const handleExecuteAction = async () => {
    if (!actionModal.isOpen || actionModal.isProcessing) return;
    setActionModal(prev => ({ ...prev, isProcessing: true, errorMessage: null }));

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(adminSecretKey ? { 'X-Admin-Secret': adminSecretKey } : {})
      };

      if (actionModal.type === 'block') {
        const res = await authFetch('/api/admin/keys/block', {
          method: 'POST',
          headers,
          body: JSON.stringify({ keyCode: actionModal.id, reason: actionModal.reason || 'Policy violation' })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          setActionMessage(`✓ Access Key ${actionModal.id} has been BLOCKED.`);
          setActionModal(prev => ({ ...prev, isOpen: false, isProcessing: false }));
          fetchKeys();
          fetchOverview();
        } else {
          setActionModal(prev => ({ ...prev, isProcessing: false, errorMessage: data.message || 'Failed to block key' }));
        }
      } else if (actionModal.type === 'unblock') {
        const res = await authFetch('/api/admin/keys/unblock', {
          method: 'POST',
          headers,
          body: JSON.stringify({ keyCode: actionModal.id })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          setActionMessage(`✓ Access Key ${actionModal.id} has been UNBLOCKED.`);
          setActionModal(prev => ({ ...prev, isOpen: false, isProcessing: false }));
          fetchKeys();
          fetchOverview();
        } else {
          setActionModal(prev => ({ ...prev, isProcessing: false, errorMessage: data.message || 'Failed to unblock key' }));
        }
      } else if (actionModal.type === 'revoke') {
        const res = await authFetch('/api/admin/keys/revoke', {
          method: 'POST',
          headers,
          body: JSON.stringify({ keyCode: actionModal.id, reason: actionModal.reason || 'Revoked' })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          setActionMessage(`✓ Key ${actionModal.id} permanently revoked.`);
          setActionModal(prev => ({ ...prev, isOpen: false, isProcessing: false }));
          fetchKeys();
          fetchOverview();
        } else {
          setActionModal(prev => ({ ...prev, isProcessing: false, errorMessage: data.message || 'Failed to revoke key' }));
        }
      } else if (actionModal.type === 'reset-session') {
        const res = await authFetch('/api/admin/keys/reset-session', {
          method: 'POST',
          headers,
          body: JSON.stringify({ keyCode: actionModal.id })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          setActionMessage(`✓ Active sessions reset for key ${actionModal.id}.`);
          setActionModal(prev => ({ ...prev, isOpen: false, isProcessing: false }));
          fetchKeys();
        } else {
          setActionModal(prev => ({ ...prev, isProcessing: false, errorMessage: data.message || 'Failed to reset sessions' }));
        }
      } else if (actionModal.type === 'reject-payment') {
        const res = await authFetch('/api/admin/keys/reject-payment', {
          method: 'POST',
          headers,
          body: JSON.stringify({ paymentId: actionModal.id, reason: actionModal.reason || 'Rejected' })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          setActionMessage(`✓ Payment ${actionModal.id} has been rejected.`);
          setActionModal(prev => ({ ...prev, isOpen: false, isProcessing: false }));
          fetchPayments();
        } else {
          setActionModal(prev => ({ ...prev, isProcessing: false, errorMessage: data.message || 'Failed to reject payment' }));
        }
      }
    } catch (err: any) {
      setActionModal(prev => ({ ...prev, isProcessing: false, errorMessage: err.message || 'Network error processing request' }));
    }
  };

  const handleExtendKey = async (keyCode: string, hours: number) => {
    try {
      const res = await authFetch('/api/admin/keys/extend', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(adminSecretKey ? { 'X-Admin-Secret': adminSecretKey } : {})
        },
        body: JSON.stringify({ keyCode, hours })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setActionMessage(`✓ Key ${keyCode} extended by +${hours} hours.`);
        fetchKeys();
        fetchOverview();
      } else {
        setActionMessage(`⚠️ Failed to extend key: ${data.message || 'Error'}`);
      }
    } catch (err: any) {
      setActionMessage(`⚠️ Error extending key: ${err.message}`);
    }
  };

  // Payment Actions
  const handleApprovePayment = async (paymentId: string) => {
    try {
      const res = await authFetch('/api/admin/keys/approve-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(adminSecretKey ? { 'X-Admin-Secret': adminSecretKey } : {})
        },
        body: JSON.stringify({ paymentId })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.accessKey) {
        setActionMessage(`✓ Payment approved! Key generated: ${data.accessKey.keyCode}`);
        fetchPayments();
        fetchKeys();
        fetchOverview();
        if (data.whatsAppShareText) {
          const clientContact = data.payment?.phone || '';
          const waUrl = `https://wa.me/${clientContact.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(data.whatsAppShareText)}`;
          setPaymentApprovedShare({
            keyCode: data.accessKey.keyCode,
            clientContact,
            waUrl
          });
        }
      } else {
        setActionMessage(`⚠️ Failed to approve payment: ${data.message || 'Failed'}`);
      }
    } catch (err: any) {
      setActionMessage(`⚠️ Connectivity error: ${err.message}`);
    }
  };

  // Generate Key Submission
  const handleGenerateKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const endpoint = genForm.isComplimentary 
        ? '/api/admin/keys/generate-complimentary' 
        : '/api/admin/keys/generate-manual';

      const res = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(genForm)
      });
      const data = await res.json();
      if (res.ok && data.accessKey) {
        setGenResult(data.accessKey);
        setActionMessage(`✓ Generated new key: ${data.accessKey.keyCode}`);
        fetchKeys();
        fetchOverview();
      } else {
        alert(data.message || 'Failed to generate key');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Plan Save Submission
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      const res = await authFetch('/api/admin/plans/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPlan)
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`✓ Plan ${editingPlan.name} saved.`);
        setIsPlanModalOpen(false);
        setEditingPlan(null);
        fetchPlans();
      } else {
        alert(data.message || 'Failed to save plan');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: AccessKeyStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ACTIVE</span>;
      case 'EXPIRING':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">EXPIRING SOON</span>;
      case 'EXPIRED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">EXPIRED</span>;
      case 'PENDING':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">PENDING ACTIVATION</span>;
      case 'BLOCKED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">BLOCKED</span>;
      case 'REVOKED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-950 text-red-400 border border-red-800">REVOKED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  return (
    <div id="admin-access-keys-container" className="space-y-6 animate-fadeIn">
      
      {/* HEADER & TOP BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            <Key className="w-6 h-6 text-emerald-400" />
            Accountless Subscriptions &amp; Access Keys Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full administrative control over cryptographic access keys, automated expiry, device sessions &amp; payments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="admin-gen-key-btn"
            onClick={() => {
              setGenResult(null);
              setIsGenModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Generate New Key
          </button>
          <button
            onClick={() => {
              fetchOverview();
              fetchKeys();
              fetchPayments();
              fetchPlans();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold"
            title="Refresh All"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage('')} className="text-slate-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* SUB-VIEW NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setSubView('overview')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
            subView === 'overview'
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Overview &amp; Metrics
        </button>

        <button
          onClick={() => setSubView('keys')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
            subView === 'keys'
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          All Access Keys ({overview?.totalKeys || keys.length})
        </button>

        <button
          onClick={() => setSubView('payments')}
          className={`relative px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
            subView === 'payments'
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          Payment Submissions ({payments.filter(p => p.status === 'PENDING').length})
          {payments.some(p => p.status === 'PENDING') && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setSubView('plans')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
            subView === 'plans'
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Subscription Plans ({plans.length})
        </button>

        <button
          onClick={() => {
            setSubView('audit');
            fetchAuditLogs();
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
            subView === 'audit'
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Audit Logs
        </button>
      </div>

      {/* 1. OVERVIEW VIEW */}
      {subView === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Active Keys</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">{overview.activeKeys}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Pending Activation</div>
              <div className="text-2xl font-black text-blue-400 mt-1">{overview.pendingKeys}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Expiring &lt;24h</div>
              <div className="text-2xl font-black text-amber-400 mt-1">{overview.expiringSoonKeys}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Expired Keys</div>
              <div className="text-2xl font-black text-slate-400 mt-1">{overview.expiredKeys}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Blocked / Revoked</div>
              <div className="text-2xl font-black text-rose-400 mt-1">{overview.blockedKeys + overview.revokedKeys}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Total Revenue (KES)</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">KSh {overview.totalRevenueKES.toLocaleString()}</div>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Quick Promotional Key Generation
              </h3>
              <p className="text-xs text-slate-400">
                Instantly issue a free test or promotional VIP pass for influencer, partner, or review purposes.
              </p>
              <button
                onClick={() => {
                  setGenForm({
                    planId: 'plan_7days',
                    isComplimentary: true,
                    reason: 'Promotional VIP Partner Pass',
                    clientContact: '',
                    customDurationHours: 168,
                    adminNotes: 'Quick 7-day promotional pass'
                  });
                  setIsGenModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" /> Issue 7-Day Promotional Pass
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-400" />
                Pending Accountless Payments
              </h3>
              <p className="text-xs text-slate-400">
                {overview.pendingPayments} payment submissions waiting for admin verification and key issuance.
              </p>
              <button
                onClick={() => setSubView('payments')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40"
              >
                Review Payment Queue ({overview.pendingPayments})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. KEYS TABLE VIEW */}
      {subView === 'keys' && (
        <div className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="admin-access-keys-search-input"
                name="admin_keys_search_query"
                type="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                placeholder="Search key code, plan, phone, reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchKeys()}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="EXPIRING">Expiring Soon</option>
                <option value="EXPIRED">Expired</option>
                <option value="BLOCKED">Blocked</option>
                <option value="REVOKED">Revoked</option>
              </select>

              <button
                onClick={fetchKeys}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
              >
                Search
              </button>
            </div>
          </div>

          {/* Keys Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Access Key Code</th>
                    <th className="p-3">Plan / Duration</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Expires At</th>
                    <th className="p-3">Client / Ref</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {keys.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">
                        {isKeysLoading ? 'Loading keys...' : 'No access keys found matching criteria.'}
                      </td>
                    </tr>
                  ) : (
                    keys.map((k) => {
                      const isCopied = copiedCode === k.keyCode;
                      return (
                        <tr key={k.id} className="hover:bg-slate-800/40 transition-colors">
                          
                          {/* Key Code */}
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <code className="font-mono font-bold text-emerald-300 bg-slate-950 px-2 py-0.5 rounded border border-emerald-500/20">
                                {k.keyCode}
                              </code>
                              <button
                                onClick={() => handleCopy(k.keyCode)}
                                className="text-slate-400 hover:text-emerald-400 p-1"
                                title="Copy Key"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            {k.isComplimentary && (
                              <span className="text-[10px] text-amber-400 font-medium">★ Complimentary</span>
                            )}
                          </td>

                          {/* Plan */}
                          <td className="p-3">
                            <div className="font-bold text-white">{k.planName}</div>
                            <div className="text-slate-400 text-[11px]">{k.durationHours || k.durationDays * 24} hours ({k.durationDays}d)</div>
                          </td>

                          {/* Status */}
                          <td className="p-3">
                            {getStatusBadge(k.status)}
                          </td>

                          {/* Expiry */}
                          <td className="p-3">
                            {k.expiresAt ? (
                              <div>
                                <div className="text-slate-200 font-medium">
                                  {new Date(k.expiresAt).toLocaleDateString()}
                                </div>
                                <div className="text-slate-400 text-[10px]">
                                  {new Date(k.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500">Not activated</span>
                            )}
                          </td>

                          {/* Client / Ref */}
                          <td className="p-3">
                            <div className="text-slate-300 font-mono">{k.clientContact || 'Direct/Guest'}</div>
                            {k.paymentReference && (
                              <div className="text-[10px] text-slate-400 font-mono">Ref: {k.paymentReference}</div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              
                              {/* WhatsApp Share */}
                              <a
                                href={`https://wa.me/?text=${encodeURIComponent(`🏆 *RAFIKI PREDICT VIP KEY*\n🔑 Key: *${k.keyCode}*\n📦 Plan: ${k.planName}\n\nFungua app na weka Access Key yako kupata VIP predictions!`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/20"
                                title="Share Key on WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>

                              {/* Extend */}
                              <button
                                onClick={() => handleExtendKey(k.keyCode, 24)}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700"
                                title="Extend +24 Hours"
                              >
                                +24h
                              </button>

                              {/* Block / Unblock */}
                              {k.status === 'BLOCKED' ? (
                                <button
                                  id={`btn-unblock-key-${k.keyCode}`}
                                  onClick={() => handleUnblockKey(k.keyCode)}
                                  className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors cursor-pointer"
                                  title="Unblock Key"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  id={`btn-block-key-${k.keyCode}`}
                                  onClick={() => handleBlockKey(k.keyCode)}
                                  className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors cursor-pointer"
                                  title="Block Key"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Reset Session */}
                              <button
                                id={`btn-reset-session-${k.keyCode}`}
                                onClick={() => handleResetSession(k.keyCode)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                                title="Reset Session / Device Binding"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>

                              {/* Revoke Key */}
                              {k.status !== 'REVOKED' && (
                                <button
                                  id={`btn-revoke-key-${k.keyCode}`}
                                  onClick={() => handleRevokeKey(k.keyCode)}
                                  className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition-colors cursor-pointer"
                                  title="Permanently Revoke Key"
                                >
                                  <Slash className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* View History */}
                              <button
                                id={`btn-view-history-${k.keyCode}`}
                                onClick={() => setSelectedKeyHistory(k)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                                title="View Key Audit History"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 bg-slate-950 border-t border-slate-800 text-xs">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="px-3 py-1 rounded bg-slate-800 disabled:opacity-50 text-slate-300"
                >
                  Previous
                </button>
                <span className="text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="px-3 py-1 rounded bg-slate-800 disabled:opacity-50 text-slate-300"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. PAYMENTS QUEUE VIEW */}
      {subView === 'payments' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Accountless Payment Submissions</h3>
                <p className="text-xs text-slate-400">Approve payments to immediately generate and issue unique Access Keys.</p>
              </div>
              <button
                onClick={fetchPayments}
                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px]">
                    <th className="p-3">Reference Code</th>
                    <th className="p-3">Plan / Amount</th>
                    <th className="p-3">Client Contact</th>
                    <th className="p-3">Submitted At</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Approve / Reject</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">
                        No payment submissions recorded.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="p-3">
                          <code className="font-mono font-bold text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-amber-500/20">
                            {p.reference}
                          </code>
                          <div className="text-[10px] text-slate-400 mt-0.5">{p.method}</div>
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-white">{p.planName}</div>
                          <div className="text-emerald-400 font-semibold">{p.amount} {p.currency}</div>
                        </td>

                        <td className="p-3">
                          <div className="text-slate-300 font-mono">{p.phone || 'N/A'}</div>
                          <div className="text-slate-400 text-[10px]">{p.email || ''}</div>
                        </td>

                        <td className="p-3 text-slate-400">
                          {new Date(p.timestamp).toLocaleString()}
                        </td>

                        <td className="p-3">
                          {p.status === 'APPROVED' ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300">APPROVED</span>
                          ) : p.status === 'REJECTED' ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300">REJECTED</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 animate-pulse">PENDING VERIFICATION</span>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          {p.status === 'PENDING' ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                id={`btn-approve-payment-${p.id}`}
                                onClick={() => handleApprovePayment(p.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-colors cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve &amp; Key
                              </button>
                              <button
                                id={`btn-reject-payment-${p.id}`}
                                onClick={() => handleRejectPayment(p.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-900/30 hover:bg-rose-900/50 text-rose-300 font-semibold text-xs border border-rose-700/40 transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : p.keyCode ? (
                            <div className="inline-flex items-center gap-1.5">
                              <code className="font-mono text-emerald-300 text-xs">{p.keyCode}</code>
                              <button
                                onClick={() => handleCopy(p.keyCode!)}
                                className="p-1 text-slate-400 hover:text-emerald-400"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. PLANS VIEW */}
      {subView === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Configured Subscription Packages</h3>
            <button
              onClick={() => {
                setEditingPlan({
                  id: `plan_${Date.now()}`,
                  name: 'New Custom VIP Pass',
                  durationDays: 14,
                  durationHours: 336,
                  priceKES: 2000,
                  currencyPrices: { KES: 2000, USD: 16 },
                  description: 'VIP Access Pass',
                  features: ['All AI Predictions', 'VIP High-Odds Accumulators'],
                  status: 'active',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                });
                setIsPlanModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Package
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((p) => (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">{p.durationDays} Days ({p.durationHours}h)</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                    {p.status.toUpperCase()}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-white text-base">{p.name}</h4>
                  <div className="text-lg font-black text-emerald-400 mt-1">KSh {p.priceKES.toLocaleString()}</div>
                </div>

                <ul className="text-xs text-slate-400 space-y-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-emerald-400" /> {f}
                    </li>
                  ))}
                </ul>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingPlan(p);
                      setIsPlanModalOpen(true);
                    }}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Edit Plan"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. AUDIT LOGS VIEW */}
      {subView === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              Complete Access Key Audit Trail
            </h3>
            <button onClick={fetchAuditLogs} className="px-3 py-1 rounded bg-slate-800 text-xs text-slate-300">Refresh</button>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto space-y-2">
            {auditLogs.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">No audit logs recorded yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="pt-2 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-400">{log.action}</span>
                      <span className="text-slate-400">by {log.actor}</span>
                    </div>
                    <p className="text-slate-300">{log.details}</p>
                    {log.keyCode && (
                      <code className="text-[11px] font-mono text-slate-400">Key: {log.keyCode}</code>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: GENERATE KEY */}
      {isGenModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Generate VIP Access Key
              </h3>
              <button
                onClick={() => setIsGenModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {genResult ? (
              <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-5 text-center space-y-3">
                <div className="text-xs font-bold text-emerald-400 uppercase">Key Generated Successfully!</div>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-2xl font-mono font-black text-white bg-slate-950 px-4 py-2 rounded-xl border border-emerald-500/40 tracking-wider">
                    {genResult.keyCode}
                  </code>
                  <button
                    onClick={() => handleCopy(genResult.keyCode)}
                    className="p-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold"
                  >
                    {copiedCode === genResult.keyCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <div className="text-xs text-slate-300">
                  {genResult.planName} • {genResult.durationHours} Hours ({genResult.durationDays} Days)
                </div>
                <div className="pt-3 flex gap-2 justify-center">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`🏆 *RAFIKI PREDICT VIP PASS*\n🔑 Access Key: *${genResult.keyCode}*\n📦 Plan: ${genResult.planName}\n\nIngiza Access Key hii ndani ya app kuanza kutumia!`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" /> Share on WhatsApp
                  </a>
                  <button
                    onClick={() => setGenResult(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Generate Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateKeySubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Select Subscription Plan</label>
                  <select
                    value={genForm.planId}
                    onChange={(e) => {
                      const p = plans.find(x => x.id === e.target.value);
                      setGenForm({
                        ...genForm,
                        planId: e.target.value,
                        customDurationHours: p ? p.durationHours : 168
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.durationDays} Days / KSh {p.priceKES})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Key Type</label>
                    <select
                      value={genForm.isComplimentary ? 'free' : 'paid'}
                      onChange={(e) => setGenForm({ ...genForm, isComplimentary: e.target.value === 'free' })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                    >
                      <option value="free">Complimentary / Free Promo</option>
                      <option value="paid">Direct Paid Client</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Custom Duration (Hours)</label>
                    <input
                      name="custom_duration_hours"
                      type="number"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                      value={genForm.customDurationHours}
                      onChange={(e) => setGenForm({ ...genForm, customDurationHours: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Client Contact / Phone / Name</label>
                  <input
                    name="client_contact_recipient"
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    placeholder="e.g. 0716483642 or John VIP"
                    value={genForm.clientContact}
                    onChange={(e) => setGenForm({ ...genForm, clientContact: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Reason / Admin Notes</label>
                  <input
                    name="admin_notes_reason"
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    placeholder="e.g. Promotional VIP Partner Pass"
                    value={genForm.reason}
                    onChange={(e) => setGenForm({ ...genForm, reason: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGenModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                  >
                    {isGenerating ? 'Generating...' : 'Create Access Key'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: KEY AUDIT TIMELINE */}
      {selectedKeyHistory && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Key History &amp; Timeline</h3>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs font-mono text-emerald-400 font-bold">{selectedKeyHistory.keyCode}</code>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    selectedKeyHistory.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' :
                    selectedKeyHistory.status === 'BLOCKED' ? 'bg-rose-500/20 text-rose-300' :
                    selectedKeyHistory.status === 'EXPIRED' ? 'bg-slate-800 text-slate-400' :
                    'bg-amber-500/20 text-amber-300'
                  }`}>
                    {selectedKeyHistory.status}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedKeyHistory(null)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            {/* Quick Actions inside history modal */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-slate-400 font-medium">Manage this Key:</span>
              <div className="flex items-center gap-2">
                {selectedKeyHistory.status === 'BLOCKED' ? (
                  <button
                    onClick={() => {
                      const code = selectedKeyHistory.keyCode;
                      setSelectedKeyHistory(null);
                      handleUnblockKey(code);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Unlock className="w-3 h-3" />
                    Unblock
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const code = selectedKeyHistory.keyCode;
                      setSelectedKeyHistory(null);
                      handleBlockKey(code);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Lock className="w-3 h-3" />
                    Block Key
                  </button>
                )}
                <button
                  onClick={() => {
                    const code = selectedKeyHistory.keyCode;
                    setSelectedKeyHistory(null);
                    handleResetSession(code);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset Session
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {selectedKeyHistory.history?.map((h, i) => (
                <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">{h.action}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(h.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-slate-300">{h.details}</div>
                  <div className="text-[10px] text-slate-500">Actor: {h.actor}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* IN-UI ACTION CONFIRMATION MODAL (Block, Unblock, Revoke, Reset, Reject) */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${
                  actionModal.type === 'block' || actionModal.type === 'revoke' || actionModal.type === 'reject-payment'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : actionModal.type === 'unblock'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {actionModal.type === 'block' && <Lock className="w-5 h-5" />}
                  {actionModal.type === 'unblock' && <Unlock className="w-5 h-5" />}
                  {actionModal.type === 'revoke' && <Slash className="w-5 h-5" />}
                  {actionModal.type === 'reset-session' && <RefreshCw className="w-5 h-5" />}
                  {actionModal.type === 'reject-payment' && <XCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{actionModal.title}</h3>
                  <div className="text-[11px] text-slate-400 font-mono">{actionModal.id}</div>
                </div>
              </div>
              <button
                onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                disabled={actionModal.isProcessing}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Description */}
            <p className="text-xs text-slate-300 leading-relaxed">
              {actionModal.description}
            </p>

            {/* Target identifier badge */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Target Identifier:</span>
              <code className="text-xs font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                {actionModal.id}
              </code>
            </div>

            {/* Optional Reason Field with Preset Chips */}
            {actionModal.requiresReason && (
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Reason for this action:
                </label>
                <input
                  type="text"
                  value={actionModal.reason}
                  onChange={(e) => setActionModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Enter reason or choose preset below..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  disabled={actionModal.isProcessing}
                />
                {actionModal.presetReasons && actionModal.presetReasons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {actionModal.presetReasons.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActionModal(prev => ({ ...prev, reason: preset }))}
                        className={`text-[10px] px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                          actionModal.reason === preset
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Error Message if any */}
            {actionModal.errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{actionModal.errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                disabled={actionModal.isProcessing}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-action-modal"
                onClick={handleExecuteAction}
                disabled={actionModal.isProcessing}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  actionModal.type === 'block' || actionModal.type === 'revoke' || actionModal.type === 'reject-payment'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
                    : actionModal.type === 'unblock'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/50'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/50'
                }`}
              >
                {actionModal.isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    {actionModal.type === 'block' && <Lock className="w-3.5 h-3.5" />}
                    {actionModal.type === 'unblock' && <Unlock className="w-3.5 h-3.5" />}
                    {actionModal.type === 'revoke' && <Slash className="w-3.5 h-3.5" />}
                    {actionModal.type === 'reset-session' && <RefreshCw className="w-3.5 h-3.5" />}
                    {actionModal.type === 'reject-payment' && <XCircle className="w-3.5 h-3.5" />}
                    <span>
                      {actionModal.type === 'block' ? 'Confirm & Block' :
                       actionModal.type === 'unblock' ? 'Confirm & Unblock' :
                       actionModal.type === 'revoke' ? 'Confirm & Revoke' :
                       actionModal.type === 'reset-session' ? 'Reset Sessions' :
                       actionModal.type === 'reject-payment' ? 'Reject Submission' : 'Confirm'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: APPROVED PAYMENT SHARE PROMPT */}
      {paymentApprovedShare && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Payment Approved &amp; Key Generated</h3>
              </div>
              <button onClick={() => setPaymentApprovedShare(null)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>
            <p className="text-xs text-slate-300">
              Access key <strong className="font-mono text-emerald-400">{paymentApprovedShare.keyCode}</strong> has been issued for subscriber <span className="font-mono text-slate-200">{paymentApprovedShare.clientContact}</span>.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPaymentApprovedShare(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Dismiss
              </button>
              <a
                href={paymentApprovedShare.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setPaymentApprovedShare(null)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                <MessageSquare className="w-4 h-4" />
                Open WhatsApp &amp; Send Key
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
