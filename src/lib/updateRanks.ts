import { getSupabaseAdmin, upsertPlayerRecord } from "./supabase";
import { getPlayerRankedStats, getCurrentSeason } from "./pubg";
import type { SteamPlayer } from "@/types";

const MODES = [
  { key: "squadFpp" as const, mode: "squad-fpp" },
  { key: "squadTpp" as const, mode: "squad" },
];

export async function updateAllRanks() {
  const { data: players, error } = await getSupabaseAdmin()
    .from("Steam_players")
    .select("*")
    .eq("is_active", true);

  if (error) throw error;

  const typedPlayers = (players ?? []) as SteamPlayer[];
  if (!typedPlayers.length) return { success: 0, failed: 0, errors: [] as string[] };

  const season = await getCurrentSeason("steam");
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (let i = 0; i < typedPlayers.length; i++) {
    // PUBG API 레이트 리밋: 분당 10요청 → 7초 간격
    if (i > 0) await new Promise((r) => setTimeout(r, 7000));

    const player = typedPlayers[i];
    try {
      if (!player.pubg_player_id) {
        results.errors.push(`${player.player_name}: PUBG 계정 ID 미등록`);
        results.failed++;
        continue;
      }

      const resolvedId = player.pubg_player_id;
      const rankData = await getPlayerRankedStats(resolvedId, "steam", season);

      for (const { key, mode } of MODES) {
        const stats = rankData[key];
        if (!stats) continue;
        await upsertPlayerRecord({
          player_id: resolvedId,
          player_name: player.steam_username,
          platform: "steam",
          season,
          mode,
          current_rp: stats.currentRankPoint,
          best_rp: stats.bestRankPoint,
          current_tier: `${stats.currentTier.tier} ${stats.currentTier.subTier}`,
          best_tier: `${stats.bestTier.tier} ${stats.bestTier.subTier}`,
          rounds_played: stats.roundsPlayed,
          wins: stats.wins,
          kills: stats.kills,
          damage_dealt: stats.damageDealt,
          fetched_at: rankData.fetchedAt,
        });
      }

      results.success++;
    } catch (e) {
      results.failed++;
      results.errors.push(
        `${player.player_name}: ${e instanceof Error ? e.message : "오류"}`
      );
    }
  }

  return { ...results, season, processedAt: new Date().toISOString() };
}
