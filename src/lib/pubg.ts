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
  if (!modeData.roundsPlayed || (modeData.roundsPlayed as number) === 0) return null;

  return {
    currentRankPoint: modeData.currentRankPoint as number,
    bestRankPoint: modeData.bestRankPoint as number,
    currentTier: modeData.currentTier as { tier: import("@/types").RankTier; subTier: string },
    bestTier: modeData.bestTier as { tier: import("@/types").RankTier; subTier: string },
    roundsPlayed: modeData.roundsPlayed as number,
    wins: modeData.wins as number,
    kills: modeData.kills as number,
    damageDealt: modeData.damageDealt as number,
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
