import type { LeaderboardEntry, RankTier } from "@/types";

const TIER_COLOR: Record<string, string> = {
  Bronze: "text-amber-600",
  Silver: "text-slate-300",
  Gold: "text-yellow-400",
  Platinum: "text-cyan-300",
  Diamond: "text-blue-300",
  Master: "text-purple-300",
  Grandmaster: "text-pubg-gold",
  Survivor: "text-red-400",
};

function tierColor(tier: string | null) {
  if (!tier) return "text-white/30";
  const t = tier.split(" ")[0] as RankTier;
  return TIER_COLOR[t] ?? "text-white/60";
}

function rankBadge(pos: number) {
  if (pos === 1) return "🥇";
  if (pos === 2) return "🥈";
  if (pos === 3) return "🥉";
  return `#${pos}`;
}

function avgDamage(damage: number | null, rounds: number | null): string {
  if (!damage || !rounds || rounds === 0) return "—";
  return Math.round(damage / rounds).toLocaleString();
}

interface Props {
  entries: LeaderboardEntry[];
}

export default function Leaderboard({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="card text-center py-16 text-white/40">
        등록된 선수가 없습니다. 어드민 페이지에서 선수를 추가해주세요.
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-white/40 text-xs uppercase tracking-wider border-b border-white/10">
            <th className="pb-3 pr-4 w-10">순위</th>
            <th className="pb-3 pr-4">팀</th>
            <th className="pb-3 pr-4">선수명</th>
            <th className="pb-3 pr-4">현재 티어</th>
            <th className="pb-3 pr-4 text-right">현재 RP</th>
            <th className="pb-3 pr-4">최고 티어</th>
            <th className="pb-3 pr-4 text-right">최고 RP</th>
            <th className="pb-3 pr-4 text-right">게임</th>
            <th className="pb-3 pr-4 text-right">승리</th>
            <th className="pb-3 pr-4 text-right">킬</th>
            <th className="pb-3 text-right">평균 데미지</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr
              key={entry.id}
              className="border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <td className="py-4 pr-4">
                <span className={`font-bold ${i < 3 ? "text-lg" : "text-white/40 text-sm"}`}>
                  {rankBadge(i + 1)}
                </span>
              </td>
              <td className="py-4 pr-4 text-white/60 text-sm">{entry.team_name}</td>
              <td className="py-4 pr-4">
                <span className="text-white font-semibold">{entry.player_name}</span>
              </td>
              <td className={`py-4 pr-4 font-bold ${tierColor(entry.current_tier)}`}>
                {entry.current_tier ?? (
                  <span className="text-white/20 font-normal">미플레이</span>
                )}
              </td>
              <td className="py-4 pr-4 text-right">
                <span className="text-white font-black text-base">
                  {entry.current_rp !== null ? entry.current_rp.toLocaleString() : "—"}
                </span>
              </td>
              <td className={`py-4 pr-4 text-sm ${tierColor(entry.best_tier)}`}>
                {entry.best_tier ?? "—"}
              </td>
              <td className="py-4 pr-4 text-right text-white/60">
                {entry.best_rp !== null ? entry.best_rp.toLocaleString() : "—"}
              </td>
              <td className="py-4 pr-4 text-right text-white/50">
                {entry.rounds_played ?? "—"}
              </td>
              <td className="py-4 pr-4 text-right text-white/70">
                {entry.wins ?? "—"}
              </td>
              <td className="py-4 pr-4 text-right text-white/70">
                {entry.kills ?? "—"}
              </td>
              <td className="py-4 text-right text-white/70">
                {avgDamage(entry.damage_dealt, entry.rounds_played)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {entries[0]?.fetched_at && (
        <p className="text-white/20 text-xs text-right mt-4">
          마지막 갱신: {new Date(entries[0].fetched_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST
        </p>
      )}
    </div>
  );
}
