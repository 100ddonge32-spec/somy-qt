import OpenAI from 'openai';
import { getTodayReading } from './reading-plan';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const DEFAULT_COOMMI_URL = 'https://coommi.org/Board/Detail/9579/125816?category=0';
export const COOMMI_BOARD_LIST_URL = 'https://coommi.org/Board/List/9579?category=0';

interface BibleBookInfo {
    index: number;
    name: string;
    aliases: string[];
}

export const BIBLE_BOOKS: BibleBookInfo[] = [
    { index: 1, name: '창세기', aliases: ['창세기', '창'] },
    { index: 2, name: '출애굽기', aliases: ['출애굽기', '출'] },
    { index: 3, name: '레위기', aliases: ['레위기', '레'] },
    { index: 4, name: '민수기', aliases: ['민수기', '민'] },
    { index: 5, name: '신명기', aliases: ['신명기', '신'] },
    { index: 6, name: '여호수아', aliases: ['여호수아', '수'] },
    { index: 7, name: '사사기', aliases: ['사사기', '삿'] },
    { index: 8, name: '룻기', aliases: ['룻기', '룻'] },
    { index: 9, name: '사무엘상', aliases: ['사무엘상', '삼상'] },
    { index: 10, name: '사무엘하', aliases: ['사무엘하', '삼하'] },
    { index: 11, name: '열왕기상', aliases: ['열왕기상', '왕상'] },
    { index: 12, name: '열왕기하', aliases: ['열왕기하', '왕하'] },
    { index: 13, name: '역대상', aliases: ['역대상', '대상'] },
    { index: 14, name: '역대하', aliases: ['역대하', '대하'] },
    { index: 15, name: '에스라', aliases: ['에스라', '스'] },
    { index: 16, name: '느헤미야', aliases: ['느헤미야', '느'] },
    { index: 17, name: '에스더', aliases: ['에스더', '더'] },
    { index: 18, name: '욥기', aliases: ['욥기', '욥'] },
    { index: 19, name: '시편', aliases: ['시편', '시'] },
    { index: 20, name: '잠언', aliases: ['잠언', '잠'] },
    { index: 21, name: '전도서', aliases: ['전도서', '전'] },
    { index: 22, name: '아가', aliases: ['아가', '아'] },
    { index: 23, name: '이사야', aliases: ['이사야', '사'] },
    { index: 24, name: '예레미야', aliases: ['예레미야', '렘'] },
    { index: 25, name: '예레미야애가', aliases: ['예레미야애가', '애가', '애'] },
    { index: 26, name: '에스겔', aliases: ['에스겔', '겔'] },
    { index: 27, name: '다니엘', aliases: ['다니엘', '단'] },
    { index: 28, name: '호세아', aliases: ['호세아', '호'] },
    { index: 29, name: '요엘', aliases: ['요엘', '욜'] },
    { index: 30, name: '아모스', aliases: ['아모스', '암'] },
    { index: 31, name: '오바댜', aliases: ['오바댜', '옵'] },
    { index: 32, name: '요나', aliases: ['요나', '욘'] },
    { index: 33, name: '미가', aliases: ['미가', '미'] },
    { index: 34, name: '나훔', aliases: ['나훔', '나'] },
    { index: 35, name: '하박국', aliases: ['하박국', '합'] },
    { index: 36, name: '스바냐', aliases: ['스바냐', '습'] },
    { index: 37, name: '학개', aliases: ['학개', '학'] },
    { index: 38, name: '스가랴', aliases: ['스가랴', '슥'] },
    { index: 39, name: '말라기', aliases: ['말라기', '말'] },
    { index: 40, name: '마태복음', aliases: ['마태복음', '마태', '마'] },
    { index: 41, name: '마가복음', aliases: ['마가복음', '마가', '막'] },
    { index: 42, name: '누가복음', aliases: ['누가복음', '누가', '눅'] },
    { index: 43, name: '요한복음', aliases: ['요한복음', '요'] },
    { index: 44, name: '사도행전', aliases: ['사도행전', '행전', '행'] },
    { index: 45, name: '로마서', aliases: ['로마서', '롬'] },
    { index: 46, name: '고린도전서', aliases: ['고린도전서', '고전'] },
    { index: 47, name: '고린도후서', aliases: ['고린도후서', '고후'] },
    { index: 48, name: '갈라디아서', aliases: ['갈라디아서', '갈'] },
    { index: 49, name: '에베소서', aliases: ['에베소서', '엡'] },
    { index: 50, name: '빌립보서', aliases: ['빌립보서', '빌'] },
    { index: 51, name: '골로새서', aliases: ['골로새서', '골'] },
    { index: 52, name: '데살로니가전서', aliases: ['데살로니가전서', '살전'] },
    { index: 53, name: '데살로니가후서', aliases: ['데살로니가후서', '살후'] },
    { index: 54, name: '디모데전서', aliases: ['디모데전서', '딤전'] },
    { index: 55, name: '디모데후서', aliases: ['디모데후서', '딤후'] },
    { index: 56, name: '디도서', aliases: ['디도서', '딛'] },
    { index: 57, name: '빌레몬서', aliases: ['빌레몬서', '몬'] },
    { index: 58, name: '히브리서', aliases: ['히브리서', '히'] },
    { index: 59, name: '야고보서', aliases: ['야고보서', '약'] },
    { index: 60, name: '베드로전서', aliases: ['베드로전서', '벧전'] },
    { index: 61, name: '베드로후서', aliases: ['베드로후서', '벧후'] },
    { index: 62, name: '요한일서', aliases: ['요한일서', '요한1서', '요일'] },
    { index: 63, name: '요한이서', aliases: ['요한이서', '요한2서', '요이'] },
    { index: 64, name: '요한삼서', aliases: ['요한삼서', '요한3서', '요삼'] },
    { index: 65, name: '유다서', aliases: ['유다서', '유'] },
    { index: 66, name: '요한계시록', aliases: ['요한계시록', '계시록', '계'] },
];

