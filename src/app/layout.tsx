import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const APP_URL = "https://somy-qt.vercel.app";
const churchName = process.env.NEXT_PUBLIC_CHURCH_NAME || "";
const appName = process.env.NEXT_PUBLIC_APP_NAME || "소미 QT";

import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function generateMetadata(): Promise<Metadata> {
  let cid = 'jesus-in';
  try {
    const headersList = headers();
    cid = headersList.get('x-church-id') || 'jesus-in';
  } catch (e) {
    // Next.js static export (Capacitor 빌드 등)에서는 headers() 사용 시 에러 발생하므로 무시
  }

  const appName = process.env.NEXT_PUBLIC_APP_NAME || "소미 QT";
  let churchName = "";
  let description = "소미와 함께하는 따뜻한 큐티 시간 🐑";
  let ogImage = `${APP_URL}/og-image.png`;

  if (cid === 'jesus-in' || cid === 'default') {
    churchName = process.env.NEXT_PUBLIC_CHURCH_NAME || "예수인교회";
  } else {
    try {
      const { data: settings } = await supabaseAdmin
        .from('church_settings')
        .select('church_name, app_subtitle, church_logo_url')
        .eq('church_id', cid)
        .maybeSingle();

      if (settings) {
        churchName = settings.church_name;
        if (settings.app_subtitle) description = settings.app_subtitle;
        if (settings.church_logo_url) ogImage = settings.church_logo_url;
      }
    } catch (e) {
      console.error('Metadata fetch error:', e);
    }
  }

  const fullTitle = churchName ? `${appName} - ${churchName}` : appName;

  return {
    title: fullTitle,
    description: description,
    themeColor: "#D4AF37",
    viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: appName,
    },
    other: {
      "mobile-web-app-capable": "yes"
    },
    icons: {
      icon: "/somy.png",
      apple: "/somy.png",
      shortcut: "/somy.png",
    },
    openGraph: {
      title: fullTitle,
      description: description,
      url: APP_URL,
      siteName: appName,
      images: [{ url: ogImage }],
      type: "website",
      locale: "ko_KR",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: description,
      images: [ogImage],
    },
  };
}

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
                  // [Cache Bust] v=3를 추가하여 브라우저가 새 ID와 fetch 핸들러를 인식하게 합니다.
                  manifestLink.href = '/api/manifest?church_id=' + encodeURIComponent(cid) + '&v=3';
                  document.head.appendChild(manifestLink);
                  console.log('Dynamic manifest loaded for:', cid);
                } catch (e) {
                  const link = document.createElement('link');
                  link.rel = 'manifest';
                  link.href = '/manifest.json';
                  document.head.appendChild(link);
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
