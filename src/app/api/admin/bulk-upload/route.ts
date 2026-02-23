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
            const full_name = row['이름'] || row['성함'];
            const email = row['이메일'];
            const phone = row['전화번호'] || row['연락처'];
            const birthdate = row['생일'] || row['생년월일'];
            const address = row['주소'];

            if (!email) continue;

            // profiles 테이블에 업데이트 (이메일로 매칭하거나 새로 생성)
            // 주의: 실제 환경에서는 auth.users와 연동되어야 하므로, 
            // 여기서는 이미 가입된 유저의 프로필 정보를 업데이트하는 방식으로 작동합니다.
            const { error } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    full_name,
                    email,
                    phone,
                    birthdate: birthdate ? new Date(birthdate).toISOString().split('T')[0] : null,
                    address,
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
