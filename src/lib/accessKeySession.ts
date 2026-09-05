import { useState, useEffect, useCallback } from 'react';
import { AccessSession, AccessKeyStatus } from '../types';

const STORAGE_SESSION_TOKEN = 'rafiki_access_session_token';
const STORAGE_KEY_CODE = 'rafiki_access_key_code';
const STORAGE_PLAN_NAME = 'rafiki_access_plan_name';
const STORAGE_EXPIRES_AT = 'rafiki_access_expires_at';
const STORAGE_DEVICE_FP = 'rafiki_device_fingerprint';

/**
 * Get or generate persistent browser fingerprint
 */
export function getDeviceFingerprint(): string {
  let fp = localStorage.getItem(STORAGE_DEVICE_FP);
  if (!fp) {
    const screenRes = `${window.screen.width}x${window.screen.height}`;
    const userAgent = navigator.userAgent;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const randomSalt = Math.random().toString(36).substring(2, 9);
    fp = `fp_${btoa(`${screenRes}-${timeZone}-${randomSalt}`).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}`;
    localStorage.setItem(STORAGE_DEVICE_FP, fp);
  }
  return fp;
}

export interface AccessKeyState {
  isActive: boolean;
  isExpiringSoon: boolean; // < 6 hours remaining
  isExpired: boolean;
  status: AccessKeyStatus | 'NONE';
  sessionToken: string | null;
  keyCode: string | null;
  planName: string | null;
  expiresAt: string | null;
  remainingSeconds: number;
  remainingFormatted: string;
  features: string[];
  isLoading: boolean;
}

// Global subscribers for reactive multi-component sync
type SessionSubscriber = (state: AccessKeyState) => void;
const subscribers = new Set<SessionSubscriber>();

let currentGlobalState: AccessKeyState = {
  isActive: false,
  isExpiringSoon: false,
  isExpired: false,
  status: 'NONE',
  sessionToken: null,
  keyCode: null,
  planName: null,
  expiresAt: null,
  remainingSeconds: 0,
  remainingFormatted: '',
  features: [],
  isLoading: true
};

