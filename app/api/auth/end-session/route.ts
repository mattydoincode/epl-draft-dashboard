import { NextResponse } from 'next/server';
import { cleanupSession } from '../token-store';

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ success: true }); // Nothing to terminate
    }

    // Cleanup the in-memory session (close Playwright browser)
    await cleanupSession(sessionId);

    const apiKey = process.env.BROWSERBASE_API_KEY;
    const projectId = process.env.BROWSERBASE_PROJECT_ID;

    if (!apiKey || !projectId) {
      return NextResponse.json(
        { error: 'Browserbase credentials not configured' },
        { status: 500 }
      );
    }

    // Release the Browserbase session
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error ending session:', error);
    // Don't fail - session termination is best-effort
    return NextResponse.json({ success: true });
  }
}
