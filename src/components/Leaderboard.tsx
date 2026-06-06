"use client";

import React, { useState, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import type { LeaderboardEntry } from "@/types";

// ─── Supabase anon client (read-only, lazy) ───────────────────────────────────
let _sb: ReturnType<typeof createClient> | null = null;
function getSB() {
  return (_sb ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));
}

// ─── Tier ────────────────────────────────────────────────────────────────────
type TierKey =
  | "Survivor" | "Master" | "Grandmaster"
  | "Diamond"  | "Platinum" | "Gold"
  | "Silver"   | "Bronze";

const TIER: Record<TierKey, { text: string; badge: string; line: string }> = {
  Survivor:    { text: "text-red-400",    badge: "text-red-400 border-red-400/50",       line: "#f87171" },
  Master:      { text: "text-purple-400", badge: "text-purple-400 border-purple-400/50", line: "#c084fc" },
  Grandmaster: { text: "text-[#F5A623]",  badge: "text-[#F5A623] border-yellow-500/50",  line: "#F5A623" },
  Diamond:     { text: "text-blue-400",   badge: "text-blue-400 border-blue-400/50",     line: "#60a5fa" },
  Platinum:    { text: "text-cyan-300",   badge: "text-cyan-300 border-cyan-300/50",     line: "#67e8f9" },
  Gold:        { text: "text-yellow-400", badge: "text-yellow-400 border-yellow-400/50", line: "#facc15" },
  Silver:      { text: "text-slate-300",  badge: "text-slate-300 border-slate-300/50",   line: "#cbd5e1" },
  Bronze:      { text: "text-amber-600",  badge: "text-amber-600 border-amber-600/50",   line: "#d97706" },
};

function getTier(tier: string | null) {
  if (!tier) return null;
  return TIER[tier.split(" ")[0] as TierKey] ?? null;
}

// ─── Team logo ────────────────────────────────────────────────────────────────
const CHIP_COLORS = [
  "bg-blue-900/60 text-blue-300",
  "bg-purple-900/60 text-purple-300",
  "bg-red-900/60 text-red-300",
  "bg-green-900/60 text-green-300",
  "bg-orange-900/60 text-orange-300",
  "bg-teal-900/60 text-teal-300",
  "bg-pink-900/60 text-pink-300",
];

function chipColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  return CHIP_COLORS[h % CHIP_COLORS.length];
}

function abbr(name: string) {
  return name.split(/[\s.]+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function TeamLogo({ team, size = 24 }: { team: string; size?: number }) {
  const [err, setErr] = useState(false);
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/teams/${encodeURIComponent(team)}.png`;

  if (err) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full text-[9px] font-bold shrink-0 ${chipColor(team)}`}
        style={{ width: size, height: size }}
      >
        {abbr(team)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={team}
      width={size}
      height={size}
      loading="lazy"
      className="rounded object-contain shrink-0"
      style={{ width: size, height: size }}
      onError={() => setErr(true)}
    />
  );
}

// ─── Tier badge ───────────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-white/20 text-[11px]">—</span>;
  const cfg = getTier(tier);
  if (!cfg) return <span className="text-white/40 text-[11px]">{tier}</span>;
  return (
    <span className={`text-[11px] font-semibold border rounded px-1.5 py-0.5 whitespace-nowrap ${cfg.badge}`}>
      {tier}
    </span>
  );
}

// ─── Rank change ──────────────────────────────────────────────────────────────
function RankChange({ prev, curr }: { prev: number | null; curr: number }) {
  if (prev === null) return <span className="text-white/20 text-[10px]">–</span>;
  const diff = prev - curr;
  if (diff > 0) return <span className="text-green-400 text-[10px] font-semibold">▲{diff}</span>;
  if (diff < 0) return <span className="text-red-400 text-[10px] font-semibold">▼{Math.abs(diff)}</span>;
  return <span className="text-white/20 text-[10px]">–</span>;
}

// ─── RP chart (inline SVG) ────────────────────────────────────────────────────
type HP = { current_rp: number; recorded_at: string };

