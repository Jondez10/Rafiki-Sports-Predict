import crypto from 'crypto';
import { 
  SubscriptionPlan, 
  AccessKey, 
  AccessKeyStatus, 
  AccessSession, 
  KeyAuditLog, 
  AccountlessPaymentSubmission 
} from '../types.js';

// Default Subscription Packages
export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan_1day',
    name: '1 Day Daily Pass',
    durationDays: 1,
    durationHours: 24,
    priceKES: 250,
    currencyPrices: {
      KES: 250,
      USD: 2.5,
      EUR: 2.3,
      GBP: 1.8,
      NGN: 3800,
      GHS: 38,
      ZAR: 45,
      UGX: 9000,
      TZS: 6500
    },
    description: 'Instant 24-hour full access to today\'s high-confidence AI predictions and accumulator tips.',
    features: [
      'All Daily High-Confidence Picks (80%+)',
      'Verified Poisson & Ensemble AI Analysis',
      'Daily Top-Trending Picks & Accas',
      'Accountless Instant Key Activation',
      'Valid for 24 Hours from Activation'
    ],
    badge: 'Quick Access',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'plan_7days',
    name: '7 Days VIP Pass',
    durationDays: 7,
    durationHours: 168,
    priceKES: 1200,
    currencyPrices: {
      KES: 1200,
      USD: 10,
      EUR: 9.5,
      GBP: 8.5,
      NGN: 15000,
      GHS: 150,
      ZAR: 180,
      UGX: 36000,
      TZS: 26000
    },
    description: 'Full week of uninterrupted AI predictions, weekend mega accas, and statistical insights.',
    features: [
      '7 Days Uninterrupted VIP Access',
      'Weekend Multi-Bet Accumulators',
      'Full Mathematical Edge Breakdown',
      'Daily Quiz AI Bonus Predictions',
      'Dedicated WhatsApp Priority Support'
    ],
    isPopular: true,
    discountPct: 30,
    badge: 'Most Popular',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'plan_30days',
    name: '30 Days Pro Elite',
    durationDays: 30,
    durationHours: 720,
    priceKES: 3500,
    currencyPrices: {
      KES: 3500,
      USD: 28,
      EUR: 26,
      GBP: 23,
      NGN: 42000,
      GHS: 420,
      ZAR: 500,
      UGX: 100000,
      TZS: 72000
    },
    description: 'A full month of disciplined value betting, portfolio bankroll guidance, and premium consensus picks.',
    features: [
      'Full 30-Day VIP Pro Access',
      'High-Yield Value Bets & Bankroll Tips',
      'Exclusive VIP Golden Ticket Accas',
      'Live Match Insights & Movement Alerts',
      'VIP Betting Buddy AI Queries'
    ],
    discountPct: 53,
    badge: 'Maximum Value',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'plan_90days',
    name: '90 Days Master VIP',
    durationDays: 90,
    durationHours: 2160,
    priceKES: 8000,
    currencyPrices: {
      KES: 8000,
      USD: 65,
      EUR: 60,
      GBP: 52,
      NGN: 98000,
      GHS: 980,
      ZAR: 1150,
      UGX: 230000,
      TZS: 170000
    },
    description: 'Quarterly champion pass for serious investors seeking long-term statistical sports profits.',
    features: [
      'Full 90-Day All-Access Master VIP',
      'All Football, Basketball & Tennis Picks',
      'Long-Term Value Betting Model & Strategy',
      'Dedicated 1-on-1 Portfolio Assistance',
      'Lifetime VIP Group Priority Perks'
    ],
    discountPct: 65,
    badge: 'Investor Choice',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// In-memory runtime state for instant sub-millisecond response & graceful fallback
const plansStore = new Map<string, SubscriptionPlan>();
const keysStore = new Map<string, AccessKey>();
const sessionsStore = new Map<string, AccessSession>();
const paymentsStore = new Map<string, AccountlessPaymentSubmission>();
const auditLogsStore: KeyAuditLog[] = [];

let firestoreDb: any = null;
let firestoreDisabled = false;

function handleFirestoreError(context: string, err: any) {
  const isPermDenied = err?.code === 7 || 
    err?.code === 'PERMISSION_DENIED' || 
    err?.details?.includes('PERMISSION_DENIED') ||
    err?.message?.includes('PERMISSION_DENIED') ||
    err?.message?.includes('Permission denied') ||
    err?.message?.includes('7 PERMISSION_DENIED');

  if (isPermDenied) {
    if (!firestoreDisabled) {
      firestoreDisabled = true;
      firestoreDb = null;
      console.info(`[AccessKeyEngine] Firestore cloud sync bypassed (permission restricted in container). Running in high-performance in-memory mode.`);
    }
  } else {
    console.warn(`[AccessKeyEngine] ${context} notice:`, err?.message || err);
  }
}

/**
 * Generate a cryptographically secure, unguessable, human-friendly access key
 * Example format: PP-9X7K-42LM-Q82F
 */
export function generateSecureAccessKey(): string {
  // Characters excluding ambiguous ones: 0, O, 1, I, L
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let segment1 = '';
  let segment2 = '';
  let segment3 = '';

  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 4; i++) {
    segment1 += chars[bytes[i] % chars.length];
    segment2 += chars[bytes[i + 4] % chars.length];
    segment3 += chars[bytes[i + 8] % chars.length];
  }

  return `PP-${segment1}-${segment2}-${segment3}`;
}

/**
 * Hash key for secure storage & verification
 */
export function hashAccessKey(keyCode: string): string {
  return crypto.createHash('sha256').update(keyCode.trim().toUpperCase()).digest('hex');
}

/**
 * Record an audit log entry
 */
export async function logKeyAuditEvent(
  action: string,
  actor: string,
  details: string,
  keyId?: string,
  keyCode?: string,
  paymentRef?: string
): Promise<KeyAuditLog> {
  const entry: KeyAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    action,
    actor,
    keyId,
    keyCode,
    paymentRef,
    details
  };

  auditLogsStore.unshift(entry);
  if (auditLogsStore.length > 500) {
    auditLogsStore.pop();
  }

  if (firestoreDb && !firestoreDisabled) {
    try {
      await firestoreDb.collection('key_audit_logs').doc(entry.id).set(entry);
    } catch (err) {
      handleFirestoreError('Audit Log write', err);
    }
  }

  return entry;
}

