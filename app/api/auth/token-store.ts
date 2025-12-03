// In-memory store for captured tokens
// Key: sessionId, Value: { token, browser, timestamp }

import type { Browser } from 'playwright-core';

interface SessionData {
  token: string | null;
  browser: Browser | null;
  timestamp: number;
}

const sessions = new Map<string, SessionData>();

export function setSession(sessionId: string, browser: Browser) {
  sessions.set(sessionId, {
    token: null,
    browser,
    timestamp: Date.now(),
  });
}

export function setToken(sessionId: string, token: string) {
  const session = sessions.get(sessionId);
  if (session) {
    session.token = token;
  }
}

export function getToken(sessionId: string): string | null {
  return sessions.get(sessionId)?.token || null;
}

export function getSession(sessionId: string): SessionData | undefined {
  return sessions.get(sessionId);
}

export async function cleanupSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (session?.browser) {
    try {
      await session.browser.close();
    } catch {
      // Ignore errors during cleanup
    }
  }
  sessions.delete(sessionId);
}

// Cleanup old sessions (older than 5 minutes)
export function cleanupOldSessions() {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [sessionId, data] of sessions.entries()) {
    if (data.timestamp < fiveMinutesAgo) {
      cleanupSession(sessionId);
    }
  }
}
