import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rowId = Number(id);
  const { team_name, player_name, pubg_account_id, is_active } = await req.json();

  const update: Record<string, unknown> = {
    team_name,
    player_name,
    is_active,
    updated_at: new Date().toISOString(),
  };

  if (pubg_account_id?.trim()) {
    const raw = pubg_account_id.trim();
    const accountId = raw.startsWith("account.") ? raw : `account.${raw}`;
    update.steam_username = accountId;
    update.pubg_player_id = accountId;
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rowId = Number(id);

  const { error } = await getSupabaseAdmin()
    .from("Steam_players")
    .delete()
    .eq("id", rowId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
