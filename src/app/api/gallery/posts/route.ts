import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// 게시물 목록 조회
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const churchId = searchParams.get('church_id') || 'jesus-in';
        const limit = parseInt(searchParams.get('limit') || '50');

        const { data, error } = await supabaseAdmin
            .from('gallery_posts')
            .select(`
                *,
                profiles:user_id (
                    full_name
                )
            `)
            .eq('church_id', churchId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // profiles에서 최신 이름을 가져와서 user_name 보완
        const formattedData = data.map((item: any) => ({
            ...item,
            user_name: item.profiles?.full_name || item.user_name || '알 수 없음'
        }));

        return NextResponse.json(formattedData);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 새 게시물 작성
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { user_id, user_name, avatar_url, image_url, image_urls, description, church_id } = body;

        if (!user_id || (!image_url && (!image_urls || image_urls.length === 0))) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const cid = church_id || 'jesus-in';

        // image_urls가 있으면 첫 번째 이미지를 대표 이미지(image_url)로 설정 (하위 호환성)
        const finalImageUrl = image_url || (image_urls && image_urls.length > 0 ? image_urls[0] : '');
        const finalImageUrls = image_urls || (image_url ? [image_url] : []);

        const { data, error } = await supabaseAdmin
            .from('gallery_posts')
            .insert([{
                user_id,
                user_name,
                avatar_url,
                image_url: finalImageUrl,
                image_urls: finalImageUrls, // TEXT[] 컬럼 필요
                description,
                church_id: cid
            }])
            .select()
            .single();

        if (error) {
            console.error('Gallery Insert Error:', error);
            // 만약 image_urls 컬럼이 아직 없다면 image_url만으로 다시 시도 (하위 호환성 강화)
            if (error.message?.includes('image_urls')) {
                const { data: retryData, error: retryError } = await supabaseAdmin
                    .from('gallery_posts')
                    .insert([{
                        user_id,
                        user_name,
                        avatar_url,
                        image_url: finalImageUrl,
                        description,
                        church_id: cid
                    }])
                    .select()
                    .single();
                if (retryError) throw retryError;
                return NextResponse.json(retryData);
            }
            throw error;
        }

        // 활동 로그 기록
        logActivity(user_id, user_name, 'POST_CREATED', cid, `갤러리 사진 공유: ${description?.slice(0, 20) || ''}`);

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 게시물 삭제
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, user_id, is_admin } = body;

        if (!id) return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });

        // 권한 확인 (본인 또는 관리자)
        let query = supabaseAdmin.from('gallery_posts').delete().eq('id', id);
        if (!is_admin) {
            query = query.eq('user_id', user_id);
        }

        const { error, count } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true, deleted: count });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
