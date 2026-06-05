import type { RankedStats } from "@/types";

interface Props {
  label: string;
  stats: RankedStats;
}

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex flex-col gap-1">
    <span className="text-white/40 text-xs font-medium uppercase tracking-wider">
      {label}
    </span>
    <span className="text-white font-bold text-lg">{value}</span>
  </div>
);

export default function SeasonStats({ label, stats }: Props) {
  return (
    <div className="card flex flex-col gap-4">
      <h3 className="text-pubg-gold font-bold text-sm uppercase tracking-wider">
        {label}
      </h3>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="라운드" value={stats.roundsPlayed} />
        <Stat label="승리" value={stats.wins} />
        <Stat label="KDA" value={stats.kda.toFixed(2)} />
        <Stat label="킬" value={stats.kills} />
        <Stat label="어시스트" value={stats.assists} />
        <Stat label="평균 순위" value={`#${stats.avgRank.toFixed(1)}`} />
      </div>

      <div className="pt-2 border-t border-white/10 flex justify-between text-sm text-white/40">
        <span>최고 RP: {stats.bestRankPoint.toLocaleString()}</span>
        <span>
          최고 티어: {stats.bestTier.tier} {stats.bestTier.subTier}
        </span>
      </div>
    </div>
  );
}
