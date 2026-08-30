import { GoogleAuthProvider, signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import { auth } from './firebase';

export const GMAIL_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
  'https://www.googleapis.com/auth/gmail.addons.current.message.action',
  'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
  'https://www.googleapis.com/auth/gmail.addons.current.message.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
];

// In-memory token storage (DO NOT store in localStorage/sessionStorage as required by workspace guidelines)
let cachedGmailAccessToken: string | null = null;
let isSigningIn = false;

// Create and configure provider
export const getGoogleAuthProvider = () => {
  const provider = new GoogleAuthProvider();
  GMAIL_SCOPES.forEach(scope => {
    provider.addScope(scope);
  });
  // Force prompt consent if needed
  provider.setCustomParameters({
    prompt: 'consent',
    access_type: 'offline'
  });
  return provider;
};

/**
 * Sign in with Google and acquire Gmail OAuth access token
 */
export const signInWithGoogleGmail = async (): Promise<{ user: FirebaseUser; accessToken: string }> => {
  try {
    isSigningIn = true;
    const provider = getGoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Failed to acquire Gmail OAuth access token from Google sign in.');
    }

    cachedGmailAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedGmailAccessToken };
  } catch (error: any) {
    console.error('Google Gmail Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get current in-memory cached access token
 */
export const getCachedGmailToken = (): string | null => {
  return cachedGmailAccessToken;
};

/**
 * Explicitly set cached access token
 */
export const setCachedGmailToken = (token: string | null) => {
  cachedGmailAccessToken = token;
};

/**
 * Clear cached access token (e.g. on logout)
 */
export const clearGmailToken = () => {
  cachedGmailAccessToken = null;
};

// Types for Gmail API
export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessagePartBody {
  size: number;
  data?: string;
}

export interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename: string;
  headers: GmailHeader[];
  body?: GmailMessagePartBody;
  parts?: GmailMessagePart[];
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  historyId?: string;
  internalDate: string;
  payload?: {
    partId: string;
    mimeType: string;
    filename: string;
    headers: GmailHeader[];
    body?: GmailMessagePartBody;
    parts?: GmailMessagePart[];
  };
  sizeEstimate?: number;
}

export interface ParsedGmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  labels: string[];
  isUnread: boolean;
  isStarred: boolean;
  bodyText: string;
  bodyHtml?: string;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}

// Decode base64 / base64url string
export const decodeBase64Url = (input: string): string => {
  if (!input) return '';
  try {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (err) {
    try {
      return atob(input.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
      return input;
    }
  }
};

// Encode string to base64url for RFC 2822 email submission
export const encodeBase64Url = (str: string): string => {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// Helper to extract email body recursively
function extractBodyFromPayload(payload?: GmailMessageSummary['payload']): { text: string; html: string } {
  let text = '';
  let html = '';

  if (!payload) return { text, html };

  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType?.includes('text/html')) {
      html = decoded;
    } else {
      text = decoded;
    }
  }

  if (payload.parts && payload.parts.length > 0) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        text += (text ? '\n\n' : '') + decodeBase64Url(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html += (html ? '<br/><br/>' : '') + decodeBase64Url(part.body.data);
      } else if (part.parts) {
        const sub = extractBodyFromPayload(part as any);
        if (sub.text) text += (text ? '\n\n' : '') + sub.text;
        if (sub.html) html += (html ? '<br/><br/>' : '') + sub.html;
      }
    }
  }

  return { text, html };
}

// Parse raw Gmail API Message payload into clean structured object
export const parseGmailMessage = (raw: GmailMessageSummary): ParsedGmailMessage => {
  const headers = raw.payload?.headers || [];
  const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const from = getHeader('From');
  const to = getHeader('To');
  const subject = getHeader('Subject') || '(No Subject)';
  const dateStr = getHeader('Date');
  const labels = raw.labelIds || [];
  const isUnread = labels.includes('UNREAD');
  const isStarred = labels.includes('STARRED');

  const { text, html } = extractBodyFromPayload(raw.payload);

  return {
    id: raw.id,
    threadId: raw.threadId,
    snippet: raw.snippet || '',
    from,
    to,
    subject,
    date: dateStr || (raw.internalDate ? new Date(parseInt(raw.internalDate)).toLocaleString() : ''),
    labels,
    isUnread,
    isStarred,
    bodyText: text || raw.snippet || '',
    bodyHtml: html || undefined
  };
};

