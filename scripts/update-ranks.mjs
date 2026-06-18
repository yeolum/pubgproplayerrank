// Node.js 18+ 네이티브 fetch 사용
const PUBG_BASE = "https://api.pubg.com/shards/steam";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PUBG_KEY = process.env.PUBG_API_KEY;

const FIRST_BATCH_SIZE = 9;   // 첫 배치: getCurrentSeason() 1개 소모로 9명
const BATCH_SIZE = 10;        // 이후 배치: 10명씩
const BATCH_DELAY_MS = 62000; // 배치 간 62초 대기 (60초 + 2초 버퍼)

const pubgHeaders = {
  Authorization: `Bearer ${PUBG_KEY}`,
  Accept: "application/vnd.api+json",
};

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function getRankedStats(playerId, season, retries = 2) {
  const res = await fetch(
    `${PUBG_BASE}/players/${playerId}/seasons/${season}/ranked`,
    { headers: pubgHeaders }
  );
  if (res.status === 429 && retries > 0) {
    await sleep(65000);
    return getRankedStats(playerId, season, retries - 1);
  }
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
  if (!res.ok) throw new Error(`upsert 실패: ${await res.text()}`);
}

// 업데이트 전 현재 순위를 previous_rank에 저장 (순위 변동 표시용)
async function snapshotRanks(season) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/Steam_player_ranks?mode=eq.squad&season=eq.${encodeURIComponent(season)}&order=current_rp.desc&select=player_id`,
    { headers: sbHeaders }
  );
  if (!res.ok) {
    console.warn(`  ⚠ 순위 스냅샷 조회 실패: ${res.status}`);
    return;
  }
  const rows = await res.json();
  if (!rows.length) return;

  await Promise.all(
    rows.map((r, i) =>
      fetch(
        `${SUPABASE_URL}/rest/v1/Steam_player_ranks?player_id=eq.${encodeURIComponent(r.player_id)}&mode=eq.squad&season=eq.${encodeURIComponent(season)}`,
        {
          method: "PATCH",
          headers: { ...sbHeaders, Prefer: "return=minimal" },
          body: JSON.stringify({ previous_rank: i + 1 }),
        }
      )
    )
  );
  console.log(`  ✓ 순위 스냅샷 저장 (${rows.length}명)`);
}

// RP가 변경됐을 때만 rp_history에 기록
async function insertRpHistory(playerId, currentRp, season) {
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/rp_history?player_id=eq.${encodeURIComponent(playerId)}&season=eq.${encodeURIComponent(season)}&order=recorded_at.desc&limit=1&select=current_rp`,
    { headers: sbHeaders }
  );
  if (checkRes.ok) {
    const [last] = await checkRes.json();
    if (last?.current_rp === currentRp) return; // 변화 없음
  }
  await fetch(`${SUPABASE_URL}/rest/v1/rp_history`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({ player_id: playerId, current_rp: currentRp, season }),
  });
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

async function processPlayer(player, season, fetchedAt) {
  if (!player.pubg_player_id) throw new Error("PUBG 계정 ID 미등록");

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

  if (records.length > 0) {
    await upsertRecords(records);
    // squad TPP RP가 변경된 경우에만 rp_history 기록
    const squadRecord = records.find((r) => r.mode === "squad");
    if (squadRecord) {
      await insertRpHistory(player.pubg_player_id, squadRecord.current_rp, season);
    }
  }
}

async function main() {
  console.log("▶ PUBG RP 갱신 시작");

  const [season, players] = await Promise.all([getCurrentSeason(), getActivePlayers()]);

  // 첫 배치 9명, 이후 10명씩 분리
  const batches = [];
  if (players.length > 0) batches.push(players.slice(0, FIRST_BATCH_SIZE));
  for (let i = FIRST_BATCH_SIZE; i < players.length; i += BATCH_SIZE) {
    batches.push(players.slice(i, i + BATCH_SIZE));
  }

  console.log(`시즌: ${season} | 선수: ${players.length}명 | 배치: ${batches.length}개`);

  console.log("\n📸 순위 스냅샷 저장 중...");
  await snapshotRanks(season);

  const fetchedAt = new Date().toISOString();
  let success = 0;
  let failed = 0;
  const errors = [];

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const batchNum = b + 1;

    if (b > 0) {
      console.log(`\n  ⏳ 다음 배치까지 ${BATCH_DELAY_MS / 1000}초 대기...`);
      await sleep(BATCH_DELAY_MS);
    }

    console.log(`\n[배치 ${batchNum}/${batches.length}] ${batch.length}명 병렬 처리 중...`);

    const results = await Promise.allSettled(
      batch.map((player) => processPlayer(player, season, fetchedAt))
    );

    for (const [j, result] of results.entries()) {
      const player = batch[j];
      if (result.status === "fulfilled") {
        console.log(`  ✓ ${player.player_name}`);
        success++;
      } else {
        const msg = result.reason?.message ?? "알 수 없는 오류";
        console.log(`  ✗ ${player.player_name}: ${msg}`);
        failed++;
        errors.push(`${player.player_name}: ${msg}`);
      }
    }
  }

  console.log(`\n${"─".repeat(40)}`);
  console.log(`완료: 성공 ${success}명 / 실패 ${failed}명`);
  if (errors.length > 0) {
    console.log("실패 목록:");
    errors.forEach((e) => console.log(`  - ${e}`));
  }

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("치명적 오류:", e.message);
  process.exit(1);
});
