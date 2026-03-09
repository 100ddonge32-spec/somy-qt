import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const normalizeId = (id: string | null) => {
    if (!id) return 'jesus-in';
    const s = id.toLowerCase().trim();
    if (s === '예수인교회' || s === 'jesus-in' || s === '예수인' || s === 'jesus' || s === 'default' || s === 'somy-main' || s === '') {
        return 'jesus-in';
    }
    return s;
};

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const churchIdParam = searchParams.get('church_id');
    const normalizedId = normalizeId(churchIdParam);

    let churchName = "소미 QT";
    let churchLogo = "/somy.png";
    let startUrl = "/";

    if (normalizedId !== 'jesus-in') {
        const { data: settings } = await supabaseAdmin
            .from('church_settings')
            .select('church_name, church_logo_url')
            .eq('church_id', normalizedId)
            .maybeSingle();

        if (settings) {
            churchName = settings.church_name || churchName;
            churchLogo = settings.church_logo_url || churchLogo;
            startUrl = `/?church_id=${normalizedId}`;
        }
    } else {
        // 예수인교회 기본값 (또는 somy-main 플랫폼 기본값)
        if (churchIdParam === 'somy-main') {
            churchName = "소미 플랫폼";
            startUrl = "/?church_id=somy-main";
        } else {
            churchName = "예수인교회 큐티";
            // [Fix] Broken Supabase URL replaced with local fallback
            churchLogo = "/somy.png";
            startUrl = "/";
        }
    }

    const manifest = {
        name: churchName,
        short_name: churchName,
        description: `${churchName} 성도님들을 위한 큐티 서비스`,
        start_url: startUrl,
        display: "standalone",
        background_color: "#FFF8F0",
        theme_color: "#D4AF37",
        icons: [
            {
                src: churchLogo,
                sizes: "192x192",
                type: "image/png",
                purpose: "any maskable"
            },
            {
                src: churchLogo,
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable"
            }
        ],
        gcm_sender_id: "103953800507"
    };

    return NextResponse.json(manifest, {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        }
    });
}
