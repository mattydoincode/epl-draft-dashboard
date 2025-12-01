'use client';

import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ConfigurationPanel from './components/ConfigurationPanel';
import TeamSummaries from './components/TeamSummaries';
import WeeklyPointsChart from './components/WeeklyPointsChart';
import PlayerTable from './components/PlayerTable';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Player {
  id: number;
  name: string;
  fullName: string;
  totalPoints: number;
  position: string;
  team: string;
  form: string;
  pointsPerGame: string;
  status: string;
  owned: boolean;
  owner: string | null;
  ownerId: number | null;
  ownerShortName: string | null;
}

interface TeamPlayer {
  name: string;
  position: string;
  points: number;
  positionOrder: number;
}

interface TeamSummary {
  entryId: number;
  teamName: string;
  managerName: string;
  shortName: string;
  totalPoints: number;
  playerCount: number;
  players: TeamPlayer[];
  averagePoints: number;
  matchResults: string[];
  leaguePoints: number;
  wins: number;
  draws: number;
  losses: number;
}

interface WeeklyData {
  week: number;
  [key: string]: number;
}

interface PlayerAnalysis {
  totalPlayers: number;
  ownedPlayers: number;
  availablePlayers: number;
  players: Player[];
  teamSummaries: TeamSummary[];
  weeklyData: WeeklyData[];
}

const DEFAULT_TEAM_COLORS = [
  'bg-blue-100 border-blue-300 text-blue-900',
  'bg-purple-100 border-purple-300 text-purple-900',
  'bg-green-100 border-green-300 text-green-900',
  'bg-yellow-100 border-yellow-300 text-yellow-900',
  'bg-red-100 border-red-300 text-red-900',
  'bg-indigo-100 border-indigo-300 text-indigo-900',
  'bg-pink-100 border-pink-300 text-pink-900',
  'bg-orange-100 border-orange-300 text-orange-900',
];

