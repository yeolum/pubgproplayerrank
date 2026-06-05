import { getSupabaseAdmin, upsertPlayerRecord } from "./supabase";
import { getPlayerRankedStats, getCurrentSeason } from "./pubg";
import type { SteamPlayer } from "@/types";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 62000;

const MODES = [
  { key: "squadFpp" as const, mode: "squad-fpp" },
  { key: "squadTpp" as const, mode: "squad" },
];

async function processPlayer(player: SteamPlayer, season: string) {
  if (!player.pubg_player_id) throw new Error("PUBG 계정 ID 미등록");

  const rankData = await getPlayerRankedStats(player.pubg_player_id, "steam", season);

  for (const { key, mode } of MODES) {
    const stats = rankData[key];
    if (!stats) continue;
    await upsertPlayerRecord({
      player_id:     player.pubg_player_id,
      player_name:   player.steam_username,
      platform:      "steam",
      season,
      mode,
      current_rp:    stats.currentRankPoint,
      best_rp:       stats.bestRankPoint,
      current_tier:  `${stats.currentTier.tier} ${stats.currentTier.subTier}`,
      best_tier:     `${stats.bestTier.tier} ${stats.bestTier.subTier}`,
      rounds_played: stats.roundsPlayed,
      wins:          stats.wins,
      kills:         stats.kills,
      damage_dealt:  stats.damageDealt,
      fetched_at:    rankData.fetchedAt,
    });
  }
}

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

  for (let i = 0; i < typedPlayers.length; i += BATCH_SIZE) {
    if (i > 0) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));

    const batch = typedPlayers.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((player) => processPlayer(player, season))
    );

    for (const [j, result] of batchResults.entries()) {
      const player = batch[j];
      if (result.status === "fulfilled") {
        results.success++;
      } else {
        results.failed++;
        const msg = result.reason instanceof Error ? result.reason.message : "오류";
        results.errors.push(`${player.player_name}: ${msg}`);
      }
    }
  }

  return { ...results, season, processedAt: new Date().toISOString() };
}
