import { NextRequest, NextResponse } from 'next/server';
import { fetchGodpeopleBibleText, parseBibleReference } from '@/lib/qt-sync';

// 장 전체 본문 캐시 (메모리 캐시로 반복 조회 즉시 응답)
const fullChapterPassageCache = new Map<number, string>();
const exactMaxVerseCache = new Map<number, number>();

// 개역개정 66권 각 장별 절 수 표준 테이블 (1회 호출 패스트패스용 + 오차 시 자동 이진탐색 보정)
const APPROX_CHAPTER_VERSES: number[][] = [
    // 창세기 (50)
    [31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26],
    // 출애굽기 (40)
    [22,25,22,31,23,30,25,32,35,29,10,51,22,31,27,36,16,27,25,26,36,31,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38],
    // 레위기 (27)
    [17,16,17,35,19,30,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34],
    // 민수기 (36)
    [54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,13,32,22,29,35,41,30,25,18,65,23,31,40,16,54,42,56,29,34,13],
    // 신명기 (34)
    [46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,68,29,20,30,52,29,12],
    // 여호수아 (24)
    [18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33],
    // 사사기 (21)
    [36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25],
    // 룻기 (4)
    [22,23,18,22],
    // 사무엘상 (31)
    [28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,42,15,23,29,22,44,25,12,25,11,31,13],
    // 사무엘하 (24)
    [27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,33,43,26,22,51,39,25],
    // 열왕기상 (22)
    [53,46,28,34,18,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,53],
    // 열왕기하 (25)
    [18,25,27,44,27,33,20,29,37,36,21,21,25,29,38,20,41,37,37,21,26,20,37,20,30],
    // 역대상 (29)
    [54,55,24,43,26,81,40,40,44,14,47,40,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30],
    // 역대하 (36)
    [17,18,17,22,14,42,22,18,31,19,23,16,22,15,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23],
    // 에스라 (10)
    [11,70,13,24,17,22,28,36,15,44],
    // 느헤미야 (13)
    [11,20,32,23,19,19,73,18,38,39,36,47,31],
    // 에스더 (10)
    [22,23,15,17,14,14,10,17,32,3],
    // 욥기 (42)
    [22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,30,24,34,17],
    // 시편 (150)
    [6,12,8,8,12,10,17,9,20,18,7,8,6,7,5,11,15,50,14,9,13,31,6,10,22,12,14,9,11,12,24,11,22,22,28,12,40,22,13,17,13,11,5,26,17,11,9,14,20,23,19,9,6,7,23,13,11,11,17,12,8,12,11,10,13,20,7,35,36,5,24,20,28,23,10,12,20,72,13,19,16,8,18,12,13,17,7,18,52,17,16,15,5,23,11,13,12,9,9,5,8,28,22,35,45,48,43,13,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,13,10,7,12,15,21,10,20,14,9,6],
    // 잠언 (31)
    [33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,27,33,31],
    // 전도서 (12)
    [18,26,22,16,20,12,29,17,18,20,10,14],
    // 아가 (8)
    [17,17,11,16,16,13,13,14],
    // 이사야 (66)
    [31,22,26,6,30,13,25,22,21,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,17,10,22,38,22,8,31,29,25,28,28,25,13,15,22,26,11,23,15,12,17,13,12,21,14,21,22,11,12,19,12,25,24],
    // 예레미야 (52)
    [19,37,25,31,31,30,34,22,26,25,23,17,27,22,21,21,27,23,15,18,14,30,40,10,38,24,22,17,32,24,40,44,26,22,19,32,21,28,18,16,18,22,13,30,5,28,7,47,39,46,64,34],
    // 예레미야애가 (5)
    [22,22,66,22,22],
    // 에스겔 (48)
    [28,10,27,17,17,14,27,18,11,22,25,28,23,23,8,63,24,32,14,49,32,31,49,27,17,21,36,26,21,26,18,32,33,31,15,38,28,23,29,49,26,20,27,31,25,24,23,35],
    // 다니엘 (12)
    [21,49,30,37,31,28,28,27,27,21,45,13],
    // 호세아 (14)
    [11,23,5,19,15,11,16,14,17,15,12,14,16,9],
    // 요엘 (3)
    [20,32,21],
    // 아모스 (9)
    [15,16,15,13,27,14,17,14,15],
    // 오바댜 (1)
    [21],
    // 요나 (4)
    [17,10,10,11],
    // 미가 (7)
    [16,13,12,13,15,16,20],
    // 나훔 (3)
    [15,13,19],
    // 하박국 (3)
    [17,20,19],
    // 스바냐 (3)
    [18,15,20],
    // 학개 (2)
    [15,23],
    // 스가랴 (14)
    [21,13,10,14,11,15,14,23,17,12,17,14,9,21],
    // 말라기 (4)
    [14,17,18,6],
    // 마태복음 (28)
    [25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20],
    // 마가복음 (16)
    [45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20],
    // 누가복음 (24)
    [80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53],
    // 요한복음 (21)
    [51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25],
    // 사도행전 (28)
    [26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,41,38,40,30,35,27,27,32,44,31],
    // 로마서 (16)
    [32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,27],
    // 고린도전서 (16)
    [31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24],
    // 고린도후서 (13)
    [24,17,18,18,21,18,16,24,15,18,33,21,13],
    // 갈라디아서 (6)
    [24,21,29,31,26,18],
    // 에베소서 (6)
    [23,22,21,32,33,24],
    // 빌립보서 (4)
    [30,30,21,23],
    // 골로새서 (4)
    [29,23,25,18],
    // 데살로니가전서 (5)
    [10,20,13,18,28],
    // 데살로니가후서 (3)
    [12,17,18],
    // 디모데전서 (6)
    [20,15,16,16,25,21],
    // 디모데후서 (4)
    [18,26,17,22],
    // 디도서 (3)
    [16,15,15],
    // 빌레몬서 (1)
    [25],
    // 히브리서 (13)
    [14,18,19,16,14,20,28,13,28,39,40,29,25],
    // 야고보서 (5)
    [27,26,18,17,20],
    // 베드로전서 (5)
    [25,25,22,19,14],
    // 베드로후서 (3)
    [21,22,18],
    // 요한일서 (5)
    [10,29,24,21,21],
    // 요한이서 (1)
    [13],
    // 요한삼서 (1) - 개역개정은 15절
    [15],
    // 유다서 (1)
    [25],
    // 요한계시록 (22)
    [20,29,22,11,14,17,17,13,21,11,19,17,18,20,8,21,18,24,21,15,27,21],
];

