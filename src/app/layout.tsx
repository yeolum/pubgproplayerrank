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
      <body className={`${inter.variable} min-h-screen bg-pubg-darker`}>
        <header className="border-b border-white/10 bg-pubg-dark">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
            <span className="text-2xl font-black text-pubg-gold tracking-tight">
              PUBG
            </span>
            <span className="text-white font-semibold text-lg">경쟁전</span>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
