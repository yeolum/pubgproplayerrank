import { NextRequest, NextResponse } from "next/server";
import { updateAllRanks } from "@/lib/updateRanks";

export async function GET(req: NextRequest) {
  // Vercel Cron이 자동으로 Authorization 헤더에 CRON_SECRET을 붙여서 호출
  if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await updateAllRanks();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
