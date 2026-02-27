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
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (!rows || rows.length === 0) {
            console.log("[Bulk] 엑셀 행이 비어있음");
            return NextResponse.json({ success: false, error: '엑셀 파일에 데이터가 없거나 형식이 잘못되었습니다.' }, { status: 400 });
        }

        console.log(`[Bulk] 업로드 시작 - 총 ${rows.length}개 행 감지`);

        let successCount = 0;
        const errors: string[] = [];

        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const findValue = (keys: string[]) => {
                const foundKey = Object.keys(row).find(k =>
                    keys.map(ki => ki.replace(/\s/g, '').toLowerCase())
                        .includes(k.replace(/\s/g, '').toLowerCase())
                );
                return foundKey ? row[foundKey] : null;
            };

            // 검색 시 불일치(공백 등으로)를 방지하기 위해 공백을 전부 제거합니다. 
            // 성명: 공백을 완전히 제거하지 않고 앞뒤 공백만 제거하여 원본성을 유지합니다.
            let full_name = (findValue(['성명', '이름', '성함', 'Name']) || '').toString().trim();

            if (!full_name) {
                console.log(`[Bulk] ${index + 1}행: 성명 없음, 건너뜀`);
                continue;
            }

            const phone = (findValue(['휴대폰', '전화번호', '연락처', 'Phone', 'Cell']) || '').toString().trim();
            const birthdateInput = findValue(['생년월일', '생일', 'Birth', 'Birthday']);
            const address = findValue(['주소', 'Address']);
            const church_rank = findValue(['교회직분', '직분', 'Rank', 'Title']);
            const member_no = findValue(['교적번호', '교적', 'No', 'MemberNo']);
            const gender = findValue(['성별', 'Gender', 'Sex']);
            let avatar_url = findValue(['교인사진', '사진', '사진URL', 'Photo', 'Image']);
            const registeredDateInput = findValue(['등록일', '가입일', 'RegisteredAt', 'CreatedAt', 'JoinDate']);

            // 이미지 주소 정제 (텍스트가 아닌 객체가 들어오거나 URL이 아닌 경우 처리)
            if (avatar_url && typeof avatar_url === 'object') {
                console.log(`[Bulk] ${full_name}: 사진 칸에 지원되지 않는 데이터(객체/이미지)가 있습니다.`);
                avatar_url = null;
            } else if (avatar_url && avatar_url.toString().startsWith('http')) {
                avatar_url = avatar_url.toString().trim();
            } else {
                avatar_url = null;
            }

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
                } catch (e) {
                    console.warn(`[Bulk] ${full_name} 생일 날짜 변환 에러:`, birthdateInput);
                }
            }

            let formattedRegisteredAt = null;
            if (registeredDateInput) {
                try {
                    if (typeof registeredDateInput === 'number') {
                        const date = new Date((registeredDateInput - 25569) * 86400 * 1000);
                        formattedRegisteredAt = date.toISOString();
                    } else {
                        const date = new Date(registeredDateInput);
                        if (!isNaN(date.getTime())) formattedRegisteredAt = date.toISOString();
                    }
                } catch (e) {
                    console.warn(`[Bulk] ${full_name} 등록일 날짜 변환 에러:`, registeredDateInput);
                }
            }

            // 고유 식별 이메일 (휴대폰 -> 이름 순으로 자동 생성)
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            const emailValue = findValue(['이메일', 'Email', 'Mail']);
            const email = (emailValue ? emailValue.toString().trim() : null) || (cleanPhone ? `${cleanPhone}@church.local` : `${full_name}@noemail.local`);

            if (!email) {
                console.log(`[Bulk] ${full_name}: 이메일 생성 불가, 건너뜀`);
                continue;
            }

            const is_birthdate_lunar = findValue(['음력', 'Lunar', 'IsLunar']) === '음력' || findValue(['음력', 'Lunar', 'IsLunar']) === true;
            const is_birthdate_public = findValue(['생일공개', 'BirthPublic']) !== '비공개' && findValue(['생일공개', 'BirthPublic']) !== false;
            const is_phone_public = findValue(['번호공개', 'PhonePublic']) !== '비공개' && findValue(['번호공개', 'PhonePublic']) !== false;
            const is_address_public = findValue(['주소공개', 'AddressPublic']) === '공개' || findValue(['주소공개', 'AddressPublic']) === true;

            const upsertData: any = {
                full_name,
                email,
                phone: phone || null,
                birthdate: formattedBirthdate,
                is_birthdate_lunar,
                is_birthdate_public,
                is_phone_public,
                is_address_public,
                address: address || null,
                avatar_url: avatar_url,
                member_no: member_no || null,
                gender: gender || null,
                church_rank: church_rank || null,
                church_id: church_id || 'jesus-in',
                is_approved: true // 벌크 업로드는 관리자가 하므로 기본 승인 처리
            };

            if (formattedRegisteredAt) {
                upsertData.created_at = formattedRegisteredAt;
            }

            const { error } = await supabaseAdmin
                .from('profiles')
                .upsert(upsertData, { onConflict: 'email' });

            if (error) {
                console.error(`[Bulk Error] ${full_name} (${email}):`, error.message);
                errors.push(`${full_name}: ${error.message}`);
            } else {
                successCount++;
            }
        }

        console.log(`[Bulk] 업로드 완료 - 성공: ${successCount}, 에러: ${errors.length}`);

        return NextResponse.json({
            success: successCount > 0,
            count: successCount,
            errors: errors.length > 0 ? errors.slice(0, 5) : null
        });
    } catch (err: any) {
        console.error('Bulk Upload Terminal Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
