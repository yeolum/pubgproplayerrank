import { NextResponse } from "next/server";
import { updateAllRanks } from "@/lib/updateRanks";

export async function POST() {
  try {
    const result = await updateAllRanks();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
