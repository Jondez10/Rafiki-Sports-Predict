import { auth } from './firebase';
import { getActiveSessionToken, getDeviceFingerprint } from './accessKeySession';

/**
 * Get the current user's Firebase ID token for Authorization header.
 * Returns null if the user is not authenticated.
 */
export async function getAuthToken(): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  try {
    return await currentUser.getIdToken();
  } catch (err) {
    console.warn("Failed to get ID token:", err);
    return null;
  }
}

/**
 * Wrapper around fetch that automatically includes:
 * - Authorization: Bearer <idToken> (if authenticated)
 * - X-Session-Token: <accessSessionToken> (if active access key)
 * - X-Device-Fingerprint: <fingerprint>
 * - X-Admin-Secret: <adminSecretKey> (if admin unlocked)
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const sessionToken = getActiveSessionToken();
  const deviceFp = getDeviceFingerprint();
  const adminSecret = 
    localStorage.getItem('rafiki_admin_secret_key') || 
    sessionStorage.getItem('rafiki_admin_secret_key') ||
    null;
  
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else if (sessionToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }

  if (sessionToken && !headers.has('X-Session-Token')) {
    headers.set('X-Session-Token', sessionToken);
  }

  if (deviceFp && !headers.has('X-Device-Fingerprint')) {
    headers.set('X-Device-Fingerprint', deviceFp);
  }

  if (adminSecret && !headers.has('X-Admin-Secret')) {
    headers.set('X-Admin-Secret', adminSecret);
  }

  return fetch(url, {
    ...options,
    headers
  });
}

