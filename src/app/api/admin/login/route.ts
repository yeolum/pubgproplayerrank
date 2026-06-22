import { NextResponse } from "next/server";
import { SignJWT } from "jose";

function secret() {
  return new TextEncoder().encode(process.env.ADMIN_SECRET ?? "change-me");
}

function isValidCredential(username: string, password: string): boolean {
  // 계정 1 (기존)
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) return true;
  // 계정 2
  if (process.env.ADMIN_USERNAME_2 && username === process.env.ADMIN_USERNAME_2 && password === process.env.ADMIN_PASSWORD_2) return true;
  // 계정 3
  if (process.env.ADMIN_USERNAME_3 && username === process.env.ADMIN_USERNAME_3 && password === process.env.ADMIN_PASSWORD_3) return true;
  return false;
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
