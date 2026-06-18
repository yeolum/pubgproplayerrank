"use client";

import React, { useState, useCallback, useRef, useMemo, useId } from "react";
import { createClient } from "@supabase/supabase-js";
import type { LeaderboardEntry, DbPlayerRecord } from "@/types";

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
  | "Crystal"  | "Diamond" | "Platinum" | "Gold"
  | "Silver"   | "Bronze";

// bg 10%, border 30%, text 100% — 크림 배경용
const TIER: Record<TierKey, { text: string; badge: string; line: string }> = {
  Survivor:    { text: "text-[#C0392B]", badge: "text-[#C0392B] border-[rgba(192,57,43,0.3)]  bg-[rgba(192,57,43,0.1)]",   line: "#C0392B" },
  Master:      { text: "text-[#5E47A0]", badge: "text-[#5E47A0] border-[rgba(94,71,160,0.3)]  bg-[rgba(94,71,160,0.1)]",   line: "#5E47A0" },
  Grandmaster: { text: "text-[#B5651D]", badge: "text-[#B5651D] border-[rgba(181,101,29,0.3)] bg-[rgba(181,101,29,0.1)]",  line: "#B5651D" },
  Crystal:     { text: "text-[#0E9EBF]", badge: "text-[#0E9EBF] border-[rgba(14,158,191,0.3)] bg-[rgba(14,158,191,0.1)]",  line: "#0E9EBF" },
  Diamond:     { text: "text-[#2E6FB0]", badge: "text-[#2E6FB0] border-[rgba(46,111,176,0.3)] bg-[rgba(46,111,176,0.1)]",  line: "#2E6FB0" },
  Platinum:    { text: "text-[#1A8A6E]", badge: "text-[#1A8A6E] border-[rgba(26,138,110,0.3)] bg-[rgba(26,138,110,0.1)]",  line: "#1A8A6E" },
  Gold:        { text: "text-[#9B6B0C]", badge: "text-[#9B6B0C] border-[rgba(155,107,12,0.3)] bg-[rgba(155,107,12,0.1)]",  line: "#9B6B0C" },
  Silver:      { text: "text-[#7A7060]", badge: "text-[#7A7060] border-[rgba(122,112,96,0.3)] bg-[rgba(122,112,96,0.1)]",  line: "#7A7060" },
  Bronze:      { text: "text-[#8B5E3C]", badge: "text-[#8B5E3C] border-[rgba(139,94,60,0.3)]  bg-[rgba(139,94,60,0.1)]",   line: "#8B5E3C" },
};

function getTier(tier: string | null) {
  if (!tier) return null;
  return TIER[tier.split(" ")[0] as TierKey] ?? null;
}

