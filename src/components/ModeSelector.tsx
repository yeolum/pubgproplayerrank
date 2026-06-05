"use client";

import { useRouter, usePathname } from "next/navigation";

const MODES = [
  { value: "squad-fpp", label: "스쿼드 FPP" },
  { value: "squad", label: "스쿼드 TPP" },
  { value: "solo-fpp", label: "솔로 FPP" },
  { value: "solo", label: "솔로 TPP" },
];

export default function ModeSelector({ currentMode }: { currentMode: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex gap-2 flex-wrap">
      {MODES.map((m) => (
        <button
          key={m.value}
          onClick={() => router.push(`${pathname}?mode=${m.value}`)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            currentMode === m.value
              ? "bg-pubg-gold text-pubg-darker"
              : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