function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds % 60}s`;
}

function updateGlobalState(newState: Partial<AccessKeyState>) {
  currentGlobalState = { ...currentGlobalState, ...newState };
  subscribers.forEach(cb => cb(currentGlobalState));
}

/**
 * Activate key with server
 */
export async function activateKeyOnServer(keyCode: string): Promise<{ success: boolean; message: string }> {
  try {
    const fp = getDeviceFingerprint();
    const cleanKey = keyCode.toUpperCase().trim();

    const response = await fetch('/api/access-keys/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyCode: cleanKey, deviceFingerprint: fp })
    });

    const data = await response.json();

    if (response.ok && data.success && data.session) {
      const session: AccessSession = data.session;
      localStorage.setItem(STORAGE_SESSION_TOKEN, session.token);
      localStorage.setItem(STORAGE_KEY_CODE, session.keyCode);
      localStorage.setItem(STORAGE_PLAN_NAME, session.planName);
      localStorage.setItem(STORAGE_EXPIRES_AT, session.expiresAt);

      const remainingSeconds = session.remainingSeconds;
      const isExpiringSoon = remainingSeconds > 0 && remainingSeconds <= 6 * 3600;

      updateGlobalState({
        isActive: true,
        isExpired: false,
        isExpiringSoon,
        status: session.status,
        sessionToken: session.token,
        keyCode: session.keyCode,
        planName: session.planName,
        expiresAt: session.expiresAt,
        remainingSeconds,
        remainingFormatted: formatRemainingTime(remainingSeconds),
        features: session.features || [],
        isLoading: false
      });

      return { success: true, message: data.message || 'VIP Access Activated!' };
    } else {
      return { success: false, message: data.message || 'Failed to activate access key' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error during activation' };
  }
}

/**
 * Verify current stored session with server
 */
export async function verifyCurrentSession(): Promise<boolean> {
  const token = localStorage.getItem(STORAGE_SESSION_TOKEN);
  const storedKeyCode = localStorage.getItem(STORAGE_KEY_CODE);
  const storedPlan = localStorage.getItem(STORAGE_PLAN_NAME);
  const storedExpiresAt = localStorage.getItem(STORAGE_EXPIRES_AT);

  if (!token) {
    updateGlobalState({
      isActive: false,
      isExpired: false,
      isExpiringSoon: false,
      status: 'NONE',
      sessionToken: null,
      keyCode: null,
      planName: null,
      expiresAt: null,
      remainingSeconds: 0,
      remainingFormatted: '',
      features: [],
      isLoading: false
    });
    return false;
  }

  // Optimistically set state from cache while validating
  if (storedExpiresAt) {
    const remaining = Math.max(0, Math.floor((new Date(storedExpiresAt).getTime() - Date.now()) / 1000));
    if (remaining > 0) {
      updateGlobalState({
        isActive: true,
        isExpired: false,
        isExpiringSoon: remaining <= 6 * 3600,
        status: 'ACTIVE',
        sessionToken: token,
        keyCode: storedKeyCode,
        planName: storedPlan,
        expiresAt: storedExpiresAt,
        remainingSeconds: remaining,
        remainingFormatted: formatRemainingTime(remaining),
        isLoading: false
      });
    }
  }

  try {
    const fp = getDeviceFingerprint();
    const response = await fetch('/api/access-keys/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: token, deviceFingerprint: fp })
    });

    const data = await response.json();

    if (response.ok && data.valid && data.session) {
      const session: AccessSession = data.session;
      const remainingSeconds = session.remainingSeconds;
      const isExpiringSoon = remainingSeconds > 0 && remainingSeconds <= 6 * 3600;

      updateGlobalState({
        isActive: true,
        isExpired: false,
        isExpiringSoon,
        status: session.status,
        sessionToken: session.token,
        keyCode: session.keyCode,
        planName: session.planName,
        expiresAt: session.expiresAt,
        remainingSeconds,
        remainingFormatted: formatRemainingTime(remainingSeconds),
        features: session.features || [],
        isLoading: false
      });
      return true;
    } else {
      // Session invalid or expired on server
      const isExp = data.status === 'EXPIRED';
      if (isExp) {
        updateGlobalState({
          isActive: false,
          isExpired: true,
          isExpiringSoon: false,
          status: 'EXPIRED',
          remainingSeconds: 0,
          remainingFormatted: 'Expired',
          isLoading: false
        });
      } else {
        clearStoredSession();
      }
      return false;
    }
  } catch (err) {
    console.warn('Session verification network note:', err);
    // Keep cached session offline if timestamp hasn't expired yet
    if (storedExpiresAt) {
      const remaining = Math.max(0, Math.floor((new Date(storedExpiresAt).getTime() - Date.now()) / 1000));
      if (remaining > 0) {
        updateGlobalState({
          isActive: true,
          isExpired: false,
          remainingSeconds: remaining,
          remainingFormatted: formatRemainingTime(remaining),
          isLoading: false
        });
        return true;
      }
    }
    return false;
  }
}

/**
 * Disconnect / Log out access key on device
 */
export function clearStoredSession() {
  localStorage.removeItem(STORAGE_SESSION_TOKEN);
  localStorage.removeItem(STORAGE_KEY_CODE);
  localStorage.removeItem(STORAGE_PLAN_NAME);
  localStorage.removeItem(STORAGE_EXPIRES_AT);

  updateGlobalState({
    isActive: false,
    isExpired: false,
    isExpiringSoon: false,
    status: 'NONE',
    sessionToken: null,
    keyCode: null,
    planName: null,
    expiresAt: null,
    remainingSeconds: 0,
    remainingFormatted: '',
    features: [],
    isLoading: false
  });
}

/**
 * Get active session token for API request headers
 */
export function getActiveSessionToken(): string | null {
  return localStorage.getItem(STORAGE_SESSION_TOKEN);
}

let globalTimersStarted = false;
let globalTickerTimer: any = null;
let globalPollerTimer: any = null;

function startGlobalTimersIfNeeded() {
  if (globalTimersStarted || typeof window === 'undefined') return;
  globalTimersStarted = true;

  // 1-second interval to update ticking countdown
  globalTickerTimer = setInterval(() => {
    if (currentGlobalState.expiresAt && currentGlobalState.isActive) {
      const remaining = Math.max(0, Math.floor((new Date(currentGlobalState.expiresAt).getTime() - Date.now()) / 1000));
      if (remaining <= 0) {
        updateGlobalState({
          isActive: false,
          isExpired: true,
          isExpiringSoon: false,
          status: 'EXPIRED',
          remainingSeconds: 0,
          remainingFormatted: 'Expired'
        });
      } else {
        const formatted = formatRemainingTime(remaining);
        const expiringSoon = remaining <= 6 * 3600;
        if (remaining !== currentGlobalState.remainingSeconds || formatted !== currentGlobalState.remainingFormatted) {
          updateGlobalState({
            remainingSeconds: remaining,
            remainingFormatted: formatted,
            isExpiringSoon: expiringSoon
          });
        }
      }
    }
  }, 1000);

  // Periodic server re-validation every 5 minutes
  globalPollerTimer = setInterval(() => {
    verifyCurrentSession();
  }, 5 * 60 * 1000);
}

/**
 * React Hook for reactive Access Key State in components
 */
export function useAccessKeySession() {
  const [state, setState] = useState<AccessKeyState>(currentGlobalState);

  useEffect(() => {
    subscribers.add(setState);
    startGlobalTimersIfNeeded();
    
    // Only verify on first hook mount if still in loading state
    if (currentGlobalState.isLoading) {
      verifyCurrentSession();
    }

    return () => {
      subscribers.delete(setState);
    };
  }, []);

  const activate = useCallback(async (keyCode: string) => {
    return await activateKeyOnServer(keyCode);
  }, []);

  const disconnect = useCallback(() => {
    clearStoredSession();
  }, []);

  const refresh = useCallback(async () => {
    return await verifyCurrentSession();
  }, []);

  return {
    ...state,
    activate,
    disconnect,
    refresh
  };
}
