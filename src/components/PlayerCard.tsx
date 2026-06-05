import type { PlayerRankData } from "@/types";
import RankBadge from "./RankBadge";
import SeasonStats from "./SeasonStats";
import type { RankTier } from "@/types";

interface Props {
  data: PlayerRankData;
}

const MODE_LABELS = {
  squadFpp: "스쿼드 FPP",
  squadTpp: "스쿼드 TPP",
  soloFpp: "솔로 FPP",
  soloTpp: "솔로 TPP",
} as const;

export default function PlayerCard({ data }: Props) {
  const modes = (["squadFpp", "squadTpp", "soloFpp", "soloTpp"] as const).filter(
    (m) => data[m] !== null
  );

  if (modes.length === 0) {
    return (
      <div className="card text-white/60 text-center py-12">
        이번 시즌 경쟁전 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {modes.map((mode) => {
        const stats = data[mode]!;
        return (
          <div key={mode} className="flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-white font-bold text-lg">{MODE_LABELS[mode]}</h3>
              <RankBadge
                tier={stats.currentTier.tier as RankTier}
                subTier={stats.currentTier.subTier}
                rp={stats.currentRankPoint}
              />
            </div>
            <SeasonStats label={MODE_LABELS[mode]} stats={stats} />
          </div>
        );
      })}

      <p className="text-white/30 text-xs text-right">
        조회 시각: {new Date(data.fetchedAt).toLocaleString("ko-KR")} · 시즌: {data.season}
      </p>
    </div>
  );
}
