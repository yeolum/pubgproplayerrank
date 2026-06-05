import { notFound } from "next/navigation";
import { getPlayer, getPlayerRankedStats } from "@/lib/pubg";
import { upsertPlayerRecord } from "@/lib/supabase";
import PlayerCard from "@/components/PlayerCard";
import type { Platform } from "@/types";

interface Props {
  params: { name: string };
  searchParams: { platform?: string };
}

export default async function PlayerPage({ params, searchParams }: Props) {
  const platform = (searchParams.platform ?? "steam") as Platform;
  const decodedName = decodeURIComponent(params.name);

  let playerData;
  try {
    const player = await getPlayer(decodedName, platform);
    const rankData = await getPlayerRankedStats(player.id, platform);
    rankData.playerName = player.name;

    // Supabase에 저장
    const modes = [
      { key: "squadFpp", mode: "squad-fpp" },
      { key: "squadTpp", mode: "squad" },
      { key: "soloFpp", mode: "solo-fpp" },
      { key: "soloTpp", mode: "solo" },
    ] as const;

    for (const { key, mode } of modes) {
      const stats = rankData[key];
      if (!stats) continue;
      await upsertPlayerRecord({
        player_id: player.id,
        player_name: player.name,
        platform,
        season: rankData.season,
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

    playerData = rankData;
  } catch (e) {
    if (e instanceof Error && e.message.includes("찾을 수 없습니다")) {
      notFound();
    }
    throw e;
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-white">
        {playerData.playerName}
        <span className="ml-3 text-sm font-normal text-white/40 uppercase">
          {platform}
        </span>
      </h2>
      <PlayerCard data={playerData} />
    </div>
  );
}
