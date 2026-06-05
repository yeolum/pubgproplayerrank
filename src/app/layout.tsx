import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PUBG RP Tracker",
  description: "PUBG 경쟁전 RP 및 랭크 조회 서비스",
  openGraph: {
    title: "PUBG RP Tracker",
    description: "PUBG 경쟁전 RP 및 랭크 조회 서비스",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.variable} min-h-screen bg-pubg-darker`}>
        <header className="border-b border-white/10 bg-pubg-dark">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
            <span className="text-2xl font-black text-pubg-gold tracking-tight">
              PUBG
            </span>
            <span className="text-white font-semibold text-lg">RP Tracker</span>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-white/10 mt-16 py-6 text-center text-white/40 text-sm">
          PUBG RP Tracker — PUBG Corporation과 무관한 팬 사이트입니다.
        </footer>
      </body>
    </html>
  );
}
