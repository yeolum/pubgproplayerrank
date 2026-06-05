import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rowId = Number(params.id);
  const { team_name, player_name, pubg_account_id, is_active } = await req.json();

  const update: Record<string, unknown> = {
    team_name,
    player_name,
    is_active,
    updated_at: new Date().toISOString(),
  };

  if (pubg_account_id?.trim()) {
    const id = pubg_account_id.trim();
    update.steam_username = id;
    update.pubg_player_id = id;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("Steam_players")
    .update(update)
    .eq("id", rowId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rowId = Number(params.id);

  const { error } = await getSupabaseAdmin()
    .from("Steam_players")
    .delete()
    .eq("id", rowId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