export default function Home() {
  const [bearerToken, setBearerToken] = useState<string>('');
  const [leagueId, setLeagueId] = useState<string>('145059');
  const [allDataLoaded, setAllDataLoaded] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [loadingAll, setLoadingAll] = useState<boolean>(false);
  const [playerAnalysis, setPlayerAnalysis] = useState<PlayerAnalysis | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [teamColors, setTeamColors] = useState<{ [entryId: number]: string }>({});

  // Player analysis function (needs to be defined before useEffect)
  const analyzePlayersLocally = (
    bootstrapData: any,
    leagueDetailsData: any,
    elementStatusData: any
  ): PlayerAnalysis => {
    const players = bootstrapData.elements || [];
    const elementTypes = bootstrapData.element_types || [];
    const teams = bootstrapData.teams || [];
    const leagueEntries = leagueDetailsData.league_entries || [];
    const elementStatus = elementStatusData.element_status || [];

    // Create lookup maps
    const positionMap: { [key: number]: string } = {};
    elementTypes.forEach((et: any) => {
      positionMap[et.id] = et.singular_name;
    });

    const teamMap: { [key: number]: string } = {};
    teams.forEach((t: any) => {
      teamMap[t.id] = t.short_name;
    });

    const ownershipMap = new Map<number, number | null>();
    elementStatus.forEach((es: any) => {
      ownershipMap.set(es.element, es.owner);
    });

    const teamNameMap = new Map<number, any>();
    leagueEntries.forEach((entry: any) => {
      teamNameMap.set(entry.entry_id, entry);
    });

    // Map league_entry IDs to entry_ids for match processing
    const leagueEntryToEntryId = new Map<number, number>();
    leagueEntries.forEach((entry: any) => {
      leagueEntryToEntryId.set(entry.id, entry.entry_id);
    });

    // Build match results for each team
    const matches = leagueDetailsData.matches || [];
    const teamMatchResults = new Map<number, string[]>();

    const sortedMatches = [...matches].filter((m: any) => m.finished).sort((a: any, b: any) => a.event - b.event);

    sortedMatches.forEach((match: any) => {
      const entryId1 = leagueEntryToEntryId.get(match.league_entry_1);
      const entryId2 = leagueEntryToEntryId.get(match.league_entry_2);

      if (entryId1 && entryId2) {
        if (!teamMatchResults.has(entryId1)) teamMatchResults.set(entryId1, []);
        if (!teamMatchResults.has(entryId2)) teamMatchResults.set(entryId2, []);

        const points1 = match.league_entry_1_points;
        const points2 = match.league_entry_2_points;

        if (points1 > points2) {
          teamMatchResults.get(entryId1)!.push('W');
          teamMatchResults.get(entryId2)!.push('L');
        } else if (points2 > points1) {
          teamMatchResults.get(entryId1)!.push('L');
          teamMatchResults.get(entryId2)!.push('W');
        } else {
          teamMatchResults.get(entryId1)!.push('D');
          teamMatchResults.get(entryId2)!.push('D');
        }
      }
    });

    // Build team statistics
    const teamStats = new Map<number, { players: any[]; totalPoints: number }>();
    players.forEach((p: any) => {
      const ownerId = ownershipMap.get(p.id);
      if (ownerId) {
        if (!teamStats.has(ownerId)) {
          teamStats.set(ownerId, { players: [], totalPoints: 0 });
        }
        const stats = teamStats.get(ownerId)!;
        stats.players.push(p);
        stats.totalPoints += p.total_points;
      }
    });

    const positionOrder: { [key: number]: number } = { 1: 1, 2: 2, 3: 3, 4: 4 };

    // Build team summaries
    const teamSummaries: TeamSummary[] = Array.from(teamStats.entries()).map(([entryId, stats]) => {
      const entry = teamNameMap.get(entryId);
      const sortedPlayers = [...stats.players].sort((a: any, b: any) => {
        return b.total_points - a.total_points;
      });

      const teamPlayers: TeamPlayer[] = sortedPlayers.map((p: any) => ({
        name: p.web_name,
        position: positionMap[p.element_type] || 'Unknown',
        points: p.total_points,
        positionOrder: positionOrder[p.element_type] || 99,
      }));

      const results = teamMatchResults.get(entryId) || [];
      const wins = results.filter(r => r === 'W').length;
      const draws = results.filter(r => r === 'D').length;
      const losses = results.filter(r => r === 'L').length;
      const leaguePoints = (wins * 3) + (draws * 1);

      return {
        entryId,
        teamName: entry?.entry_name || `Team ${entryId}`,
        managerName: entry?.player_first_name && entry?.player_last_name
          ? `${entry.player_first_name} ${entry.player_last_name}`
          : 'Unknown',
        shortName: entry?.short_name || `T${entryId}`,
        totalPoints: stats.totalPoints,
        playerCount: stats.players.length,
        players: teamPlayers,
        averagePoints: stats.players.length > 0
          ? Math.round(stats.totalPoints / stats.players.length)
          : 0,
        matchResults: results,
        leaguePoints,
        wins,
        draws,
        losses,
      };
    });

    // Sort team summaries by league points (standings), then total points as tiebreaker
    teamSummaries.sort((a, b) => {
      if (b.leaguePoints !== a.leaguePoints) {
        return b.leaguePoints - a.leaguePoints;
      }
      return b.totalPoints - a.totalPoints;
    });

    // Build enriched player list
    const enrichedPlayers: Player[] = players.map((p: any) => {
      const ownerId = ownershipMap.get(p.id);
      const owner = ownerId ? teamNameMap.get(ownerId) : null;

      return {
        id: p.id,
        name: p.web_name,
        fullName: `${p.first_name} ${p.second_name}`,
        totalPoints: p.total_points,
        position: positionMap[p.element_type] || 'Unknown',
        team: teamMap[p.team] || 'Unknown',
        form: p.form,
        pointsPerGame: p.points_per_game,
        status: p.status,
        owned: !!ownerId,
        owner: owner ? `${owner.player_first_name} ${owner.player_last_name}` : null,
        ownerId: ownerId || null,
        ownerShortName: owner?.short_name || null,
      };
    });

    enrichedPlayers.sort((a, b) => b.totalPoints - a.totalPoints);

    const ownedCount = enrichedPlayers.filter(p => p.owned).length;

    // Build weekly scoring data from matches
    const weeklyPointsMap = new Map<number, Map<number, number>>();

    matches.forEach((match: any) => {
      if (!match.finished) return;

      const week = match.event;
      if (!weeklyPointsMap.has(week)) {
        weeklyPointsMap.set(week, new Map());
      }
      const weekData = weeklyPointsMap.get(week)!;

      const entryId1 = leagueEntryToEntryId.get(match.league_entry_1);
      const entryId2 = leagueEntryToEntryId.get(match.league_entry_2);

      if (entryId1) {
        weekData.set(entryId1, match.league_entry_1_points);
      }
      if (entryId2) {
        weekData.set(entryId2, match.league_entry_2_points);
      }
    });

    const weeklyData: WeeklyData[] = [];
    const weeks = Array.from(weeklyPointsMap.keys()).sort((a, b) => a - b);

    weeks.forEach(week => {
      const weekPoints = weeklyPointsMap.get(week)!;
      const dataPoint: WeeklyData = { week };

      weekPoints.forEach((points, entryId) => {
        const teamEntry = teamNameMap.get(entryId);
        if (teamEntry) {
          dataPoint[`team_${entryId}`] = points;
        }
      });

      weeklyData.push(dataPoint);
    });

    return {
      totalPlayers: enrichedPlayers.length,
      ownedPlayers: ownedCount,
      availablePlayers: enrichedPlayers.length - ownedCount,
      players: enrichedPlayers,
      teamSummaries,
      weeklyData,
    };
  };

  // Load saved values and cached data from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('bearerToken');
    if (savedToken) {
      setBearerToken(savedToken);
    }
    const savedLeagueId = localStorage.getItem('leagueId');
    if (savedLeagueId) {
      setLeagueId(savedLeagueId);
    }
    const savedColors = localStorage.getItem('teamColors');
    if (savedColors) {
      try {
        setTeamColors(JSON.parse(savedColors));
      } catch (e) {
        console.error('Failed to parse saved team colors:', e);
      }
    }

    // Auto-load cached data if available
    const loadCachedData = () => {
      try {
        const staticCache = localStorage.getItem('pl-bootstrap-static');
        const dynamicCache = localStorage.getItem('pl-bootstrap-dynamic');
        const detailsCache = savedLeagueId ? localStorage.getItem(`pl-league-${savedLeagueId}-details`) : null;
        const statusCache = savedLeagueId ? localStorage.getItem(`pl-league-${savedLeagueId}-element-status`) : null;

        if (staticCache && dynamicCache && detailsCache && statusCache) {
          console.log('[Frontend] Found cached data, loading automatically...');

          const staticData = JSON.parse(staticCache).data;
          const detailsData = JSON.parse(detailsCache).data;
          const statusData = JSON.parse(statusCache).data;

          const analysis = analyzePlayersLocally(staticData, detailsData, statusData);
          setPlayerAnalysis(analysis);
          setAllDataLoaded(true);

          console.log('[Frontend] Auto-loaded cached data successfully');
        } else {
          console.log('[Frontend] No complete cached data found');
        }
      } catch (e) {
        console.error('[Frontend] Failed to auto-load cached data:', e);
      }
    };

    loadCachedData();
  }, []);

  useEffect(() => {
    if (bearerToken) {
      localStorage.setItem('bearerToken', bearerToken);
    }
  }, [bearerToken]);

  useEffect(() => {
    if (leagueId) {
      localStorage.setItem('leagueId', leagueId);
    }
  }, [leagueId]);

  useEffect(() => {
    localStorage.setItem('teamColors', JSON.stringify(teamColors));
  }, [teamColors]);

  useEffect(() => {
    if (allDataLoaded) {
      setSidebarCollapsed(true);
    }
  }, [allDataLoaded]);

  const fetchOrGetFromCache = async (
    cacheKey: string,
    fetchUrl: string,
    fetchBody: object,
    forceRefresh: boolean,
    description: string
  ): Promise<{ data: any; fromCache: boolean }> => {
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          console.log(`[Frontend] Using cached ${description}`);
          return { data: parsed.data, fromCache: true };
        } catch (e) {
          console.error(`[Frontend] Failed to parse cached ${description}:`, e);
        }
      }
    }

    console.log(`[Frontend] Fetching ${description} from API`);
    const res = await fetch(fetchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fetchBody),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to load ${description}: ${errorText}`);
    }

    const data = await res.json();

    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      cachedAt: new Date().toISOString(),
    }));
    console.log(`[Frontend] Cached ${description}`);

    return { data, fromCache: false };
  };

  const handleLoadAllData = async (forceRefresh: boolean = false) => {
    if (!bearerToken.trim()) {
      alert('Please enter a bearer token');
      return;
    }

    if (!leagueId.trim()) {
      alert('Please enter a league ID');
      return;
    }

    setLoadingAll(true);
    setAllDataLoaded(false);
    setPlayerAnalysis(null);
    const logs: string[] = [];

    try {
      setLoadingStatus('Loading static data...');
      logs.push('Loading static data...');
      const staticResult = await fetchOrGetFromCache(
        'pl-bootstrap-static',
        '/api/prem/bootstrap-static',
        { bearerToken },
        forceRefresh,
        'bootstrap-static'
      );
      logs.push(`✓ Static data ${staticResult.fromCache ? 'loaded from cache' : 'fetched from API'}`);

      setLoadingStatus('Loading dynamic data...');
      logs.push('Loading dynamic data...');
      const dynamicResult = await fetchOrGetFromCache(
        'pl-bootstrap-dynamic',
        '/api/prem/bootstrap-dynamic',
        { bearerToken },
        forceRefresh,
        'bootstrap-dynamic'
      );
      logs.push(`✓ Dynamic data ${dynamicResult.fromCache ? 'loaded from cache' : 'fetched from API'}`);

      setLoadingStatus('Loading league details...');
      logs.push('Loading league details...');
      const detailsResult = await fetchOrGetFromCache(
        `pl-league-${leagueId}-details`,
        '/api/prem/league-details',
        { bearerToken, leagueId },
        forceRefresh,
        'league-details'
      );
      logs.push(`✓ League details ${detailsResult.fromCache ? 'loaded from cache' : 'fetched from API'}`);

      setLoadingStatus('Loading element status (ownership)...');
      logs.push('Loading element status...');
      const statusResult = await fetchOrGetFromCache(
        `pl-league-${leagueId}-element-status`,
        '/api/prem/league-element-status',
        { bearerToken, leagueId },
        forceRefresh,
        'element-status'
      );
      logs.push(`✓ Element status ${statusResult.fromCache ? 'loaded from cache' : 'fetched from API'}`);

      setLoadingStatus('Analyzing players...');
      logs.push('Analyzing players...');
      const analysis = analyzePlayersLocally(
        staticResult.data,
        detailsResult.data,
        statusResult.data
      );
      setPlayerAnalysis(analysis);
      logs.push(`✓ Analyzed ${analysis.totalPlayers} players`);

      setAllDataLoaded(true);
      setLoadingStatus('✓ All data loaded successfully!\n\n' + logs.join('\n'));
      console.log('All data loaded:', logs);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLoadingStatus(`✗ Error: ${errorMessage}\n\n` + logs.join('\n'));
      console.error('Failed to load data:', errorMessage);
    } finally {
      setLoadingAll(false);
    }
  };

  const handleClearCache = () => {
    if (!confirm('Are you sure you want to clear all cached data?')) {
      return;
    }

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('pl-')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      setAllDataLoaded(false);
      setLoadingStatus('');
      setPlayerAnalysis(null);

      alert(`Cache cleared: ${keysToRemove.length} items removed from localStorage`);
      console.log('Cache cleared:', keysToRemove);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error clearing cache: ${errorMessage}`);
      console.error('Failed to clear cache:', errorMessage);
    }
  };

  const getTeamColorClasses = (entryId: number, index: number): string => {
    const customColor = teamColors[entryId];
    if (customColor) return customColor;
    return DEFAULT_TEAM_COLORS[index % DEFAULT_TEAM_COLORS.length];
  };

  const handleColorChange = (entryId: number, color: string) => {
    setTeamColors(prev => ({ ...prev, [entryId]: color }));
  };

  const handleResetColors = () => {
    setTeamColors({});
  };

  const getPlayerBorderColor = (ownerId: number | null) => {
    if (!ownerId || !playerAnalysis) return 'border-gray-200';
    const teamIndex = playerAnalysis.teamSummaries.findIndex(t => t.entryId === ownerId);
    if (teamIndex === -1) return 'border-gray-200';
    const colorClasses = getTeamColorClasses(ownerId, teamIndex);
    return colorClasses.split(' ')[1];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ConfigurationPanel
        bearerToken={bearerToken}
        setBearerToken={setBearerToken}
        leagueId={leagueId}
        setLeagueId={setLeagueId}
        loadingAll={loadingAll}
        allDataLoaded={allDataLoaded}
        loadingStatus={loadingStatus}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        handleLoadAllData={handleLoadAllData}
        handleClearCache={handleClearCache}
      />

      <div className={`${sidebarCollapsed ? 'ml-12' : 'ml-80'} p-8 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Premier League Fantasy Draft
          </h1>
          <p className="text-gray-600 mb-8">
            Simple analysis dashboard to track team performance and player stats
          </p>

          {!allDataLoaded && (
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Welcome to Premier League Draft Analyzer! 🏆</h2>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">Getting Started</h3>
                  <p className="text-blue-800">
                    To use this app, you'll need to get your authentication token from the Premier League Draft website.
                    Follow the steps below to find it!
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Step 1: Open Premier League Draft Website</h4>
                    <p className="text-gray-700">
                      Navigate to <a href="https://draft.premierleague.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">draft.premierleague.com</a> and log in to your account.
                    </p>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Step 2: Open Developer Tools</h4>
                    <p className="text-gray-700 mb-2">
                      Open your browser's developer tools:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                      <li><strong>Chrome/Edge:</strong> Press F12 or Right-click → Inspect</li>
                      <li><strong>Firefox:</strong> Press F12 or Right-click → Inspect Element</li>
                      <li><strong>Safari:</strong> Enable Developer menu in Preferences, then press Cmd+Option+I</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Step 3: Go to Network Tab</h4>
                    <p className="text-gray-700">
                      Click on the <strong className="font-mono bg-gray-100 px-2 py-0.5 rounded">Network</strong> tab in the developer tools.
                    </p>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Step 4: Load a Page</h4>
                    <p className="text-gray-700">
                      While the Network tab is open, navigate to any page on the Premier League Draft site (like your team page or league standings).
                      You should see network requests appearing in the Network tab.
                    </p>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Step 5: Find the "dynamic" Request</h4>
                    <p className="text-gray-700 mb-2">
                      In the Network tab, use the search/filter box and type <strong className="font-mono bg-gray-100 px-2 py-0.5 rounded">dynamic</strong>.
                      Look for a request to something like <span className="font-mono text-sm">bootstrap-dynamic</span>.
                    </p>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Step 6: View Request Headers</h4>
                    <p className="text-gray-700 mb-2">
                      Click on that request, then look for the <strong className="font-mono bg-gray-100 px-2 py-0.5 rounded">Headers</strong> tab.
                    </p>
                    <p className="text-gray-700">
                      Scroll down to <strong>Request Headers</strong> and find the header called <strong className="font-mono bg-gray-100 px-2 py-0.5 rounded">X-Api-Authorization</strong> or <strong className="font-mono bg-gray-100 px-2 py-0.5 rounded">x-api-authorization</strong>.
                    </p>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Step 7: Copy Your Token</h4>
                    <p className="text-gray-700 mb-2">
                      The value will look like: <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">Bearer eyJhbGci...</span>
                    </p>
                    <p className="text-gray-700">
                      Copy the <strong>entire value</strong> (including "Bearer" if it's there) and paste it into the <strong>Bearer Token</strong> field in the left sidebar.
                    </p>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Step 8: Load Your Data</h4>
                    <p className="text-gray-700">
                      Click the <strong className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Load All Data</strong> button in the left sidebar.
                      Your league data will be fetched and cached locally!
                    </p>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>📌 Note:</strong> Your bearer token will expire after some time (usually 24-48 hours).
                    If you get authentication errors, just repeat these steps to get a fresh token.
                  </p>
                </div>
              </div>
            </div>
          )}

          {playerAnalysis && (
            <div className="space-y-6">
              <TeamSummaries
                teamSummaries={playerAnalysis.teamSummaries}
                teamColors={teamColors}
                onColorChange={handleColorChange}
                onResetColors={handleResetColors}
              />

              <WeeklyPointsChart
                weeklyData={playerAnalysis.weeklyData}
                teamSummaries={playerAnalysis.teamSummaries}
                getTeamColorClasses={getTeamColorClasses}
              />

              <PlayerTable
                playerAnalysis={playerAnalysis}
                getTeamColorClasses={getTeamColorClasses}
                getPlayerBorderColor={getPlayerBorderColor}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

