import { getLeaderboard, getSeasons } from "@/lib/supabase";
import Leaderboard from "@/components/Leaderboard";

export const revalidate = 0;

export default async function Home() {
  const [seasons, entries] = await Promise.all([
    getSeasons(),
    getLeaderboard("squad"),
  ]);
  const currentSeason = seasons[0] ?? null;
  return <Leaderboard entries={entries} seasons={seasons} currentSeason={currentSeason} />;
}
