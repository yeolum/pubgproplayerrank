-- =============================================
-- Steam_player_ranks : RP 기록 테이블
-- =============================================
create table if not exists "Steam_player_ranks" (
  id bigserial primary key,
  player_id text not null,
  player_name text not null,
  platform text not null default 'steam',
  season text not null,
  mode text not null,               -- 'squad-fpp' | 'squad' | 'solo-fpp' | 'solo'
  current_rp integer not null,
  best_rp integer not null,
  current_tier text not null,
  best_tier text not null,
  rounds_played integer not null,
  kills integer not null,
  wins integer not null,
  kda numeric(6,3) not null,
  fetched_at timestamptz not null,
  created_at timestamptz default now(),

  unique (player_id, season, mode)
);

create index if not exists idx_Steam_player_ranks_player_name on "Steam_player_ranks" (player_name);
create index if not exists idx_Steam_player_ranks_current_rp on "Steam_player_ranks" (current_rp desc);
create index if not exists idx_Steam_player_ranks_fetched_at on "Steam_player_ranks" (fetched_at desc);

alter table "Steam_player_ranks" enable row level security;

create policy "Public read access"
  on "Steam_player_ranks" for select using (true);

create policy "Service role write access"
  on "Steam_player_ranks" for insert
  with check (auth.role() = 'service_role');

create policy "Service role update access"
  on "Steam_player_ranks" for update
  using (auth.role() = 'service_role');


-- =============================================
-- Steam_players : 선수 관리 테이블
-- =============================================
create table if not exists "Steam_players" (
  id bigserial primary key,
  team_name text not null,
  player_name text not null,
  steam_username text not null,     -- PUBG 인게임 닉네임 (Steam)
  pubg_player_id text,              -- PUBG account ID (account.xxxx) 캐시
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (steam_username)
);

create index if not exists idx_Steam_players_team on "Steam_players" (team_name);
create index if not exists idx_Steam_players_active on "Steam_players" (is_active);

alter table "Steam_players" enable row level security;

-- 누구나 활성 선수 목록 읽기 가능
create policy "Public read active players"
  on "Steam_players" for select
  using (is_active = true);

-- Service role만 쓰기 가능
create policy "Service role all access on Steam_players"
  on "Steam_players" for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- =============================================
-- Migrations
-- =============================================

-- damage_dealt 컬럼 (없을 경우 추가)
alter table "Steam_player_ranks"
  add column if not exists damage_dealt integer not null default 0;

-- 순위 변동 추적용 previous_rank 컬럼
alter table "Steam_player_ranks"
  add column if not exists previous_rank integer;

-- =============================================
-- rp_history : RP 시계열 기록 (변경 시에만 insert)
-- =============================================
create table if not exists "rp_history" (
  id          bigserial   primary key,
  player_id   text        not null,
  current_rp  integer     not null,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_rp_history_player_time
  on "rp_history" (player_id, recorded_at desc);

alter table "rp_history" enable row level security;

create policy "Public read rp_history"
  on "rp_history" for select using (true);

create policy "Service role write rp_history"
  on "rp_history" for insert
  with check (auth.role() = 'service_role');
