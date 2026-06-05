import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getPlayer } from "@/lib/pubg";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("Steam_players")
    .select("*")
    .order("team_name")
    .order("player_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { team_name, player_name, steam_username } = await req.json();

  if (!team_name?.trim() || !player_name?.trim() || !steam_username?.trim()) {
    return NextResponse.json({ error: "모든 필드를 입력해주세요." }, { status: 400 });
  }

  let pubg_player_id: string | null = null;
  try {
    const player = await getPlayer(steam_username.trim(), "steam");
    pubg_player_id = player.id;
  } catch {
    // PUBG ID 조회 실패해도 저장 (크론에서 재시도)
  }

  const { data, error } = await supabaseAdmin
    .from("Steam_players")
    .insert({
      team_name: team_name.trim(),
      player_name: player_name.trim(),
      steam_username: steam_username.trim(),
      pubg_player_id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "이미 등록된 스팀 아이디입니다." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
