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
            const full_name = (row['성명'] || row['이름'] || '').toString().trim();
            const phone = (row['휴대폰'] || row['전화번호'] || '').toString().trim();
            const birthdateInput = row['생년월일'] || row['생일'];
            const address = row['주소'];
            const church_rank = row['교회직분'];
            const member_no = row['교적번호'];
            const gender = row['성별'];
            const avatar_url = row['교인사진'] || row['사진'];

            // 엑셀 날짜 형식 처리 (숫자 형태 또는 텍스트 형태)
            let formattedBirthdate = null;
            if (birthdateInput) {
                try {
                    if (typeof birthdateInput === 'number') {
                        // 엑셀 날짜(정수)를 JS 날짜로 변환
                        const date = new Date((birthdateInput - 25569) * 86400 * 1000);
                        formattedBirthdate = date.toISOString().split('T')[0];
                    } else {
                        const date = new Date(birthdateInput);
                        if (!isNaN(date.getTime())) {
                            formattedBirthdate = date.toISOString().split('T')[0];
                        }
                    }
                } catch (e) {
                    console.warn(`[Bulk] 날짜 변환 실패 (${full_name}):`, birthdateInput);
                }
            }

            // 이메일이 없는 경우 대비한 스마트 식별자 생성
            const email = row['이메일'] || (phone ? `${phone.replace(/-/g, '')}@church.local` : (full_name ? `${full_name}@noemail.local` : null));

            if (!email) continue;

            const { error } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    full_name,
                    email,
                    phone,
                    birthdate: formattedBirthdate,
                    address,
                    avatar_url,
                    member_no,
                    gender,
                    church_rank,
                    church_id: church_id || 'jesus-in'
                }, { onConflict: 'email' });

            if (error) {
                console.error(`[Bulk Error] ${full_name} 저장 실패:`, error.message);
            } else {
                successCount++;
            }
        }

        return NextResponse.json({ success: true, count: successCount });
    } catch (err: any) {
        console.error('Bulk Upload Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
