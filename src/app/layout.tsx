import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const APP_URL = "https://somy-qt.vercel.app";
const churchName = process.env.NEXT_PUBLIC_CHURCH_NAME || "";
const appName = process.env.NEXT_PUBLIC_APP_NAME || "소미 QT";

export const metadata: Metadata = {
  title: churchName ? `${appName} - ${churchName}` : appName,
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
  // manifest: "/manifest.json", // 동적 매니페스트 사용을 위해 주석 처리
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
              (function() {
                try {
                  const urlParams = new URLSearchParams(window.location.search);
                  const path = window.location.pathname.replace(/^\\/|\\/$/g, '');
                  let cid = urlParams.get('church_id') || urlParams.get('church') || path || localStorage.getItem('church_id') || 'jesus-in';
                  
                  if (cid === 'somy-main' || cid === 'default' || cid === '') cid = 'jesus-in';

                  const manifestLink = document.createElement('link');
                  manifestLink.rel = 'manifest';
                  manifestLink.href = '/api/manifest?church_id=' + encodeURIComponent(cid);
                  document.head.appendChild(manifestLink);
                  console.log('Dynamic manifest loaded for:', cid);
                } catch (e) {
                  const link = document.createElement('link');
                  link.rel = 'manifest';
                  link.href = '/manifest.json';
                  document.head.appendChild(link);
                }
              })();

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
