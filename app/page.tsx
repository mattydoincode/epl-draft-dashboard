'use client';

import { useState, useEffect } from 'react';

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
}

interface PlayerAnalysis {
  totalPlayers: number;
  ownedPlayers: number;
  availablePlayers: number;
  players: Player[];
  teamSummaries: TeamSummary[];
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

const COLOR_OPTIONS = [
  { name: 'Blue', classes: 'bg-blue-100 border-blue-300 text-blue-900', preview: 'bg-blue-200' },
  { name: 'Purple', classes: 'bg-purple-100 border-purple-300 text-purple-900', preview: 'bg-purple-200' },
  { name: 'Green', classes: 'bg-green-100 border-green-300 text-green-900', preview: 'bg-green-200' },
  { name: 'Yellow', classes: 'bg-yellow-100 border-yellow-300 text-yellow-900', preview: 'bg-yellow-200' },
  { name: 'Red', classes: 'bg-red-100 border-red-300 text-red-900', preview: 'bg-red-200' },
  { name: 'Indigo', classes: 'bg-indigo-100 border-indigo-300 text-indigo-900', preview: 'bg-indigo-200' },
  { name: 'Pink', classes: 'bg-pink-100 border-pink-300 text-pink-900', preview: 'bg-pink-200' },
  { name: 'Orange', classes: 'bg-orange-100 border-orange-300 text-orange-900', preview: 'bg-orange-200' },
  { name: 'Teal', classes: 'bg-teal-100 border-teal-300 text-teal-900', preview: 'bg-teal-200' },
  { name: 'Cyan', classes: 'bg-cyan-100 border-cyan-300 text-cyan-900', preview: 'bg-cyan-200' },
  { name: 'Lime', classes: 'bg-lime-100 border-lime-300 text-lime-900', preview: 'bg-lime-200' },
  { name: 'Emerald', classes: 'bg-emerald-100 border-emerald-300 text-emerald-900', preview: 'bg-emerald-200' },
  { name: 'Rose', classes: 'bg-rose-100 border-rose-300 text-rose-900', preview: 'bg-rose-200' },
  { name: 'Fuchsia', classes: 'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-900', preview: 'bg-fuchsia-200' },
  { name: 'Violet', classes: 'bg-violet-100 border-violet-300 text-violet-900', preview: 'bg-violet-200' },
  { name: 'Amber', classes: 'bg-amber-100 border-amber-300 text-amber-900', preview: 'bg-amber-200' },
];

export default function Home() {
  const [bearerToken, setBearerToken] = useState<string>('');
  const [leagueId, setLeagueId] = useState<string>('145059');
  const [allDataLoaded, setAllDataLoaded] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [loadingAll, setLoadingAll] = useState<boolean>(false);
  const [playerAnalysis, setPlayerAnalysis] = useState<PlayerAnalysis | null>(null);
  const [loadingPlayers, setLoadingPlayers] = useState<boolean>(false);
  const [sortColumn, setSortColumn] = useState<keyof Player>('totalPoints');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const [teamColors, setTeamColors] = useState<{ [entryId: number]: string }>({});
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [visibleTeams, setVisibleTeams] = useState<Set<number | 'unowned'>>(new Set());
  const [visiblePositions, setVisiblePositions] = useState<Set<string>>(new Set());

  // Load saved values from localStorage on mount
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
  }, []);

  // Save to localStorage whenever they change
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
    const logs: string[] = [];

    try {
      // 1. Load Static Data
      setLoadingStatus('Loading static data...');
      logs.push('Loading static data...');
      const staticRes = await fetch('/api/prem/bootstrap-static', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bearerToken, forceRefresh }),
      });
      if (!staticRes.ok) throw new Error('Failed to load static data');
      const staticData = await staticRes.json();
      logs.push(`✓ Static data ${staticData._cached ? 'loaded from cache' : 'fetched from API'}`);

      // 2. Load Dynamic Data
      setLoadingStatus('Loading dynamic data...');
      logs.push('Loading dynamic data...');
      const dynamicRes = await fetch('/api/prem/bootstrap-dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bearerToken, forceRefresh }),
      });
      if (!dynamicRes.ok) throw new Error('Failed to load dynamic data');
      const dynamicData = await dynamicRes.json();
      logs.push(`✓ Dynamic data ${dynamicData._cached ? 'loaded from cache' : 'fetched from API'}`);

      // 3. Load League Details
      setLoadingStatus('Loading league details...');
      logs.push('Loading league details...');
      const detailsRes = await fetch('/api/prem/league-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bearerToken, leagueId, forceRefresh }),
      });
      if (!detailsRes.ok) throw new Error('Failed to load league details');
      const detailsData = await detailsRes.json();
      logs.push(`✓ League details ${detailsData._cached ? 'loaded from cache' : 'fetched from API'}`);

      // 4. Load Element Status
      setLoadingStatus('Loading element status (ownership)...');
      logs.push('Loading element status...');
      const statusRes = await fetch('/api/prem/league-element-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bearerToken, leagueId, forceRefresh }),
      });
      if (!statusRes.ok) throw new Error('Failed to load element status');
      const statusData = await statusRes.json();
      logs.push(`✓ Element status ${statusData._cached ? 'loaded from cache' : 'fetched from API'}`);

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

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear all cached data?')) {
      return;
    }

    try {
      const res = await fetch('/api/prem/clear-cache', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to clear cache');
      }

      const data = await res.json();
      setAllDataLoaded(false);
      setLoadingStatus('');
      setPlayerAnalysis(null);
      alert(`Cache cleared: ${data.filesDeleted} files deleted`);
      console.log('Cache cleared:', data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error clearing cache: ${errorMessage}`);
      console.error('Failed to clear cache:', errorMessage);
    }
  };

  const handleAnalyzePlayers = async () => {
    setLoadingPlayers(true);
    try {
      console.log('Analyzing players...');
      const res = await fetch('/api/prem/analyze-players');

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setPlayerAnalysis(data);
      setSortColumn('totalPoints');
      setSortDirection('desc');
      console.log(`Loaded ${data.totalPlayers} players`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error analyzing players: ${errorMessage}`);
      console.error('Failed to analyze players:', errorMessage);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleSort = (column: keyof Player) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending for numbers, ascending for text
      setSortColumn(column);
      if (column === 'name' || column === 'position' || column === 'team' || column === 'owner') {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  const getSortedPlayers = () => {
    if (!playerAnalysis) return [];

    let filtered = playerAnalysis.players;

    // Apply team visibility filter if any teams are selected
    if (visibleTeams.size > 0) {
      filtered = filtered.filter(player => {
        if (!player.owned && visibleTeams.has('unowned')) {
          return true;
        }
        if (player.ownerId && visibleTeams.has(player.ownerId)) {
          return true;
        }
        return false;
      });
    }

    // Apply position visibility filter if any positions are selected
    if (visiblePositions.size > 0) {
      filtered = filtered.filter(player => visiblePositions.has(player.position));
    }

    const sorted = [...filtered].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      // Handle string vs number comparisons
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      // Handle null/undefined
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const SortIcon = ({ column }: { column: keyof Player }) => {
    if (sortColumn !== column) {
      return <span className="text-gray-400">⇅</span>;
    }
    return sortDirection === 'asc' ? <span>▲</span> : <span>▼</span>;
  };

  const toggleTeam = (entryId: number) => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    if (!playerAnalysis) return;
    setExpandedTeams(new Set(playerAnalysis.teamSummaries.map(t => t.entryId)));
  };

  const collapseAll = () => {
    setExpandedTeams(new Set());
  };

  const getTeamColorClasses = (entryId: number, index: number) => {
    if (teamColors[entryId]) {
      return teamColors[entryId];
    }
    return DEFAULT_TEAM_COLORS[index % DEFAULT_TEAM_COLORS.length];
  };

  const setTeamColor = (entryId: number, colorClasses: string) => {
    const newColors = { ...teamColors, [entryId]: colorClasses };
    setTeamColors(newColors);
    localStorage.setItem('teamColors', JSON.stringify(newColors));
  };

  const resetTeamColors = () => {
    setTeamColors({});
    localStorage.removeItem('teamColors');
  };

  const toggleTeamVisibility = (teamId: number | 'unowned') => {
    setVisibleTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const showAllTeams = () => {
    if (!playerAnalysis) return;
    const allTeams = new Set<number | 'unowned'>([
      ...playerAnalysis.teamSummaries.map(t => t.entryId),
      'unowned'
    ]);
    setVisibleTeams(allTeams);
  };

  const hideAllTeams = () => {
    setVisibleTeams(new Set());
  };

  const togglePositionVisibility = (position: string) => {
    setVisiblePositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(position)) {
        newSet.delete(position);
      } else {
        newSet.add(position);
      }
      return newSet;
    });
  };

  const showAllPositions = () => {
    setVisiblePositions(new Set(['Goalkeeper', 'Defender', 'Midfielder', 'Forward']));
  };

  const hideAllPositions = () => {
    setVisiblePositions(new Set());
  };

  const getTeamColor = (ownerId: number | null) => {
    if (!ownerId || !playerAnalysis) return 'bg-gray-50';
    const teamIndex = playerAnalysis.teamSummaries.findIndex(t => t.entryId === ownerId);
    if (teamIndex === -1) return 'bg-gray-50';
    const colorClasses = getTeamColorClasses(ownerId, teamIndex);
    return colorClasses.split(' ')[0];
  };

  const getTeamBorderColor = (ownerId: number | null) => {
    if (!ownerId || !playerAnalysis) return 'border-gray-200';
    const teamIndex = playerAnalysis.teamSummaries.findIndex(t => t.entryId === ownerId);
    if (teamIndex === -1) return 'border-gray-200';
    const colorClasses = getTeamColorClasses(ownerId, teamIndex);
    return colorClasses.split(' ')[1];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Left Panel */}
      <div className="fixed top-0 left-0 w-80 h-screen bg-white border-r border-gray-200 p-6 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Configuration</h2>
          </div>

          <div>
            <label htmlFor="bearer-token" className="block text-sm font-medium text-gray-700 mb-2">
              Bearer Token
            </label>
            <textarea
              id="bearer-token"
              value={bearerToken}
              onChange={(e) => setBearerToken(e.target.value)}
              placeholder="Paste token..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-xs"
              rows={6}
            />
          </div>

          <div>
            <label htmlFor="league-id" className="block text-sm font-medium text-gray-700 mb-2">
              League ID
            </label>
            <input
              id="league-id"
              type="text"
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              placeholder="Enter league ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-3">
            <button
              onClick={() => handleLoadAllData(false)}
              disabled={loadingAll}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loadingAll ? 'Loading...' : 'Load All Data'}
            </button>

            {allDataLoaded && (
              <button
                onClick={() => handleLoadAllData(true)}
                disabled={loadingAll}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Refresh from API
              </button>
            )}

            <button
              onClick={handleClearCache}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
            >
              Clear Cache
            </button>
          </div>

          {loadingStatus && (
            <div className={`p-4 rounded-lg text-xs ${loadingStatus.startsWith('✓')
              ? 'bg-green-50 text-green-800'
              : loadingStatus.startsWith('✗')
                ? 'bg-red-50 text-red-800'
                : 'bg-blue-50 text-blue-800'
              }`}>
              <pre className="whitespace-pre-wrap font-mono">{loadingStatus}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="ml-80 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Premier League API
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Analysis Dashboard
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

          {allDataLoaded && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Player Analysis
                </h2>
                <button
                  onClick={handleAnalyzePlayers}
                  disabled={loadingPlayers}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loadingPlayers ? 'Analyzing...' : 'Analyze Players'}
                </button>
              </div>

              {playerAnalysis && (
                <>
                  {/* Team Summaries */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Team Summaries
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowColorPicker(!showColorPicker)}
                          className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 rounded transition-colors text-purple-900"
                        >
                          {showColorPicker ? 'Hide Colors' : 'Customize Colors'}
                        </button>
                        <button
                          onClick={expandAll}
                          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        >
                          Expand All
                        </button>
                        <button
                          onClick={collapseAll}
                          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        >
                          Collapse All
                        </button>
                      </div>
                    </div>

                    {showColorPicker && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold text-gray-900">Team Color Settings</h4>
                          <button
                            onClick={resetTeamColors}
                            className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 rounded transition-colors text-red-900"
                          >
                            Reset to Defaults
                          </button>
                        </div>
                        <div className="space-y-3">
                          {playerAnalysis.teamSummaries.map((team, index) => {
                            const currentColor = getTeamColorClasses(team.entryId, index);
                            return (
                              <div key={team.entryId} className="flex items-center gap-3">
                                <div className="w-48 font-medium text-sm truncate">
                                  {team.teamName}
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                  {COLOR_OPTIONS.map((color) => (
                                    <button
                                      key={color.name}
                                      onClick={() => setTeamColor(team.entryId, color.classes)}
                                      className={`w-8 h-8 rounded border-2 ${color.preview} ${currentColor === color.classes
                                        ? 'border-gray-900 ring-2 ring-gray-400'
                                        : 'border-gray-300 hover:border-gray-500'
                                        }`}
                                      title={color.name}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {playerAnalysis.teamSummaries.map((team, index) => {
                        const colorClasses = getTeamColorClasses(team.entryId, index);
                        const isExpanded = expandedTeams.has(team.entryId);
                        return (
                          <div
                            key={team.entryId}
                            className={`p-4 rounded-lg border-2 ${colorClasses}`}
                          >
                            <div
                              className="flex justify-between items-start mb-3 cursor-pointer"
                              onClick={() => toggleTeam(team.entryId)}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-lg mt-0.5">
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                                <div>
                                  <div className="font-semibold text-lg">{team.teamName}</div>
                                  <div className="text-sm opacity-75">{team.managerName}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold">{team.totalPoints}</div>
                                <div className="text-xs opacity-75">total pts</div>
                              </div>
                            </div>

                            {isExpanded && (
                              <>
                                <div className="space-y-1 text-sm max-h-96 overflow-y-auto">
                                  {team.players.map((player, pIndex) => (
                                    <div
                                      key={pIndex}
                                      className="flex justify-between items-center py-1 border-b border-current border-opacity-20"
                                    >
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="font-mono text-xs opacity-60 w-20 flex-shrink-0">{player.position}</span>
                                        <span className="font-medium truncate">{player.name}</span>
                                      </div>
                                      <span className="font-semibold ml-2 flex-shrink-0">{player.points}</span>
                                    </div>
                                  ))}
                                </div>

                                <div className="mt-3 pt-3 border-t border-current border-opacity-30 text-xs opacity-75">
                                  {team.playerCount} players • Avg: {team.averagePoints} pts
                                </div>
                              </>
                            )}

                            {!isExpanded && (
                              <div className="text-xs opacity-75">
                                {team.playerCount} players • Avg: {team.averagePoints} pts
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Players Table */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="mb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            All Players
                          </h3>
                          <div className="flex gap-4 mt-2 text-sm">
                            <p className="text-gray-600">
                              Total: {playerAnalysis.totalPlayers} players
                            </p>
                            <p className="text-red-600 font-medium">
                              Owned: {playerAnalysis.ownedPlayers}
                            </p>
                            <p className="text-green-600 font-medium">
                              Available: {playerAnalysis.availablePlayers}
                            </p>
                          </div>
                        </div>

                        {/* Filters */}
                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-3">
                          {/* Team Filter */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-700">Teams</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={showAllTeams}
                                  className="px-2 py-0.5 text-xs bg-white hover:bg-gray-100 border border-gray-300 rounded"
                                >
                                  All
                                </button>
                                <button
                                  onClick={hideAllTeams}
                                  className="px-2 py-0.5 text-xs bg-white hover:bg-gray-100 border border-gray-300 rounded"
                                >
                                  None
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {playerAnalysis.teamSummaries.map((team, index) => {
                                const colorClasses = getTeamColorClasses(team.entryId, index);
                                const bgColor = colorClasses.split(' ')[0];
                                return (
                                  <label
                                    key={team.entryId}
                                    className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-100 p-1 rounded"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={visibleTeams.has(team.entryId)}
                                      onChange={() => toggleTeamVisibility(team.entryId)}
                                      className="rounded"
                                    />
                                    <span className={`w-3 h-3 rounded ${bgColor} flex-shrink-0`}></span>
                                    <span className="truncate" title={team.teamName}>
                                      {team.shortName}
                                    </span>
                                  </label>
                                );
                              })}
                              <label className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-100 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={visibleTeams.has('unowned')}
                                  onChange={() => toggleTeamVisibility('unowned')}
                                  className="rounded"
                                />
                                <span className="w-3 h-3 rounded bg-gray-200 flex-shrink-0"></span>
                                <span>Unowned</span>
                              </label>
                            </div>
                          </div>

                          {/* Position Filter */}
                          <div className="pt-3 border-t border-gray-300">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-700">Positions</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={showAllPositions}
                                  className="px-2 py-0.5 text-xs bg-white hover:bg-gray-100 border border-gray-300 rounded"
                                >
                                  All
                                </button>
                                <button
                                  onClick={hideAllPositions}
                                  className="px-2 py-0.5 text-xs bg-white hover:bg-gray-100 border border-gray-300 rounded"
                                >
                                  None
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {[
                                { name: 'Goalkeeper', abbr: 'GKP' },
                                { name: 'Defender', abbr: 'DEF' },
                                { name: 'Midfielder', abbr: 'MID' },
                                { name: 'Forward', abbr: 'FWD' }
                              ].map(pos => (
                                <label
                                  key={pos.name}
                                  className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-100 p-1 rounded"
                                >
                                  <input
                                    type="checkbox"
                                    checked={visiblePositions.has(pos.name)}
                                    onChange={() => togglePositionVisibility(pos.name)}
                                    className="rounded"
                                  />
                                  <span className="font-mono">{pos.abbr}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Rank
                            </th>
                            <th
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('name')}
                            >
                              <div className="flex items-center gap-1">
                                Player <SortIcon column="name" />
                              </div>
                            </th>
                            <th
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('position')}
                            >
                              <div className="flex items-center gap-1">
                                Pos <SortIcon column="position" />
                              </div>
                            </th>
                            <th
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('team')}
                            >
                              <div className="flex items-center gap-1">
                                Team <SortIcon column="team" />
                              </div>
                            </th>
                            <th
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('totalPoints')}
                            >
                              <div className="flex items-center gap-1">
                                Total Pts <SortIcon column="totalPoints" />
                              </div>
                            </th>
                            <th
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('pointsPerGame')}
                            >
                              <div className="flex items-center gap-1">
                                Pts/Game <SortIcon column="pointsPerGame" />
                              </div>
                            </th>
                            <th
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('form')}
                            >
                              <div className="flex items-center gap-1">
                                Form <SortIcon column="form" />
                              </div>
                            </th>
                            <th
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('owned')}
                            >
                              <div className="flex items-center gap-1">
                                Status <SortIcon column="owned" />
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getSortedPlayers().map((player, index) => (
                            <tr
                              key={player.id}
                              className={`${getTeamColor(player.ownerId)} border-l-4 ${getTeamBorderColor(player.ownerId)}`}
                            >
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {index + 1}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {player.name}
                                {player.owned && (
                                  <span className="ml-2 text-xs text-red-600">
                                    (Owned{player.owner ? `: ${player.owner}` : ''})
                                  </span>
                                )}
                                {!player.owned && (
                                  <span className="ml-2 text-xs text-green-600">
                                    (Available)
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {player.position}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {player.team}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                                {player.totalPoints}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {player.pointsPerGame}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {player.form}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {player.status === 'a' ? '✓' : player.status}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 text-sm text-gray-500">
                      Players are color-coded by their fantasy team owner. Grey = Available on waivers.
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
