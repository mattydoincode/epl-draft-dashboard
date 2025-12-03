import { NextResponse } from 'next/server';
import { getToken, cleanupSession } from '../token-store';

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get the captured token from memory
    const token = getToken(sessionId);

    if (!token) {
      return NextResponse.json(
        { error: 'Token not found. Please make sure you logged in and navigated to a page that makes API calls.' },
        { status: 404 }
      );
    }

    // Cleanup the session (close browser, release Browserbase session)
    await cleanupSession(sessionId);

    // Also release the Browserbase session
    const apiKey = process.env.BROWSERBASE_API_KEY;
    const projectId = process.env.BROWSERBASE_PROJECT_ID;
    if (apiKey && projectId) {
      try {
        await fetch(
          `https://api.browserbase.com/v1/sessions/${sessionId}`,
          {
            method: 'POST',
            headers: {
              'X-BB-API-Key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'REQUEST_RELEASE',
              projectId,
            }),
          }
        );
      } catch (releaseError) {
        console.error('Error releasing Browserbase session:', releaseError);
      }
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error getting token:', error);
    return NextResponse.json(
      { error: 'Failed to get token' },
      { status: 500 }
    );
  }
}