export interface ParsedBibleRange {
    bookIndex: number;
    bookName: string;
    startChapter: number;
    startVerse: number;
    endChapter: number;
    endVerse: number;
    formattedReference: string;
    godpeopleUrl: string;
}

/**
 * HTML 문자열에서 태그를 제거하고 줄바꿈을 보존한 텍스트로 변환합니다.
 */
function htmlToCleanText(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<(br|p|div|tr|li|h[1-6]|dt|dd|section|article)[^>]*>/gi, '\n')
        .replace(/<\/(p|div|tr|li|h[1-6]|table|ul|ol)>/gi, '\n')
        .replace(/<td[^>]*>/gi, ' | ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n+/g, '\n')
        .trim();
}

/**
 * 성경 구절 문자열(예: "요한계시록 2:1-7", "계 2:1~7", "사도행전 15장 1-11절")을 파싱합니다.
 */
export function parseBibleReference(rawRef: string): ParsedBibleRange | null {
    if (!rawRef) return null;
    const cleaned = rawRef
        .replace(/\s+/g, ' ')
        .replace(/[()[\]]/g, ' ')
        .trim();

    // 긴 이름(예: 요한계시록, 예레미야애가)부터 먼저 매칭되도록 정렬
    const allAliases: { alias: string; book: BibleBookInfo }[] = [];
    for (const book of BIBLE_BOOKS) {
        for (const alias of book.aliases) {
            allAliases.push({ alias, book });
        }
    }
    allAliases.sort((a, b) => b.alias.length - a.alias.length);

    for (const { alias, book } of allAliases) {
        // 패턴 1: "요한계시록 2:1-7" 또는 "요한계시록 2:1-3:5"
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexColon = new RegExp(
            `${escaped}\\s*(\\d+)\\s*(?:장|:)\\s*(\\d+)\\s*(?:절)?\\s*(?:[-~∼~—]\\s*(?:(\\d+)\\s*(?:장|:)\\s*)?(\\d+)\\s*(?:절)?)?`,
            'i'
        );
        const match = cleaned.match(regexColon);
        if (match) {
            const startChapter = parseInt(match[1], 10);
            const startVerse = parseInt(match[2], 10);
            const endChapter = match[3] ? parseInt(match[3], 10) : startChapter;
            const endVerse = match[4] ? parseInt(match[4], 10) : startVerse;

            const code = `${String(book.index).padStart(2, '0')}${String(startChapter).padStart(3, '0')}`;
            const formattedReference =
                startChapter === endChapter
                    ? startVerse === endVerse
                        ? `${book.name} ${startChapter}:${startVerse}`
                        : `${book.name} ${startChapter}:${startVerse}-${endVerse}`
                    : `${book.name} ${startChapter}:${startVerse}-${endChapter}:${endVerse}`;

            return {
                bookIndex: book.index,
                bookName: book.name,
                startChapter,
                startVerse,
                endChapter,
                endVerse,
                formattedReference,
                godpeopleUrl: `https://cnts.godpeople.com/words/${code}`,
            };
        }

        // 패턴 2: 장만 있는 경우 (예: "창세기 24" 또는 "창세기 1-2") -> 1절~끝절(999)
        const regexChapterOnly = new RegExp(`${escaped}\\s*(\\d+)(?:\\s*[-~]\\s*(\\d+))?\\s*(?:장)?`, 'i');
        const chapMatch = cleaned.match(regexChapterOnly);
        if (chapMatch) {
            const startChapter = parseInt(chapMatch[1], 10);
            const endChapter = chapMatch[2] ? parseInt(chapMatch[2], 10) : startChapter;
            const code = `${String(book.index).padStart(2, '0')}${String(startChapter).padStart(3, '0')}`;
            return {
                bookIndex: book.index,
                bookName: book.name,
                startChapter,
                startVerse: 1,
                endChapter,
                endVerse: 200,
                formattedReference:
                    startChapter === endChapter
                        ? `${book.name} ${startChapter}장`
                        : `${book.name} ${startChapter}-${endChapter}장`,
                godpeopleUrl: `https://cnts.godpeople.com/words/${code}`,
            };
        }
    }

    return null;
}

