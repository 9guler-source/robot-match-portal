import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "나에게 맞는 동반 로봇 찾기",
  description: "11단계 설문으로 나에게 꼭 맞는 로봇을 찾아드립니다",
  openGraph: {
    title: "나에게 맞는 동반 로봇 찾기",
    description: "11단계 설문으로 나에게 꼭 맞는 로봇을 찾아드립니다",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
