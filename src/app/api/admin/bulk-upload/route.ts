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
            // 대소문자나 공백 무관하게 매칭
            const findValue = (keys: string[]) => {
                const foundKey = Object.keys(row).find(k => keys.map(ki => ki.replace(/\s/g, '').toLowerCase()).includes(k.replace(/\s/g, '').toLowerCase()));
                return foundKey ? row[foundKey] : null;
            };

            const full_name = (findValue(['성명', '이름', '성함', 'Name']) || '').toString().trim();
            if (!full_name) continue; // 이름 없으면 그냥 넘어감 (빈 줄 방지)

            const phone = (findValue(['휴대폰', '전화번호', '연락처', 'Phone']) || '').toString().trim();
            const birthdateInput = findValue(['생년월일', '생일', 'Birth']);
            const address = findValue(['주소', 'Address']);
            const church_rank = findValue(['교회직분', '직분', 'Rank']);
            const member_no = findValue(['교적번호', '교적', 'No']);
            const gender = findValue(['성별', 'Gender']);
            const avatar_url = findValue(['교인사진', '사진', '사진URL', 'Photo']);

            let formattedBirthdate = null;
            if (birthdateInput) {
                try {
                    if (typeof birthdateInput === 'number') {
                        const date = new Date((birthdateInput - 25569) * 86400 * 1000);
                        formattedBirthdate = date.toISOString().split('T')[0];
                    } else {
                        const date = new Date(birthdateInput);
                        if (!isNaN(date.getTime())) formattedBirthdate = date.toISOString().split('T')[0];
                    }
                } catch (e) { }
            }

            // 고유 식별 이메일 (휴대폰 -> 이름 순으로 자동 생성)
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            const email = findValue(['이메일', 'Email']) || (cleanPhone ? `${cleanPhone}@church.local` : `${full_name}@noemail.local`);

            const { error } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    full_name,
                    email,
                    phone: phone || null,
                    birthdate: formattedBirthdate,
                    address: address || null,
                    avatar_url: avatar_url || null,
                    member_no: member_no || null,
                    gender: gender || null,
                    church_rank: church_rank || null,
                    church_id: church_id || 'jesus-in'
                }, { onConflict: 'email' });

            if (error) {
                errors.push(`${full_name}: ${error.message}`);
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
