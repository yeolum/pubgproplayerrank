"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Platform } from "@/types";

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "steam", label: "Steam (PC)" },
  { value: "kakao", label: "Kakao (PC-KR)" },
  { value: "xbox", label: "Xbox" },
  { value: "psn", label: "PlayStation" },
];

export default function PlayerSearch() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<Platform>("steam");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    router.push(
      `/player/${encodeURIComponent(name.trim())}?platform=${platform}`
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="card w-full max-w-xl flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label className="text-white/60 text-sm font-medium">플레이어 닉네임</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="닉네임을 입력하세요"
          className="bg-pubg-darker border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-pubg-gold transition-colors"
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-white/60 text-sm font-medium">플랫폼</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
          className="bg-pubg-darker border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pubg-gold transition-colors"
        >
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "조회 중..." : "RP 조회하기"}
      </button>
    </form>
  );
}
