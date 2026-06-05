import { getLeaderboard } from "@/lib/supabase";
import Leaderboard from "@/components/Leaderboard";
import ModeSelector from "@/components/ModeSelector";

export const revalidate = 0;

interface Props {
  searchParams: { mode?: string };
}

export default async function Home({ searchParams }: Props) {
  const mode = searchParams.mode ?? "squad-fpp";
  const entries = await getLeaderboard(mode);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-black text-white">경쟁전 RP 리더보드</h1>
        <p className="text-white/40 text-sm mt-1">매 시간 자동 갱신됩니다.</p>
      </div>
      <ModeSelector currentMode={mode} />
      <Leaderboard entries={entries} mode={mode} />
    </div>
  );
}
