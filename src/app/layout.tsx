import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PUBG 경쟁전",
  description: "PUBG 경쟁전 RP 리더보드",
  openGraph: {
    title: "PUBG 경쟁전",
    description: "PUBG 경쟁전 RP 리더보드",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.variable} min-h-screen`} style={{ backgroundColor: "var(--bg)" }}>
        <header className="border-b" style={{ backgroundColor: "var(--panel)", borderColor: "var(--line)" }}>
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
            <span className="text-2xl font-black tracking-tight" style={{ color: "var(--accent)" }}>
              PUBG
            </span>
            <span className="font-semibold text-lg" style={{ color: "var(--text)" }}>경쟁전</span>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
