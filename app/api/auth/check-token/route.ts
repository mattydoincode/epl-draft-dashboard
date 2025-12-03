import { NextResponse } from 'next/server';
import { getToken } from '../token-store';

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const token = getToken(sessionId);

    return NextResponse.json({
      hasToken: !!token,
      token: token || null,
    });
  } catch (error) {
    console.error('Error checking token:', error);
    return NextResponse.json(
      { error: 'Failed to check token' },
      { status: 500 }
    );
  }
}
