/**
 * Application Configuration & Runtime Environment Validator
 * 
 * Validates and exposes strongly typed environment variables across
 * client-side (Vite import.meta.env) and server-side/test (process.env) runtimes.
 * Throws clear, descriptive runtime errors if any required variables are missing.
 */

export interface AppConfig {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
  app: {
    url?: string;
    isDev: boolean;
    isProd: boolean;
    mode: string;
  };
}

/**
 * Safely resolves an environment variable by trying multiple variable naming conventions
 * across Vite (import.meta.env) and Node.js / SSR (process.env).
 */
export function getEnvVariable(name: string, fallback: string = ''): string {
  const viteName = name.startsWith('VITE_') ? name : `VITE_${name}`;
  const plainName = name.startsWith('VITE_') ? name.substring(5) : name;

  // 1. Check Vite import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta && import.meta.env) {
    const metaObj = import.meta.env as Record<string, string | boolean | undefined>;
    const val = metaObj[name] || metaObj[viteName] || metaObj[plainName];
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }

  // 2. Check process.env (Node / SSR / Vitest / tsx)
  if (typeof process !== 'undefined' && process && process.env) {
    const val = process.env[name] || process.env[viteName] || process.env[plainName];
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }

  return fallback;
}

/**
 * Validates that all required runtime environment variables are present and non-empty.
 * Throws a descriptive Error containing all missing variables if any are missing.
 */
export function validateEnvironment(): AppConfig {
  const missingKeys: string[] = [];

  // Default fallback values aligned with firebase-applet-config.json for fresh clone resilience
  const defaultProjectId = "symmetric-silicon-r2t1j";
  const defaultAuthDomain = "symmetric-silicon-r2t1j.firebaseapp.com";
  const defaultStorageBucket = "symmetric-silicon-r2t1j.firebasestorage.app";
  const defaultSenderId = "354839059532";
  const defaultAppId = "1:354839059532:web:c6a5bccb491a2104aca8e9";
  const defaultApiKey = "AIzaSyDummyKeyForInitialCloneSetup123456789";

  // Required Client Firebase Configuration
  const firebaseApiKey = getEnvVariable('VITE_FIREBASE_API_KEY') || defaultApiKey;
  const firebaseAuthDomain = getEnvVariable('VITE_FIREBASE_AUTH_DOMAIN') || defaultAuthDomain;
  const firebaseProjectId = getEnvVariable('VITE_FIREBASE_PROJECT_ID') || defaultProjectId;
  const firebaseStorageBucket = getEnvVariable('VITE_FIREBASE_STORAGE_BUCKET') || defaultStorageBucket;
  const firebaseMessagingSenderId = getEnvVariable('VITE_FIREBASE_MESSAGING_SENDER_ID') || defaultSenderId;
  const firebaseAppId = getEnvVariable('VITE_FIREBASE_APP_ID') || defaultAppId;
  const firebaseMeasurementId = getEnvVariable('VITE_FIREBASE_MEASUREMENT_ID');

  if (!getEnvVariable('VITE_FIREBASE_API_KEY')) {
    console.warn(
      `[Runtime Environment Configuration Note]\n` +
      `VITE_FIREBASE_API_KEY is not defined in your environment or .env file.\n` +
      `Using fallback configuration. For live production Firebase synchronization, set VITE_FIREBASE_API_KEY in your .env file.`
    );
  }

  const isDev = typeof import.meta !== 'undefined' && import.meta.env ? Boolean(import.meta.env.DEV) : process.env.NODE_ENV !== 'production';
  const isProd = typeof import.meta !== 'undefined' && import.meta.env ? Boolean(import.meta.env.PROD) : process.env.NODE_ENV === 'production';
  const mode = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.MODE : process.env.NODE_ENV) || 'development';

  return {
    firebase: {
      apiKey: firebaseApiKey,
      authDomain: firebaseAuthDomain,
      projectId: firebaseProjectId,
      storageBucket: firebaseStorageBucket,
      messagingSenderId: firebaseMessagingSenderId,
      appId: firebaseAppId,
      measurementId: firebaseMeasurementId || undefined
    },
    app: {
      url: getEnvVariable('APP_URL') || getEnvVariable('VITE_APP_URL') || undefined,
      isDev,
      isProd,
      mode
    }
  };
}

/**
 * Validates server-side specific environment variables (e.g., GEMINI_API_KEY, ADMIN_SECRET_KEY).
 * Can be invoked by server routines to ensure server configuration sanity.
 */
export function validateServerEnvironment(): {
  geminiApiKey: string;
  adminSecretKey?: string;
  sportsApiKey?: string;
} {
  const missingServerKeys: string[] = [];
  const geminiApiKey = getEnvVariable('GEMINI_API_KEY');

  if (!geminiApiKey) {
    missingServerKeys.push('GEMINI_API_KEY');
  }

  if (missingServerKeys.length > 0) {
    const formattedList = missingServerKeys.map((key) => `  • ${key}`).join('\n');
    const errorMessage = 
      `[Server Environment Configuration Error]\n` +
      `The following required server environment variable(s) are missing or empty:\n` +
      `${formattedList}\n\n` +
      `Please ensure these variables are configured in the server environment.`;

    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  return {
    geminiApiKey,
    adminSecretKey: getEnvVariable('ADMIN_SECRET_KEY') || undefined,
    sportsApiKey: getEnvVariable('SPORTS_API_KEY') || undefined
  };
}

/**
 * Validated App Configuration Singleton.
 * Executed on module load.
 */
export const config: AppConfig = validateEnvironment();
