"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "로그인에 실패했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pubg-darker flex items-center justify-center">
      <div className="card w-full max-w-sm flex flex-col gap-6">
        <div>
          <h1 className="text-white font-black text-2xl">어드민 로그인</h1>
          <p className="text-white/40 text-sm mt-1">PUBG RP Tracker 관리자</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="아이디"
            required
            className="bg-pubg-darker border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-pubg-gold transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
            className="bg-pubg-darker border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-pubg-gold transition-colors"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
