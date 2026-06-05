import { getSupabaseAdmin, upsertPlayerRecord } from "./supabase";
import { getPlayerRankedStats, getCurrentSeason, getPlayer } from "./pubg";
import type { SteamPlayer } from "@/types";

const MODES = [
  { key: "squadFpp" as const, mode: "squad-fpp" },
  { key: "squadTpp" as const, mode: "squad" },
  { key: "soloFpp" as const, mode: "solo-fpp" },
  { key: "soloTpp" as const, mode: "solo" },
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

  for (const player of typedPlayers) {
    try {
      let playerId: string | null = player.pubg_player_id;

      if (!playerId) {
        const found = await getPlayer(player.steam_username, "steam");
        playerId = found.id;
        await getSupabaseAdmin()
          .from("Steam_players")
          .update({ pubg_player_id: playerId, updated_at: new Date().toISOString() })
          .eq("id", player.id);
      }

      // if 블록에서 할당했으므로 이 시점에는 항상 string
      const resolvedId = playerId as string;
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
          kills: stats.kills,
          wins: stats.wins,
          kda: stats.kda,
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
