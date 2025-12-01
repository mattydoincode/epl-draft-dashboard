'use client';

import { useState } from 'react';

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

interface TeamSummariesProps {
  teamSummaries: TeamSummary[];
  teamColors: { [entryId: number]: string };
  onColorChange: (entryId: number, color: string) => void;
  onResetColors: () => void;
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

export default function TeamSummaries({ teamSummaries, teamColors, onColorChange, onResetColors }: TeamSummariesProps) {
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'leaguePoints' | 'totalPoints'>('leaguePoints');

  const getTeamColorClasses = (entryId: number, index: number): string => {
    const customColor = teamColors[entryId];
    if (customColor) return customColor;
    return DEFAULT_TEAM_COLORS[index % DEFAULT_TEAM_COLORS.length];
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
    setExpandedTeams(new Set(teamSummaries.map(t => t.entryId)));
  };

  const collapseAll = () => {
    setExpandedTeams(new Set());
  };

  // Create a stable mapping of entryId to original index for consistent colors
  const entryIdToIndex = new Map<number, number>();
  teamSummaries.forEach((team, index) => {
    entryIdToIndex.set(team.entryId, index);
  });

  const getSortedTeams = () => {
    return [...teamSummaries].sort((a, b) => {
      if (sortBy === 'leaguePoints') {
        if (b.leaguePoints !== a.leaguePoints) {
          return b.leaguePoints - a.leaguePoints;
        }
        return b.totalPoints - a.totalPoints;
      } else {
        return b.totalPoints - a.totalPoints;
      }
    });
  };

  const sortedTeams = getSortedTeams();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Team Summaries
          </h3>
          <div className="flex gap-1">
            <button
              onClick={() => setSortBy('leaguePoints')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                sortBy === 'leaguePoints'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Sort by LP
            </button>
            <button
              onClick={() => setSortBy('totalPoints')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                sortBy === 'totalPoints'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Sort by Points
            </button>
          </div>
        </div>
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
              onClick={onResetColors}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
          <div className="space-y-3">
            {teamSummaries.map((team) => {
              const stableIndex = entryIdToIndex.get(team.entryId) || 0;
              const currentColor = getTeamColorClasses(team.entryId, stableIndex);
              return (
                <div key={team.entryId} className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded border-2 ${currentColor} text-sm font-medium min-w-32`}>
                    {team.shortName}
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {COLOR_OPTIONS.map((color) => (
                      <div
                        key={color.name}
                        onClick={() => onColorChange(team.entryId, color.classes)}
                        className={`w-8 h-8 rounded cursor-pointer border-2 ${color.preview} ${currentColor === color.classes
                          ? 'border-gray-800 ring-2 ring-gray-400'
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
      
      <div className="space-y-4">
        {sortedTeams.map((team) => {
          const stableIndex = entryIdToIndex.get(team.entryId) || 0;
          const colorClasses = getTeamColorClasses(team.entryId, stableIndex);
          const isExpanded = expandedTeams.has(team.entryId);
          return (
            <div
              key={team.entryId}
              className={`p-4 rounded-lg border-2 ${colorClasses}`}
            >
              <div
                className="cursor-pointer"
                onClick={() => toggleTeam(team.entryId)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <div className="font-semibold text-lg truncate">{team.teamName}</div>
                    <div className="text-sm opacity-75 flex-shrink-0">{team.managerName}</div>
                    {isExpanded && team.matchResults.length > 0 && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {team.matchResults.map((result, idx) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold leading-none ${result === 'W'
                              ? 'bg-green-600 text-white'
                              : result === 'L'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-400 text-white'
                              }`}
                            title={`Week ${idx + 1}: ${result === 'W' ? 'Win' : result === 'L' ? 'Loss' : 'Draw'}`}
                          >
                            {result}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-baseline gap-2 justify-end">
                      <div>
                        <span className="text-2xl font-bold">{team.totalPoints}</span>
                        <span className="text-xs opacity-75 ml-1">pts</span>
                      </div>
                      <div className="text-sm font-semibold text-blue-700">{team.leaguePoints} LP</div>
                    </div>
                    {isExpanded && (
                      <div className="text-xs opacity-60 mt-1">
                        {team.wins}W-{team.draws}D-{team.losses}L
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {isExpanded && (
                <>
                  <div className="space-y-1 text-sm max-h-96 overflow-y-auto mt-3">
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
                    Avg: {team.averagePoints} pts per player
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

