import type { RankTier } from "@/types";

const TIER_COLORS: Record<RankTier, string> = {
  Bronze: "text-amber-700 bg-amber-900/30 border-amber-700/50",
  Silver: "text-slate-300 bg-slate-700/30 border-slate-500/50",
  Gold: "text-yellow-400 bg-yellow-900/30 border-yellow-500/50",
  Platinum: "text-cyan-300 bg-cyan-900/30 border-cyan-500/50",
  Diamond: "text-blue-300 bg-blue-900/30 border-blue-500/50",
  Master: "text-purple-300 bg-purple-900/30 border-purple-500/50",
  Grandmaster: "text-pubg-gold bg-yellow-900/30 border-pubg-gold/50",
};

interface Props {
  tier: RankTier;
  subTier: string;
  rp: number;
}

export default function RankBadge({ tier, subTier, rp }: Props) {
  const colorClass = TIER_COLORS[tier] ?? TIER_COLORS.Bronze;

  return (
    <div
      className={`inline-flex flex-col items-center px-4 py-3 rounded-xl border ${colorClass}`}
    >
      <span className="text-xs font-medium opacity-70 mb-1">현재 랭크</span>
      <span className="text-xl font-black tracking-tight">
        {tier} {subTier !== "I" ? subTier : ""}
      </span>
      <span className="text-2xl font-black mt-1">{rp.toLocaleString()} RP</span>
    </div>
  );
}
