import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const church_id = formData.get('church_id') as string;

        if (!file) {
            return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const workbook = XLSX.read(bytes, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 엑셀 데이터를 JSON으로 변환
        // 헤더: 이름 | 이메일 | 전화번호 | 생일 | 주소
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

        let successCount = 0;
        for (const row of rows) {
            const full_name = row['성명'] || row['이름'];
            const phone = row['휴대폰'] || row['전화번호'];
            const birthdate = row['생년월일'] || row['생일'];
            const address = row['주소'];
            const church_rank = row['교회직분'];
            const member_no = row['교적번호'];
            const gender = row['성별'];
            const avatar_url = row['교인사진'] || row['사진'];

            // 이메일이 없는 경우 이름을 기반으로 더미 이메일 생성 또는 기존 유저 검색 (여기서는 성명 활용)
            // 대표님 양식에는 이메일이 없으므로, 휴대폰 번호를 이메일 키로 활용하는 방식 제안
            const email = row['이메일'] || (phone ? `${phone.replace(/-/g, '')}@church.local` : null);

            if (!email && !full_name) continue;

            const { error } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    full_name,
                    email,
                    phone,
                    birthdate: birthdate ? new Date(birthdate).toISOString().split('T')[0] : null,
                    address,
                    avatar_url,
                    church_id: church_id || 'jesus-in'
                }, { onConflict: 'email' });

            if (!error) successCount++;
        }

        return NextResponse.json({ success: true, count: successCount });
    } catch (err: any) {
        console.error('Bulk Upload Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