/**
 * 1단계: 꿈미(coommi.org) 사이트에서 특정 날짜(YYYY-MM-DD)의 큐티 성경 구절 범위를 가져옵니다.
 */
export async function fetchCoommiReference(
    date: string,
    customCoommiUrl?: string
): Promise<{ reference: string; sourceUrl: string; fromCoommi: boolean }> {
    const targetUrl = customCoommiUrl?.trim() || process.env.COOMMI_QT_URL || DEFAULT_COOMMI_URL;
    const [, monthStr, dayStr] = date.split('-');
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    const urlsToTry = [targetUrl];
    if (!urlsToTry.includes(COOMMI_BOARD_LIST_URL)) {
        urlsToTry.push(COOMMI_BOARD_LIST_URL);
    }

    const fetchHeaders = {
        'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    };

    for (const url of urlsToTry) {
        try {
            const res = await fetch(url, {
                headers: fetchHeaders,
                cache: 'no-store',
            });
            if (!res.ok) continue;

            const html = await res.text();

            // 만약 게시판 목록 페이지이거나 해당 상세 페이지에 다른 상세 게시글 링크(/Board/Detail/9579/...)가 있다면 추출
            const cleanText = htmlToCleanText(html);

            // 상세 페이지 안에 본문 구절이 있는지 먼저 AI + 정규식으로 확인
            const extracted = await extractReferenceForDateFromText(cleanText, date, month, day);
            if (extracted) {
                const parsed = parseBibleReference(extracted);
                return {
                    reference: parsed ? parsed.formattedReference : extracted,
                    sourceUrl: url,
                    fromCoommi: true,
                };
            }

            // 만약 현재 페이지에서 해당 날짜 구절을 못 찾았고, HTML 내에 /Board/Detail/9579/{id} 링크들이 있다면 최신 링크 최대 3개 탐색
            const detailLinkMatches = Array.from(
                html.matchAll(/\/Board\/Detail\/9579\/(\d+)(?:\?category=\d+)?/gi)
            );
            const seenIds = new Set<string>();
            for (const m of detailLinkMatches) {
                const postId = m[1];
                if (seenIds.has(postId) || url.includes(postId)) continue;
                seenIds.add(postId);
                if (seenIds.size > 4) break;

                const subUrl = `https://coommi.org/Board/Detail/9579/${postId}?category=0`;
                try {
                    const subRes = await fetch(subUrl, { headers: fetchHeaders, cache: 'no-store' });
                    if (!subRes.ok) continue;
                    const subHtml = await subRes.text();
                    const subText = htmlToCleanText(subHtml);
                    const subExtracted = await extractReferenceForDateFromText(subText, date, month, day);
                    if (subExtracted) {
                        const parsed = parseBibleReference(subExtracted);
                        return {
                            reference: parsed ? parsed.formattedReference : subExtracted,
                            sourceUrl: subUrl,
                            fromCoommi: true,
                        };
                    }
                } catch {
                    // ignore sub-page error
                }
            }
        } catch (err) {
            console.warn(`[Coommi Fetch Warning] Failed on ${url}:`, err);
        }
    }

    // 폴백: 꿈미 사이트 연결 실패 시 기본 성경 읽기표 구절 반환
    const fallbackRef = getTodayReading(date);
    return {
        reference: fallbackRef,
        sourceUrl: targetUrl,
        fromCoommi: false,
    };
}

/**
 * 페이지 텍스트에서 특정 날짜(month월 day일)에 해당하는 성경 구절을 정규식 및 AI로 추출합니다.
 */
async function extractReferenceForDateFromText(
    text: string,
    date: string,
    month: number,
    day: number
): Promise<string | null> {
    if (!text || text.length < 10) return null;

    // 1. 텍스트 내에 성경 구절 패턴이 아예 존재하는지 확인
    const bookNamesPattern = BIBLE_BOOKS.flatMap((b) => b.aliases)
        .sort((a, b) => b.length - a.length)
        .join('|');
    const bibleRefRegex = new RegExp(
        `(?:${bookNamesPattern})\\s*\\d+\\s*(?:장|:)\\s*\\d+\\s*(?:절)?(?:\\s*[-~∼~—]\\s*(?:\\d+\\s*(?:장|:)\\s*)?\\d+\\s*(?:절)?)?`,
        'g'
    );

    const allMatches = text.match(bibleRefRegex);
    if (!allMatches || allMatches.length === 0) {
        return null;
    }

    // 2. 날짜와 함께 적힌 줄(예: "11월 21일", "11/21", "11.21", "21일")에서 구절 찾기
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const padM = String(month).padStart(2, '0');
    const padD = String(day).padStart(2, '0');
    const datePatterns = [
        new RegExp(`${date}`),
        new RegExp(`${month}월\\s*${day}일`),
        new RegExp(`${padM}월\\s*${padD}일`),
        new RegExp(`(?:^|\\D)${month}\\s*[./-]\\s*${day}(?:\\D|$)`),
        new RegExp(`(?:^|\\D)${padM}\\s*[./-]\\s*${padD}(?:\\D|$)`),
    ];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (datePatterns.some((p) => p.test(line))) {
            // 현재 줄이나 바로 다음 1~2줄 내에 성경구절이 있는지 확인
            const windowText = [line, lines[i + 1] || '', lines[i + 2] || ''].join(' ');
            const m = windowText.match(bibleRefRegex);
            if (m && m[0]) {
                return m[0].trim();
            }
        }
    }

    // 3. 만약 페이지 전체에 성경 구절이 단 1개만 있다면(일별 단일 게시글인 경우) 바로 반환
    const uniqueRefs = Array.from(new Set(allMatches.map((s) => s.trim())));
    if (uniqueRefs.length === 1) {
        return uniqueRefs[0];
    }

    // 4. 여러 구절이 있는 월간/주간 일정표 형태라면 OpenAI를 이용해 해당 날짜 구절 정확히 추출
    try {
        const snippet = text.slice(0, 12000);
        const aiRes = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `주어진 웹페이지 텍스트(꿈미 주만나 큐티 게시판)에서 요청된 날짜(${date}, ${month}월 ${day}일)에 해당하는 성경 본문 구절(예: "요한계시록 2:1-7")을 찾아 JSON으로 반환하세요.
만약 해당 날짜가 명시되어 있지 않지만 이 게시글 자체가 단일 큐티 본문 게시글이라면 그 게시글의 핵심 성경 구절을 반환하세요.
찾을 수 없으면 {"reference": null} 로 답하세요.
형식: {"reference": "성경이름 장:절-절"}`,
                },
                {
                    role: 'user',
                    content: `찾을 날짜: ${date} (${month}월 ${day}일)\n\n웹페이지 텍스트:\n${snippet}`,
                },
            ],
            temperature: 0,
            max_tokens: 150,
        });

        const content = aiRes.choices[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.reference && typeof parsed.reference === 'string') {
                return parsed.reference.trim();
            }
        }
    } catch (e) {
        console.warn('[Coommi AI Parse Warning]:', e);
    }

    return uniqueRefs[0] || null;
}

