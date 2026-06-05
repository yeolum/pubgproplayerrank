import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getPlayer } from "@/lib/pubg";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  const { team_name, player_name, steam_username, is_active } = await req.json();

  const update: Record<string, unknown> = {
    team_name,
    player_name,
    is_active,
    updated_at: new Date().toISOString(),
  };

  if (steam_username) {
    update.steam_username = steam_username;
    try {
      const player = await getPlayer(steam_username, "steam");
      update.pubg_player_id = player.id;
    } catch {
      update.pubg_player_id = null;
    }
  }

  const { data, error } = await supabaseAdmin
    .from("Steam_players")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);

  const { error } = await supabaseAdmin
    .from("Steam_players")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
