import type { Platform, PubgPlayer, PlayerRankData, RankedStats } from "@/types";

const PUBG_API_BASE = "https://api.pubg.com/shards";
const API_KEY = process.env.PUBG_API_KEY!;

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  Accept: "application/vnd.api+json",
};

export async function getCurrentSeason(platform: Platform = "steam"): Promise<string> {
  const res = await fetch(`${PUBG_API_BASE}/${platform}/seasons`, {
    headers,
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`시즌 조회 실패: ${res.status}`);

  const data = await res.json();
  const current = data.data?.find(
    (s: { attributes: { isCurrentSeason: boolean } }) => s.attributes.isCurrentSeason
  );

  if (!current) throw new Error("현재 시즌을 찾을 수 없습니다.");
  return current.id;
}

function parseRankedStats(modeData: Record<string, unknown> | null): RankedStats | null {
  if (!modeData) return null;
  const stats = modeData.stats as Record<string, unknown>;
  if (!stats || (stats.roundsPlayed as number) === 0) return null;

  return {
    currentRankPoint: stats.currentRankPoint as number,
    bestRankPoint: stats.bestRankPoint as number,
    currentTier: stats.currentTier as { tier: import("@/types").RankTier; subTier: string },
    bestTier: stats.bestTier as { tier: import("@/types").RankTier; subTier: string },
    roundsPlayed: stats.roundsPlayed as number,
    wins: stats.wins as number,
    kills: stats.kills as number,
    damageDealt: stats.damageDealt as number,
  };
}

export async function getPlayerRankedStats(
  playerId: string,
  platform: Platform = "steam",
  season?: string
): Promise<PlayerRankData> {
  const seasonId = season ?? (await getCurrentSeason(platform));

  const res = await fetch(
    `${PUBG_API_BASE}/${platform}/players/${playerId}/seasons/${seasonId}/ranked`,
    { headers, next: { revalidate: 300 } }
  );

  if (!res.ok) {
    if (res.status === 404) throw new Error("해당 시즌 데이터가 없습니다.");
    throw new Error(`랭크 데이터 조회 실패: ${res.status}`);
  }

  const data = await res.json();
  const attrs = data.data?.attributes?.rankedGameModeStats ?? {};

  return {
    playerId,
    playerName: "",
    platform,
    season: seasonId,
    squadFpp: parseRankedStats(attrs["squad-fpp"] ?? null),
    squadTpp: parseRankedStats(attrs["squad"] ?? null),
    fetchedAt: new Date().toISOString(),
  };
}
