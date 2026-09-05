import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  RefreshCw, 
  Search, 
  Inbox, 
  Star, 
  Clock, 
  FileText, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Reply, 
  Share2, 
  X, 
  ExternalLink,
  PlusCircle,
  Filter,
  Sparkles,
  ShieldCheck,
  UserCheck,
  LogOut,
  Tag,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithGoogleGmail, 
  getCachedGmailToken, 
  clearGmailToken,
  fetchGmailProfile, 
  fetchGmailLabels, 
  listGmailMessages, 
  getGmailMessage, 
  parseGmailMessage, 
  sendGmailEmail, 
  createGmailDraft, 
  trashGmailMessage, 
  markGmailAsRead,
  ParsedGmailMessage, 
  GmailProfile, 
  GmailLabel 
} from '../lib/gmail';
import { UserProfile } from '../types';

interface GmailTabProps {
  userProfile: UserProfile | null;
  language: 'en' | 'sw';
  theme: 'midnight' | 'high-contrast';
  displayDensity: 'comfortable' | 'compact';
}

export default function GmailTab({
  userProfile,
  language,
  theme,
  displayDensity
}: GmailTabProps) {
  // Authentication State
  const [accessToken, setAccessToken] = useState<string | null>(getCachedGmailToken());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Gmail Data State
  const [profile, setProfile] = useState<GmailProfile | null>(null);
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [messages, setMessages] = useState<ParsedGmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navigation & Filtering State
  const [selectedFolder, setSelectedFolder] = useState<string>('INBOX');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSearchTerm, setActiveSearchTerm] = useState<string>('');
  const [selectedMessage, setSelectedMessage] = useState<ParsedGmailMessage | null>(null);

  // Compose State
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('none');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // User Confirmation Dialog State (Mandatory for destructive/sending operations)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'send' | 'trash';
    payload: any;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: 'send',
    payload: null
  });

  // Pre-configured email templates tailored to Rafiki Predict
  const templates = [
    {
      id: 'support_receipt',
      title: language === 'en' ? 'Submit M-Pesa / Payment Proof to Customer Support' : 'Wasilisha Ushahidi wa Malipo ya M-Pesa kwa Msaada',
      to: 'rafikibc1000@gmail.com',
      subject: 'Rafiki Predict Payment Verification Reference',
      body: `Hello Rafiki Support Team,\n\nI have completed my VIP subscription payment. Here are my transaction details:\n\n- Payment Method: M-Pesa Till 6881472 (John Mushira) / Send Money 0716483642\n- Transaction Code / Reference: [ENTER CODE HERE]\n- Amount Paid: [ENTER AMOUNT, e.g. KES 500 / KES 1,000]\n- Registered Email: ${userProfile?.email || ''}\n\nPlease confirm and activate my VIP package access.\n\nThank you,\n${userProfile?.username || 'Rafiki Member'}`
    },
    {
      id: 'share_prediction',
      title: language === 'en' ? 'Share High-Confidence Prediction Slip with Friend' : 'Shirikisha Rafiki Utabiri Wenye Uhakika wa Juu',
      to: '',
      subject: '🔥 High-Value Football Prediction from Rafiki Predict',
      body: `Hey,\n\nCheck out today's top analytical prediction from Rafiki Predict AI:\n\n- Recommended Selection: Over 2.5 Goals / High-Value +EV Slip\n- AI Model Confidence: 88%+\n- Analysis Platform: https://rafiki-business-vercel-com.vercel.app/\n\nTake a look and let me know your thoughts!`
    },
    {
      id: 'vip_inquiry',
      title: language === 'en' ? 'Inquire About VIP Accumulators' : 'Ulizia Kuhusu Tiketi za VIP Accumulator',
      to: 'rafikibc1000@gmail.com',
      subject: 'VIP Accumulator Subscription Inquiry',
      body: `Hello,\n\nI am interested in joining the VIP Accumulator tier on Rafiki Predict. Could you provide more details regarding the daily odds selection, staking guidance, and weekend mega accas?\n\nBest regards,\n${userProfile?.username || 'Sports Enthusiast'}`
    }
  ];

  // Handle Google OAuth Sign-in
  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const result = await signInWithGoogleGmail();
      setAccessToken(result.accessToken);
      setActionSuccessMessage(language === 'en' ? 'Successfully connected to Gmail!' : 'Umefanikiwa kuunganisha Gmail!');
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Sign in error:', err);
      setAuthError(err.message || (language === 'en' ? 'Failed to sign in with Google' : 'Imeshindwa kuingia na Google'));
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Disconnect / Sign out of Gmail
  const handleDisconnect = () => {
    clearGmailToken();
    setAccessToken(null);
    setProfile(null);
    setMessages([]);
    setSelectedMessage(null);
  };

  // Load Gmail Profile, Labels, and Messages
  const loadGmailData = async (token: string, folder: string = selectedFolder, customQuery: string = activeSearchTerm) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Profile
      const prof = await fetchGmailProfile(token);
      setProfile(prof);

      // 2. Fetch Labels
      const lbls = await fetchGmailLabels(token);
      setLabels(lbls);

      // 3. Build query for messages
      let q = customQuery;
      let labelIds: string[] = [];

      if (!customQuery) {
        if (folder === 'INBOX') {
          labelIds = ['INBOX'];
        } else if (folder === 'UNREAD') {
          labelIds = ['UNREAD'];
        } else if (folder === 'SENT') {
          labelIds = ['SENT'];
        } else if (folder === 'STARRED') {
          labelIds = ['STARRED'];
        } else if (folder === 'DRAFT') {
          labelIds = ['DRAFT'];
        } else if (folder === 'SPORTS_PREDICTIONS') {
          q = 'rafiki OR prediction OR accumulator OR odds OR bet OR ticket';
        } else if (folder === 'SUPPORT_PAYMENTS') {
          q = 'rafikibc1000@gmail.com OR payment OR "M-Pesa" OR receipt';
        }
      }

      const listResult = await listGmailMessages(token, {
        query: q || undefined,
        labelIds: labelIds.length > 0 ? labelIds : undefined,
        maxResults: 15
      });

      if (!listResult.messages || listResult.messages.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      // 4. Fetch details in parallel for the first 15 messages
      const detailedMessages = await Promise.all(
        listResult.messages.map(async (msg) => {
          try {
            const raw = await getGmailMessage(token, msg.id);
            return parseGmailMessage(raw);
          } catch (err) {
            console.warn(`Failed to fetch message ${msg.id}:`, err);
            return null;
          }
        })
      );

      const validMessages = detailedMessages.filter((m): m is ParsedGmailMessage => m !== null);
      setMessages(validMessages);
    } catch (err: any) {
      console.error('Failed to load Gmail data:', err);
      if (err.message?.includes('401') || err.message?.includes('token')) {
        setError(language === 'en' ? 'Your Gmail session has expired. Please sign in again.' : 'Muda wa Gmail umekwisha. Tafadhali ingia tena.');
        setAccessToken(null);
        clearGmailToken();
      } else {
        setError(err.message || (language === 'en' ? 'Failed to fetch emails from Gmail' : 'Imeshindwa kupakia barua pepe'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial load when token changes
  useEffect(() => {
    if (accessToken) {
      loadGmailData(accessToken, selectedFolder, activeSearchTerm);
    }
  }, [accessToken, selectedFolder, activeSearchTerm]);

  // Handle Refresh
  const handleRefresh = async () => {
    if (!accessToken) return;
    setRefreshing(true);
    await loadGmailData(accessToken, selectedFolder, activeSearchTerm);
    setRefreshing(false);
  };

  // Handle Search Submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearchTerm(searchQuery.trim());
  };

  // Handle Template Selection in Compose Modal
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === 'none') return;
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl) {
      if (tmpl.to) setComposeTo(tmpl.to);
      setComposeSubject(tmpl.subject);
      setComposeBody(tmpl.body);
    }
  };

  // Trigger Send Confirmation Dialog (MANDATORY per Workspace Skill)
  const initiateSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim()) {
      alert(language === 'en' ? 'Please enter a recipient email address.' : 'Tafadhali weka barua pepe ya mpokeaji.');
      return;
    }
    if (!composeSubject.trim()) {
      alert(language === 'en' ? 'Please enter a subject.' : 'Tafadhali weka mada ya barua pepe.');
      return;
    }

    // Open mandatory confirmation dialog
    setConfirmDialog({
      isOpen: true,
      title: language === 'en' ? 'Confirm Sending Email' : 'Thibitisha Kutuma Barua Pepe',
      description: language === 'en'
        ? `Are you sure you want to send this email to ${composeTo}? This will deliver the message directly from your Gmail account.`
        : `Je, una uhakika unataka kutuma barua pepe hii kwa ${composeTo}? Ujumbe huu utatumwa moja kwa moja kutoka kwa akaunti yako ya Gmail.`,
      actionType: 'send',
      payload: {
        to: composeTo.trim(),
        subject: composeSubject.trim(),
        body: composeBody
      }
    });
  };

  // Trigger Trash Confirmation Dialog (MANDATORY per Workspace Skill)
  const initiateTrashMessage = (msg: ParsedGmailMessage) => {
    setConfirmDialog({
      isOpen: true,
      title: language === 'en' ? 'Move Email to Trash?' : 'Tupa Barua Pepe Kwenye Tupio?',
      description: language === 'en'
        ? `Are you sure you want to move "${msg.subject}" to your Gmail Trash folder?`
        : `Je, una uhakika unataka kuhamisha "${msg.subject}" kwenye tupio la Gmail?`,
      actionType: 'trash',
      payload: msg
    });
  };

  // Execute Confirmed Operation
  const executeConfirmedAction = async () => {
    if (!accessToken) return;
    const { actionType, payload } = confirmDialog;
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));

    if (actionType === 'send') {
      setSendingEmail(true);
      try {
        await sendGmailEmail(accessToken, {
          to: payload.to,
          subject: payload.subject,
          body: payload.body
        });

        setActionSuccessMessage(language === 'en' ? 'Email sent successfully via Gmail!' : 'Barua pepe imetumwa kikamilifu kupitia Gmail!');
        setShowCompose(false);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        setSelectedTemplate('none');
        setTimeout(() => setActionSuccessMessage(null), 5000);
        
        // Refresh list
        handleRefresh();
      } catch (err: any) {
        console.error('Send email error:', err);
        alert(language === 'en' ? `Failed to send email: ${err.message}` : `Imeshindwa kutuma barua pepe: ${err.message}`);
      } finally {
        setSendingEmail(false);
      }
    } else if (actionType === 'trash') {
      try {
        await trashGmailMessage(accessToken, payload.id);
        setMessages(prev => prev.filter(m => m.id !== payload.id));
        if (selectedMessage?.id === payload.id) {
          setSelectedMessage(null);
        }
        setActionSuccessMessage(language === 'en' ? 'Message moved to Trash.' : 'Ujumbe umehamishwa kwenye tupio.');
        setTimeout(() => setActionSuccessMessage(null), 4000);
      } catch (err: any) {
        console.error('Trash error:', err);
        alert(language === 'en' ? `Failed to move message: ${err.message}` : `Imeshindwa kufuta: ${err.message}`);
      }
    }
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!accessToken) return;
    if (!composeTo && !composeSubject && !composeBody) return;

    try {
      await createGmailDraft(accessToken, {
        to: composeTo.trim(),
        subject: composeSubject.trim() || '(Draft)',
        body: composeBody
      });
      setActionSuccessMessage(language === 'en' ? 'Draft saved to Gmail.' : 'Rasimu imehifadhiwa kwenye Gmail.');
      setShowCompose(false);
      setTimeout(() => setActionSuccessMessage(null), 4000);
      handleRefresh();
    } catch (err: any) {
      console.error('Draft error:', err);
      alert(language === 'en' ? `Failed to save draft: ${err.message}` : `Imeshindwa kuhifadhi rasimu: ${err.message}`);
    }
  };

  // Handle Clicking a message to open detail view
  const handleSelectMessage = (msg: ParsedGmailMessage) => {
    setSelectedMessage(msg);
    // Mark as read in background if unread
    if (msg.isUnread && accessToken) {
      markGmailAsRead(accessToken, msg.id).catch(e => console.warn('Mark read error:', e));
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isUnread: false } : m));
    }
  };

  // Reply to sender
  const handleReplyToMessage = (msg: ParsedGmailMessage) => {
    setComposeTo(msg.from.replace(/.*<(.+)>/, '$1') || msg.from);
    setComposeSubject(msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`);
    setComposeBody(`\n\n--- On ${msg.date}, ${msg.from} wrote ---\n> ${msg.bodyText.replace(/\n/g, '\n> ')}`);
    setShowCompose(true);
    setSelectedMessage(null);
  };

  // Render Not Signed In state with official Google Sign In button
  if (!accessToken) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Banner */}
        <div className={`p-6 sm:p-8 rounded-3xl border transition-all ${theme === 'high-contrast' ? 'bg-white border-slate-200 shadow-sm text-slate-900' : 'bg-zinc-900/60 border-zinc-800 text-white'}`}>
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-xs font-mono font-bold">
              <Mail className="w-3.5 h-3.5 text-red-500" />
              <span>Google Workspace • Gmail Integration</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-sans font-black tracking-tight">
              {language === 'en' ? 'Connect Gmail to Rafiki Predict' : 'Unganisha Gmail kwenye Rafiki Predict'}
            </h2>

            <p className="text-sm text-gray-400 leading-relaxed">
              {language === 'en'
                ? 'Sign in with your Google account with permission to access your Gmail inbox directly inside Rafiki Predict. Read incoming messages, send sports prediction tips, and quickly email transaction receipts to customer support.'
                : 'Ingia na akaunti yako ya Google kwa ruhusa ya kufikia kisanduku chako cha barua pepe cha Gmail ndani ya Rafiki Predict. Soma barua pepe, tuma vidokezo vya utabiri, na tuma risiti za malipo kwa huduma ya wateja.'}
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className={`p-3.5 rounded-2xl border ${theme === 'high-contrast' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-zinc-950/70 border-zinc-850 text-gray-300'}`}>
                <div className="flex items-center gap-2 text-xs font-bold mb-1">
                  <Inbox className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'en' ? 'Read Inbox Messages' : 'Soma Barua Pepe'}</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  {language === 'en' ? 'View real-time email threads, alerts, and payment receipts directly.' : 'Angalia barua pepe na risiti za malipo moja kwa moja.'}
                </p>
              </div>

              <div className={`p-3.5 rounded-2xl border ${theme === 'high-contrast' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-zinc-950/70 border-zinc-850 text-gray-300'}`}>
                <div className="flex items-center gap-2 text-xs font-bold mb-1">
                  <Send className="w-4 h-4 text-blue-400" />
                  <span>{language === 'en' ? 'Send & Share Predictions' : 'Tuma & Shirikisha Utabiri'}</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  {language === 'en' ? 'Email winning acca slips to friends with 1-click templates.' : 'Tuma mikeka ya ushindi kwa marafiki kupitia miundo rahisi.'}
                </p>
              </div>

              <div className={`p-3.5 rounded-2xl border ${theme === 'high-contrast' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-zinc-950/70 border-zinc-850 text-gray-300'}`}>
                <div className="flex items-center gap-2 text-xs font-bold mb-1">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>{language === 'en' ? 'Secure OAuth Authorization' : 'Idhini Salama ya OAuth'}</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  {language === 'en' ? 'Tokens stored in-memory. Clear confirmation on every send operation.' : 'Usalama wa hali ya juu na uthibitisho kabla ya kutuma.'}
                </p>
              </div>
            </div>

            {authError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3.5 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Official Google Sign-In Button as mandated in Workspace Skill */}
            <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={isAuthenticating}
                className="gsi-material-button cursor-pointer transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #747775',
                  borderRadius: '12px',
                  boxSizing: 'border-box',
                  color: '#1f1f1f',
                  cursor: 'pointer',
                  fontFamily: "'Google Sans', Roboto, sans-serif",
                  fontSize: '14px',
                  fontWeight: 500,
                  height: '44px',
                  letterSpacing: '0.25px',
                  outline: 'none',
                  overflow: 'hidden',
                  padding: '0 16px',
                  position: 'relative',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  whiteSpace: 'nowrap',
                  width: 'auto',
                  maxWidth: '320px',
                  minWidth: 'min-content'
                }}
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper flex items-center justify-center gap-3">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '20px', height: '20px' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents font-semibold text-slate-800">
                    {isAuthenticating 
                      ? (language === 'en' ? 'Connecting to Gmail...' : 'Inaunganisha Gmail...')
                      : (language === 'en' ? 'Sign in with Google' : 'Ingia na Google')}
                  </span>
                </div>
              </button>

              <span className="text-xs text-gray-500 font-mono">
                {language === 'en' ? 'Requires Gmail permissions to view and send messages.' : 'Inahitaji ruhusa ya Gmail kuangalia na kutuma barua pepe.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {actionSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-2xl flex items-center justify-between text-xs font-semibold"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{actionSuccessMessage}</span>
            </div>
            <button onClick={() => setActionSuccessMessage(null)} className="text-gray-400 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Gmail Control Bar & Profile Card */}
      <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${theme === 'high-contrast' ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-zinc-900/60 border-zinc-800 text-white'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-sans">
                  {language === 'en' ? 'Gmail Inbox & Workspace' : 'Kisanduku cha Gmail & Workspace'}
                </h3>
                <span className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                  Connected
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono">
                {profile?.emailAddress || userProfile?.email || 'Authenticated User'} 
                {profile?.messagesTotal ? ` • ${profile.messagesTotal.toLocaleString()} total messages` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setShowCompose(true);
                setSelectedTemplate('none');
              }}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-all shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)] cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{language === 'en' ? 'Compose Email' : 'Andika Barua'}</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                theme === 'high-contrast' ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-zinc-800 border-zinc-700 text-gray-300 hover:text-white'
              }`}
              title="Refresh messages"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing || loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              onClick={handleDisconnect}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                theme === 'high-contrast' ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' : 'bg-rose-950/20 border-rose-900/30 text-rose-400 hover:bg-rose-950/40'
              }`}
              title="Disconnect Gmail session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Disconnect' : 'Ondoa'}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={language === 'en' ? 'Search emails (e.g. from:support, prediction, ticket, subject:odds)...' : 'Tafuta barua pepe (mfano: kutoka:support, utabiri, risiti)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border transition-colors outline-none ${
                theme === 'high-contrast'
                  ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                  : 'bg-zinc-950 border-zinc-800 text-white focus:border-emerald-500'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveSearchTerm('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer"
          >
            {language === 'en' ? 'Search' : 'Tafuta'}
          </button>
        </form>

        {/* Folder & Category Pills */}
        <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-zinc-800/60">
          {[
            { id: 'INBOX', label: language === 'en' ? 'Inbox' : 'Kipokezi', icon: Inbox },
            { id: 'UNREAD', label: language === 'en' ? 'Unread' : 'Isiyosomwa', icon: AlertCircle },
            { id: 'SENT', label: language === 'en' ? 'Sent' : 'Zilizotumwa', icon: Send },
            { id: 'STARRED', label: language === 'en' ? 'Starred' : 'Zilizowekwa Nyota', icon: Star },
            { id: 'DRAFT', label: language === 'en' ? 'Drafts' : 'Rasimu', icon: FileText },
            { id: 'SPORTS_PREDICTIONS', label: language === 'en' ? '⚽ Sports Predictions' : '⚽ Utabiri wa Michezo', icon: Sparkles },
            { id: 'SUPPORT_PAYMENTS', label: language === 'en' ? '💳 Support & Payments' : '💳 Msaada & Malipo', icon: ShieldCheck }
          ].map(folder => {
            const Icon = folder.icon;
            const isSelected = selectedFolder === folder.id && !activeSearchTerm;
            return (
              <button
                key={folder.id}
                onClick={() => {
                  setSelectedFolder(folder.id);
                  setActiveSearchTerm('');
                  setSearchQuery('');
                  setSelectedMessage(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold shadow-sm'
                    : theme === 'high-contrast'
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                    : 'bg-zinc-950/60 hover:bg-zinc-900 border-zinc-800 text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{folder.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => accessToken && loadGmailData(accessToken)}
            className="px-3 py-1 bg-red-950/40 hover:bg-red-950/60 border border-red-900/40 rounded-lg text-white font-semibold cursor-pointer"
          >
            {language === 'en' ? 'Retry' : 'Jaribu Tena'}
          </button>
        </div>
      )}

      {/* Message List or Detail View */}
      {selectedMessage ? (
        /* Message Reading Pane */
        <div className={`p-6 rounded-3xl border transition-all ${theme === 'high-contrast' ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-zinc-900/60 border-zinc-800 text-white'}`}>
          {/* Header Navigation */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 gap-3">
            <button
              onClick={() => setSelectedMessage(null)}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl border border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Back to Inbox' : 'Rudi Nyuma'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleReplyToMessage(selectedMessage)}
                className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'Reply' : 'Jibu'}</span>
              </button>

              <button
                onClick={() => initiateTrashMessage(selectedMessage)}
                className="p-2 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-400 rounded-xl transition-colors cursor-pointer"
                title="Move to Trash"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Email Subject & Metadata */}
          <div className="py-4 space-y-3">
            <h2 className="text-xl font-bold font-sans tracking-tight">
              {selectedMessage.subject}
            </h2>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
              <div className="space-y-0.5">
                <div className="text-white font-medium">
                  <span className="text-gray-500 font-mono mr-1">From:</span> {selectedMessage.from}
                </div>
                {selectedMessage.to && (
                  <div>
                    <span className="text-gray-500 font-mono mr-1">To:</span> {selectedMessage.to}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{selectedMessage.date}</span>
              </div>
            </div>

            {/* Labels Tags */}
            {selectedMessage.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedMessage.labels.map(lbl => (
                  <span key={lbl} className="text-[10px] font-mono px-2 py-0.5 bg-zinc-800 text-gray-300 rounded-md border border-zinc-700">
                    {lbl}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Email Body Content */}
          <div className="mt-4 pt-4 border-t border-zinc-800/80">
            {selectedMessage.bodyHtml ? (
              <div 
                className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed overflow-x-auto p-4 bg-zinc-950/50 rounded-2xl border border-zinc-850"
                dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }}
              />
            ) : (
              <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-gray-300 leading-relaxed p-4 bg-zinc-950/50 rounded-2xl border border-zinc-850">
                {selectedMessage.bodyText}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Messages Table / List */
        <div className={`rounded-3xl border overflow-hidden transition-all ${theme === 'high-contrast' ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900/60 border-zinc-800'}`}>
          {loading ? (
            <div className="py-20 text-center space-y-3 font-mono text-xs text-gray-400">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto"></div>
              <span>{language === 'en' ? 'Synchronizing Gmail mailbox...' : 'Inasawazisha kisanduku cha Gmail...'}</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="py-16 text-center space-y-3 p-6">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center text-gray-400 mx-auto">
                <Inbox className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">
                {language === 'en' ? 'No emails found' : 'Hakuna barua pepe zilizopatikana'}
              </h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {activeSearchTerm 
                  ? (language === 'en' ? `No messages matched query "${activeSearchTerm}". Try broadening your search.` : `Hakuna matokeo ya utafutaji wa "${activeSearchTerm}".`)
                  : (language === 'en' ? 'Your selected folder is currently empty.' : 'Folda uliyochagua kwa sasa haina barua pepe.')}
              </p>
              <button
                onClick={() => {
                  setShowCompose(true);
                  setSelectedTemplate('none');
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer mt-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{language === 'en' ? 'Compose New Email' : 'Andika Barua Mpya'}</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleSelectMessage(msg)}
                  className={`p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                    msg.isUnread
                      ? (theme === 'high-contrast' ? 'bg-emerald-50/70 hover:bg-emerald-100/70' : 'bg-emerald-950/15 hover:bg-emerald-950/25')
                      : (theme === 'high-contrast' ? 'hover:bg-slate-50' : 'hover:bg-zinc-850/60')
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    {/* Unread dot / Star */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5 sm:pt-0">
                      {msg.isUnread ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" title="Unread" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-transparent" />
                      )}
                      {msg.isStarred && (
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs truncate ${msg.isUnread ? 'font-bold text-white' : 'font-semibold text-gray-300'}`}>
                          {msg.from.replace(/<.*>/, '').trim() || msg.from}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2 text-xs truncate">
                        <span className={`truncate ${msg.isUnread ? 'font-bold text-white' : 'text-gray-200'}`}>
                          {msg.subject}
                        </span>
                        <span className="text-gray-500 text-[11px] truncate hidden md:inline">
                          — {msg.snippet}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Date & Quick Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 text-xs font-mono text-gray-400">
                    <span className="text-[11px]">{msg.date}</span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          initiateTrashMessage(msg);
                        }}
                        className="p-1.5 hover:bg-rose-950/40 text-gray-400 hover:text-rose-400 rounded-lg transition-colors"
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMPOSE EMAIL MODAL */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCompose(false)} />
          
          <div className={`relative z-10 w-full max-w-2xl rounded-3xl border overflow-hidden p-6 shadow-2xl space-y-5 ${theme === 'high-contrast' ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-white'}`}>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400" />
                <h4 className="text-base font-bold font-sans">
                  {language === 'en' ? 'Compose Gmail Message' : 'Andika Barua Pepe'}
                </h4>
              </div>
              <button onClick={() => setShowCompose(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Template Selector */}
            <div className="bg-zinc-950/80 border border-zinc-850 p-3 rounded-2xl space-y-2">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>{language === 'en' ? 'Quick 1-Click Templates' : 'Miundo ya Haraka'}</span>
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
              >
                <option value="none">{language === 'en' ? '— Custom Blank Message —' : '— Ujumbe Mtupu —'}</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            {/* Email Form */}
            <form onSubmit={initiateSendEmail} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 mb-1">
                  {language === 'en' ? 'To (Recipient Email)' : 'Kwenda Kwa (Barua Pepe)'}
                </label>
                <input
                  type="email"
                  required
                  placeholder="recipient@example.com"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 mb-1">
                  {language === 'en' ? 'Subject' : 'Mada'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'en' ? 'e.g. VIP Subscription Receipt / Prediction Slip' : 'mfano: Risiti ya Malipo ya VIP'}
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 mb-1">
                  {language === 'en' ? 'Message Body' : 'Ujumbe'}
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder={language === 'en' ? 'Write your message here...' : 'Andika ujumbe wako hapa...'}
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl p-3.5 text-xs text-white outline-none font-sans leading-relaxed resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Save as Draft' : 'Hifadhi kama Rasimu'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCompose(false)}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    {language === 'en' ? 'Cancel' : 'Ghairi'}
                  </button>

                  <button
                    type="submit"
                    disabled={sendingEmail}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-all shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)] cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{sendingEmail ? (language === 'en' ? 'Sending...' : 'Inatuma...') : (language === 'en' ? 'Send Email' : 'Tuma Barua Pepe')}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION DIALOG (Per Workspace Skill) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} />
          
          <div className={`relative z-10 w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 ${theme === 'high-contrast' ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-white'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${confirmDialog.actionType === 'send' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                {confirmDialog.actionType === 'send' ? <Send className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-base font-bold font-sans">{confirmDialog.title}</h4>
                <span className="text-[10px] font-mono text-gray-400">User Confirmation Required</span>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              {confirmDialog.description}
            </p>

            {confirmDialog.actionType === 'send' && confirmDialog.payload && (
              <div className="p-3 bg-zinc-950/80 border border-zinc-850 rounded-xl space-y-1 text-xs">
                <div className="text-gray-400"><strong className="text-white">To:</strong> {confirmDialog.payload.to}</div>
                <div className="text-gray-400"><strong className="text-white">Subject:</strong> {confirmDialog.payload.subject}</div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                {language === 'en' ? 'Cancel' : 'Ghairi'}
              </button>

              <button
                type="button"
                onClick={executeConfirmedAction}
                className={`px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  confirmDialog.actionType === 'send'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg'
                    : 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg'
                }`}
              >
                {confirmDialog.actionType === 'send'
                  ? (language === 'en' ? 'Yes, Send Email' : 'Ndio, Tuma Sasa')
                  : (language === 'en' ? 'Yes, Move to Trash' : 'Ndio, Futa')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