async function queryGodpeopleRange(ucodeNum: number, vStart: number, vEnd: number) {
    const res = await fetch('https://godpick.godpeople.com/ajax.getbible.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Origin: 'https://cnts.godpeople.com',
            Referer: 'https://cnts.godpeople.com/',
            'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        body: JSON.stringify({
            task: 'Phrase',
            ver: 'rv',
            ucode: ucodeNum,
            ujeol_s: vStart,
            ujeol_e: vEnd,
            full: 1,
        }),
        cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
}

function formatGodpeopleRows(rows: any[]): string {
    return rows
        .map((item: any) => {
            const j = String(item.jeol || item.no).trim();
            const phrase = String(item.phrase || '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            return `${j}. ${phrase}`;
        })
        .join('\n');
}

async function fetchFullSingleChapter(bookIndex: number, chapter: number): Promise<string> {
    const ucodeNum = bookIndex * 1000 + chapter;
    if (fullChapterPassageCache.has(ucodeNum)) {
        return fullChapterPassageCache.get(ucodeNum)!;
    }

    const guessedMax =
        exactMaxVerseCache.get(ucodeNum) ||
        APPROX_CHAPTER_VERSES[bookIndex - 1]?.[chapter - 1] ||
        30;

    // 1차 시도: 표준 장별 절 수로 단 1회 호출
    const firstTry = await queryGodpeopleRange(ucodeNum, 1, guessedMax);
    if (firstTry && firstTry.success && Array.isArray(firstTry.result) && firstTry.result.length > 0) {
        const passage = formatGodpeopleRows(firstTry.result);
        exactMaxVerseCache.set(ucodeNum, guessedMax);
        fullChapterPassageCache.set(ucodeNum, passage);
        return passage;
    }

    // 2차 안전장치: 절 수 오차(error_code 775) 발생 시 이진 탐색으로 정확한 끝 절 번호 자동 확정
    let lo = 1;
    let hi = 176;
    let bestRows: any[] | null = null;
    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const probe = await queryGodpeopleRange(ucodeNum, 1, mid);
        if (probe && probe.success && Array.isArray(probe.result) && probe.result.length > 0) {
            bestRows = probe.result;
            exactMaxVerseCache.set(ucodeNum, mid);
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }

    if (bestRows && bestRows.length > 0) {
        const passage = formatGodpeopleRows(bestRows);
        fullChapterPassageCache.set(ucodeNum, passage);
        return passage;
    }

    return '';
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { reference, fullChapter } = body || {};

    if (!reference) {
        return NextResponse.json({ error: '성경 구절을 입력해주세요.' }, { status: 400 });
    }

    try {
        const parsed = parseBibleReference(reference);

        // 장 전체 조회 요청(성경통독방)이거나 명시적 절 지정 없이 장만 입력된 경우 전체 절을 빠짐없이 반환
        if (parsed && (fullChapter || !parsed.hasExplicitVerses)) {
            const unit = parsed.bookName === '시편' ? '편' : '장';
            const passage = await fetchFullSingleChapter(parsed.bookIndex, parsed.startChapter);
            if (passage) {
                return NextResponse.json({
                    reference: `${parsed.bookName} ${parsed.startChapter}${unit}`,
                    passage,
                    godpeopleUrl: parsed.godpeopleUrl,
                    fromGodpeople: true,
                });
            }
        }

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
