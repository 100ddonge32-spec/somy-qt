import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const DEFAULT_COOMMI_URL = 'https://coommi.org/Board/Detail/9579/125816?category=0';
export const COOMMI_BOARD_LIST_URL = 'https://coommi.org/Board/Index/9579?category=0';

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
    hasExplicitVerses: boolean;
    formattedReference: string;
    godpeopleUrl: string;
}

/**
 * HTML 엔티티 디코딩 및 태그 제거
 */
function stripTags(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<(br|p|div|tr|li|h[1-6])[^>]*>/gi, '\n')
        .replace(/<\/(p|div|tr|li|h[1-6]|table|ul|ol)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&ndash;/gi, '–')
        .replace(/&mdash;/gi, '—')
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
 * 성경 구절 문자열(예: "사도행전 15장 30–35절", "사도행전 15장 36-41절", "요한계시록 2:1-7")을 파싱합니다.
 * 하이픈(-), 엔대시(–, \u2013), 엠대시(—, \u2014), 물결(~, ∼)을 모두 인식합니다.
 */
export function parseBibleReference(rawRef: string): ParsedBibleRange | null {
    if (!rawRef) return null;
    const cleaned = rawRef
        .replace(/[\u2012\u2013\u2014\u2015\u2212~∼]/g, '-') // 모든 종류의 대시/물결을 표준 하이픈(-)으로 통일
        .replace(/\s+/g, ' ')
        .replace(/[()[\]]/g, ' ')
        .trim();

    const allAliases: { alias: string; book: BibleBookInfo }[] = [];
    for (const book of BIBLE_BOOKS) {
        for (const alias of book.aliases) {
            allAliases.push({ alias, book });
        }
    }
    allAliases.sort((a, b) => b.alias.length - a.alias.length);

    for (const { alias, book } of allAliases) {
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // 패턴 1: "사도행전 15장 30-35절", "사도행전 15:30-35", "사도행전 15:30-16:5"
        const regexColon = new RegExp(
            `${escaped}\\s*(\\d+)\\s*(?:장|편|:)\\s*(\\d+)\\s*(?:절)?\\s*(?:-\\s*(?:(\\d+)\\s*(?:장|편|:)\\s*)?(\\d+)\\s*(?:절)?)?`,
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
                hasExplicitVerses: true,
                formattedReference,
                godpeopleUrl: `https://cnts.godpeople.com/words/${code}`,
            };
        }

        // 패턴 2: 장만 있는 경우 (예: "사도행전 15장")
        const regexChapterOnly = new RegExp(`${escaped}\\s*(\\d+)(?:\\s*-\\s*(\\d+))?\\s*(?:장|편)?`, 'i');
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
                endVerse: 20,
                hasExplicitVerses: false,
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
 * 꿈미 상세 페이지 HTML에서 제목(날짜)과 '본문 : ...' 구절을 추출합니다.
 */
function parseCoommiDetailHtml(html: string): {
    headlineDate: string;
    reference: string | null;
} {
    let headlineDate = '';

    // 1. JSON-LD 또는 .document-title 에서 게시글 제목(예: "2026년 11월 22일") 확인
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch && jsonLdMatch[1]) {
        try {
            const ld = JSON.parse(jsonLdMatch[1].trim());
            if (ld.headline) headlineDate = String(ld.headline).trim();
            // description 안에도 "본문 : 사도행전 15장 30–35절"이 들어 있음
            if (ld.description) {
                const descMatch = String(ld.description).match(/본문\s*[:：]\s*([^\n\r]+?)(?:\s+주\s+안에|\s+\d+\.|\n|$)/);
                if (descMatch && descMatch[1]) {
                    const parsed = parseBibleReference(descMatch[1]);
                    if (parsed) {
                        return { headlineDate, reference: parsed.formattedReference };
                    }
                }
            }
        } catch {
            // ignore JSON-LD parse error
        }
    }

    if (!headlineDate) {
        const titleMatch = html.match(/class=["'][^"']*document-title[^"']*["'][^>]*>([\s\S]*?)<\//i);
        if (titleMatch && titleMatch[1]) {
            headlineDate = stripTags(titleMatch[1]);
        }
    }

    // 2. 본문 텍스트에서 "본문 : 사도행전 15장 30–35절" 추출
    const cleanText = stripTags(html);
    const lines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
        const m = line.match(/^본문\s*[:：]\s*(.+)$/);
        if (m && m[1]) {
            const parsed = parseBibleReference(m[1]);
            if (parsed) {
                return { headlineDate, reference: parsed.formattedReference };
            }
        }
    }

    // 줄 중간에 "본문 : ..."이 있는 경우
    const inlineMatch = cleanText.match(/본문\s*[:：]\s*([가-힣]+\s*\d+\s*(?:장|편|:)\s*\d+[\s\u2012-\u2015~∼\-0-9절장:]*)/);
    if (inlineMatch && inlineMatch[1]) {
        const parsed = parseBibleReference(inlineMatch[1]);
        if (parsed) {
            return { headlineDate, reference: parsed.formattedReference };
        }
    }

    return { headlineDate, reference: null };
}

/**
 * 꿈미 페이지(상세 페이지 하단 리스트 또는 /Board/Index/9579) HTML에서
 * 원하는 날짜(예: "2026년 11월 22일")에 해당하는 게시글 URL을 찾습니다.
 */
function findCoommiPostUrlForDate(html: string, year: number, month: number, day: number): string | null {
    const padM = String(month).padStart(2, '0');
    const padD = String(day).padStart(2, '0');

    // 꿈미 게시판 제목 형식: "2026년 11월 22일" 또는 "11월 22일"
    const targetPatterns = [
        new RegExp(`${year}년\\s*0?${month}월\\s*0?${day}일`),
        new RegExp(`${year}[-./]\\s*${padM}[-./]\\s*${padD}`),
        new RegExp(`0?${month}월\\s*0?${day}일`),
    ];

    const linkRegex = /<a[^>]+href=["'](\/Board\/Detail\/9579\/\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1];
        const linkText = stripTags(match[2]);
        if (targetPatterns.some((p) => p.test(linkText))) {
            return `https://coommi.org${href.replace(/&amp;/g, '&')}`;
        }
    }

    return null;
}

/**
 * 1단계: 꿈미(coommi.org) 사이트에서 특정 날짜(YYYY-MM-DD)의 큐티 성경 구절 범위를 가져옵니다.
 * - 각 날짜별 게시글(예: 제목 "2026년 11월 22일" -> /Board/Detail/9579/125817?category=0)을 정확히 찾아
 *   본문 내 "본문 : 사도행전 15장 36-41절"을 추출합니다.
 */
export async function fetchCoommiReference(
    date: string,
    customCoommiUrl?: string
): Promise<{ reference: string; sourceUrl: string; fromCoommi: boolean }> {
    const [yearStr, monthStr, dayStr] = date.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    // 사용자가 실수로 /Board/List/9579를 넣었더라도 실제 작동하는 /Board/Index/9579로 자동 보정
    let initialUrl = (customCoommiUrl?.trim() || process.env.COOMMI_QT_URL || DEFAULT_COOMMI_URL).replace(
        '/Board/List/9579',
        '/Board/Index/9579'
    );

    const fetchHeaders = {
        'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    };

    const dateTitleRegex = new RegExp(`(?:${year}년\\s*)?0?${month}월\\s*0?${day}일`);

    // 1. 먼저 지정된 URL(예: /Board/Detail/9579/125816?category=0)을 가져옵니다.
    //    (꿈미 상세 페이지 하단에는 전체 게시글 리스트 테이블이 함께 포함되어 있습니다!)
    const entryUrls = [initialUrl];
    if (!entryUrls.includes(COOMMI_BOARD_LIST_URL)) {
        entryUrls.push(COOMMI_BOARD_LIST_URL);
    }

    for (const url of entryUrls) {
        try {
            const res = await fetch(url, { headers: fetchHeaders, cache: 'no-store' });
            if (!res.ok) continue;
            const html = await res.text();

            // 1-A. 현재 페이지 자체가 요청한 날짜(예: "2026년 11월 21일")의 상세 게시글인지 확인
            const detailInfo = parseCoommiDetailHtml(html);
            if (detailInfo.reference && detailInfo.headlineDate && dateTitleRegex.test(detailInfo.headlineDate)) {
                return {
                    reference: detailInfo.reference,
                    sourceUrl: url,
                    fromCoommi: true,
                };
            }

            // 1-B. 현재 페이지(또는 하단 게시판 목록)에서 요청한 날짜("2026년 11월 22일")의 게시글 링크 찾기
            const matchedPostUrl = findCoommiPostUrlForDate(html, year, month, day);
            if (matchedPostUrl) {
                const targetRes = await fetch(matchedPostUrl, { headers: fetchHeaders, cache: 'no-store' });
                if (targetRes.ok) {
                    const targetHtml = await targetRes.text();
                    const targetInfo = parseCoommiDetailHtml(targetHtml);
                    if (targetInfo.reference) {
                        return {
                            reference: targetInfo.reference,
                            sourceUrl: matchedPostUrl,
                            fromCoommi: true,
                        };
                    }
                }
            }
        } catch (err) {
            console.warn(`[Coommi Fetch Warning] Failed on ${url}:`, err);
        }
    }

    // 2. 만약 리스트 1페이지에 없는 과거/미래 날짜라면 2~3페이지까지 추가 탐색
    for (let page = 2; page <= 3; page++) {
        const pageUrl = `https://coommi.org/Board/Index/9579?page=${page}&category=0`;
        try {
            const res = await fetch(pageUrl, { headers: fetchHeaders, cache: 'no-store' });
            if (!res.ok) continue;
            const html = await res.text();
            const matchedPostUrl = findCoommiPostUrlForDate(html, year, month, day);
            if (matchedPostUrl) {
                const targetRes = await fetch(matchedPostUrl, { headers: fetchHeaders, cache: 'no-store' });
                if (targetRes.ok) {
                    const targetHtml = await targetRes.text();
                    const targetInfo = parseCoommiDetailHtml(targetHtml);
                    if (targetInfo.reference) {
                        return {
                            reference: targetInfo.reference,
                            sourceUrl: matchedPostUrl,
                            fromCoommi: true,
                        };
                    }
                }
            }
        } catch {
            // ignore pagination error
        }
    }

    return {
        reference: '',
        sourceUrl: initialUrl,
        fromCoommi: false,
    };
}

/**
 * 2단계: 갓피플 성경(cnts.godpeople.com/words/{ucode} 및 godpick.godpeople.com/ajax.getbible.php)에서
 * 개역개정(rv) 성경 원문을 글자 하나 틀리지 않고 그대로 가져옵니다.
 */
export async function fetchGodpeopleBibleText(reference: string): Promise<{
    reference: string;
    passage: string;
    godpeopleUrl: string;
    fromGodpeople: boolean;
}> {
    const parsed = parseBibleReference(reference);
    if (!parsed) {
        return {
            reference: reference.trim(),
            passage: '',
            godpeopleUrl: 'https://cnts.godpeople.com',
            fromGodpeople: false,
        };
    }

    const endChap = parsed.hasExplicitVerses ? parsed.endChapter : parsed.startChapter;
    const allVerses: string[] = [];
    let resolvedUrl = parsed.godpeopleUrl;

    for (let ch = parsed.startChapter; ch <= endChap; ch++) {
        // ucode 계산: 예) 사도행전(44) 15장(015) -> 44015, 요한계시록(66) 2장(002) -> 66002, 창세기(01) 1장(001) -> 1001
        const ucodeNum = parsed.bookIndex * 1000 + ch;
        const ucodeStr5 = `${String(parsed.bookIndex).padStart(2, '0')}${String(ch).padStart(3, '0')}`;
        const pageUrl = `https://cnts.godpeople.com/words/${ucodeStr5}`;
        resolvedUrl = pageUrl;

        const vStart = ch === parsed.startChapter ? parsed.startVerse : 1;
        const vEnd = ch === endChap ? parsed.endVerse : 200;

        let chapterLoaded = false;

        // 방법 1: 갓피플 성경 공식 JSON API (https://godpick.godpeople.com/ajax.getbible.php) 직접 호출
        try {
            const apiRes = await fetch('https://godpick.godpeople.com/ajax.getbible.php', {
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
                    ver: 'rv', // 개역개정
                    ucode: ucodeNum,
                    ujeol_s: vStart,
                    ujeol_e: vEnd,
                    full: 1,
                }),
                cache: 'no-store',
            });

            if (apiRes.ok) {
                const json = await apiRes.json();
                if (json && json.success && Array.isArray(json.result) && json.result.length > 0) {
                    const filtered = json.result.filter((item: any) => {
                        const j = parseInt(String(item.jeol || item.no), 10);
                        return j >= vStart && j <= vEnd;
                    });

                    if (filtered.length > 0) {
                        for (const item of filtered) {
                            const j = String(item.jeol || item.no).trim();
                            const phrase = stripTags(String(item.phrase || '')).trim();
                            allVerses.push(`${j}. ${phrase}`);
                        }
                        chapterLoaded = true;
                    }
                }
            }
        } catch (apiErr) {
            console.warn(`[Godpeople API Warning] Failed on ucode ${ucodeNum}:`, apiErr);
        }

        // 방법 2: API 응답 실패 시 https://cnts.godpeople.com/words/{ucodeStr5} HTML의 <li id="B{절번호}"> 파싱
        if (!chapterLoaded) {
            try {
                const htmlRes = await fetch(pageUrl, {
                    headers: {
                        'User-Agent':
                            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    },
                    cache: 'no-store',
                });

                if (htmlRes.ok) {
                    const html = await htmlRes.text();
                    // <li id="B30" ...><span ...>30</span><span ...>말씀본문</span></li>
                    const liRegex = /<li[^>]+id=["']B(\d+)["'][^>]*>([\s\S]*?)<\/li>/gi;
                    let m: RegExpExecArray | null;
                    const foundInHtml: { num: number; text: string }[] = [];

                    while ((m = liRegex.exec(html)) !== null) {
                        const vNum = parseInt(m[1], 10);
                        if (vNum >= vStart && vNum <= vEnd) {
                            const innerHtml = m[2];
                            // 두 번째 span(또는 첫 번째 절번호 span 제거 후 텍스트) 추출
                            const spans = Array.from(innerHtml.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi));
                            let verseText = '';
                            if (spans.length >= 2) {
                                verseText = stripTags(spans[spans.length - 1][1]);
                            } else {
                                verseText = stripTags(innerHtml).replace(new RegExp(`^${vNum}\\s*`), '');
                            }
                            if (verseText) {
                                foundInHtml.push({ num: vNum, text: verseText });
                            }
                        }
                    }

                    if (foundInHtml.length > 0) {
                        for (const v of foundInHtml) {
                            allVerses.push(`${v.num}. ${v.text}`);
                        }
                        chapterLoaded = true;
                    }
                }
            } catch (htmlErr) {
                console.warn(`[Godpeople HTML Warning] Failed on ${pageUrl}:`, htmlErr);
            }
        }
    }

    if (allVerses.length > 0) {
        return {
            reference: parsed.formattedReference,
            passage: allVerses.join('\n'),
            godpeopleUrl: resolvedUrl,
            fromGodpeople: true,
        };
    }

    return {
        reference: parsed.formattedReference,
        passage: '',
        godpeopleUrl: resolvedUrl,
        fromGodpeople: false,
    };
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
        response_format: { type: 'json_object' },
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

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
}
