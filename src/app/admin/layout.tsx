"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-pubg-darker">
      <header className="bg-pubg-card border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-pubg-gold font-black text-xl">
            PUBG RP Tracker
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white font-semibold">어드민</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-white/60 hover:text-white text-sm transition-colors"
        >
          로그아웃
        </button>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
