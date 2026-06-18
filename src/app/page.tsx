import { getLeaderboard, getSeasons } from "@/lib/supabase";
import Leaderboard from "@/components/Leaderboard";

export const revalidate = 0;

export default async function Home() {
  const seasons = await getSeasons();
  const currentSeason = seasons[0] ?? null;
  const entries = await getLeaderboard("squad", currentSeason ?? undefined);
  return <Leaderboard entries={entries} seasons={seasons} currentSeason={currentSeason} />;
}
