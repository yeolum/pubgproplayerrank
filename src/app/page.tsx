import { getLeaderboard } from "@/lib/supabase";
import Leaderboard from "@/components/Leaderboard";

export const revalidate = 0;

export default async function Home() {
  const entries = await getLeaderboard("squad");
  return <Leaderboard entries={entries} />;
}
