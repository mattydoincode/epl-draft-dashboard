'use client';

import { useState } from 'react';

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

interface TeamSummary {
  entryId: number;
  teamName: string;
  shortName: string;
}

interface PlayerAnalysis {
  totalPlayers: number;
  ownedPlayers: number;
  availablePlayers: number;
  players: Player[];
  teamSummaries: TeamSummary[];
}

interface PlayerTableProps {
  playerAnalysis: PlayerAnalysis;
  getTeamColorClasses: (entryId: number, index: number) => string;
  getPlayerBorderColor: (ownerId: number | null) => string;
  getTeamColor: (ownerId: number | null) => string;
}

export default function PlayerTable({ playerAnalysis, getTeamColorClasses, getPlayerBorderColor, getTeamColor }: PlayerTableProps) {
  const [sortColumn, setSortColumn] = useState<keyof Player>('totalPoints');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [visibleTeams, setVisibleTeams] = useState<Set<number | 'unowned'>>(new Set());
  const [visiblePositions, setVisiblePositions] = useState<Set<string>>(new Set());

  const handleSort = (column: keyof Player) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      if (column === 'name' || column === 'position' || column === 'team' || column === 'owner') {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  const getSortedPlayers = () => {
    let filtered = playerAnalysis.players;

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

    if (visiblePositions.size > 0) {
      filtered = filtered.filter(player => visiblePositions.has(player.position));
    }

    const sorted = [...filtered].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortColumn === 'totalPoints' || sortColumn === 'form' || sortColumn === 'pointsPerGame') {
        aVal = parseFloat(String(aVal)) || 0;
        bVal = parseFloat(String(bVal)) || 0;
      }

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
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

  const showAllTeams = () => {
    const allTeams = new Set<number | 'unowned'>([
      ...playerAnalysis.teamSummaries.map(t => t.entryId),
      'unowned'
    ]);
    setVisibleTeams(allTeams);
  };

  const hideAllTeams = () => {
    setVisibleTeams(new Set());
  };

  const showAllPositions = () => {
    setVisiblePositions(new Set(['Goalkeeper', 'Defender', 'Midfielder', 'Forward']));
  };

  const hideAllPositions = () => {
    setVisiblePositions(new Set());
  };

  const sortedPlayers = getSortedPlayers();

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'a':
        return <span className="text-green-600 font-medium">✓ Fit</span>;
      case 'd':
        return <span className="text-yellow-600 font-medium">? Doubtful</span>;
      case 'i':
        return <span className="text-red-600 font-medium">✗ Injured</span>;
      case 'u':
        return <span className="text-red-600 font-medium">✗ Unavailable</span>;
      case 's':
        return <span className="text-red-600 font-medium">✗ Suspended</span>;
      case 'n':
        return <span className="text-gray-500 font-medium">- Not Available</span>;
      default:
        return <span className="text-gray-500">{status}</span>;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-4">
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

        {/* Filters - Full Width Below */}
        <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-6">
            {/* Team Filter */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Filter by Team</span>
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
              <div className="grid grid-cols-3 gap-2 text-xs">
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
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Filter by Position</span>
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
                Name {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('position')}
              >
                Position {sortColumn === 'position' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('team')}
              >
                Team {sortColumn === 'team' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalPoints')}
              >
                Total Points {sortColumn === 'totalPoints' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('form')}
              >
                Form {sortColumn === 'form' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('pointsPerGame')}
              >
                PPG {sortColumn === 'pointsPerGame' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('owner')}
              >
                Owner {sortColumn === 'owner' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedPlayers.map((player, index) => {
              const teamName = player.owned 
                ? playerAnalysis.teamSummaries.find(t => t.entryId === player.ownerId)?.teamName 
                : null;
              return (
                <tr
                  key={player.id}
                  className={`hover:opacity-90 border-l-4 ${getPlayerBorderColor(player.ownerId)} ${getTeamColor(player.ownerId)}`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {player.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {player.position}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {player.team}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                    {player.totalPoints}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {player.form}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {player.pointsPerGame}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {getStatusDisplay(player.status)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {player.owned ? (
                      <span className="font-medium">
                        {teamName || player.owner || 'Owned'}
                      </span>
                    ) : (
                      <span className="text-green-600 font-medium">Free Agent</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

