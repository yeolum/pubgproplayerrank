import { NextRequest, NextResponse } from "next/server";
import { getPlayer } from "@/lib/pubg";
import type { Platform } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  const platform = (searchParams.get("platform") ?? "steam") as Platform;

  if (!name) {
    return NextResponse.json({ error: "name 파라미터가 필요합니다." }, { status: 400 });
  }

  try {
    const player = await getPlayer(name, platform);
    return NextResponse.json(player);
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
