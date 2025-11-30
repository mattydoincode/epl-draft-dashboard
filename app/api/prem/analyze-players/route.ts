import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

interface Player {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  total_points: number;
  element_type: number;
  team: number;
  form: string;
  points_per_game: string;
  status: string;
  event_points: number;
}

interface BootstrapData {
  elements: Player[];
  element_types: Array<{ id: number; singular_name: string; plural_name: string }>;
  teams: Array<{ id: number; name: string; short_name: string }>;
}

interface ElementStatus {
  element: number;
  owner: number | null;
  status: string;
}

interface LeagueEntry {
  entry_id: number;
  entry_name: string;
  player_first_name: string;
  player_last_name: string;
  short_name: string;
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

export async function GET() {
  try {
    // Read bootstrap-static data
    const bootstrapPath = path.join(DATA_DIR, 'bootstrap-static.json');
    if (!fs.existsSync(bootstrapPath)) {
      return NextResponse.json(
        { error: 'Bootstrap data not loaded. Please load basic data first.' },
        { status: 404 }
      );
    }

    console.log('[Backend] Reading bootstrap-static data for player analysis');
    const data: BootstrapData = JSON.parse(fs.readFileSync(bootstrapPath, 'utf-8'));

    // Read element-status data (ownership)
    const elementStatusFiles = fs.readdirSync(DATA_DIR).filter(f => f.includes('element-status'));
    let ownershipMap = new Map<number, number | null>();
    
    if (elementStatusFiles.length > 0) {
      const elementStatusPath = path.join(DATA_DIR, elementStatusFiles[0]);
      const elementStatusData: { element_status: ElementStatus[] } = JSON.parse(
        fs.readFileSync(elementStatusPath, 'utf-8')
      );
      
      elementStatusData.element_status.forEach(es => {
        ownershipMap.set(es.element, es.owner);
      });
      
      console.log(`[Backend] Loaded ownership data for ${ownershipMap.size} players`);
    }

    // Read league details (team names)
    const leagueDetailsFiles = fs.readdirSync(DATA_DIR).filter(f => f.includes('details'));
    let teamNameMap = new Map<number, LeagueEntry>();
    
    if (leagueDetailsFiles.length > 0) {
      const leagueDetailsPath = path.join(DATA_DIR, leagueDetailsFiles[0]);
      const leagueDetailsData: { league_entries: LeagueEntry[] } = JSON.parse(
        fs.readFileSync(leagueDetailsPath, 'utf-8')
      );
      
      leagueDetailsData.league_entries.forEach(entry => {
        teamNameMap.set(entry.entry_id, entry);
      });
      
      console.log(`[Backend] Loaded ${teamNameMap.size} team names`);
    }

    const players = data.elements;
    const elementTypes = data.element_types || [];
    const teams = data.teams || [];

    // Create lookup maps
    const positionMap = Object.fromEntries(
      elementTypes.map(et => [et.id, et.singular_name])
    );
    const teamMap = Object.fromEntries(
      teams.map(t => [t.id, t.short_name])
    );

    // Calculate team summaries
    const teamStats = new Map<number, {
      players: Player[];
      totalPoints: number;
    }>();

    players.forEach(p => {
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

    const positionOrder: { [key: number]: number } = { 1: 1, 2: 2, 3: 3, 4: 4 }; // GKP, DEF, MID, FWD

    const teamSummaries: TeamSummary[] = Array.from(teamStats.entries()).map(([entryId, stats]) => {
      const entry = teamNameMap.get(entryId);
      
      const teamPlayers: TeamPlayer[] = stats.players
        .map(p => ({
          name: p.web_name,
          position: positionMap[p.element_type] || 'Unknown',
          points: p.total_points,
          positionOrder: positionOrder[p.element_type] || 99,
        }))
        .sort((a, b) => {
          // First sort by position
          if (a.positionOrder !== b.positionOrder) {
            return a.positionOrder - b.positionOrder;
          }
          // Then by points (descending)
          return b.points - a.points;
        });

      return {
        entryId,
        teamName: entry?.entry_name || `Team ${entryId}`,
        managerName: entry ? `${entry.player_first_name} ${entry.player_last_name}` : 'Unknown',
        shortName: entry?.short_name || '??',
        totalPoints: stats.totalPoints,
        playerCount: stats.players.length,
        players: teamPlayers,
        averagePoints: Math.round(stats.totalPoints / stats.players.length),
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    // Sort players by total_points descending and add ownership info
    const rankedPlayers = players
      .map(p => {
        const ownerId = ownershipMap.get(p.id);
        const ownerEntry = ownerId ? teamNameMap.get(ownerId) : null;
        
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
          owned: ownerId !== null && ownerId !== undefined,
          owner: ownerEntry?.entry_name || null,
          ownerId: ownerId || null,
          ownerShortName: ownerEntry?.short_name || null,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints);

    const ownedCount = rankedPlayers.filter(p => p.owned).length;
    const availableCount = rankedPlayers.filter(p => !p.owned).length;

    console.log(`[Backend] Analyzed ${rankedPlayers.length} players (${ownedCount} owned, ${availableCount} available)`);
    console.log(`[Backend] Generated ${teamSummaries.length} team summaries`);

    return NextResponse.json({
      totalPlayers: rankedPlayers.length,
      ownedPlayers: ownedCount,
      availablePlayers: availableCount,
      players: rankedPlayers,
      teamSummaries,
      positionTypes: elementTypes.map(et => ({
        id: et.id,
        name: et.singular_name,
        plural: et.plural_name,
      })),
    });
  } catch (error) {
    console.error('[Backend] Error analyzing players:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
