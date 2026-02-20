import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Somy - 크리스찬 큐티 챗봇",
  description: "당신만의 따뜻한 영적 동반자, 소미와 함께하는 큐티 시간",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-[#F9F7F2] text-[#3E3C3A]`}>
        {children}
      </body>
    </html>
  );
}
