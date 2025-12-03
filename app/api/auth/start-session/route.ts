import { NextResponse } from 'next/server';
import Browserbase from '@browserbasehq/sdk';
import { chromium } from 'playwright-core';
import { setSession, setToken, cleanupOldSessions } from '../token-store';

export async function POST() {
  try {
    // Cleanup old sessions periodically
    cleanupOldSessions();

    const apiKey = process.env.BROWSERBASE_API_KEY;
    const projectId = process.env.BROWSERBASE_PROJECT_ID;

    if (!apiKey || !projectId) {
      return NextResponse.json(
        { error: 'Browserbase credentials not configured' },
        { status: 500 }
      );
    }

    const bb = new Browserbase({ apiKey });

    // Create a new browser session in us-east-1 for lower latency
    const session = await bb.sessions.create({
      projectId,
      region: 'us-east-1',
      keepAlive: true,
      timeout: 120, // 2 minute timeout
      browserSettings: {
        viewport: {
          width: 1280,
          height: 720,
        },
      },
    });

    // Get the live view URL for interactive use
    const liveViewLinks = await bb.sessions.debug(session.id);

    // Connect with Playwright - keep connection alive for CDP interception
    const browser = await chromium.connectOverCDP(session.connectUrl);
    const defaultContext = browser.contexts()[0];
    const page = defaultContext.pages()[0];

    // Store the browser instance for later cleanup
    setSession(session.id, browser);

    // Get CDP session for network interception
    const cdpSession = await defaultContext.newCDPSession(page);

    // Enable network monitoring
    await cdpSession.send('Network.enable');

    // Listen for requests and capture the auth header
    cdpSession.on('Network.requestWillBeSent', (params) => {
      const url = params.request?.url || '';
      const headers = params.request?.headers || {};

      if (url.includes('draft.premierleague.com/api/')) {
        console.log('CDP captured PL API request:', url);
        console.log('CDP headers:', JSON.stringify(headers, null, 2));

        // Look for the auth header (case-insensitive)
        for (const [key, value] of Object.entries(headers)) {
          if (key.toLowerCase() === 'x-api-authorization' && typeof value === 'string') {
            console.log('Token captured!');
            setToken(session.id, value);
          }
        }
      }
    });

    // Navigate to Premier League Draft
    await page.goto('https://draft.premierleague.com/', { waitUntil: 'domcontentloaded' });

    // Don't close browser - keep it alive for user interaction and CDP monitoring

    return NextResponse.json({
      sessionId: session.id,
      liveViewUrl: liveViewLinks.debuggerFullscreenUrl,
    });
  } catch (error) {
    console.error('Error creating Browserbase session:', error);
    return NextResponse.json(
      { error: 'Failed to create browser session' },
      { status: 500 }
    );
  }
}
