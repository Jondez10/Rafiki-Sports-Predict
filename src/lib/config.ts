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

  // Required Client Firebase Configuration
  const firebaseApiKey = getEnvVariable('VITE_FIREBASE_API_KEY');
  const firebaseAuthDomain = getEnvVariable('VITE_FIREBASE_AUTH_DOMAIN');
  const firebaseProjectId = getEnvVariable('VITE_FIREBASE_PROJECT_ID');
  const firebaseStorageBucket = getEnvVariable('VITE_FIREBASE_STORAGE_BUCKET');
  const firebaseMessagingSenderId = getEnvVariable('VITE_FIREBASE_MESSAGING_SENDER_ID');
  const firebaseAppId = getEnvVariable('VITE_FIREBASE_APP_ID');
  const firebaseMeasurementId = getEnvVariable('VITE_FIREBASE_MEASUREMENT_ID');

  if (!firebaseApiKey) missingKeys.push('VITE_FIREBASE_API_KEY');
  if (!firebaseAuthDomain) missingKeys.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!firebaseProjectId) missingKeys.push('VITE_FIREBASE_PROJECT_ID');
  if (!firebaseStorageBucket) missingKeys.push('VITE_FIREBASE_STORAGE_BUCKET');
  if (!firebaseMessagingSenderId) missingKeys.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
  if (!firebaseAppId) missingKeys.push('VITE_FIREBASE_APP_ID');

  if (missingKeys.length > 0) {
    const formattedList = missingKeys.map((key) => `  • ${key}`).join('\n');
    const errorMessage = 
      `[Runtime Environment Configuration Error]\n` +
      `The following required environment variable(s) are missing or empty:\n` +
      `${formattedList}\n\n` +
      `Please ensure these variables are defined in your environment or .env file before starting the application.`;

    console.error(errorMessage);
    throw new Error(errorMessage);
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