/**
 * Initialize Access Key Engine from database or seed defaults
 */
export async function initAccessKeyEngine(db: any) {
  firestoreDb = db;

  // 1. Initialize Plans
  DEFAULT_PLANS.forEach(p => plansStore.set(p.id, p));

  if (firestoreDb && !firestoreDisabled) {
    try {
      const plansSnap = await firestoreDb.collection('subscription_plans').get();
      if (!plansSnap.empty) {
        plansSnap.forEach((docSnap: any) => {
          const plan = docSnap.data() as SubscriptionPlan;
          plansStore.set(plan.id, plan);
        });
      } else {
        // Seed default plans into Firestore
        for (const plan of DEFAULT_PLANS) {
          await firestoreDb.collection('subscription_plans').doc(plan.id).set(plan);
        }
        console.log(`✓ Seeded ${DEFAULT_PLANS.length} default subscription packages to Firestore`);
      }

      // 2. Load Existing Access Keys
      const keysSnap = await firestoreDb.collection('access_keys').limit(200).get();
      if (!keysSnap.empty) {
        keysSnap.forEach((docSnap: any) => {
          const key = docSnap.data() as AccessKey;
          keysStore.set(key.id, key);
          keysStore.set(key.keyCode.toUpperCase().trim(), key);
        });
        console.log(`✓ Loaded ${keysSnap.size} access keys from Firestore`);
      }

      // 3. Load Payments
      const paySnap = await firestoreDb.collection('accountless_payments').limit(100).get();
      if (!paySnap.empty) {
        paySnap.forEach((docSnap: any) => {
          const pay = docSnap.data() as AccountlessPaymentSubmission;
          paymentsStore.set(pay.id, pay);
          if (pay.reference) {
            paymentsStore.set(pay.reference.toUpperCase().trim(), pay);
          }
        });
      }

      // 4. Load Audit Logs
      const auditSnap = await firestoreDb.collection('key_audit_logs').orderBy('timestamp', 'desc').limit(100).get();
      if (!auditSnap.empty) {
        auditSnap.forEach((docSnap: any) => {
          auditLogsStore.push(docSnap.data() as KeyAuditLog);
        });
      }
    } catch (err) {
      handleFirestoreError('Access Key Engine Firestore init', err);
    }
  }

  // Pre-seed a demonstrative active test key if empty
  if (keysStore.size === 0) {
    const demoKey = createKeyRecord({
      planId: 'plan_7days',
      price: 1200,
      currency: 'KES',
      isComplimentary: true,
      complimentaryReason: 'Welcome VIP System Key',
      grantedBy: 'System Auto-Seed',
      adminNotes: 'Default active master pass'
    });
    // Pre-activate demo key
    demoKey.status = 'ACTIVE';
    demoKey.activatedAt = new Date().toISOString();
    demoKey.expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    keysStore.set(demoKey.id, demoKey);
    keysStore.set(demoKey.keyCode.toUpperCase().trim(), demoKey);
  }

  console.log('✓ Accountless Access Key Engine successfully initialized');
}

/**
 * Get all available subscription plans
 */
export function getAllPlans(includeInactive = false): SubscriptionPlan[] {
  const plans = Array.from(plansStore.values());
  if (includeInactive) return plans;
  return plans.filter(p => p.status === 'active');
}

/**
 * Save / update a subscription plan
 */
