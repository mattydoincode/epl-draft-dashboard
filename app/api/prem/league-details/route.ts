import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export async function POST(request: NextRequest) {
  try {
    const { bearerToken, leagueId, forceRefresh } = await request.json();

    if (!leagueId) {
      return NextResponse.json(
        { error: 'League ID is required' },
        { status: 400 }
      );
    }

    const cacheFilePath = path.join(DATA_DIR, `league-${leagueId}-details.json`);

    // Check if cached data exists and return it if not forcing refresh
    if (!forceRefresh && fs.existsSync(cacheFilePath)) {
      console.log(`[Backend] Returning cached league details for league ${leagueId}`);
      const cachedData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
      return NextResponse.json({
        ...cachedData,
        _cached: true,
        _cachedAt: fs.statSync(cacheFilePath).mtime.toISOString(),
      });
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
    const url = `https://draft.premierleague.com/api/league/${leagueId}/details`;

    console.log(`[Backend] Calling Premier League API: ${url}`);

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

    // Save to cache file
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    fs.writeFileSync(cacheFilePath, JSON.stringify(data, null, 2));
    console.log(`[Backend] Cached data saved to: ${cacheFilePath}`);

    return NextResponse.json({
      ...data,
      _cached: false,
      _fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Backend] Exception:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

