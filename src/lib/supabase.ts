import { createClient } from "@supabase/supabase-js";
import type { DbPlayerRecord, LeaderboardEntry, SteamPlayer } from "@/types";

// 모듈 로드 시점이 아닌 첫 호출 시점에 초기화 (빌드 타임 오류 방지)
let _supabase: ReturnType<typeof createClient> | null = null;
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabase(): any {
  return (_supabase ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseAdmin(): any {
  return (_supabaseAdmin ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ));
}

// ── RP 기록 ─────────────────────────────────────────────

export async function upsertPlayerRecord(record: DbPlayerRecord) {
  const { error } = await getSupabaseAdmin()
    .from("Steam_player_ranks")
    .upsert(
      {
        player_id: record.player_id,
        player_name: record.player_name,
        platform: record.platform,
        season: record.season,
        mode: record.mode,
        current_rp: record.current_rp,
        best_rp: record.best_rp,
        current_tier: record.current_tier,
        best_tier: record.best_tier,
        rounds_played: record.rounds_played,
        wins: record.wins,
        kills: record.kills,
        damage_dealt: record.damage_dealt,
        fetched_at: record.fetched_at,
      },
      { onConflict: "player_id,season,mode" }
    );

  if (error) throw new Error(`Supabase upsert 실패: ${error.message}`);
}

// ── 리더보드 ─────────────────────────────────────────────

export async function getLeaderboard(mode = "squad-fpp"): Promise<LeaderboardEntry[]> {
  const { data: rawPlayers, error: pe } = await getSupabase()
    .from("Steam_players")
    .select("*")
    .eq("is_active", true)
    .order("team_name")
    .order("player_name");

  if (pe) throw new Error(`선수 조회 실패: ${pe.message}`);

  const players = (rawPlayers ?? []) as SteamPlayer[];
  if (!players.length) return [];

  const pubgIds = players
    .map((p: SteamPlayer) => p.pubg_player_id)
    .filter(Boolean) as string[];

  const rankMap = new Map<string, DbPlayerRecord>();

  if (pubgIds.length > 0) {
    const { data: rawRanks } = await getSupabase()
      .from("Steam_player_ranks")
      .select("*")
      .eq("mode", mode)
      .in("player_id", pubgIds)
      .order("fetched_at", { ascending: false });

    for (const r of (rawRanks ?? []) as DbPlayerRecord[]) {
      if (!rankMap.has(r.player_id)) rankMap.set(r.player_id, r);
    }
  }

  const merged: LeaderboardEntry[] = players.map((p: SteamPlayer) => {
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
  const { data, error } = await getSupabaseAdmin()
    .from("Steam_players")
    .select("*")
    .order("team_name")
    .order("player_name");

  if (error) throw new Error(error.message);
  return (data ?? []) as SteamPlayer[];
}
