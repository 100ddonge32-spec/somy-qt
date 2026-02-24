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
        const errors: string[] = [];

        for (const row of rows) {
            // 대소문자나 공백 무관하게 매칭하기 위해 키를 정리
            const findValue = (keys: string[]) => {
                const foundKey = Object.keys(row).find(k => keys.includes(k.replace(/\s/g, '')));
                return foundKey ? row[foundKey] : null;
            };

            const full_name = (findValue(['성명', '이름', '성함']) || '').toString().trim();
            const phone = (findValue(['휴대폰', '전화번호', '연락처']) || '').toString().trim();
            const birthdateInput = findValue(['생년월일', '생일']);
            const address = findValue(['주소']);
            const church_rank = findValue(['교회직분', '직분']);
            const member_no = findValue(['교적번호', '교적']);
            const gender = findValue(['성별']);
            const avatar_url = findValue(['교인사진', '사진', '사진URL']);

            if (!full_name) {
                errors.push("성명 데이터가 없는 행이 있습니다.");
                continue;
            }

            let formattedBirthdate = null;
            if (birthdateInput) {
                try {
                    if (typeof birthdateInput === 'number') {
                        const date = new Date((birthdateInput - 25569) * 86400 * 1000);
                        formattedBirthdate = date.toISOString().split('T')[0];
                    } else {
                        const date = new Date(birthdateInput);
                        if (!isNaN(date.getTime())) {
                            formattedBirthdate = date.toISOString().split('T')[0];
                        }
                    }
                } catch (e) { }
            }

            const email = findValue(['이메일']) || (phone ? `${phone.replace(/-/g, '')}@church.local` : `${full_name}@noemail.local`);

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
                errors.push(`${full_name}: ${error.message}`);
                console.error(`[Bulk Error]`, error);
            } else {
                successCount++;
            }
        }

        return NextResponse.json({
            success: successCount > 0,
            count: successCount,
            errors: errors.length > 0 ? errors.slice(0, 3) : null // 너무 많을까봐 3개만 리턴
        });
    } catch (err: any) {
        console.error('Bulk Upload Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