/**
 * 2단계: 갓피플 성경(cnts.godpeople.com/words/{BBCCC})에서 개역개정 원문을 가져옵니다.
 * 예: 요한계시록(66) 2장(002) -> https://cnts.godpeople.com/words/66002
 */
export async function fetchGodpeopleBibleText(reference: string): Promise<{
    reference: string;
    passage: string;
    godpeopleUrl: string;
    fromGodpeople: boolean;
}> {
    const parsed = parseBibleReference(reference);

    if (parsed) {
        const chaptersToFetch: number[] = [];
        for (let ch = parsed.startChapter; ch <= parsed.endChapter; ch++) {
            chaptersToFetch.push(ch);
        }

        const fetchedChapterTexts: { chapter: number; rawText: string; url: string }[] = [];

        for (const ch of chaptersToFetch) {
            const code5 = `${String(parsed.bookIndex).padStart(2, '0')}${String(ch).padStart(3, '0')}`;
            const code4 = `${parsed.bookIndex}${String(ch).padStart(3, '0')}`;
            const candidateUrls = [
                `https://cnts.godpeople.com/words/${code5}`,
                ...(code4 !== code5 ? [`https://cnts.godpeople.com/words/${code4}`] : []),
            ];

            for (const url of candidateUrls) {
                try {
                    const res = await fetch(url, {
                        headers: {
                            'User-Agent':
                                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'ko-KR,ko;q=0.9',
                        },
                        cache: 'no-store',
                    });

                    if (!res.ok) continue;
                    const buffer = await res.arrayBuffer();
                    let html = new TextDecoder('utf-8').decode(buffer);
                    // 만약 EUC-KR 인코딩 페이지여서 한글이 깨진 경우 대비
                    if (html.includes('euc-kr') || html.includes('EUC-KR')) {
                        try {
                            html = new TextDecoder('euc-kr').decode(buffer);
                        } catch {
                            // keep utf-8
                        }
                    }

                    const cleanText = htmlToCleanText(html);
                    if (cleanText.length > 100) {
                        fetchedChapterTexts.push({ chapter: ch, rawText: cleanText, url });
                        break;
                    }
                } catch (err) {
                    console.warn(`[Godpeople Fetch Warning] Failed on ${url}:`, err);
                }
            }
        }

        // 갓피플 페이지에서 텍스트를 성공적으로 가져온 경우, 해당 절(startVerse ~ endVerse)만 정확히 추출
        if (fetchedChapterTexts.length > 0) {
            const combinedRaw = fetchedChapterTexts
                .map((c) => `[${parsed.bookName} ${c.chapter}장 웹페이지 원문]\n${c.rawText.slice(0, 15000)}`)
                .join('\n\n');

            // 1차: 정규식으로 직접 절 번호 매칭 시도 (단일 장일 때)
            if (parsed.startChapter === parsed.endChapter) {
                const directVerses = extractVersesDirectly(
                    fetchedChapterTexts[0].rawText,
                    parsed.startVerse,
                    parsed.endVerse
                );
                if (directVerses) {
                    return {
                        reference: parsed.formattedReference,
                        passage: directVerses,
                        godpeopleUrl: fetchedChapterTexts[0].url,
                        fromGodpeople: true,
                    };
                }
            }

            // 2차: 갓피플 웹페이지 원문 텍스트를 AI에 전달하여 요청된 절만 토씨 하나 바꾸지 않고 그대로 발췌
            try {
                const extractRes = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `당신은 성경 원문 발췌기입니다. 아래 제공된 [갓피플 성경 웹페이지 텍스트] 안에서 요청된 구절(${parsed.formattedReference})에 해당하는 개역개정 성경 본문만 정확히 발췌하세요.
[엄격 규칙]
1. 웹페이지 원문에 있는 개역개정 글자를 단 한 글자도 수정, 요약, 누락하지 말고 원문 그대로 추출하세요.
2. 각 절의 앞에는 절 번호를 "1. 말씀내용" 형태로 붙이고 줄바꿈(\\n)으로 구분하세요.
3. 반드시 JSON 형식으로만 답하세요: {"reference": "${parsed.formattedReference}", "passage": "1. ...\\n2. ..."}`,
                        },
                        {
                            role: 'user',
                            content: `발췌할 구절 범위: ${parsed.formattedReference} (${parsed.startChapter}장 ${parsed.startVerse}절 ~ ${parsed.endChapter}장 ${parsed.endVerse}절)\n\n[갓피플 성경 웹페이지 텍스트]\n${combinedRaw}`,
                        },
                    ],
                    temperature: 0,
                    max_tokens: 2500,
                });

                const content = extractRes.choices[0]?.message?.content || '';
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    if (result.passage && result.passage.trim().length > 10) {
                        return {
                            reference: parsed.formattedReference,
                            passage: result.passage.trim(),
                            godpeopleUrl: fetchedChapterTexts[0].url,
                            fromGodpeople: true,
                        };
                    }
                }
            } catch (err) {
                console.warn('[Godpeople AI Extract Warning]:', err);
            }
        }
    }

    // 폴백: 갓피플 접속이 불가하거나 파싱되지 않는 형태일 때 OpenAI gpt-4o로 개역개정 원문 직접 추출
    const fallbackRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: `당신은 대한민국 성서학자인 동시에 신중한 목회자입니다.
성경 구절에 해당하는 **'성경전서 개역개정판(KRV)'**의 본문을 **단 한 글자의 가감이나 수정 없이 원문 그대로(Verbatim)** 제공하세요.
1. 절대 요약하거나 현대어로 바꾸지 마세요.
2. 각 절 앞에 반드시 번호를 붙이세요 (예: 1. 여호와께서... \\n2. 너희는...).
반드시 아래 JSON 형식으로만 답하세요:
{"reference":"정확한 범위 (예: 요한계시록 2:1-7)","passage":"본문 내용 (줄바꿈은 \\n으로)"}`,
            },
            {
                role: 'user',
                content: `성경구절: ${ parsed?.formattedReference || reference }`,
            },
        ],
        temperature: 0,
        max_tokens: 2500,
    });

    const content = fallbackRes.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { reference, passage: '' };

    return {
        reference: parsed?.formattedReference || result.reference || reference,
        passage: result.passage || '',
        godpeopleUrl: parsed?.godpeopleUrl || 'https://cnts.godpeople.com',
        fromGodpeople: false,
    };
}

