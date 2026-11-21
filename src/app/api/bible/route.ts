import { NextRequest, NextResponse } from 'next/server';
import { fetchGodpeopleBibleText } from '@/lib/qt-sync';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { reference } = body;

    if (!reference) {
        return NextResponse.json({ error: '성경 구절을 입력해주세요.' }, { status: 400 });
    }

    try {
        const result = await fetchGodpeopleBibleText(reference);
        if (!result.passage) {
            return NextResponse.json({ error: '성경 본문 가져오기 실패' }, { status: 500 });
        }

        return NextResponse.json({
            reference: result.reference || reference,
            passage: result.passage,
            godpeopleUrl: result.godpeopleUrl,
            fromGodpeople: result.fromGodpeople,
        });
    } catch (err) {
        console.error('Bible fetch error:', err);
        return NextResponse.json({ error: '성경 본문 가져오기 실패' }, { status: 500 });
    }
}