function RPChart({ data, lineColor }: { data: HP[]; lineColor: string }) {
  if (data.length < 2) {
    return <p className="text-white/30 text-sm text-center py-4">추이 데이터가 아직 없습니다</p>;
  }

  const W = 560, H = 90;
  const P = { t: 8, r: 16, b: 20, l: 46 };
  const iw = W - P.l - P.r;
  const ih = H - P.t - P.b;

  const rps = data.map(d => d.current_rp);
  const ts  = data.map(d => new Date(d.recorded_at).getTime());
  const minR = Math.min(...rps), maxR = Math.max(...rps);
  const minT = Math.min(...ts),  maxT = Math.max(...ts);

  const sx = (t: number) =>
    P.l + (maxT === minT ? iw / 2 : ((t - minT) / (maxT - minT)) * iw);
  const sy = (r: number) =>
    P.t + (maxR === minR ? ih / 2 : (1 - (r - minR) / (maxR - minR)) * ih);

  const pts = data
    .map(d => `${sx(new Date(d.recorded_at).getTime()).toFixed(1)},${sy(d.current_rp).toFixed(1)}`)
    .join(" ");

  const delta = rps[rps.length - 1] - rps[0];
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", timeZone: "Asia/Seoul" });

  return (
    <div>
      <div className="flex flex-wrap gap-4 text-xs mb-2">
        <span className={delta >= 0 ? "text-green-400" : "text-red-400"}>
          {delta >= 0 ? "+" : ""}{delta} RP
        </span>
        <span className="text-white/30">최저 {minR.toLocaleString()}</span>
        <span className="text-white/30">최고 {maxR.toLocaleString()}</span>
        <span className="text-white/20 text-[10px]">
          {fmtDate(data[0].recorded_at)} – {fmtDate(data[data.length - 1].recorded_at)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }}>
        <line x1={P.l} y1={P.t} x2={P.l} y2={P.t + ih} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
        <line x1={P.l} y1={P.t + ih} x2={P.l + iw} y2={P.t + ih} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
        <text x={P.l - 4} y={P.t + 5}      textAnchor="end" fontSize={8} fill="rgba(255,255,255,0.3)">{maxR}</text>
        <text x={P.l - 4} y={P.t + ih + 1} textAnchor="end" fontSize={8} fill="rgba(255,255,255,0.3)">{minR}</text>
        <polyline
          points={pts}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={sx(ts[ts.length - 1])}
          cy={sy(rps[rps.length - 1])}
          r={3}
          fill={lineColor}
        />
      </svg>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function avgDmg(dmg: number | null, rounds: number | null) {
  if (!dmg || !rounds || rounds === 0) return "—";
  return Math.round(dmg / rounds).toLocaleString();
}

function relTime(iso: string | null) {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

// ─── Podium ───────────────────────────────────────────────────────────────────
const PODIUM_STYLE = [
  { cssOrder: "order-2", label: "1위", border: "border-yellow-400/50", labelColor: "text-yellow-400", rpColor: "text-yellow-400" },
  { cssOrder: "order-1", label: "2위", border: "border-slate-400/30",  labelColor: "text-slate-300",  rpColor: "text-slate-200"  },
  { cssOrder: "order-3", label: "3위", border: "border-amber-700/40",  labelColor: "text-amber-600",  rpColor: "text-amber-500"  },
];

function PodiumCard({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const s = PODIUM_STYLE[rank - 1];
  return (
    <div className={`flex-1 min-w-[110px] rounded-xl border ${s.border} bg-white/[0.03] p-4 flex flex-col items-center gap-1.5 ${s.cssOrder}`}>
      <span className={`text-[10px] font-bold uppercase tracking-widest ${s.labelColor}`}>{s.label}</span>
      <TeamLogo team={entry.team_name} size={38} />
      <span className="text-white font-bold text-sm text-center leading-tight w-full truncate text-center">
        {entry.player_name}
      </span>
      <span className="text-white/30 text-[10px] w-full truncate text-center">{entry.team_name}</span>
      {entry.current_rp != null && (
        <span className={`text-xl font-black tabular-nums mt-0.5 ${s.rpColor}`}>
          {entry.current_rp.toLocaleString()}
        </span>
      )}
      <TierBadge tier={entry.current_tier} />
    </div>
  );
}

// ─── Sort ─────────────────────────────────────────────────────────────────────
type SortKey = "current_rp" | "rounds_played" | "kills" | "avg_damage";

// ─── Main ─────────────────────────────────────────────────────────────────────
interface Props {
  entries: LeaderboardEntry[];
}

export default function Leaderboard({ entries }: Props) {
  const [query,          setQuery         ] = useState("");
  const [sortKey,        setSortKey       ] = useState<SortKey | null>(null);
  const [expandedIds,    setExpandedIds   ] = useState<Set<string>>(new Set());
  const [historyData,    setHistoryData   ] = useState<Map<string, HP[]>>(new Map());
  const [historyLoading, setHistoryLoading] = useState<Set<string>>(new Set());
  const cache = useRef<Map<string, HP[]>>(new Map());

  const ranked   = entries.filter(e => e.current_rp != null);
  const unranked = entries.filter(e => e.current_rp == null);

  // RP-order rank (fixed regardless of current sort)
  const rpRank = new Map(ranked.map((e, i) => [e.id, i + 1]));

  const latestUpdate = entries.reduce<string | null>((max, e) => {
    if (!e.fetched_at) return max;
    return !max || e.fetched_at > max ? e.fetched_at : max;
  }, null);

  // Filter
  const q = query.toLowerCase();
  const filtered = ranked.filter(e =>
    !q ||
    e.player_name.toLowerCase().includes(q) ||
    e.team_name.toLowerCase().includes(q)
  );

  // Sort
  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let av: number, bv: number;
        if (sortKey === "avg_damage") {
          av = a.damage_dealt && a.rounds_played ? a.damage_dealt / a.rounds_played : 0;
          bv = b.damage_dealt && b.rounds_played ? b.damage_dealt / b.rounds_played : 0;
        } else {
          av = (a[sortKey] as number | null) ?? 0;
          bv = (b[sortKey] as number | null) ?? 0;
        }
        return bv - av;
      })
    : filtered;

  const toggleSort = (key: SortKey) => setSortKey(prev => (prev === key ? null : key));

  const toggleExpand = useCallback(async (entry: LeaderboardEntry) => {
    const pid = entry.pubg_player_id;
    if (!pid) return;

    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });

    if (cache.current.has(pid)) return;

    setHistoryLoading(prev => new Set(prev).add(pid));

    const { data } = await getSB()
      .from("rp_history")
      .select("current_rp, recorded_at")
      .eq("player_id", pid)
      .order("recorded_at", { ascending: true })
      .limit(60);

    const points: HP[] = data ?? [];
    cache.current.set(pid, points);
    setHistoryData(prev => new Map(prev).set(pid, points));
    setHistoryLoading(prev => { const s = new Set(prev); s.delete(pid); return s; });
  }, []);

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 text-center py-16 text-white/40">
        등록된 선수가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">경쟁전 리더보드</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-white/30 text-xs tracking-wide">스쿼드 · TPP</span>
            {latestUpdate && (
              <span className="text-white/20 text-xs">{relTime(latestUpdate)} 갱신</span>
            )}
          </div>
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="선수·팀 검색"
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/25 w-44 transition-colors"
        />
      </div>

      {/* ── Podium (top 3, 2위|1위|3위 순서) ── */}
      {ranked.length >= 3 && !query && (
        <div className="flex gap-3">
          {([ranked[0], ranked[1], ranked[2]] as LeaderboardEntry[]).map((e, i) => (
            <PodiumCard key={e.id} entry={e} rank={i + 1} />
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-xl border border-white/10 bg-[#16213E] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="sticky top-0 z-10 bg-[#16213E]">
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left text-white/40 w-14">#</th>
                <th className="px-4 py-3 text-left text-white/40">선수</th>
                <th className="px-4 py-3 text-left text-white/40 whitespace-nowrap">티어</th>
                <th className="px-4 py-3 text-right text-white/40">
                  <button
                    onClick={() => toggleSort("current_rp")}
                    className={`hover:text-white transition-colors ${sortKey === "current_rp" ? "text-[#F5A623]" : ""}`}
                  >
                    RP{sortKey === "current_rp" ? " ↓" : ""}
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-white/40 hidden sm:table-cell">
                  <button
                    onClick={() => toggleSort("rounds_played")}
                    className={`hover:text-white transition-colors ${sortKey === "rounds_played" ? "text-[#F5A623]" : ""}`}
                  >
                    게임{sortKey === "rounds_played" ? " ↓" : ""}
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-white/40 hidden sm:table-cell">
                  <button
                    onClick={() => toggleSort("kills")}
                    className={`hover:text-white transition-colors ${sortKey === "kills" ? "text-[#F5A623]" : ""}`}
                  >
                    킬{sortKey === "kills" ? " ↓" : ""}
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-white/40 hidden sm:table-cell">
                  <button
                    onClick={() => toggleSort("avg_damage")}
                    className={`hover:text-white transition-colors ${sortKey === "avg_damage" ? "text-[#F5A623]" : ""}`}
                  >
                    평뎀{sortKey === "avg_damage" ? " ↓" : ""}
                  </button>
                </th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(entry => {
                const rank    = rpRank.get(entry.id) ?? 0;
                const pid     = entry.pubg_player_id ?? "";
                const open    = expandedIds.has(pid);
                const loading = historyLoading.has(pid);
                const history = historyData.get(pid) ?? null;
                const cfg     = getTier(entry.current_tier);

                return (
                  <React.Fragment key={entry.id}>
                    <tr
                      onClick={() => toggleExpand(entry)}
                      className={`border-b border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer ${open ? "bg-white/[0.04]" : ""}`}
                    >
                      {/* Rank # */}
                      <td className="px-4 py-3">
                        <div className={`font-bold tabular-nums leading-tight ${rank <= 3 ? "text-[#F5A623] text-base" : "text-white/40 text-sm"}`}>
                          #{rank}
                        </div>
                        <div className="mt-0.5">
                          <RankChange prev={entry.previous_rank} curr={rank} />
                        </div>
                      </td>

                      {/* Player & team */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TeamLogo team={entry.team_name} size={24} />
                          <div className="min-w-0">
                            <div className="text-white font-semibold text-sm leading-tight">
                              {entry.player_name}
                            </div>
                            <div className="text-white/30 text-[10px] truncate max-w-[100px]">
                              {entry.team_name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tier */}
                      <td className="px-4 py-3">
                        <TierBadge tier={entry.current_tier} />
                        {entry.best_tier && (
                          <div className="text-[9px] text-white/20 mt-0.5 whitespace-nowrap">
                            최고 {entry.best_tier}
                          </div>
                        )}
                      </td>

                      {/* RP */}
                      <td className="px-4 py-3 text-right">
                        <div className={`font-black text-base tabular-nums ${cfg?.text ?? "text-white"}`}>
                          {entry.current_rp?.toLocaleString()}
                        </div>
                        {entry.best_rp != null && (
                          <div className="text-[9px] text-white/20 mt-0.5 tabular-nums">
                            최고 {entry.best_rp.toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Games */}
                      <td className="px-4 py-3 text-right text-white/35 text-xs tabular-nums hidden sm:table-cell">
                        {entry.rounds_played ?? "—"}
                      </td>

                      {/* Kills */}
                      <td className="px-4 py-3 text-right text-white/35 text-xs tabular-nums hidden sm:table-cell">
                        {entry.kills ?? "—"}
                      </td>

                      {/* Avg damage */}
                      <td className="px-4 py-3 text-right text-white/35 text-xs tabular-nums hidden sm:table-cell">
                        {avgDmg(entry.damage_dealt, entry.rounds_played)}
                      </td>

                      {/* Chevron */}
                      <td className="px-4 py-3">
                        <svg
                          viewBox="0 0 24 24" width={14} height={14}
                          className={`text-white/25 transition-transform duration-200 ml-auto ${open ? "rotate-180" : ""}`}
                          fill="none" stroke="currentColor" strokeWidth={2.5}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </td>
                    </tr>

                    {/* Expand: RP chart */}
                    {open && (
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <td colSpan={8} className="px-6 py-4">
                          {loading ? (
                            <div className="flex items-center gap-2 text-white/30 text-sm py-2">
                              <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                              </svg>
                              불러오는 중...
                            </div>
                          ) : history && history.length > 0 ? (
                            <RPChart data={history} lineColor={cfg?.line ?? "#60a5fa"} />
                          ) : (
                            <p className="text-white/25 text-sm text-center py-2">
                              추이 데이터가 아직 없습니다
                            </p>
                          )}
                          {/* Mobile: 숨겨진 통계 표시 */}
                          <div className="flex flex-wrap gap-4 mt-3 text-xs text-white/30 sm:hidden">
                            <span>게임 {entry.rounds_played ?? "—"}</span>
                            <span>킬 {entry.kills ?? "—"}</span>
                            <span>평뎀 {avgDmg(entry.damage_dealt, entry.rounds_played)}</span>
                            {entry.wins != null && <span>승리 {entry.wins}</span>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Unranked ── */}
      {unranked.length > 0 && !query && (
        <div>
          <p className="text-white/20 text-xs font-semibold uppercase tracking-widest mb-2">
            미배치 · 이번 시즌 랭크 기록 없음
          </p>
          <div className="rounded-xl border border-white/5 overflow-hidden opacity-40">
            <table className="w-full">
              <tbody>
                {unranked.map(e => (
                  <tr key={e.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <TeamLogo team={e.team_name} size={20} />
                        <span className="text-white text-sm">{e.player_name}</span>
                        <span className="text-white/30 text-xs">{e.team_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-white/20 text-xs">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
