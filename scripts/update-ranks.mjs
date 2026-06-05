// Node.js 18+ 네이티브 fetch 사용 — 타임아웃 없이 55명 이상 처리 가능
const PUBG_BASE = "https://api.pubg.com/shards/steam";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PUBG_KEY = process.env.PUBG_API_KEY;

const DELAY_MS = 6500; // PUBG API: 분당 10요청 제한 (최소 6초, 0.5초 버퍼)

const pubgHeaders = {
  Authorization: `Bearer ${PUBG_KEY}`,
  Accept: "application/vnd.api+json",
};

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getCurrentSeason() {
  const res = await fetch(`${PUBG_BASE}/seasons`, { headers: pubgHeaders });
  if (!res.ok) throw new Error(`시즌 조회 실패: ${res.status}`);
  const data = await res.json();
  const current = data.data.find((s) => s.attributes.isCurrentSeason);
  if (!current) throw new Error("현재 시즌 없음");
  return current.id;
}

async function getActivePlayers() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/Steam_players?is_active=eq.true&select=*`,
    { headers: sbHeaders }
  );
  if (!res.ok) throw new Error(`선수 조회 실패: ${res.status}`);
  return res.json();
}

async function getRankedStats(playerId, season) {
  const res = await fetch(
    `${PUBG_BASE}/players/${playerId}/seasons/${season}/ranked`,
    { headers: pubgHeaders }
  );
  if (!res.ok) throw new Error(`랭크 조회 실패: ${res.status}`);
  return res.json();
}

async function upsertRecords(records) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/Steam_player_ranks?on_conflict=player_id%2Cseason%2Cmode`,
    {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(records),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`upsert 실패: ${err}`);
  }
}

function parseStats(modeData) {
  if (!modeData || !modeData.roundsPlayed || modeData.roundsPlayed === 0) return null;
  return {
    currentRankPoint: modeData.currentRankPoint,
    bestRankPoint: modeData.bestRankPoint,
    currentTier: modeData.currentTier,
    bestTier: modeData.bestTier,
    roundsPlayed: modeData.roundsPlayed,
    wins: modeData.wins,
    kills: modeData.kills,
    damageDealt: modeData.damageDealt,
  };
}

async function main() {
  console.log("▶ PUBG RP 갱신 시작");

  const [season, players] = await Promise.all([getCurrentSeason(), getActivePlayers()]);
  console.log(`시즌: ${season} | 선수: ${players.length}명`);

  const fetchedAt = new Date().toISOString();
  let success = 0;
  let failed = 0;

  for (let i = 0; i < players.length; i++) {
    const player = players[i];

    if (i > 0) {
      process.stdout.write(`  [딜레이 ${DELAY_MS / 1000}초]\n`);
      await sleep(DELAY_MS);
    }

    if (!player.pubg_player_id) {
      console.log(`  ✗ ${player.player_name}: PUBG 계정 ID 미등록`);
      failed++;
      continue;
    }

    try {
      const data = await getRankedStats(player.pubg_player_id, season);
      const modeStats = data.data?.attributes?.rankedGameModeStats ?? {};

      const MODES = [
        { key: "squad-fpp", field: "squad-fpp" },
        { key: "squad",     field: "squad" },
      ];

      const records = [];
      for (const { key, field } of MODES) {
        const stats = parseStats(modeStats[field]);
        if (!stats) continue;
        records.push({
          player_id:     player.pubg_player_id,
          player_name:   player.steam_username,
          platform:      "steam",
          season,
          mode:          key,
          current_rp:    stats.currentRankPoint,
          best_rp:       stats.bestRankPoint,
          current_tier:  `${stats.currentTier.tier} ${stats.currentTier.subTier}`,
          best_tier:     `${stats.bestTier.tier} ${stats.bestTier.subTier}`,
          rounds_played: stats.roundsPlayed,
          wins:          stats.wins,
          kills:         stats.kills,
          kda:           0,
          damage_dealt:  stats.damageDealt,
          fetched_at:    fetchedAt,
        });
      }

      if (records.length > 0) await upsertRecords(records);
      console.log(`  ✓ ${player.player_name} (${i + 1}/${players.length})`);
      success++;
    } catch (e) {
      console.log(`  ✗ ${player.player_name}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n완료: 성공 ${success}명 / 실패 ${failed}명`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("치명적 오류:", e.message);
  process.exit(1);
});
