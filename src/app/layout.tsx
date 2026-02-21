import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const churchName = process.env.NEXT_PUBLIC_CHURCH_NAME || "예수인교회";
const appName = process.env.NEXT_PUBLIC_APP_NAME || "소미 QT";

export const metadata: Metadata = {
  title: `${appName} - ${churchName}`,
  description: "소미와 함께하는 따뜻한 큐티 시간",
  icons: {
    icon: "/somy.png",
    apple: "/somy.png",
    shortcut: "/somy.png",
  },
  manifest: "/manifest.json",
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
