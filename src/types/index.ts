export type Platform = "steam" | "kakao" | "xbox" | "psn" | "stadia";

export type RankTier =
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond"
  | "Master"
  | "Grandmaster"
  | "Survivor";

export interface PubgPlayer {
  id: string;
  name: string;
  platform: Platform;
}

export interface RankedStats {
  currentRankPoint: number;
  bestRankPoint: number;
  currentTier: { tier: RankTier; subTier: string };
  bestTier: { tier: RankTier; subTier: string };
  roundsPlayed: number;
  wins: number;
  kills: number;
  damageDealt: number;
}

export interface PlayerRankData {
  playerId: string;
  playerName: string;
  platform: Platform;
  season: string;
  squadFpp: RankedStats | null;
  squadTpp: RankedStats | null;
  fetchedAt: string;
}

export interface DbPlayerRecord {
  id?: number;
  player_id: string;
  player_name: string;
  platform: Platform;
  season: string;
  mode: string;
  current_rp: number;
  best_rp: number;
  current_tier: string;
  best_tier: string;
  rounds_played: number;
  wins: number;
  kills: number;
  damage_dealt: number;
  fetched_at: string;
  created_at?: string;
}

export interface SteamPlayer {
  id: number;
  team_name: string;
  player_name: string;
  steam_username: string;
  pubg_player_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry extends SteamPlayer {
  current_rp: number | null;
  best_rp: number | null;
  current_tier: string | null;
  best_tier: string | null;
  rounds_played: number | null;
  wins: number | null;
  kills: number | null;
  damage_dealt: number | null;
  season: string | null;
  fetched_at: string | null;
}
