import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  updateEmail,
  updateProfile,
  signInWithPopup,
  signInWithCustomToken,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  addDoc,
  query, 
  where, 
  orderBy,
  limit,
  Timestamp,
  deleteDoc,
  onSnapshot,
  setLogLevel,
  enableNetwork,
  disableNetwork,
  waitForPendingWrites
} from 'firebase/firestore';

// Configuration loaded from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDKcBbUdNWMDN8c25Du261sNMgZNnmxWZE",
  authDomain: "symmetric-silicon-r2t1j.firebaseapp.com",
  projectId: "symmetric-silicon-r2t1j",
  storageBucket: "symmetric-silicon-r2t1j.firebasestorage.app",
  messagingSenderId: "354839059532",
  appId: "1:354839059532:web:c6a5bccb491a2104aca8e9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
// Use default firestore database or config-specified database ID
export const db = (firebaseConfig as any).firestoreDatabaseId 
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);
setLogLevel('error');

// Google OAuth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Apple OAuth Provider
export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// Microsoft OAuth Provider
export const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.addScope('openid');
microsoftProvider.addScope('email');
microsoftProvider.addScope('profile');
microsoftProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Structured Firestore Error Logger
 */
export function logFirestoreError(context: string, error: any, extraMeta?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const errorCode = error?.code || 'UNKNOWN_CODE';
  const errorMessage = error?.message || String(error);
  
  console.error(`[FirestoreSync][${context}] Error at ${timestamp}:`, {
    context,
    code: errorCode,
    message: errorMessage,
    ...extraMeta,
    stack: error?.stack
  });
}

/**
 * Re-establish Firestore Connection
 */
export async function reconnectFirestore(): Promise<boolean> {
  try {
    console.info(`[FirestoreSync] Attempting network reconnection to Firestore backend at ${new Date().toISOString()}...`);
    await enableNetwork(db);
    console.info(`[FirestoreSync] Successfully reconnected network channel to Firestore.`);
    return true;
  } catch (err: any) {
    logFirestoreError('reconnectFirestore', err);
    return false;
  }
}

/**
 * Robust Retry Mechanism for Firestore Operations
 * Implements exponential backoff with full jitter and structured error tracking.
 */
export interface FirestoreRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  contextTag?: string;
  onRetry?: (attempt: number, error: any, nextDelayMs: number) => void;
}

export async function withFirestoreRetry<T>(
  operation: () => Promise<T>,
  options: FirestoreRetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 500,
    maxDelayMs = 6000,
    backoffFactor = 2,
    contextTag = 'FirestoreOperation',
    onRetry
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    attempt++;
    try {
      return await operation();
    } catch (error: any) {
      const isLastAttempt = attempt > maxRetries;
      const errorCode = error?.code || '';
      
      // Determine if error is typically retryable in Firestore/Network context
      const isRetryable = 
        errorCode.includes('unavailable') ||
        errorCode.includes('deadline-exceeded') ||
        errorCode.includes('resource-exhausted') ||
        errorCode.includes('cancelled') ||
        errorCode.includes('aborted') ||
        errorCode.includes('network-request-failed') ||
        errorCode.includes('internal') ||
        error?.message?.toLowerCase().includes('network') ||
        error?.message?.toLowerCase().includes('failed to fetch') ||
        error?.message?.toLowerCase().includes('offline') ||
        !isLastAttempt;

      if (!isRetryable || isLastAttempt) {
        logFirestoreError(contextTag, error, {
          totalAttempts: attempt,
          exhaustedRetries: isLastAttempt,
          reason: 'Permanent error or retry limit exhausted'
        });
        throw error;
      }

      // Calculate jittered exponential backoff
      const jitter = Math.random() * 0.4 + 0.8; // 0.8 to 1.2
      const calculatedDelay = Math.min(delay * backoffFactor * jitter, maxDelayMs);
      
      console.warn(
        `[FirestoreSync][${contextTag}] Attempt ${attempt}/${maxRetries} failed: [${errorCode || 'Error'}] ${error?.message || error}. Retrying in ${Math.round(calculatedDelay)}ms...`
      );

      if (onRetry) {
        onRetry(attempt, error, calculatedDelay);
      }

      // If unavailable or offline, trigger explicit network re-enable before waiting
      if (errorCode.includes('unavailable') || errorCode.includes('network')) {
        enableNetwork(db).catch(() => {});
      }

      await new Promise((resolve) => setTimeout(resolve, calculatedDelay));
      delay = calculatedDelay;
    }
  }
}

/**
 * Sign in / Register with Google OAuth
 */
export const signInWithGoogle = async () => {
  return await signInWithPopup(auth, googleProvider);
};

/**
 * Sign in with Apple OAuth
 */
export const signInWithApple = async () => {
  return await signInWithPopup(auth, appleProvider);
};

/**
 * Sign in with Microsoft OAuth
 */
export const signInWithMicrosoft = async () => {
  return await signInWithPopup(auth, microsoftProvider);
};

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  updateEmail,
  updateProfile,
  signInWithPopup,
  signInWithCustomToken,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  enableNetwork,
  disableNetwork,
  waitForPendingWrites
};
export type { FirebaseUser };

