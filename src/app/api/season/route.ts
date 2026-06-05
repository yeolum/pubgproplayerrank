import { NextRequest, NextResponse } from "next/server";
import { getCurrentSeason } from "@/lib/pubg";
import type { Platform } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = (searchParams.get("platform") ?? "steam") as Platform;

  try {
    const season = await getCurrentSeason(platform);
    return NextResponse.json({ season });
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