export async function savePlan(planData: Partial<SubscriptionPlan> & { id?: string }): Promise<SubscriptionPlan> {
  const planId = planData.id || `plan_${Date.now()}`;
  const existing = plansStore.get(planId);

  const updatedPlan: SubscriptionPlan = {
    id: planId,
    name: planData.name || existing?.name || 'Custom Plan',
    durationDays: planData.durationDays || existing?.durationDays || 1,
    durationHours: planData.durationHours || (planData.durationDays ? planData.durationDays * 24 : existing?.durationHours || 24),
    priceKES: planData.priceKES || existing?.priceKES || 250,
    currencyPrices: planData.currencyPrices || existing?.currencyPrices || {
      KES: planData.priceKES || 250,
      USD: Math.round(((planData.priceKES || 250) / 130) * 10) / 10
    },
    description: planData.description || existing?.description || '',
    features: planData.features || existing?.features || ['All High-Confidence AI Predictions'],
    isPopular: planData.isPopular ?? existing?.isPopular ?? false,
    discountPct: planData.discountPct ?? existing?.discountPct ?? 0,
    badge: planData.badge || existing?.badge || '',
    status: planData.status || existing?.status || 'active',
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  plansStore.set(planId, updatedPlan);

  if (firestoreDb && !firestoreDisabled) {
    try {
      await firestoreDb.collection('subscription_plans').doc(planId).set(updatedPlan);
    } catch (err) {
      handleFirestoreError('savePlan', err);
    }
  }

  await logKeyAuditEvent('PLAN_SAVED', 'Admin', `Plan ${updatedPlan.name} (${updatedPlan.id}) saved/updated`);
  return updatedPlan;
}

/**
 * Delete a plan
 */
export async function deletePlan(planId: string): Promise<boolean> {
  plansStore.delete(planId);
  if (firestoreDb && !firestoreDisabled) {
    try {
      await firestoreDb.collection('subscription_plans').doc(planId).delete();
    } catch (err) {
      handleFirestoreError('deletePlan', err);
    }
  }
  await logKeyAuditEvent('PLAN_DELETED', 'Admin', `Plan ${planId} deleted`);
  return true;
}

/**
 * Internal helper to create a structured Key record
 */
function createKeyRecord(params: {
  planId: string;
  price?: number;
  currency?: string;
  paymentReference?: string;
  paymentMethod?: string;
  clientContact?: string;
  isComplimentary?: boolean;
  complimentaryReason?: string;
  grantedBy?: string;
  adminNotes?: string;
  customDurationHours?: number;
}): AccessKey {
  const plan = plansStore.get(params.planId) || DEFAULT_PLANS[0];
  const durationHours = params.customDurationHours || plan.durationHours || plan.durationDays * 24;
  const durationDays = params.customDurationHours ? Math.round(params.customDurationHours / 24) : plan.durationDays;
  const keyCode = generateSecureAccessKey();
  const id = `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const keyHash = hashAccessKey(keyCode);

  const record: AccessKey = {
    id,
    keyCode,
    keyHash,
    subscriptionId: `sub_${Date.now()}`,
    planId: plan.id,
    planName: plan.name,
    durationDays,
    durationHours,
    price: params.price ?? plan.priceKES,
    currency: params.currency || 'KES',
    paymentReference: params.paymentReference || '',
    paymentMethod: params.paymentMethod || (params.isComplimentary ? 'Complimentary' : 'M-Pesa'),
    clientContact: params.clientContact || '',
    status: 'PENDING', // Will transition to ACTIVE upon user activation or admin auto-activate
    createdAt: new Date().toISOString(),
    isComplimentary: !!params.isComplimentary,
    complimentaryReason: params.complimentaryReason || '',
    grantedBy: params.grantedBy || 'System',
    adminNotes: params.adminNotes || '',
    history: [
      {
        timestamp: new Date().toISOString(),
        action: 'GENERATED',
        actor: params.grantedBy || 'System',
        details: `Key generated for ${plan.name} (${durationHours}h)`
      }
    ]
  };

  keysStore.set(id, record);
  keysStore.set(keyCode.toUpperCase().trim(), record);

  if (firestoreDb && !firestoreDisabled) {
    firestoreDb.collection('access_keys').doc(id).set(record).catch((err: any) => {
      handleFirestoreError('createKeyRecord', err);
    });
  }

  return record;
}

/**
 * Submit accountless payment
 */
export async function submitAccountlessPayment(data: {
  planId: string;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  phone?: string;
  email?: string;
}): Promise<AccountlessPaymentSubmission> {
  const plan = plansStore.get(data.planId) || DEFAULT_PLANS[0];
  const payId = `pay_acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const refClean = data.reference.toUpperCase().trim();

  const submission: AccountlessPaymentSubmission = {
    id: payId,
    planId: plan.id,
    planName: plan.name,
    durationDays: plan.durationDays,
    amount: Number(data.amount) || plan.priceKES,
    currency: data.currency || 'KES',
    method: data.method || 'M-Pesa',
    reference: refClean,
    phone: data.phone || '',
    email: data.email || '',
    status: 'PENDING',
    timestamp: new Date().toISOString()
  };

  paymentsStore.set(payId, submission);
  paymentsStore.set(refClean, submission);

  if (firestoreDb && !firestoreDisabled) {
    try {
      await firestoreDb.collection('accountless_payments').doc(payId).set(submission);
      
      // Also register into admin notifications for rapid visibility
      const adminNotifId = `admin-notif-${Date.now()}`;
      await firestoreDb.collection('admin_notifications').doc(adminNotifId).set({
        id: adminNotifId,
        userId: `guest_${refClean}`,
        userName: `Accountless (${data.phone || refClean})`,
        userEmail: data.email || 'guest@rafikipredict.com',
        userPhone: data.phone || 'N/A',
        selectedPlan: plan.name,
        amountPaid: Number(data.amount),
        currency: data.currency || 'KES',
        paymentMethod: data.method,
        transactionReference: refClean,
        paymentDateTime: submission.timestamp,
        paymentStatus: 'Pending Verification (Accountless Key)',
        whatsAppLink: `https://wa.me/254716483642?text=${encodeURIComponent(`*NEW PAYMENT VERIFICATION REQUEST*\nPlan: ${plan.name}\nAmount: ${data.amount} ${data.currency}\nRef: ${refClean}\nPhone: ${data.phone || 'N/A'}`)}`,
        timestamp: submission.timestamp
      });
    } catch (err) {
      handleFirestoreError('submitAccountlessPayment', err);
    }
  }

  await logKeyAuditEvent(
    'PAYMENT_SUBMITTED', 
    data.phone || 'Guest Client', 
    `Submitted payment ref ${refClean} for ${plan.name} (${data.amount} ${data.currency})`,
    undefined,
    undefined,
    refClean
  );

  return submission;
}

/**
 * Universal lookup for an accountless or registered payment submission
 * Matches by ID, Reference, uppercase, lowercase, in-memory Map, and Firestore collections.
 */
export async function lookupPaymentSubmission(paymentIdOrRef: string): Promise<AccountlessPaymentSubmission | null> {
  if (!paymentIdOrRef) return null;
  const raw = paymentIdOrRef.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  const lower = raw.toLowerCase();

  // 1. Check in-memory paymentsStore directly
  if (paymentsStore.has(raw)) return paymentsStore.get(raw)!;
  if (paymentsStore.has(upper)) return paymentsStore.get(upper)!;
  if (paymentsStore.has(lower)) return paymentsStore.get(lower)!;

  // 2. Iterate in-memory paymentsStore values to find matching ID or Reference
  for (const p of paymentsStore.values()) {
    if (
      p.id === raw ||
      p.id.toLowerCase() === lower ||
      p.id.toUpperCase() === upper ||
      (p.reference && (
        p.reference === raw ||
        p.reference.toUpperCase() === upper ||
        p.reference.toLowerCase() === lower
      ))
    ) {
      return p;
    }
  }

  // 3. Query Firestore 'accountless_payments'
  if (firestoreDb && !firestoreDisabled) {
    try {
      // By doc ID directly (raw, lowercase, uppercase)
      const docSnap = await firestoreDb.collection('accountless_payments').doc(raw).get();
      if (docSnap.exists) {
        const pay = docSnap.data() as AccountlessPaymentSubmission;
        paymentsStore.set(pay.id, pay);
        if (pay.reference) paymentsStore.set(pay.reference.toUpperCase().trim(), pay);
        return pay;
      }

      if (lower !== raw) {
        const lowerDoc = await firestoreDb.collection('accountless_payments').doc(lower).get();
        if (lowerDoc.exists) {
          const pay = lowerDoc.data() as AccountlessPaymentSubmission;
          paymentsStore.set(pay.id, pay);
          if (pay.reference) paymentsStore.set(pay.reference.toUpperCase().trim(), pay);
          return pay;
        }
      }

      // By reference field
      const refSnap = await firestoreDb.collection('accountless_payments')
        .where('reference', '==', upper)
        .limit(1)
        .get();
      if (!refSnap.empty) {
        const pay = refSnap.docs[0].data() as AccountlessPaymentSubmission;
        paymentsStore.set(pay.id, pay);
        if (pay.reference) paymentsStore.set(pay.reference.toUpperCase().trim(), pay);
        return pay;
      }

      const rawRefSnap = await firestoreDb.collection('accountless_payments')
        .where('reference', '==', raw)
        .limit(1)
        .get();
      if (!rawRefSnap.empty) {
        const pay = rawRefSnap.docs[0].data() as AccountlessPaymentSubmission;
        paymentsStore.set(pay.id, pay);
        if (pay.reference) paymentsStore.set(pay.reference.toUpperCase().trim(), pay);
        return pay;
      }

      const idSnap = await firestoreDb.collection('accountless_payments')
        .where('id', '==', raw)
        .limit(1)
        .get();
      if (!idSnap.empty) {
        const pay = idSnap.docs[0].data() as AccountlessPaymentSubmission;
        paymentsStore.set(pay.id, pay);
        if (pay.reference) paymentsStore.set(pay.reference.toUpperCase().trim(), pay);
        return pay;
      }

      // 4. Also check the 'payments' collection (from registered users or checkout simulation)
      const regDocSnap = await firestoreDb.collection('payments').doc(raw).get();
      if (regDocSnap.exists) {
        const data = regDocSnap.data() as any;
        const plan = plansStore.get(data.planId) || DEFAULT_PLANS[0];
        const adapted: AccountlessPaymentSubmission = {
          id: data.id || raw,
          planId: plan.id,
          planName: data.planName || plan.name,
          durationDays: plan.durationDays,
          amount: Number(data.amount) || plan.priceKES,
          currency: data.currency || 'KES',
          method: data.paymentMethod || 'M-Pesa Till',
          reference: data.transactionReference || data.reference || raw,
          phone: data.phone || '',
          email: data.email || '',
          status: (data.status === 'approved' || data.paymentStatus === 'approved') ? 'APPROVED' : 'PENDING',
          timestamp: data.timestamp || new Date().toISOString(),
          keyCode: data.keyCode
        };
        paymentsStore.set(adapted.id, adapted);
        paymentsStore.set(adapted.reference.toUpperCase().trim(), adapted);
        return adapted;
      }

      const regRefSnap = await firestoreDb.collection('payments')
        .where('transactionReference', '==', upper)
        .limit(1)
        .get();
      if (!regRefSnap.empty) {
        const data = regRefSnap.docs[0].data() as any;
        const plan = plansStore.get(data.planId) || DEFAULT_PLANS[0];
        const adapted: AccountlessPaymentSubmission = {
          id: data.id || raw,
          planId: plan.id,
          planName: data.planName || plan.name,
          durationDays: plan.durationDays,
          amount: Number(data.amount) || plan.priceKES,
          currency: data.currency || 'KES',
          method: data.paymentMethod || 'M-Pesa Till',
          reference: data.transactionReference || data.reference || upper,
          phone: data.phone || '',
          email: data.email || '',
          status: (data.status === 'approved' || data.paymentStatus === 'approved') ? 'APPROVED' : 'PENDING',
          timestamp: data.timestamp || new Date().toISOString(),
          keyCode: data.keyCode
        };
        paymentsStore.set(adapted.id, adapted);
        paymentsStore.set(adapted.reference.toUpperCase().trim(), adapted);
        return adapted;
      }
    } catch (err) {
      handleFirestoreError('lookupPaymentSubmission', err);
    }
  }

  return null;
}

/**
 * Check payment status by Reference or ID
 */
export async function getPaymentStatus(referenceOrId: string): Promise<AccountlessPaymentSubmission | null> {
  return lookupPaymentSubmission(referenceOrId);
}

/**
 * Approve payment & generate unique access key
 */
export async function approvePayment(paymentIdOrRef: string, adminActor = 'Admin'): Promise<{
  payment: AccountlessPaymentSubmission;
  accessKey: AccessKey;
  whatsAppShareText: string;
}> {
  let payment = await lookupPaymentSubmission(paymentIdOrRef);

  if (!payment) {
    const cleanRef = (paymentIdOrRef || '').trim();
    // If the administrator is approving a direct transaction reference or receipt
    // that was paid via Till 6881472 without submitting an upfront web form
    if (cleanRef.length >= 3) {
      const defaultPlan = DEFAULT_PLANS[0]; // Standard 1-Day Pass or plan
      payment = {
        id: `pay_acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        planId: defaultPlan.id,
        planName: defaultPlan.name,
        durationDays: defaultPlan.durationDays,
        amount: defaultPlan.priceKES,
        currency: 'KES',
        method: 'M-Pesa Buy Goods Till 6881472',
        reference: cleanRef.toUpperCase(),
        phone: '',
        email: '',
        status: 'PENDING',
        timestamp: new Date().toISOString()
      };
      paymentsStore.set(payment.id, payment);
      paymentsStore.set(payment.reference.toUpperCase(), payment);
    } else {
      throw new Error('Payment reference not found');
    }
  }

  // Create key
  const accessKey = createKeyRecord({
    planId: payment.planId,
    price: payment.amount,
    currency: payment.currency,
    paymentReference: payment.reference,
    paymentMethod: payment.method,
    clientContact: payment.phone || payment.email,
    grantedBy: adminActor,
    adminNotes: `Approved from payment ref ${payment.reference}`
  });

  // Update payment
  payment.status = 'APPROVED';
  payment.keyCode = accessKey.keyCode;
  payment.approvedAt = new Date().toISOString();
  payment.approvedBy = adminActor;

  paymentsStore.set(payment.id, payment);
  paymentsStore.set(payment.reference.toUpperCase().trim(), payment);

  if (firestoreDb && !firestoreDisabled) {
    try {
      await firestoreDb.collection('accountless_payments').doc(payment.id).set(payment, { merge: true });
      // If it originated from payments collection, update that too
      await firestoreDb.collection('payments').doc(payment.id).set({
        status: 'approved',
        paymentStatus: 'approved',
        keyCode: accessKey.keyCode,
        approvedAt: payment.approvedAt,
        approvedBy: adminActor
      }, { merge: true });
    } catch (err) {
      handleFirestoreError('approvePayment write', err);
    }
  }

  const whatsAppShareText = 
    `🏆 *RAFIKI PREDICT VIP ACCESS KEY* 🏆\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Karibu VIP! Malipo yako ya *${payment.amount} ${payment.currency}* yamethibitishwa.\n\n` +
    `🔑 *Access Key Yako*: *${accessKey.keyCode}*\n` +
    `📦 *Kifurushi*: ${payment.planName} (${payment.durationDays} Days)\n` +
    `⚡ *Jinsi ya Kutumia*:\n1. Fungua app ya Rafiki Predict\n2. Ingiza Access Key yako hapo juu\n3. Bofya "ACTIVATE ACCESS" kufungua utabiri wote wa VIP mara moja!\n\n` +
    `Asante kwa kujiunga na Rafiki Predict AI!`;

  await logKeyAuditEvent(
    'PAYMENT_APPROVED',
    adminActor,
    `Approved payment ${payment.reference}, generated key ${accessKey.keyCode}`,
    accessKey.id,
    accessKey.keyCode,
    payment.reference
  );

  return { payment, accessKey, whatsAppShareText };
}

/**
 * Reject payment
 */
export async function rejectPayment(paymentIdOrRef: string, reason: string, adminActor = 'Admin'): Promise<AccountlessPaymentSubmission> {
  const payment = await lookupPaymentSubmission(paymentIdOrRef);

  if (!payment) {
    throw new Error('Payment not found');
  }

  payment.status = 'REJECTED';
  payment.rejectionReason = reason;
  paymentsStore.set(payment.id, payment);
  paymentsStore.set(payment.reference.toUpperCase().trim(), payment);

  if (firestoreDb && !firestoreDisabled) {
    try {
      await firestoreDb.collection('accountless_payments').doc(payment.id).set(payment, { merge: true });
      await firestoreDb.collection('payments').doc(payment.id).set({
        status: 'rejected',
        paymentStatus: 'rejected',
        rejectionReason: reason
      }, { merge: true });
    } catch (err) {
      handleFirestoreError('rejectPayment write', err);
    }
  }

  await logKeyAuditEvent(
    'PAYMENT_REJECTED',
    adminActor,
    `Rejected payment ${payment.reference}. Reason: ${reason}`,
    undefined,
    undefined,
    payment.reference
  );

  return payment;
}

/**
 * Generate manual or complimentary key directly
 */
export async function generateAdminKey(params: {
  planId: string;
  isComplimentary?: boolean;
  complimentaryReason?: string;
  customDurationHours?: number;
  clientContact?: string;
  adminNotes?: string;
  adminActor?: string;
}): Promise<AccessKey> {
  const key = createKeyRecord({
    planId: params.planId,
    isComplimentary: params.isComplimentary,
    complimentaryReason: params.complimentaryReason,
    customDurationHours: params.customDurationHours,
    clientContact: params.clientContact,
    adminNotes: params.adminNotes,
    grantedBy: params.adminActor || 'Admin'
  });

  await logKeyAuditEvent(
    params.isComplimentary ? 'COMPLIMENTARY_KEY_GENERATED' : 'MANUAL_KEY_GENERATED',
    params.adminActor || 'Admin',
    `Generated ${params.isComplimentary ? 'Complimentary' : 'Manual'} key ${key.keyCode} (${key.planName}) for ${params.clientContact || 'Direct Client'}. Reason: ${params.complimentaryReason || 'Admin Action'}`,
    key.id,
    key.keyCode
  );

  return key;
}

/**
 * Lookup key by code or ID
 */
export async function lookupKey(keyCodeOrId: string): Promise<AccessKey | null> {
  const clean = keyCodeOrId.toUpperCase().trim();
  if (keysStore.has(clean)) {
    return keysStore.get(clean)!;
  }

  // Search by ID or formatted key
  for (const k of keysStore.values()) {
    if (k.id === keyCodeOrId || k.keyCode.toUpperCase().trim() === clean) {
      return k;
    }
  }

  if (firestoreDb && !firestoreDisabled) {
    try {
      const snap = await firestoreDb.collection('access_keys').where('keyCode', '==', clean).limit(1).get();
      if (!snap.empty) {
        const key = snap.docs[0].data() as AccessKey;
        keysStore.set(key.id, key);
        keysStore.set(clean, key);
        return key;
      }
    } catch (err) {
      handleFirestoreError('lookupKey', err);
    }
  }

  return null;
}

/**
 * Activate an Access Key (Strict Server-Side Expiration Math)
 */
export async function activateAccessKey(params: {
  keyCode: string;
  deviceFingerprint?: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<{
  success: boolean;
  message: string;
  session?: AccessSession;
  key?: AccessKey;
}> {
  const cleanCode = params.keyCode.toUpperCase().trim();
  const key = await lookupKey(cleanCode);

  if (!key) {
    return { success: false, message: 'Invalid Access Key. Please check the code and try again.' };
  }

  // Status checks
  if (key.status === 'BLOCKED') {
    return { success: false, message: 'This Access Key has been blocked due to security or policy restrictions.' };
  }
  if (key.status === 'REVOKED') {
    return { success: false, message: 'This Access Key has been permanently revoked.' };
  }
  if (key.status === 'SUSPENDED') {
    return { success: false, message: 'This Access Key is temporarily suspended. Please contact support.' };
  }

  const nowMs = Date.now();
  const plan = plansStore.get(key.planId) || DEFAULT_PLANS[0];
  const durationHours = key.durationHours || (key.durationDays * 24);

  // If already activated previously, check if expired
  if (key.activatedAt && key.expiresAt) {
    const expiryMs = new Date(key.expiresAt).getTime();
    if (nowMs >= expiryMs) {
      key.status = 'EXPIRED';
      key.history.push({
        timestamp: new Date().toISOString(),
        action: 'EXPIRED',
        actor: 'Server Expiry Monitor',
        details: 'Key reached expiration timestamp'
      });
      keysStore.set(key.id, key);
      keysStore.set(key.keyCode.toUpperCase().trim(), key);
      return { success: false, message: 'This Access Key has expired. Please choose a new subscription plan.' };
    }
  } else {
    // First time activation! Calculate exact server-side expiration
    const activatedAt = new Date(nowMs).toISOString();
    const expiresAt = new Date(nowMs + durationHours * 3600 * 1000).toISOString();

    key.status = 'ACTIVE';
    key.activatedAt = activatedAt;
    key.expiresAt = expiresAt;
    key.history.push({
      timestamp: activatedAt,
      action: 'ACTIVATED',
      actor: 'User Device',
      details: `First activation on ${params.userAgent || 'Web Browser'}. Expires ${expiresAt}`
    });
  }

  // Device Fingerprint Binding / Multi-Device Security Management
  const deviceFp = params.deviceFingerprint || `fp_${Math.random().toString(36).substring(2, 9)}`;
  if (key.deviceFingerprint && key.deviceFingerprint !== deviceFp) {
    // Device transfer detected: log event and gracefully bind new active device session
    key.history.push({
      timestamp: new Date().toISOString(),
      action: 'SESSION_RESET',
      actor: 'Security Controller',
      details: `Device transfer from ${key.deviceFingerprint} to ${deviceFp}`
    });
  }
  key.deviceFingerprint = deviceFp;
  key.lastActiveAt = new Date().toISOString();

  // Generate a cryptographically secure session token
  const sessionToken = `sess_${crypto.randomBytes(24).toString('hex')}`;
  key.activeSessionToken = sessionToken;
  key.sessionExpiresAt = key.expiresAt;

  const expiryMs = new Date(key.expiresAt!).getTime();
  const remainingSeconds = Math.max(0, Math.floor((expiryMs - nowMs) / 1000));

  const session: AccessSession = {
    token: sessionToken,
    keyId: key.id,
    keyCode: key.keyCode,
    planId: key.planId,
    planName: key.planName,
    status: key.status,
    activatedAt: key.activatedAt!,
    expiresAt: key.expiresAt!,
    remainingSeconds,
    deviceFingerprint: deviceFp,
    features: plan.features
  };

  sessionsStore.set(sessionToken, session);
  keysStore.set(key.id, key);
  keysStore.set(key.keyCode.toUpperCase().trim(), key);

  if (firestoreDb && !firestoreDisabled) {
    try {
      await firestoreDb.collection('access_keys').doc(key.id).set(key);
      await firestoreDb.collection('access_sessions').doc(sessionToken).set(session);
    } catch (err) {
      handleFirestoreError('activation write', err);
    }
  }

  await logKeyAuditEvent(
    'KEY_ACTIVATED',
    params.deviceFingerprint || 'Client Device',
    `Key ${key.keyCode} activated. Valid until ${key.expiresAt}`,
    key.id,
    key.keyCode
  );

  return {
    success: true,
    message: `VIP Access Activated successfully! Valid until ${new Date(key.expiresAt!).toLocaleString()}`,
    session,
    key
  };
}

/**
 * Verify Temporary Access Session Token (Strict Server-Side Validation)
 */
export async function verifyAccessSession(sessionToken: string, deviceFingerprint?: string): Promise<{
  valid: boolean;
  status: AccessKeyStatus | 'INVALID';
  session?: AccessSession;
  key?: AccessKey;
  message?: string;
}> {
  if (!sessionToken || !sessionToken.startsWith('sess_')) {
    return { valid: false, status: 'INVALID', message: 'Missing or malformed session token' };
  }

  let session = sessionsStore.get(sessionToken) || null;

  if (!session && firestoreDb && !firestoreDisabled) {
    try {
      const snap = await firestoreDb.collection('access_sessions').doc(sessionToken).get();
      if (snap.exists) {
        session = snap.data() as AccessSession;
        sessionsStore.set(sessionToken, session);
      }
    } catch (err) {
      handleFirestoreError('verifyAccessSession', err);
    }
  }

  if (!session) {
    return { valid: false, status: 'INVALID', message: 'Session token not found or revoked' };
  }

  const key = await lookupKey(session.keyCode);
  if (!key) {
    return { valid: false, status: 'INVALID', message: 'Associated Access Key not found' };
  }

  // Check admin overrides (Blocked, Revoked, Suspended)
  if (key.status === 'BLOCKED' || key.status === 'REVOKED' || key.status === 'SUSPENDED') {
    return { valid: false, status: key.status, message: `Access ${key.status.toLowerCase()}` };
  }

  const nowMs = Date.now();
  const expiryMs = new Date(key.expiresAt || session.expiresAt).getTime();

  // Automatic Server-Side Expiration Enforcer
  if (nowMs >= expiryMs) {
    key.status = 'EXPIRED';
    session.status = 'EXPIRED';
    session.remainingSeconds = 0;
    keysStore.set(key.id, key);
    keysStore.set(key.keyCode.toUpperCase().trim(), key);
    sessionsStore.delete(sessionToken);

    if (firestoreDb && !firestoreDisabled) {
      firestoreDb.collection('access_keys').doc(key.id).update({ status: 'EXPIRED' }).catch((err: any) => {
        handleFirestoreError('expireKey', err);
      });
      firestoreDb.collection('access_sessions').doc(sessionToken).delete().catch((err: any) => {
        handleFirestoreError('deleteSession', err);
      });
    }

    return {
      valid: false,
      status: 'EXPIRED',
      message: 'Subscription has expired. Please renew to continue accessing premium predictions.'
    };
  }

  // Calculate dynamic status (e.g. EXPIRING if < 6 hours left)
  const remainingSeconds = Math.max(0, Math.floor((expiryMs - nowMs) / 1000));
  const isExpiringSoon = remainingSeconds <= (6 * 3600); // 6 hours threshold
  const currentStatus: AccessKeyStatus = isExpiringSoon ? 'EXPIRING' : 'ACTIVE';

  session.status = currentStatus;
  session.remainingSeconds = remainingSeconds;

  return {
    valid: true,
    status: currentStatus,
    session,
    key
  };
}

/**
 * Admin Action: Block Key
 */
export async function blockKey(keyIdOrCode: string, reason: string, adminActor = 'Admin'): Promise<AccessKey> {
  const key = await lookupKey(keyIdOrCode);
  if (!key) throw new Error('Key not found');

  key.status = 'BLOCKED';
  key.adminNotes = reason ? `Blocked: ${reason}` : 'Blocked by Administrator';
  key.history.push({
    timestamp: new Date().toISOString(),
    action: 'BLOCKED',
    actor: adminActor,
    details: reason || 'Blocked by Admin'
  });

  if (key.activeSessionToken) {
    sessionsStore.delete(key.activeSessionToken);
  }

  keysStore.set(key.id, key);
  keysStore.set(key.keyCode.toUpperCase().trim(), key);

  if (firestoreDb && !firestoreDisabled) {
    try {
      await firestoreDb.collection('access_keys').doc(key.id).set(key);
    } catch (err) {
      handleFirestoreError('blockKey', err);
    }
  }

  await logKeyAuditEvent('KEY_BLOCKED', adminActor, `Blocked key ${key.keyCode}. Reason: ${reason}`, key.id, key.keyCode);
  return key;
}

/**
 * Admin Action: Unblock Key
 */
export async function unblockKey(keyIdOrCode: string, adminActor = 'Admin'): Promise<AccessKey> {
  const key = await lookupKey(keyIdOrCode);
  if (!key) throw new Error('Key not found');

  const nowMs = Date.now();
  const expiryMs = key.expiresAt ? new Date(key.expiresAt).getTime() : 0;
  key.status = (key.expiresAt && nowMs < expiryMs) ? 'ACTIVE' : 'PENDING';

  key.history.push({
    timestamp: new Date().toISOString(),
    action: 'UNBLOCKED',
    actor: adminActor,
    details: 'Unblocked by Admin'
  });

  keysStore.set(key.id, key);
  keysStore.set(key.keyCode.toUpperCase().trim(), key);

  if (firestoreDb && !firestoreDisabled) {
    try {
      await firestoreDb.collection('access_keys').doc(key.id).set(key);
    } catch (err) {
      handleFirestoreError('unblockKey', err);
    }
  }

  await logKeyAuditEvent('KEY_UNBLOCKED', adminActor, `Unblocked key ${key.keyCode}`, key.id, key.keyCode);
  return key;
}

/**
 * Admin Action: Revoke Key (Permanent)
 */
export async function revokeKey(keyIdOrCode: string, reason: string, adminActor = 'Admin'): Promise<AccessKey> {
  const key = await lookupKey(keyIdOrCode);
  if (!key) throw new Error('Key not found');

  key.status = 'REVOKED';
  key.adminNotes = reason ? `Revoked: ${reason}` : 'Permanently Revoked';
  key.history.push({
    timestamp: new Date().toISOString(),
    action: 'REVOKED',
    actor: adminActor,
    details: reason || 'Permanently Revoked'
  });

  if (key.activeSessionToken) {
    sessionsStore.delete(key.activeSessionToken);
  }

  keysStore.set(key.id, key);
  keysStore.set(key.keyCode.toUpperCase().trim(), key);

  if (firestoreDb && !firestoreDisabled) {
    try {
      await firestoreDb.collection('access_keys').doc(key.id).set(key);
    } catch (err) {
      handleFirestoreError('revokeKey', err);
    }
  }

  await logKeyAuditEvent('KEY_REVOKED', adminActor, `Revoked key ${key.keyCode}. Reason: ${reason}`, key.id, key.keyCode);
  return key;
}

/**
 * Admin Action: Extend Key Expiry
 */
export async function extendKey(keyIdOrCode: string, additionalHours: number, adminActor = 'Admin'): Promise<AccessKey> {
  const key = await lookupKey(keyIdOrCode);
  if (!key) throw new Error('Key not found');

  const nowMs = Date.now();
  const currentExpiryMs = key.expiresAt ? new Date(key.expiresAt).getTime() : nowMs;
  const baseMs = Math.max(nowMs, currentExpiryMs);
  const newExpiryMs = baseMs + (additionalHours * 3600 * 1000);
  const newExpiresAt = new Date(newExpiryMs).toISOString();

  key.expiresAt = newExpiresAt;
  key.status = 'ACTIVE';
  key.durationHours = (key.durationHours || 24) + additionalHours;
  key.durationDays = Math.round(key.durationHours / 24);

  key.history.push({
    timestamp: new Date().toISOString(),
    action: 'EXTENDED',
    actor: adminActor,
    details: `Extended by +${additionalHours} hours. New expiry: ${newExpiresAt}`
  });

  keysStore.set(key.id, key);
  keysStore.set(key.keyCode.toUpperCase().trim(), key);

  if (firestoreDb && !firestoreDisabled) {
    try {
      await firestoreDb.collection('access_keys').doc(key.id).set(key);
    } catch (err) {
      handleFirestoreError('extendKey', err);
    }
  }

  await logKeyAuditEvent('KEY_EXTENDED', adminActor, `Extended key ${key.keyCode} by +${additionalHours} hours`, key.id, key.keyCode);
  return key;
}

/**
 * Admin Action: Reduce Key Expiry
 */
export async function reduceKey(keyIdOrCode: string, reduceHours: number, adminActor = 'Admin'): Promise<AccessKey> {
  const key = await lookupKey(keyIdOrCode);
  if (!key) throw new Error('Key not found');

  const nowMs = Date.now();
  const currentExpiryMs = key.expiresAt ? new Date(key.expiresAt).getTime() : nowMs;
  const newExpiryMs = Math.max(nowMs, currentExpiryMs - (reduceHours * 3600 * 1000));
  const newExpiresAt = new Date(newExpiryMs).toISOString();

  key.expiresAt = newExpiresAt;
  if (newExpiryMs <= nowMs) {
    key.status = 'EXPIRED';
  }

  key.history.push({
    timestamp: new Date().toISOString(),
    action: 'REDUCED',
    actor: adminActor,
    details: `Reduced by -${reduceHours} hours. New expiry: ${newExpiresAt}`
  });

  keysStore.set(key.id, key);
  keysStore.set(key.keyCode.toUpperCase().trim(), key);

  if (firestoreDb && !firestoreDisabled) {
    try {
      await firestoreDb.collection('access_keys').doc(key.id).set(key);
    } catch (err) {
      handleFirestoreError('reduceKey', err);
    }
  }

  await logKeyAuditEvent('KEY_REDUCED', adminActor, `Reduced key ${key.keyCode} by -${reduceHours} hours`, key.id, key.keyCode);
  return key;
}

/**
 * Admin Action: Reset Active Session / Force Logout
 */
export async function resetKeySession(keyIdOrCode: string, adminActor = 'Admin'): Promise<AccessKey> {
  const key = await lookupKey(keyIdOrCode);
  if (!key) throw new Error('Key not found');

  if (key.activeSessionToken) {
    sessionsStore.delete(key.activeSessionToken);
  }
  key.activeSessionToken = undefined;
  key.deviceFingerprint = undefined;

  key.history.push({
    timestamp: new Date().toISOString(),
    action: 'SESSION_RESET',
    actor: adminActor,
    details: 'Admin reset active sessions & device bindings'
  });

  keysStore.set(key.id, key);
  keysStore.set(key.keyCode.toUpperCase().trim(), key);

  if (firestoreDb && !firestoreDisabled) {
    try {
      await firestoreDb.collection('access_keys').doc(key.id).set(key);
    } catch (err) {
      handleFirestoreError('resetKeySession', err);
    }
  }

  await logKeyAuditEvent('SESSION_RESET', adminActor, `Reset session for key ${key.keyCode}`, key.id, key.keyCode);
  return key;
}

/**
 * Overview statistics for Admin Dashboard
 */
export function getAccessKeysOverview() {
  const nowMs = Date.now();
  const allKeys = Array.from(new Set(Array.from(keysStore.values())));

  let totalKeys = allKeys.length;
  let activeKeys = 0;
  let pendingKeys = 0;
  let expiredKeys = 0;
  let blockedKeys = 0;
  let revokedKeys = 0;
  let expiringSoonKeys = 0;
  let complimentaryKeys = 0;
  let totalRevenueKES = 0;

  for (const k of allKeys) {
    const expiryMs = k.expiresAt ? new Date(k.expiresAt).getTime() : 0;
    const isExpired = k.expiresAt && nowMs >= expiryMs;

    if (k.status === 'BLOCKED') blockedKeys++;
    else if (k.status === 'REVOKED') revokedKeys++;
    else if (isExpired || k.status === 'EXPIRED') expiredKeys++;
    else if (k.status === 'ACTIVE') {
      activeKeys++;
      const remainingSec = (expiryMs - nowMs) / 1000;
      if (remainingSec <= 24 * 3600) {
        expiringSoonKeys++;
      }
    } else {
      pendingKeys++;
    }

    if (k.isComplimentary) complimentaryKeys++;
    if (k.price && !k.isComplimentary) {
      totalRevenueKES += Number(k.price) || 0;
    }
  }

  const allPayments = Array.from(new Set(Array.from(paymentsStore.values())));
  const pendingPayments = allPayments.filter(p => p.status === 'PENDING').length;
  const approvedPayments = allPayments.filter(p => p.status === 'APPROVED').length;

  return {
    totalKeys,
    activeKeys,
    pendingKeys,
    expiredKeys,
    blockedKeys,
    revokedKeys,
    expiringSoonKeys,
    complimentaryKeys,
    totalRevenueKES,
    pendingPayments,
    approvedPayments,
    totalPlans: plansStore.size,
    timestamp: new Date().toISOString()
  };
}

/**
 * List keys with search, filters, pagination
 */
export function listKeys(params: {
  status?: string;
  search?: string;
  planId?: string;
  page?: number;
  limit?: number;
}): {
  keys: AccessKey[];
  total: number;
  page: number;
  totalPages: number;
} {
  const allKeys = Array.from(new Set(Array.from(keysStore.values())));
  let filtered = allKeys;

  if (params.status && params.status !== 'ALL') {
    const s = params.status.toUpperCase();
    filtered = filtered.filter(k => k.status === s);
  }

  if (params.planId && params.planId !== 'ALL') {
    filtered = filtered.filter(k => k.planId === params.planId);
  }

  if (params.search) {
    const query = params.search.toLowerCase().trim();
    filtered = filtered.filter(k => 
      k.keyCode.toLowerCase().includes(query) ||
      k.planName.toLowerCase().includes(query) ||
      (k.paymentReference && k.paymentReference.toLowerCase().includes(query)) ||
      (k.clientContact && k.clientContact.toLowerCase().includes(query)) ||
      (k.complimentaryReason && k.complimentaryReason.toLowerCase().includes(query))
    );
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return {
    keys: paginated,
    total,
    page,
    totalPages
  };
}

/**
 * List all payments
 */
export function listAccountlessPayments(): AccountlessPaymentSubmission[] {
  const all = Array.from(new Set(Array.from(paymentsStore.values())));
  return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Get audit logs
 */
export function getAuditLogs(): KeyAuditLog[] {
  return [...auditLogsStore];
}
