import { NextResponse } from "next/server";
import { SignJWT } from "jose";

function secret() {
  return new TextEncoder().encode(process.env.ADMIN_SECRET ?? "change-me");
}

function isValidCredential(username: string, password: string): boolean {
  // 다중 계정: ADMIN_CREDENTIALS=[{"u":"id1","p":"pw1"},{"u":"id2","p":"pw2"}]
  const multi = process.env.ADMIN_CREDENTIALS;
  if (multi) {
    try {
      const list = JSON.parse(multi) as { u: string; p: string }[];
      return list.some(c => c.u === username && c.p === password);
    } catch {
      // JSON 파싱 실패 시 단일 계정으로 폴백
    }
  }
  // 단일 계정 (기존 방식)
  return username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD;
}

export async function POST(req: Request) {
  const { username, password } = await req.json();

  if (!isValidCredential(username, password)) {
    return NextResponse.json(
      { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  const token = await new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(secret());

  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return res;
}
