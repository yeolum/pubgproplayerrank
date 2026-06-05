"use client";

import { useRouter, usePathname } from "next/navigation";

export default function ModeSelector({ currentMode }: { currentMode: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex gap-2">
      <button
        onClick={() => router.push(`${pathname}?mode=squad`)}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          currentMode === "squad"
            ? "bg-pubg-gold text-pubg-darker"
            : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
        }`}
      >
        스쿼드 TPP
      </button>
    </div>
  );
}