/**
 * Fetch Gmail user profile
 */
export const fetchGmailProfile = async (token: string): Promise<GmailProfile> => {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to load Gmail profile (${res.status}): ${errorBody}`);
  }
  return await res.json();
};

/**
 * Fetch Gmail labels list
 */
export const fetchGmailLabels = async (token: string): Promise<GmailLabel[]> => {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Gmail labels (${res.status})`);
  }
  const data = await res.json();
  return data.labels || [];
};

/**
 * List messages with optional search query and maxResults
 */
export const listGmailMessages = async (
  token: string,
  options: { query?: string; labelIds?: string[]; maxResults?: number; pageToken?: string } = {}
): Promise<{ messages: { id: string; threadId: string }[]; nextPageToken?: string; resultSizeEstimate?: number }> => {
  const params = new URLSearchParams();
  if (options.query) params.set('q', options.query);
  if (options.maxResults) params.set('maxResults', options.maxResults.toString());
  if (options.pageToken) params.set('pageToken', options.pageToken);
  if (options.labelIds && options.labelIds.length > 0) {
    options.labelIds.forEach(lbl => params.append('labelIds', lbl));
  }

  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to list Gmail messages (${res.status}): ${errText}`);
  }

  return await res.json();
};

/**
 * Get individual message details
 */
export const getGmailMessage = async (token: string, messageId: string): Promise<GmailMessageSummary> => {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error(`Failed to load message ${messageId}`);
  }

  return await res.json();
};

/**
 * Send an email via Gmail API
 * Note: Caller must provide explicit user confirmation prior to calling this!
 */
export const sendGmailEmail = async (
  token: string,
  emailData: {
    to: string;
    subject: string;
    body: string;
    isHtml?: boolean;
    cc?: string;
    bcc?: string;
  }
): Promise<{ id: string; threadId: string; labelIds: string[] }> => {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(emailData.subject)))}?=`;
  
  const headers = [
    `To: ${emailData.to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    emailData.isHtml ? 'Content-Type: text/html; charset=utf-8' : 'Content-Type: text/plain; charset=utf-8',
  ];

  if (emailData.cc) headers.push(`Cc: ${emailData.cc}`);
  if (emailData.bcc) headers.push(`Bcc: ${emailData.bcc}`);

  const emailRaw = `${headers.join('\r\n')}\r\n\r\n${emailData.body}`;
  const rawBase64 = encodeBase64Url(emailRaw);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: rawBase64 })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to send email (${res.status}): ${errorText}`);
  }

  return await res.json();
};

/**
 * Create an email draft in Gmail
 */
export const createGmailDraft = async (
  token: string,
  emailData: {
    to: string;
    subject: string;
    body: string;
    isHtml?: boolean;
  }
): Promise<{ id: string; message: { id: string; threadId: string } }> => {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(emailData.subject)))}?=`;
  const emailRaw = [
    `To: ${emailData.to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    emailData.isHtml ? 'Content-Type: text/html; charset=utf-8' : 'Content-Type: text/plain; charset=utf-8',
    '',
    emailData.body
  ].join('\r\n');

  const rawBase64 = encodeBase64Url(emailRaw);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: { raw: rawBase64 }
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create draft (${res.status}): ${errorText}`);
  }

  return await res.json();
};

/**
 * Trash a message (requires user confirmation before calling)
 */
export const trashGmailMessage = async (token: string, messageId: string): Promise<void> => {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error(`Failed to move message to trash (${res.status})`);
  }
};

/**
 * Mark a message as read
 */
export const markGmailAsRead = async (token: string, messageId: string): Promise<void> => {
  await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      removeLabelIds: ['UNREAD']
    })
  });
};
