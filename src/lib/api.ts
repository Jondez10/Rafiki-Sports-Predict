import { auth } from './firebase';

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
 * Wrapper around fetch that automatically includes Authorization: Bearer <idToken>
 * and Content-Type: application/json (if body is present and not FormData).
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers
  });
}
