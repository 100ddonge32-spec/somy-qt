import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const APP_URL = "https://somy-qt.vercel.app";
const churchName = process.env.NEXT_PUBLIC_CHURCH_NAME || "예수인교회";
const appName = process.env.NEXT_PUBLIC_APP_NAME || "소미 QT";

export const metadata: Metadata = {
  title: `${appName} - ${churchName}`,
  description: "소미와 함께하는 따뜻한 큐티 시간 🐑",
  icons: {
    icon: "/somy.png",
    apple: "/somy.png",
    shortcut: "/somy.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: `${appName} - ${churchName}`,
    description: "소미와 함께하는 따뜻한 큐티 시간 🐑",
    url: APP_URL,
    siteName: `${appName}`,
    images: [
      {
        url: `${APP_URL}/somy.png`,
        width: 512,
        height: 512,
        alt: "소미 큐티 챗봇 캐릭터",
      },
    ],
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary",
    title: `${appName} - ${churchName}`,
    description: "소미와 함께하는 따뜻한 큐티 시간 🐑",
    images: [`${APP_URL}/somy.png`],
  },
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
