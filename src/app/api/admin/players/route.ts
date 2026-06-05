import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("Steam_players")
    .select("*")
    .order("team_name")
    .order("player_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { team_name, player_name, pubg_account_id } = await req.json();

  if (!team_name?.trim() || !player_name?.trim() || !pubg_account_id?.trim()) {
    return NextResponse.json({ error: "모든 필드를 입력해주세요." }, { status: 400 });
  }

  const raw = pubg_account_id.trim();
  const id = raw.startsWith("account.") ? raw : `account.${raw}`;

  const { data, error } = await getSupabaseAdmin()
    .from("Steam_players")
    .insert({
      team_name: team_name.trim(),
      player_name: player_name.trim(),
      steam_username: id,   // unique 제약 유지용
      pubg_player_id: id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "이미 등록된 PUBG 계정 ID입니다." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
