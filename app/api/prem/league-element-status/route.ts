import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { bearerToken, leagueId } = await request.json();

    if (!leagueId) {
      return NextResponse.json(
        { error: 'League ID is required' },
        { status: 400 }
      );
    }

    if (!bearerToken) {
      return NextResponse.json(
        { error: 'Bearer token is required' },
        { status: 400 }
      );
    }

    // Clean up the token - remove "Bearer " prefix if present and strip newlines
    let cleanToken = bearerToken.trim().replace(/\n/g, '').replace(/\r/g, '');
    if (cleanToken.toLowerCase().startsWith('bearer ')) {
      cleanToken = cleanToken.substring(7).trim();
    }

    const authHeader = `Bearer ${cleanToken}`;
    const url = `https://draft.premierleague.com/api/league/${leagueId}/element-status`;

    console.log(`[Backend] Proxying request to Premier League API: ${url}`);

    const startTime = Date.now();
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Authorization': authHeader,
      },
    });
    const duration = Date.now() - startTime;

    console.log(`[Backend] Response received in ${duration}ms`);
    console.log(`[Backend] Response status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Backend] Error response: ${errorText}`);
      return NextResponse.json(
        { error: `Premier League API error: ${res.status} - ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    console.log(`[Backend] Success! Response data keys: ${Object.keys(data).join(', ')}`);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Backend] Exception:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
