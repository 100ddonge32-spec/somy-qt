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
  themeColor: "#D4AF37",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: appName,
  },
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
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "소미 큐티 챗봇 - 성경과 함께하는 양 캐릭터",
      },
    ],
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: `${appName} - ${churchName}`,
    description: "소미와 함께하는 따뜻한 큐티 시간 🐑",
    images: [`${APP_URL}/og-image.png`],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#F9F7F2] text-[#3E3C3A]`} suppressHydrationWarning>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('SW registered');
                  }, function(err) {
                    console.log('SW registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