// ─── Team logo ────────────────────────────────────────────────────────────────
const CHIP_COLORS = [
  "bg-[rgba(46,111,176,0.1)]  text-[#2E6FB0]",
  "bg-[rgba(94,71,160,0.1)]   text-[#5E47A0]",
  "bg-[rgba(192,57,43,0.1)]   text-[#C0392B]",
  "bg-[rgba(26,138,110,0.1)]  text-[#1A8A6E]",
  "bg-[rgba(181,101,29,0.1)]  text-[#B5651D]",
  "bg-[rgba(155,107,12,0.1)]  text-[#9B6B0C]",
  "bg-[rgba(139,94,60,0.1)]   text-[#8B5E3C]",
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
  const fileName = team.replace(/\s+/g, "_");
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/teams/${encodeURIComponent(fileName)}.png`;

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
  if (!tier) return <span className="text-[11px]" style={{ color: "var(--faint)" }}>—</span>;
  const cfg = getTier(tier);
  if (!cfg) return <span className="text-[11px]" style={{ color: "var(--muted)" }}>{tier}</span>;
  return (
    <span className={`text-[11px] font-semibold border rounded px-1.5 py-0.5 whitespace-nowrap ${cfg.badge}`}>
      {tier}
    </span>
  );
}

// ─── Rank change ──────────────────────────────────────────────────────────────
function RankChange({ prev, curr }: { prev: number | null; curr: number }) {
  if (prev === null) return <span className="text-[10px]" style={{ color: "var(--faint)" }}>–</span>;
  const diff = prev - curr;
  if (diff > 0) return <span className="text-[10px] font-semibold" style={{ color: "var(--up)" }}>▲{diff}</span>;
  if (diff < 0) return <span className="text-[10px] font-semibold" style={{ color: "var(--down)" }}>▼{Math.abs(diff)}</span>;
  return <span className="text-[10px]" style={{ color: "var(--faint)" }}>–</span>;
}

// ─── RP chart helpers ────────────────────────────────────────────────────────
function genYTicks(min: number, max: number, target: number): number[] {
  if (min === max) return [min];
  const range = max - min;
  const rough = range / target;
  const mag   = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm  = rough / mag;
  const nice  = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
  const step  = nice * mag;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.01; v += step) ticks.push(Math.round(v));
  return ticks;
}

function sampleIdx(count: number, max: number): number[] {
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  const out  = new Set([0, count - 1]);
  const step = (count - 1) / (max - 1);
  for (let i = 1; i < max - 1; i++) out.add(Math.round(i * step));
  return [...out].sort((a, b) => a - b);
}

// ─── RP chart (inline SVG) ────────────────────────────────────────────────────
type HP = { current_rp: number; recorded_at: string };

function RPChart({ data, lineColor }: { data: HP[]; lineColor: string }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const uid = useId();

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const p = new Intl.DateTimeFormat("en-US", {
      month: "2-digit", day: "2-digit",
      hour: "2-digit", hour12: false,
      timeZone: "Asia/Seoul",
    }).formatToParts(d);
    const v = (t: string) => p.find(x => x.type === t)?.value ?? "";
    return `${v("month")}.${v("day")} ${v("hour")}시`;
  };

  if (data.length === 0) {
    return <p className="text-sm text-center py-4" style={{ color: "var(--faint)" }}>추이 데이터가 아직 없습니다</p>;
  }

  if (data.length === 1) {
    return (
      <div className="flex items-center gap-3 py-2 text-xs">
        <span className="font-bold tabular-nums" style={{ color: lineColor, fontSize: 15 }}>
          {data[0].current_rp.toLocaleString()} RP
        </span>
        <span style={{ color: "var(--faint)" }}>
          {fmtDate(data[0].recorded_at)} 기준 · 데이터 1건
        </span>
      </div>
    );
  }

  // ── Layout ──────────────────────────────────────────────────────────────────
  const W = 560, H = 160;
  const P = { t: 14, r: 20, b: 40, l: 54 };
  const iw = W - P.l - P.r;
  const ih = H - P.t - P.b;

  // ── Data ────────────────────────────────────────────────────────────────────
  const rps  = data.map(d => d.current_rp);
  const minR = Math.min(...rps), maxR = Math.max(...rps);

  // ── Scale ───────────────────────────────────────────────────────────────────
  const yPad = maxR === minR ? 100 : (maxR - minR) * 0.18;
  const loY  = minR - yPad, hiY = maxR + yPad;

  // X축: 포인트별 균등 간격 (라벨 가독성 우선)
  const sx = (i: number) =>
    data.length <= 1 ? P.l + iw / 2 : P.l + (i / (data.length - 1)) * iw;
  const sy = (r: number) => P.t + (1 - (r - loY) / (hiY - loY)) * ih;

  // ── Derived ─────────────────────────────────────────────────────────────────
  const pts      = data.map((_, i) => [sx(i), sy(rps[i])] as [number, number]);
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1][0].toFixed(1)},${(P.t + ih).toFixed(1)} L ${pts[0][0].toFixed(1)},${(P.t + ih).toFixed(1)} Z`;
  const yTicks   = genYTicks(minR, maxR, 4);
  const xLabels  = sampleIdx(data.length, 6);
  const delta    = rps[rps.length - 1] - rps[0];
  const gradId   = `rpg${uid.replace(/:/g, "")}`;

  const fmtY = (v: number) => v.toLocaleString();

  return (
    <div>
      {/* ── 요약 ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 text-xs mb-3">
        <span style={{ color: delta >= 0 ? "var(--up)" : "var(--down)" }}>
          {delta >= 0 ? "+" : ""}{delta.toLocaleString()} RP
        </span>
        <span style={{ color: "var(--faint)" }}>최저 {minR.toLocaleString()}</span>
        <span style={{ color: "var(--faint)" }}>최고 {maxR.toLocaleString()}</span>
        <span className="text-[10px]" style={{ color: "var(--faint)" }}>
          {fmtDate(data[0].recorded_at)} – {fmtDate(data[data.length - 1].recorded_at)}
        </span>
      </div>

      {/* ── SVG ─────────────────────────────────────────────────────────────── */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H, overflow: "visible" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={lineColor} stopOpacity={0.22} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Y 그리드 */}
        {yTicks.map(v => {
          const y = sy(v);
          if (y < P.t - 1 || y > P.t + ih + 1) return null;
          return (
            <g key={v}>
              <line
                x1={P.l} y1={y} x2={P.l + iw} y2={y}
                stroke="var(--line)" strokeWidth={0.5} strokeDasharray="4 3" opacity={0.5}
              />
              <text x={P.l - 5} y={y + 3.5} textAnchor="end" fontSize={9}
                style={{ fill: "var(--faint)" }}>
                {fmtY(v)}
              </text>
            </g>
          );
        })}

        {/* 축 선 */}
        <line x1={P.l} y1={P.t}      x2={P.l}      y2={P.t + ih} stroke="var(--line)" strokeWidth={1} />
        <line x1={P.l} y1={P.t + ih} x2={P.l + iw} y2={P.t + ih} stroke="var(--line)" strokeWidth={1} />

        {/* 영역 채우기 */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* 꺾은선 */}
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" />

        {/* 데이터 포인트 */}
        {pts.map((p, i) => {
          const isLast    = i === pts.length - 1;
          const isHovered = i === hoveredIdx;
          return (
            <g key={i}>
              <circle cx={p[0]} cy={p[1]} r={10} fill="transparent"
                style={{ cursor: "crosshair" }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onTouchStart={() => setHoveredIdx(prev => prev === i ? null : i)}
              />
              <circle
                cx={p[0]} cy={p[1]}
                r={isLast || isHovered ? 4 : 2.5}
                fill={isHovered || isLast ? lineColor : "var(--panel-2)"}
                stroke={lineColor}
                strokeWidth={isLast || isHovered ? 2 : 1.5}
                style={{ pointerEvents: "none" }}
              />
            </g>
          );
        })}

        {/* X축 라벨 */}
        {xLabels.map(i => (
          <text key={i} x={pts[i][0]} y={P.t + ih + 18}
            textAnchor="middle" fontSize={9} style={{ fill: "var(--faint)" }}>
            {fmtDate(data[i].recorded_at)}
          </text>
        ))}

        {/* 툴팁 */}
        {hoveredIdx !== null && (() => {
          const hx          = pts[hoveredIdx][0];
          const hy          = pts[hoveredIdx][1];
          const rpV         = rps[hoveredIdx];
          const date        = fmtDate(data[hoveredIdx].recorded_at);
          const tw          = 104;
          const th          = 40;
          const tx          = Math.max(P.l + 2, Math.min(hx - tw / 2, P.l + iw - tw - 2));
          const aboveEnough = hy - th - 10 >= P.t;
          const ty          = aboveEnough ? hy - th - 10 : hy + 12;
          return (
            <g style={{ pointerEvents: "none" }}>
              <line
                x1={hx} y1={aboveEnough ? ty + th : ty}
                x2={hx} y2={aboveEnough ? hy - 5  : hy + 5}
                stroke={lineColor} strokeWidth={1} strokeDasharray="2 2" opacity={0.45}
              />
              <rect x={tx} y={ty} width={tw} height={th} rx={5}
                fill="var(--text)" opacity={0.9} />
              <text x={tx + tw / 2} y={ty + 14} textAnchor="middle" fontSize={9}
                style={{ fill: "var(--panel)", opacity: 0.7 }}>
                {date}
              </text>
              <text x={tx + tw / 2} y={ty + 29} textAnchor="middle" fontSize={12}
                fontWeight="bold" style={{ fill: "var(--panel)" }}>
                {rpV.toLocaleString()} RP
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

// ─── Season label ─────────────────────────────────────────────────────────────
function formatSeason(s: string): string {
  const m = s.match(/(\d+)$/);
  if (m) return `${parseInt(m[1])}시즌`;
  return s;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function avgDmg(dmg: number | null, rounds: number | null) {
  if (!dmg || !rounds || rounds === 0) return "—";
  return Math.round(dmg / rounds).toLocaleString();
}

function avgKills(kills: number | null, rounds: number | null) {
  if (kills == null || !rounds || rounds === 0) return "—";
  return (kills / rounds).toFixed(2);
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
  { cssOrder: "order-2", label: "1위", borderColor: "rgba(181,101,29,0.45)", labelColor: "var(--accent)", rpColor: "var(--accent)"  },
  { cssOrder: "order-1", label: "2위", borderColor: "var(--line)",           labelColor: "var(--muted)",  rpColor: "var(--text)"    },
  { cssOrder: "order-3", label: "3위", borderColor: "var(--line)",           labelColor: "var(--faint)",  rpColor: "var(--muted)"   },
];

function PodiumCard({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const s = PODIUM_STYLE[rank - 1];
  return (
    <div
      className={`flex-1 min-w-[110px] rounded-xl p-4 flex flex-col items-center gap-1.5 border ${s.cssOrder}`}
      style={{ backgroundColor: "var(--panel)", borderColor: s.borderColor }}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: s.labelColor }}>
        {s.label}
      </span>
      <TeamLogo team={entry.team_name} size={38} />
      <span className="text-sm font-bold text-center leading-tight w-full truncate text-center" style={{ color: "var(--text)" }}>
        {entry.player_name}
      </span>
      <span className="text-[10px] w-full truncate text-center" style={{ color: "var(--faint)" }}>
        {entry.team_name}
      </span>
      {entry.current_rp != null && (
        <span className="text-xl font-black tabular-nums mt-0.5" style={{ color: s.rpColor }}>
          {entry.current_rp.toLocaleString()}
        </span>
      )}
      <TierBadge tier={entry.current_tier} />
    </div>
  );
}

// ─── Team aggregation ─────────────────────────────────────────────────────────
interface TeamEntry {
  team_name: string;
  total_rp: number;
  total_games: number;
  total_kills: number;
}

function aggregateByTeam(players: LeaderboardEntry[]): TeamEntry[] {
  const map = new Map<string, TeamEntry>();
  for (const p of players) {
    if (p.current_rp == null) continue;
    const prev = map.get(p.team_name);
    if (prev) {
      prev.total_rp    += p.current_rp;
      prev.total_games += p.rounds_played ?? 0;
      prev.total_kills += p.kills ?? 0;
    } else {
      map.set(p.team_name, {
        team_name:   p.team_name,
        total_rp:    p.current_rp,
        total_games: p.rounds_played ?? 0,
        total_kills: p.kills ?? 0,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total_rp - a.total_rp);
}

// ─── Team podium card ─────────────────────────────────────────────────────────
function TeamPodiumCard({ team, rank }: { team: TeamEntry; rank: number }) {
  const s = PODIUM_STYLE[rank - 1];
  return (
    <div
      className={`flex-1 min-w-[110px] rounded-xl p-4 flex flex-col items-center gap-1.5 border ${s.cssOrder}`}
      style={{ backgroundColor: "var(--panel)", borderColor: s.borderColor }}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: s.labelColor }}>
        {s.label}
      </span>
      <TeamLogo team={team.team_name} size={38} />
      <span className="text-sm font-bold text-center leading-tight w-full truncate" style={{ color: "var(--text)" }}>
        {team.team_name}
      </span>
      <span className="text-xl font-black tabular-nums mt-0.5" style={{ color: s.rpColor }}>
        {team.total_rp.toLocaleString()}
      </span>
    </div>
  );
}

// ─── Sort ─────────────────────────────────────────────────────────────────────
type SortKey = "current_rp" | "rounds_played" | "kills" | "avg_kills" | "avg_damage";

// ─── Main ─────────────────────────────────────────────────────────────────────
interface Props {
  entries: LeaderboardEntry[];
  seasons: string[];
  currentSeason: string | null;
}

export default function Leaderboard({ entries, seasons, currentSeason }: Props) {
  const [viewMode,       setViewMode      ] = useState<"player" | "team">("player");
  const [query,          setQuery         ] = useState("");
  const [sortKey,        setSortKey       ] = useState<SortKey | null>(null);
  const [expandedIds,    setExpandedIds   ] = useState<Set<string>>(new Set());
  const [expandedTeams,  setExpandedTeams ] = useState<Set<string>>(new Set());
  const [historyData,    setHistoryData   ] = useState<Map<string, HP[]>>(new Map());
  const [historyLoading, setHistoryLoading] = useState<Set<string>>(new Set());
  const cache = useRef<Map<string, HP[]>>(new Map());

  const [selectedSeason,  setSelectedSeason ] = useState<string>(currentSeason ?? "");
  const [seasonEntries,   setSeasonEntries  ] = useState<LeaderboardEntry[] | null>(null);
  const [seasonLoading,   setSeasonLoading  ] = useState(false);

  const activeEntries = seasonEntries ?? entries;

  const ranked   = useMemo(() => activeEntries.filter(e => e.current_rp != null), [activeEntries]);
  const unranked = useMemo(() => activeEntries.filter(e => e.current_rp == null), [activeEntries]);

  const rpRank = useMemo(() => new Map(ranked.map((e, i) => [e.id, i + 1])), [ranked]);

  const latestUpdate = useMemo(() => activeEntries.reduce<string | null>((max, e) => {
    if (!e.fetched_at) return max;
    return !max || e.fetched_at > max ? e.fetched_at : max;
  }, null), [activeEntries]);

  // ─── Player mode derivations ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    const tq = query.toLowerCase();
    return ranked.filter(e =>
      !tq || e.player_name.toLowerCase().includes(tq) || e.team_name.toLowerCase().includes(tq)
    );
  }, [ranked, query]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === "avg_damage") {
        av = a.damage_dealt && a.rounds_played ? a.damage_dealt / a.rounds_played : 0;
        bv = b.damage_dealt && b.rounds_played ? b.damage_dealt / b.rounds_played : 0;
      } else if (sortKey === "avg_kills") {
        av = a.kills != null && a.rounds_played ? a.kills / a.rounds_played : 0;
        bv = b.kills != null && b.rounds_played ? b.kills / b.rounds_played : 0;
      } else {
        av = (a[sortKey] as number | null) ?? 0;
        bv = (b[sortKey] as number | null) ?? 0;
      }
      return bv - av;
    });
  }, [filtered, sortKey]);

  // ─── Team mode derivations ─────────────────────────────────────────────────
  const teamEntries = useMemo(() => aggregateByTeam(ranked), [ranked]);

  const teamFiltered = useMemo(() => {
    const tq = query.toLowerCase();
    if (!tq) return teamEntries;
    return teamEntries.filter(t => t.team_name.toLowerCase().includes(tq));
  }, [teamEntries, query]);

  const switchMode = (mode: "player" | "team") => {
    setViewMode(mode);
    setQuery("");
    setSortKey(null);
  };

  const toggleTeamExpand = (teamName: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      next.has(teamName) ? next.delete(teamName) : next.add(teamName);
      return next;
    });
  };

  const toggleSort = (key: SortKey) => setSortKey(prev => (prev === key ? null : key));

  const changeSeason = useCallback(async (season: string) => {
    setSelectedSeason(season);
    setExpandedIds(new Set());
    setExpandedTeams(new Set());
    if (season === (currentSeason ?? "")) {
      setSeasonEntries(null);
      return;
    }
    setSeasonLoading(true);
    try {
      const pubgIds = entries.map(p => p.pubg_player_id).filter(Boolean) as string[];
      const rankMap = new Map<string, DbPlayerRecord>();
      if (pubgIds.length > 0) {
        const { data: rawRanks } = await getSB()
          .from("Steam_player_ranks")
          .select("*")
          .eq("mode", "squad")
          .in("player_id", pubgIds)
          .eq("season", season)
          .order("fetched_at", { ascending: false });
        for (const r of (rawRanks ?? []) as DbPlayerRecord[]) {
          if (!rankMap.has(r.player_id)) rankMap.set(r.player_id, r);
        }
      }
      const merged: LeaderboardEntry[] = entries.map(p => {
        const rank = p.pubg_player_id ? rankMap.get(p.pubg_player_id) ?? null : null;
        return {
          ...p,
          current_rp:    rank?.current_rp    ?? null,
          best_rp:       rank?.best_rp       ?? null,
          current_tier:  rank?.current_tier  ?? null,
          best_tier:     rank?.best_tier     ?? null,
          rounds_played: rank?.rounds_played ?? null,
          wins:          rank?.wins          ?? null,
          kills:         rank?.kills         ?? null,
          damage_dealt:  rank?.damage_dealt  ?? null,
          season:        rank?.season        ?? null,
          fetched_at:    rank?.fetched_at    ?? null,
          previous_rank: rank?.previous_rank ?? null,
        };
      });
      merged.sort((a, b) => {
        if (a.current_rp === null && b.current_rp === null) return 0;
        if (a.current_rp === null) return 1;
        if (b.current_rp === null) return -1;
        return b.current_rp - a.current_rp;
      });
      setSeasonEntries(merged);
    } finally {
      setSeasonLoading(false);
    }
  }, [currentSeason, entries]);

  const toggleExpand = useCallback(async (entry: LeaderboardEntry) => {
    const pid = entry.pubg_player_id;
    if (!pid) return;

    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });

    const cacheKey = `${pid}:${selectedSeason}`;
    if (cache.current.has(cacheKey)) {
      setHistoryData(prev => new Map(prev).set(pid, cache.current.get(cacheKey)!));
      return;
    }

    setHistoryLoading(prev => new Set(prev).add(pid));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = getSB()
      .from("rp_history")
      .select("current_rp, recorded_at")
      .eq("player_id", pid)
      .order("recorded_at", { ascending: true })
      .limit(60);
    if (selectedSeason) q = q.eq("season", selectedSeason);

    const { data } = await q;

    const points: HP[] = data ?? [];
    cache.current.set(cacheKey, points);
    setHistoryData(prev => new Map(prev).set(pid, points));
    setHistoryLoading(prev => { const s = new Set(prev); s.delete(pid); return s; });
  }, [selectedSeason]);

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border text-center py-16 text-sm"
        style={{ backgroundColor: "var(--panel)", borderColor: "var(--line)", color: "var(--muted)" }}>
        등록된 선수가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--text)" }}>경쟁전 리더보드</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs tracking-wide" style={{ color: "var(--faint)" }}>스쿼드 · TPP</span>
            {seasons.length > 1 && (
              <div className="relative flex items-center">
                <select
                  value={selectedSeason}
                  onChange={e => changeSeason(e.target.value)}
                  disabled={seasonLoading}
                  className="text-xs pl-2 pr-6 py-0.5 rounded appearance-none focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: "var(--panel-2)",
                    border: "1px solid var(--line)",
                    color: seasonLoading ? "var(--faint)" : "var(--muted)",
                  }}
                >
                  {seasons.map(s => (
                    <option key={s} value={s}>{formatSeason(s)}</option>
                  ))}
                </select>
                <svg viewBox="0 0 24 24" width={10} height={10}
                  className="absolute right-1.5 pointer-events-none"
                  fill="none" stroke="currentColor" strokeWidth={2.5}
                  style={{ color: "var(--faint)" }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            )}
            {seasonLoading && (
              <svg className="animate-spin w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: "var(--faint)" }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            )}
            {latestUpdate && (
              <span className="text-xs" style={{ color: "var(--faint)" }}>{relTime(latestUpdate)} 갱신</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* ── View mode toggle ── */}
          <div
            className="inline-flex rounded-lg p-0.5 relative select-none"
            style={{ backgroundColor: "var(--panel-2)", border: "1px solid var(--line)" }}
          >
            {/* Sliding indicator */}
            <span
              className="absolute top-0.5 bottom-0.5 w-14 rounded-md pointer-events-none transition-transform duration-200 ease-in-out"
              style={{
                backgroundColor: "var(--accent)",
                left: "2px",
                transform: viewMode === "team" ? "translateX(56px)" : "translateX(0)",
              }}
              aria-hidden="true"
            />
            <button
              onClick={() => switchMode("player")}
              className="relative z-10 w-14 py-1.5 text-sm font-semibold transition-colors duration-200"
              style={{ color: viewMode === "player" ? "var(--panel)" : "var(--muted)" }}
            >
              선수
            </button>
            <button
              onClick={() => switchMode("team")}
              className="relative z-10 w-14 py-1.5 text-sm font-semibold transition-colors duration-200"
              style={{ color: viewMode === "team" ? "var(--panel)" : "var(--muted)" }}
            >
              팀
            </button>
          </div>

          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={viewMode === "player" ? "선수·팀 검색" : "팀 검색"}
            className="rounded-lg px-3 py-1.5 text-sm focus:outline-none w-44 transition-colors"
            style={{
              backgroundColor: "var(--bg)",
              border: "1px solid var(--line)",
              color: "var(--text)",
            }}
          />
        </div>
      </div>

      {/* ── Podium ── */}
      {viewMode === "player" && ranked.length >= 3 && !query && (
        <div className="flex gap-3">
          {([ranked[0], ranked[1], ranked[2]] as LeaderboardEntry[]).map((e, i) => (
            <PodiumCard key={e.id} entry={e} rank={i + 1} />
          ))}
        </div>
      )}
      {viewMode === "team" && teamEntries.length >= 3 && !query && (
        <div className="flex gap-3">
          {([teamEntries[0], teamEntries[1], teamEntries[2]] as TeamEntry[]).map((t, i) => (
            <TeamPodiumCard key={t.team_name} team={t} rank={i + 1} />
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: "var(--panel)", borderColor: "var(--line)" }}>
        <div className="overflow-x-auto">

          {/* Player mode table */}
          {viewMode === "player" && (
            <table className="w-full text-sm min-w-[480px]">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: "var(--panel)" }}>
                <tr className="text-xs uppercase tracking-wider border-b"
                  style={{ borderColor: "var(--line)" }}>
                  <th className="px-4 py-3 text-left w-14" style={{ color: "var(--faint)" }}>#</th>
                  <th className="px-4 py-3 text-left" style={{ color: "var(--faint)" }}>선수</th>
                  <th className="px-4 py-3 text-left" style={{ color: "var(--faint)" }}>티어</th>
                  <th className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleSort("current_rp")}
                      className="hover:opacity-80 transition-opacity"
                      style={{ color: sortKey === "current_rp" ? "var(--accent)" : "var(--faint)" }}
                    >
                      RP{sortKey === "current_rp" ? " ↓" : ""}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">
                    <button
                      onClick={() => toggleSort("rounds_played")}
                      className="hover:opacity-80 transition-opacity"
                      style={{ color: sortKey === "rounds_played" ? "var(--accent)" : "var(--faint)" }}
                    >
                      게임{sortKey === "rounds_played" ? " ↓" : ""}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">
                    <button
                      onClick={() => toggleSort("kills")}
                      className="hover:opacity-80 transition-opacity"
                      style={{ color: sortKey === "kills" ? "var(--accent)" : "var(--faint)" }}
                    >
                      킬{sortKey === "kills" ? " ↓" : ""}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">
                    <button
                      onClick={() => toggleSort("avg_kills")}
                      className="hover:opacity-80 transition-opacity"
                      style={{ color: sortKey === "avg_kills" ? "var(--accent)" : "var(--faint)" }}
                    >
                      평균 킬{sortKey === "avg_kills" ? " ↓" : ""}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">
                    <button
                      onClick={() => toggleSort("avg_damage")}
                      className="hover:opacity-80 transition-opacity"
                      style={{ color: sortKey === "avg_damage" ? "var(--accent)" : "var(--faint)" }}
                    >
                      평균 데미지{sortKey === "avg_damage" ? " ↓" : ""}
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
                        className="border-b transition-colors cursor-pointer"
                        style={{
                          borderColor: "var(--line-soft)",
                          backgroundColor: open ? "var(--panel-2)" : undefined,
                        }}
                        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--panel-2)"; }}
                        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                      >
                        {/* # */}
                        <td className="px-4 py-3">
                          <div className={`font-bold tabular-nums leading-tight ${rank <= 3 ? "text-base" : "text-sm"}`}
                            style={{ color: rank <= 3 ? "var(--accent)" : "var(--faint)" }}>
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
                              <div className="font-semibold text-sm leading-tight" style={{ color: "var(--text)" }}>
                                {entry.player_name}
                              </div>
                              <div className="text-[10px] truncate max-w-[100px]" style={{ color: "var(--faint)" }}>
                                {entry.team_name}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Tier */}
                        <td className="px-4 py-3">
                          <TierBadge tier={entry.current_tier} />
                          {entry.best_tier && (
                            <div className="text-[9px] mt-0.5 whitespace-nowrap" style={{ color: "var(--faint)" }}>
                              최고 {entry.best_tier}
                            </div>
                          )}
                        </td>

                        {/* RP */}
                        <td className="px-4 py-3 text-right">
                          <div className={`font-black text-base tabular-nums ${rank > 3 ? (cfg?.text ?? "") : ""}`}
                            style={{ color: rank <= 3 ? "var(--accent)" : (cfg ? undefined : "var(--text)") }}
                          >
                            {entry.current_rp?.toLocaleString()}
                          </div>
                          {entry.best_rp != null && (
                            <div className="text-[9px] mt-0.5 tabular-nums" style={{ color: "var(--faint)" }}>
                              최고 {entry.best_rp.toLocaleString()}
                            </div>
                          )}
                        </td>

                        {/* Games */}
                        <td className="px-4 py-3 text-right text-xs tabular-nums hidden sm:table-cell"
                          style={{ color: "var(--muted)" }}>
                          {entry.rounds_played ?? "—"}
                        </td>

                        {/* Kills */}
                        <td className="px-4 py-3 text-right text-xs tabular-nums hidden sm:table-cell"
                          style={{ color: "var(--muted)" }}>
                          {entry.kills ?? "—"}
                        </td>

                        {/* Avg kills */}
                        <td className="px-4 py-3 text-right text-xs tabular-nums hidden sm:table-cell"
                          style={{ color: "var(--muted)" }}>
                          {avgKills(entry.kills, entry.rounds_played)}
                        </td>

                        {/* Avg damage */}
                        <td className="px-4 py-3 text-right text-xs tabular-nums hidden sm:table-cell"
                          style={{ color: "var(--muted)" }}>
                          {avgDmg(entry.damage_dealt, entry.rounds_played)}
                        </td>

                        {/* Chevron */}
                        <td className="px-4 py-3">
                          <svg
                            viewBox="0 0 24 24" width={14} height={14}
                            className={`transition-transform duration-200 ml-auto ${open ? "rotate-180" : ""}`}
                            fill="none" stroke="currentColor" strokeWidth={2.5}
                            style={{ color: "var(--faint)" }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </td>
                      </tr>

                      {/* Expand */}
                      {open && (
                        <tr className="border-b" style={{ borderColor: "var(--line-soft)", backgroundColor: "var(--panel-2)" }}>
                          <td colSpan={9} className="px-6 py-4">
                            {loading ? (
                              <div className="flex items-center gap-2 text-sm py-2" style={{ color: "var(--faint)" }}>
                                <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                </svg>
                                불러오는 중...
                              </div>
                            ) : history && history.length > 0 ? (
                              <RPChart data={history} lineColor={cfg?.line ?? "#2E6FB0"} />
                            ) : (
                              <p className="text-sm text-center py-2" style={{ color: "var(--faint)" }}>
                                추이 데이터가 아직 없습니다
                              </p>
                            )}
                            <div className="flex flex-wrap gap-4 mt-3 text-xs sm:hidden" style={{ color: "var(--faint)" }}>
                              <span>게임 {entry.rounds_played ?? "—"}</span>
                              <span>킬 {entry.kills ?? "—"}</span>
                              <span>평균 킬 {avgKills(entry.kills, entry.rounds_played)}</span>
                              <span>평균 데미지 {avgDmg(entry.damage_dealt, entry.rounds_played)}</span>
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
          )}

          {/* Team mode table */}
          {viewMode === "team" && (
            <table className="w-full text-sm min-w-[320px]">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: "var(--panel)" }}>
                <tr className="text-xs uppercase tracking-wider border-b"
                  style={{ borderColor: "var(--line)" }}>
                  <th className="px-4 py-3 text-left w-14" style={{ color: "var(--faint)" }}>#</th>
                  <th className="px-4 py-3 text-left" style={{ color: "var(--faint)" }}>팀</th>
                  <th className="px-4 py-3 text-right" style={{ color: "var(--faint)" }}>RP</th>
                  <th className="px-4 py-3 text-right" style={{ color: "var(--faint)" }}>게임</th>
                  <th className="px-4 py-3 text-right" style={{ color: "var(--faint)" }}>킬</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {teamFiltered.map((team, idx) => {
                  const rank     = idx + 1;
                  const teamOpen = expandedTeams.has(team.team_name);
                  const members  = ranked
                    .filter(p => p.team_name === team.team_name && p.current_rp != null)
                    .sort((a, b) => (b.current_rp ?? 0) - (a.current_rp ?? 0));

                  return (
                    <React.Fragment key={team.team_name}>
                      <tr
                        onClick={() => toggleTeamExpand(team.team_name)}
                        className="border-b transition-colors cursor-pointer"
                        style={{
                          borderColor: "var(--line-soft)",
                          backgroundColor: teamOpen ? "var(--panel-2)" : undefined,
                        }}
                        onMouseEnter={e => { if (!teamOpen) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--panel-2)"; }}
                        onMouseLeave={e => { if (!teamOpen) (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                      >
                        {/* # */}
                        <td className="px-4 py-3">
                          <div className={`font-bold tabular-nums ${rank <= 3 ? "text-base" : "text-sm"}`}
                            style={{ color: rank <= 3 ? "var(--accent)" : "var(--faint)" }}>
                            #{rank}
                          </div>
                        </td>

                        {/* Team */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <TeamLogo team={team.team_name} size={28} />
                            <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                              {team.team_name}
                            </span>
                          </div>
                        </td>

                        {/* RP */}
                        <td className="px-4 py-3 text-right">
                          <span className="font-black text-base tabular-nums"
                            style={{ color: rank <= 3 ? "var(--accent)" : "var(--text)" }}>
                            {team.total_rp.toLocaleString()}
                          </span>
                        </td>

                        {/* Games */}
                        <td className="px-4 py-3 text-right text-xs tabular-nums"
                          style={{ color: "var(--muted)" }}>
                          {team.total_games}
                        </td>

                        {/* Kills */}
                        <td className="px-4 py-3 text-right text-xs tabular-nums"
                          style={{ color: "var(--muted)" }}>
                          {team.total_kills}
                        </td>

                        {/* Chevron */}
                        <td className="px-4 py-3">
                          <svg
                            viewBox="0 0 24 24" width={14} height={14}
                            className={`transition-transform duration-200 ml-auto ${teamOpen ? "rotate-180" : ""}`}
                            fill="none" stroke="currentColor" strokeWidth={2.5}
                            style={{ color: "var(--faint)" }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </td>
                      </tr>

                      {/* Team expand — member list */}
                      {teamOpen && (
                        <tr className="border-b" style={{ borderColor: "var(--line-soft)", backgroundColor: "var(--panel-2)" }}>
                          <td colSpan={6} className="px-6 py-3">
                            <div className="flex flex-col">
                              {members.map((p, i) => {
                                const cfg = getTier(p.current_tier);
                                return (
                                  <div
                                    key={p.id}
                                    className="flex items-center gap-3 py-1.5 border-b last:border-0"
                                    style={{ borderColor: "var(--line-soft)" }}
                                  >
                                    <span className="text-xs w-4 tabular-nums text-right shrink-0" style={{ color: "var(--faint)" }}>
                                      {i + 1}
                                    </span>
                                    <span className="flex-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
                                      {p.player_name}
                                    </span>
                                    <span className={`text-sm font-bold tabular-nums ${cfg?.text ?? ""}`}
                                      style={{ color: cfg ? undefined : "var(--text)" }}>
                                      {p.current_rp?.toLocaleString()}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}

        </div>
      </div>

      {/* ── Unranked (player mode only) ── */}
      {viewMode === "player" && unranked.length > 0 && !query && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--faint)" }}>
            미배치 · 이번 시즌 랭크 기록 없음
          </p>
          <div className="rounded-xl border overflow-hidden opacity-50"
            style={{ borderColor: "var(--line-soft)" }}>
            <table className="w-full">
              <tbody>
                {unranked.map(e => (
                  <tr key={e.id} className="border-b last:border-0" style={{ borderColor: "var(--line-soft)" }}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <TeamLogo team={e.team_name} size={20} />
                        <span className="text-sm" style={{ color: "var(--text)" }}>{e.player_name}</span>
                        <span className="text-xs" style={{ color: "var(--faint)" }}>{e.team_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs" style={{ color: "var(--faint)" }}>—</td>
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
