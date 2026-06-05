import { createClient } from "@supabase/supabase-js";
import type { DbPlayerRecord, LeaderboardEntry, SteamPlayer } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// ── RP 기록 ─────────────────────────────────────────────

export async function upsertPlayerRecord(record: DbPlayerRecord) {
  const { error } = await supabaseAdmin
    .from("Steam_player_ranks")
    .upsert(record, { onConflict: "player_id,season,mode" });

  if (error) throw new Error(`Supabase upsert 실패: ${error.message}`);
}

// ── 리더보드 ─────────────────────────────────────────────

export async function getLeaderboard(mode = "squad-fpp"): Promise<LeaderboardEntry[]> {
  const { data: players, error: pe } = await supabase
    .from("Steam_players")
    .select("*")
    .eq("is_active", true)
    .order("team_name")
    .order("player_name");

  if (pe) throw new Error(`선수 조회 실패: ${pe.message}`);
  if (!players?.length) return [];

  const pubgIds = players
    .map((p) => p.pubg_player_id)
    .filter(Boolean) as string[];

  let rankMap = new Map<string, DbPlayerRecord>();

  if (pubgIds.length > 0) {
    const { data: ranks } = await supabase
      .from("Steam_player_ranks")
      .select("*")
      .eq("mode", mode)
      .in("player_id", pubgIds)
      .order("fetched_at", { ascending: false });

    for (const r of ranks ?? []) {
      if (!rankMap.has(r.player_id)) rankMap.set(r.player_id, r);
    }
  }

  const merged: LeaderboardEntry[] = players.map((p) => {
    const rank = p.pubg_player_id ? rankMap.get(p.pubg_player_id) ?? null : null;
    return {
      ...p,
      current_rp: rank?.current_rp ?? null,
      best_rp: rank?.best_rp ?? null,
      current_tier: rank?.current_tier ?? null,
      best_tier: rank?.best_tier ?? null,
      rounds_played: rank?.rounds_played ?? null,
      wins: rank?.wins ?? null,
      kills: rank?.kills ?? null,
      kda: rank?.kda ?? null,
      season: rank?.season ?? null,
      fetched_at: rank?.fetched_at ?? null,
    };
  });

  return merged.sort((a, b) => {
    if (a.current_rp === null && b.current_rp === null) return 0;
    if (a.current_rp === null) return 1;
    if (b.current_rp === null) return -1;
    return b.current_rp - a.current_rp;
  });
}

// ── 선수 관리 (어드민) ─────────────────────────────────

export async function getAllPlayers(): Promise<SteamPlayer[]> {
  const { data, error } = await supabaseAdmin
    .from("Steam_players")
    .select("*")
    .order("team_name")
    .order("player_name");

  if (error) throw new Error(error.message);
  return data ?? [];
}
