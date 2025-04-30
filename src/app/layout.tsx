import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MedleyTrackCutter - メドレー曲分割ツール",
  description: "音楽メドレーを曲ごとに自動分割してダウンロードできるウェブアプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="preload" href="/ffmpeg-core.js" as="script" />
        <link rel="preload" href="/ffmpeg-core.wasm" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/ffmpeg-worker.js" as="script" />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