/**
 * 갓피플 텍스트에서 정규식으로 startVerse ~ endVerse 절을 직접 추출합니다.
 */
function extractVersesDirectly(rawText: string, startVerse: number, endVerse: number): string | null {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const verseMap = new Map<number, string>();

    for (const line of lines) {
        // 예: "1 에베소 교회의 사자에게..." 또는 "1. 에베소 교회의 사자에게..."
        const m = line.match(/^(\d{1,3})(?:[.)]|\s+)\s*([가-힣"'(\[].{4,})$/);
        if (m) {
            const vNum = parseInt(m[1], 10);
            const vText = m[2].trim();
            if (vNum >= startVerse && vNum <= endVerse && !verseMap.has(vNum)) {
                verseMap.set(vNum, `${vNum}. ${vText}`);
            }
        }
    }

    const expectedCount = Math.min(endVerse, startVerse + 50) - startVerse + 1;
    // 요청한 절 범위가 모두 연속으로 매칭되었을 때만 직접 반환
    if (verseMap.size >= expectedCount && expectedCount > 0 && verseMap.has(startVerse)) {
        const resultLines: string[] = [];
        for (let v = startVerse; v <= endVerse; v++) {
            const line = verseMap.get(v);
            if (line) resultLines.push(line);
        }
        if (resultLines.length > 0) {
            return resultLines.join('\n');
        }
    }

    return null;
}

/**
 * 3단계: 성경 구절과 개역개정 본문을 바탕으로 개혁주의/주만나 스타일 해설, 질문 3개, 기도문을 생성합니다.
 */
export async function generateQtReflection(reference: string, passage: string): Promise<{
    interpretation: string;
    question1: string;
    question2: string;
    question3: string;
    prayer: string;
}> {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: `당신은 개혁주의 신학(Reformed Theology)에 입각하여 말씀을 해석하는 신중한 목회자이자, 성도를 아끼는 따뜻한 큐티 전문가입니다. 성도들이 말씀을 깊이 묵상하고 삶에 적용할 수 있도록, 상담실에서 마주 앉아 대화하듯 부드럽고 친절한 경어체('~해요', '~입니다')를 사용해 주세요.
주어진 개역개정 성경 본문을 바탕으로 다음을 작성하세요:
1. 본문 해설: 개혁주의 신학의 관점을 반영하되, 목회자가 성도에게 조근조근 들려주듯 따뜻하게 해설해주세요. 분량은 10줄 이상으로 충분하고 풍성하게 작성하며, 어려운 용어보다는 삶에 닿는 언어를 사용해주세요. 원어(히브리어/헬라어)나 배경 의미가 필요하다면 <참고> 또는 <묵상 포인트> 형식으로 함께 설명해주세요.
2. 묵상 질문 3개 (오륜교회 '주만나' 큐티 스타일 반영):
   - 본문의 성경적 흐름과 역사적/문맥적 맥락을 충분히 이해한 깊이 있는 질문이어야 합니다.
   - 성도가 오늘 하루 삶의 자리(가정, 일터, 인간관계, 개인의 연약함이나 성품 등)에서 맞닥뜨리는 실존적인 고민들과 본문의 사건/메시지를 긴밀하게 연결하세요.
   - 내 생각과 방법으로 인생을 통제하거나 해결하려 했던 영역은 무엇인지 돌아보게 하고, 하나님의 성품과 절대 주권을 온전히 신뢰하며 내려놓도록 직면시키는 질문이어야 합니다.
   - 막연하고 추상적인 결단 대신, 오늘 당장 실천할 수 있는 '멈추어야 할 행동'이나 '새롭게 시작해야 할 일' 등 구체적인 적용점을 이끌어내도록 질문을 다듬어 주세요.
3. 마무리 기도문 1개: 본문의 은혜가 성도의 삶에 임하기를 간구하는 따뜻한 기도

반드시 아래 JSON 형식으로만 답하세요:
{"interpretation":"해설 내용","question1":"질문1","question2":"질문2","question3":"질문3","prayer":"기도문"}`,
            },
            {
                role: 'user',
                content: `성경구절: ${reference}\n본문:\n${passage}`,
            },
        ],
        temperature: 0.7,
        max_tokens: 1800,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('AI 해설 생성 응답 형식 오류');
    }

    return JSON.parse(jsonMatch[0]);
}

