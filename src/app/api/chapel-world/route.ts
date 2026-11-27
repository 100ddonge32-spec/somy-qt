import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTodayReading } from '@/lib/reading-plan';
import { fetchCoommiReference, fetchGodpeopleBibleText } from '@/lib/qt-sync';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CHAPEL_WORLD_RECORD_ID = 'somy-chapel-world-v1';

function normalizeChapelChurchId(raw?: string | null): string {
    const trimmed = String(raw || '').trim().toLowerCase();
    if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'somy-main') {
        return 'jesus-in';
    }
    if (trimmed === '예수인교회' || trimmed === '예수인' || trimmed === 'jesus' || trimmed === 'jesus-in') {
        return 'jesus-in';
    }
    return trimmed;
}

function getChapelRecordId(rawChurchId?: string | null): string {
    const cid = normalizeChapelChurchId(rawChurchId);
    return cid === 'jesus-in' ? CHAPEL_WORLD_RECORD_ID : `${CHAPEL_WORLD_RECORD_ID}:${cid}`;
}

function formatKstShort(iso?: string | null): string {
    if (!iso) return '오늘';
    const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
    if (Number.isNaN(d.getTime())) return '오늘';
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mi = String(d.getUTCMinutes()).padStart(2, '0');
    return `${mm}.${dd} ${hh}:${mi}`;
}

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

function getKoreaDateString(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function getKoreaTimeStamp(): string {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(kst.getUTCDate()).padStart(2, '0');
    const hh = String(kst.getUTCHours()).padStart(2, '0');
    const mi = String(kst.getUTCMinutes()).padStart(2, '0');
    return `${mm}.${dd} ${hh}:${mi}`;
}

export interface BibleTongdokLog {
    id: string;
    reader: string;
    planName: string;
    rangeLabel: string;
    chaptersCount: number;
    comment: string;
    amens: number;
    createdAt: string;
    dateKey: string;
}

export interface ChapelWorldState {
    sarangbangs: {
        id: string;
        name: string;
        leader: string;
        topic: string;
        createdAt: string;
    }[];
    qtLectures: {
        id: string;
        week: string;
        title: string;
        summary: string;
        content: string;
        updatedAt: string;
    }[];
    qtShares: {
        id: string;
        author: string;
        passage: string;
        content: string;
        amens: number;
        createdAt: string;
        fromSomyApp?: boolean;
    }[];
    bibleLogs: BibleTongdokLog[];
    candles: {
        id: number;
        name: string;
        text: string;
        amens: number;
        angle: number;
    }[];
    roomBoards: Record<
        string,
        {
            mode: 'slide' | 'ppt_embed' | 'whiteboard' | 'youtube';
            badge?: string;
            body?: string;
            embedUrl?: string;
            slideImages?: string[];
            slideIndex?: number;
            youtubeId?: string;
        }
    >;
}

const DEFAULT_WORLD_STATE: ChapelWorldState = {
    sarangbangs: [
        {
            id: 'group-1',
            name: '1교구 믿음 사랑방',
            leader: '김은혜 권사',
            topic: '주일 설교 말씀 삶으로 살아내기',
            createdAt: '2026-11-26',
        },
        {
            id: 'group-2',
            name: '청년부 소망 셀모임',
            leader: '박소망 리더',
            topic: '직장과 캠퍼스에서의 경건 생활 나눔',
            createdAt: '2026-11-26',
        },
        {
            id: 'group-3',
            name: '새가족 환영 사랑방',
            leader: '이믿음 집사',
            topic: '교회 안내 및 첫 믿음의 발걸음 교제',
            createdAt: '2026-11-26',
        },
    ],
    qtLectures: [
        {
            id: 'lec-1',
            week: '1주차 기초강의',
            title: '큐티(Quiet Time)란 무엇인가?',
            summary: '날마다 하나님과 일대일로 만나는 거룩한 교제의 시간',
            content:
                '1. 큐티의 정의\n큐티(QT)는 Quiet Time의 약자로, 매일 정해진 시간과 장소에서 하나님의 말씀(성경)과 기도를 통해 주님과 인격적으로 교제하는 시간입니다.\n\n2. 큐티의 목적\n• 성경 지식을 쌓는 것을 넘어 하나님의 마음을 알아갑니다.\n• 오늘 나에게 주시는 주님의 음성을 듣고 순종으로 반응합니다.\n\n3. 시작 전 준비 기도\n"성령님, 내 눈을 열어 주의 율법에서 놀라운 것을 보게 하소서 (시 119:18)"',
            updatedAt: '2026-11-26',
        },
        {
            id: 'lec-2',
            week: '2주차 핵심실습',
            title: '큐티의 3단계: 관찰 · 해석 · 적용 (O·I·A)',
            summary: '본문을 자세히 읽고, 하나님의 뜻을 깨달아, 오늘 삶에 실천하기',
            content:
                '1단계: 관찰 (Observation) — "본문이 무엇을 말하는가?"\n• 누가, 언제, 어디서, 무엇을, 어떻게 했는지 천천히 3번 이상 소리 내어 읽습니다.\n• 반복되는 단어나 마음에 와닿는 구절에 밑줄을 긋습니다.\n\n2단계: 해석 (Interpretation) — "하나님은 어떤 분이신가?"\n• 이 말씀을 통해 나타내시는 성부·성자·성령 하나님의 성품과 뜻은 무엇입니까?\n\n3단계: 적용 (Application) — "내가 오늘 실천할 한 가지는?"\n• 구체적(Specific), 개인적(Personal), 오늘 실천 가능한(Possible) 순종 제목을 적습니다.',
            updatedAt: '2026-11-26',
        },
        {
            id: 'lec-3',
            week: '3주차 나눔가이드',
            title: '은혜로운 큐티 나눔의 원칙',
            summary: '가르치거나 판단하지 않고 내게 주신 은혜를 진솔하게 나누기',
            content:
                '1. "나(I)"를 주어로 나눕니다 ("우리가 해야 합니다" 대신 "제가 깨달은 것은…").\n2. 다른 성도의 나눔에 조언이나 훈계 대신 공감과 "아멘"으로 격려합니다.\n3. 나눔 안에서 들은 개인적인 기도제목은 모임 밖으로 발설하지 않고 중보기도로 지킵니다.',
            updatedAt: '2026-11-26',
        },
    ],
    qtShares: [
        {
            id: 'qs-1',
            author: '김은혜 권사',
            passage: '시편 27:1',
            content: '여호와가 나의 빛이시니 두려워할 것이 없음을 고백합니다. 오늘 병원에 계신 성도님께 위로 전화를 드리겠습니다.',
            amens: 12,
            createdAt: '오늘',
        },
        {
            id: 'qs-2',
            author: '박소망 청년',
            passage: '빌립보서 4:6-7',
            content: '염려 대신 감사함으로 아뢰라는 말씀에 순종해 출근길 10분 먼저 도착해 기도로 하루를 시작하겠습니다!',
            amens: 9,
            createdAt: '오늘',
        },
    ],
    bibleLogs: [
        {
            id: 'bl-1',
            reader: '강기쁨 청년',
            planName: '연대기순 통독',
            rangeLabel: '창세기 1장 ~ 3장',
            chaptersCount: 3,
            comment: '예스통독! 태초에 말씀으로 빛을 창조하신 주님을 찬양합니다.',
            amens: 8,
            createdAt: '오늘 07:30',
            dateKey: '2026-11-26',
        },
        {
            id: 'bl-2',
            reader: '김은혜 권사',
            planName: '성경 순서 정독',
            rangeLabel: '시편 23편 ~ 25편',
            chaptersCount: 3,
            comment: '예스통독! 음성 낭독으로 함께 들으니 말씀이 마음에 깊이 새겨집니다.',
            amens: 11,
            createdAt: '오늘 08:15',
            dateKey: '2026-11-26',
        },
        {
            id: 'bl-3',
            reader: '한충성 장로',
            planName: '구약+신약 균형',
            rangeLabel: '요한복음 1장 ~ 2장',
            chaptersCount: 2,
            comment: '예스통독! 말씀이 육신이 되어 우리 가운데 거하시매 아멘!',
            amens: 9,
            createdAt: '오늘 09:05',
            dateKey: '2026-11-26',
        },
    ],
    candles: [
        { id: 1, name: '김은혜 권사', text: '환우들의 치유와 회복을 위해 간절히 기도합니다.', amens: 21, angle: -0.45 },
        { id: 2, name: '이믿음 집사', text: '온 가정이 주님만 섬기는 믿음의 명문가 되게 하소서.', amens: 15, angle: -0.27 },
        { id: 3, name: '박소망 청년', text: '다음 세대와 청년부가 말씀으로 부흥하게 하소서.', amens: 29, angle: -0.09 },
        { id: 4, name: '한충성 장로', text: '교회가 지역 사회의 따뜻한 방주가 되게 하소서.', amens: 34, angle: 0.09 },
        { id: 5, name: '정온유 성도', text: '주일 예배마다 하나님의 임재가 넘치게 하소서.', amens: 18, angle: 0.27 },
        { id: 6, name: '윤평강 권사', text: '나라와 민족, 열방의 선교사님들을 지켜주소서.', amens: 16, angle: 0.45 },
    ],
    roomBoards: {
        sanctuary: {
            mode: 'slide',
            badge: 'SUNDAY WORSHIP · 그레이스 대성전',
            body: '여호와는 나의 빛이요 나의 구원이시니\n내가 누구를 두려워하리요 (시편 27:1)',
        },
        qt: {
            mode: 'slide',
            badge: 'QT ACADEMY · 오늘의 소미 큐티 & 기초반',
            body: '관찰(무엇을) ➔ 해석(왜) ➔ 적용(오늘 나의 순종)\n말씀 앞에서 주님의 음성을 듣는 복된 시간',
        },
        bible: {
            mode: 'slide',
            badge: 'BIBLE READING · 성경통독방 · 예스통독!',
            body: '주의 말씀은 내 발에 등이요 내 길에 빛이니이다 (시 119:105)\n성경책을 펴서 음성으로 통독하고 [예스통독]을 남겨보세요!',
        },
        'sarangbang:group-1': {
            mode: 'slide',
            badge: '1교구 믿음 사랑방 · 소그룹 나눔',
            body: '이번 한 주간 받은 가장 큰 감사 제목 한 가지를\n순원들과 따뜻하게 나누어 봅시다 🙏',
        },
    },
};

async function loadStateFromDb(rawChurchId?: string | null): Promise<ChapelWorldState> {
    const recordId = getChapelRecordId(rawChurchId);
    try {
        const { data } = await supabaseAdmin
            .from('church_settings')
            .select('id, church_id, plan')
            .eq('church_id', recordId)
            .neq('id', 1)
            .maybeSingle();

        if (data?.plan && data.plan.startsWith('CHAPEL_JSON:')) {
            const parsed = JSON.parse(data.plan.slice('CHAPEL_JSON:'.length));
            return {
                ...DEFAULT_WORLD_STATE,
                ...parsed,
                bibleLogs: Array.isArray(parsed.bibleLogs) && parsed.bibleLogs.length > 0
                    ? parsed.bibleLogs
                    : DEFAULT_WORLD_STATE.bibleLogs,
                roomBoards: { ...DEFAULT_WORLD_STATE.roomBoards, ...(parsed.roomBoards || {}) },
            };
        }
    } catch (e) {
        console.warn('[ChapelWorld API] Fallback to default state:', e);
    }
    return structuredClone(DEFAULT_WORLD_STATE);
}

async function saveStateToDb(state: ChapelWorldState, rawChurchId?: string | null): Promise<void> {
    const recordId = getChapelRecordId(rawChurchId);
    const serialized = 'CHAPEL_JSON:' + JSON.stringify(state);
    const { data: existing } = await supabaseAdmin
        .from('church_settings')
        .select('id, church_id')
        .eq('church_id', recordId)
        .neq('id', 1)
        .maybeSingle();

    const payload: Record<string, unknown> = {
        church_id: recordId,
        church_name: '소미 3D 온라인 캠퍼스 데이터',
        app_subtitle: '3D 메타버스 예배당·사랑방·통독방·큐티방 상태 저장용',
        plan: serialized,
        community_visible: false,
    };

    if (existing && existing.id !== 1) {
        await supabaseAdmin.from('church_settings').update(payload).eq('id', existing.id);
    } else {
        await supabaseAdmin.from('church_settings').insert(payload);
    }
}

// 소미 앱 community_posts(is_qt: true)와 온라인 예배당 큐티방 나눔 보드 양방향 병합
async function attachLiveSomyQtShares(state: ChapelWorldState, rawChurchId?: string | null): Promise<ChapelWorldState> {
    const cid = normalizeChapelChurchId(rawChurchId);
    const churchFilter = cid === 'jesus-in' ? ['jesus-in', '예수인교회'] : [cid];

    try {
        const { data: qtPosts } = await supabaseAdmin
            .from('community_posts')
            .select('id, user_name, content, liker_ids, created_at, is_private, is_qt')
            .in('church_id', churchFilter)
            .eq('is_qt', true)
            .eq('is_private', false)
            .order('created_at', { ascending: false })
            .limit(25);

        if (Array.isArray(qtPosts) && qtPosts.length > 0) {
            const mappedFromSomy = qtPosts.map((p: any) => {
                const rawContent = String(p.content || '').trim();
                const headerMatch = rawContent.match(/^\[(?:📖\s*)?([^\]]+)\]\s*\n?([\s\S]*)$/);
                const passage = headerMatch ? headerMatch[1].trim() : '소미 큐티 묵상';
                const cleanBody = headerMatch && headerMatch[2].trim() ? headerMatch[2].trim() : rawContent;
                const amensCount = Array.isArray(p.liker_ids) ? Math.max(1, p.liker_ids.length) : 1;

                return {
                    id: `cp-${p.id}`,
                    author: String(p.user_name || '성도'),
                    passage,
                    content: cleanBody,
                    amens: amensCount,
                    createdAt: formatKstShort(p.created_at),
                    fromSomyApp: true,
                };
            });

            const localOnly = (state.qtShares || []).filter((s) => !String(s.id).startsWith('cp-'));
            return {
                ...state,
                qtShares: [...mappedFromSomy, ...localOnly].slice(0, 35),
            };
        }
    } catch (e) {
        console.warn('[ChapelWorld API] attachLiveSomyQtShares warning:', e);
    }
    return state;
}

// 소미 큐티(daily_qt) 안전 조회 헬퍼: 요청 날짜 -> 최근 등록된 큐티 -> 실시간 말씀 본문 순으로 100% 보장
async function resolveSomyQtForChapel(requestedDate?: string) {
    const today = getKoreaDateString();
    const targetDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : today;

    // 최근 등록된 큐티 날짜 목록 (드롭다운 선택용)
    let recentDates: { date: string; reference: string }[] = [];
    try {
        const { data: listData } = await supabaseAdmin
            .from('daily_qt')
            .select('date, reference')
            .order('date', { ascending: false })
            .limit(15);
        if (Array.isArray(listData)) {
            recentDates = listData;
        }
    } catch {}

    // 1. 요청 날짜와 정확히 일치하는 daily_qt 본문 조회
    try {
        const { data: exactQt } = await supabaseAdmin
            .from('daily_qt')
            .select('*')
            .eq('date', targetDate)
            .maybeSingle();

        if (exactQt && exactQt.passage) {
            return { qt: exactQt, isExactDate: true, requestedDate: targetDate, recentDates };
        }
    } catch {}

    // 2. 사용자가 날짜를 직접 지정하지 않았는데 당일 데이터가 아직 등록 전이라면,
    //    가장 최근에 등록된 소미 큐티 본문을 우선 확인하거나 오늘의 본문을 실시간 로드
    if (!requestedDate) {
        try {
            const { data: latestQt } = await supabaseAdmin
                .from('daily_qt')
                .select('*')
                .lte('date', today)
                .order('date', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (latestQt && latestQt.passage) {
                return { qt: latestQt, isExactDate: latestQt.date === today, requestedDate: targetDate, recentDates };
            }
        } catch {}
    }

    // 3. DB에 해당 날짜 데이터가 없을 때 꿈미/읽기표 + 갓피플 개역개정 원문으로 즉시 구성
    try {
        const coommi = await fetchCoommiReference(targetDate).catch(() => ({ reference: '' }));
        const rawRef = coommi.reference || getTodayReading(targetDate);
        const bibleRes = await fetchGodpeopleBibleText(rawRef.includes(':') ? rawRef : `${rawRef}:1-30`);
        if (bibleRes && bibleRes.passage) {
            return {
                qt: {
                    date: targetDate,
                    reference: bibleRes.reference || rawRef,
                    passage: `${bibleRes.passage}|||오늘 본문 말씀을 천천히 세 번 소리 내어 읽으며, 하나님께서 나에게 주시는 위로와 교훈, 그리고 순종할 한 가지 적용점을 묵상해 보세요.`,
                    question1: '오늘 본문에서 가장 마음에 와닿는 구절이나 단어는 무엇입니까?',
                    question2: '이 말씀을 통해 깨닫게 되는 하나님의 성품과 마음은 어떠합니까?',
                    question3: '오늘 가정과 일터에서 구체적으로 실천할 나의 순종(적용) 한 가지는 무엇입니까?',
                    prayer: '사랑의 주님, 오늘 주신 말씀을 내 발의 등이요 내 길의 빛으로 삼아 순종하며 살아가게 하옵소서. 예수님의 이름으로 기도드립니다. 아멘.',
                },
                isExactDate: true,
                requestedDate: targetDate,
                recentDates,
            };
        }
    } catch {}

    return { qt: null, isExactDate: false, requestedDate: targetDate, recentDates };
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const qtOnly = searchParams.get('qt_only') === 'true';
    const qtDate = searchParams.get('qt_date') || undefined;
    const churchId = searchParams.get('church_id');

    if (qtOnly) {
        const qtBundle = await resolveSomyQtForChapel(qtDate);
        return NextResponse.json(qtBundle, {
            headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
    }

    const [rawState, qtBundle] = await Promise.all([
        loadStateFromDb(churchId),
        resolveSomyQtForChapel(qtDate),
    ]);
    const state = await attachLiveSomyQtShares(rawState, churchId);

    return NextResponse.json(
        {
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            state,
            somyQt: qtBundle.qt,
            somyQtRecentDates: qtBundle.recentDates,
        },
        {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        }
    );
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, payload, churchId: rawBodyChurchId } = body || {};
        const churchId = normalizeChapelChurchId(rawBodyChurchId || payload?.churchId);
        const state = await loadStateFromDb(churchId);

        if (action === 'create_sarangbang') {
            const name = String(payload?.name || '').trim();
            const leader = String(payload?.leader || '인도자').trim();
            const topic = String(payload?.topic || '말씀과 삶 나눔').trim();
            if (name) {
                const newRoom = {
                    id: 'group-' + Date.now(),
                    name: name.slice(0, 40),
                    leader: leader.slice(0, 24),
                    topic: topic.slice(0, 80),
                    createdAt: getKoreaDateString(),
                };
                state.sarangbangs.push(newRoom);
                state.roomBoards[`sarangbang:${newRoom.id}`] = {
                    mode: 'slide',
                    badge: `${newRoom.name} · 인도: ${newRoom.leader}`,
                    body: newRoom.topic,
                };
                await saveStateToDb(state, churchId);
                return NextResponse.json({ success: true, room: newRoom, state: await attachLiveSomyQtShares(state, churchId) });
            }
        } else if (action === 'delete_sarangbang') {
            const roomId = String(payload?.id || '');
            if (state.sarangbangs.length > 1) {
                state.sarangbangs = state.sarangbangs.filter((r) => r.id !== roomId);
                delete state.roomBoards[`sarangbang:${roomId}`];
                await saveStateToDb(state, churchId);
            }
            return NextResponse.json({ success: true, state: await attachLiveSomyQtShares(state, churchId) });
        } else if (action === 'save_qt_lecture') {
            const id = String(payload?.id || 'lec-' + Date.now());
            const week = String(payload?.week || '큐티 강의').trim().slice(0, 24);
            const title = String(payload?.title || '').trim().slice(0, 60);
            const summary = String(payload?.summary || '').trim().slice(0, 100);
            const content = String(payload?.content || '').trim().slice(0, 4000);
            if (title && content) {
                const idx = state.qtLectures.findIndex((l) => l.id === id);
                const item = {
                    id,
                    week,
                    title,
                    summary: summary || content.split('\n')[0].slice(0, 60),
                    content,
                    updatedAt: getKoreaDateString(),
                };
                if (idx >= 0) state.qtLectures[idx] = item;
                else state.qtLectures.push(item);
                await saveStateToDb(state, churchId);
                return NextResponse.json({ success: true, lecture: item, state: await attachLiveSomyQtShares(state, churchId) });
            }
        } else if (action === 'delete_qt_lecture') {
            const id = String(payload?.id || '');
            if (state.qtLectures.length > 1) {
                state.qtLectures = state.qtLectures.filter((l) => l.id !== id);
                await saveStateToDb(state, churchId);
            }
            return NextResponse.json({ success: true, state: await attachLiveSomyQtShares(state, churchId) });
        } else if (action === 'add_qt_share') {
            const author = String(payload?.author || '익명 성도').trim().slice(0, 24);
            const passage = String(payload?.passage || '오늘의 말씀').trim().slice(0, 40);
            const content = String(payload?.content || '').trim().slice(0, 800);
            const userId = String(payload?.userId || '').trim();
            const avatarUrl = payload?.avatarUrl ? String(payload.avatarUrl) : null;

            if (content) {
                // 로그인된 소미 앱 성도인 경우: 소미 앱 community_posts(is_qt: true) 및 qt_completions(달력·통계)에 직접 반영!
                if (userId) {
                    const formattedContent = `[📖 ${passage}]\n${content}`;
                    const { data: insertedPost, error: insertErr } = await supabaseAdmin
                        .from('community_posts')
                        .insert([
                            {
                                user_id: userId,
                                user_name: author,
                                avatar_url: avatarUrl,
                                content: formattedContent,
                                church_id: churchId,
                                is_private: false,
                                is_qt: true,
                            },
                        ])
                        .select()
                        .single();

                    if (!insertErr && insertedPost) {
                        const koreaDate = getKoreaDateString();
                        await supabaseAdmin
                            .from('qt_completions')
                            .upsert(
                                {
                                    user_id: userId,
                                    user_name: author,
                                    avatar_url: avatarUrl,
                                    completed_date: koreaDate,
                                    answers: [formattedContent],
                                },
                                { onConflict: 'user_id,completed_date' }
                            );

                        logActivity(userId, author, 'POST_CREATED', churchId, formattedContent.slice(0, 50));
                        logActivity(userId, author, 'QT_COMPLETED', churchId, koreaDate);

                        const mergedState = await attachLiveSomyQtShares(state, churchId);
                        return NextResponse.json({
                            success: true,
                            syncedToSomy: true,
                            somyPost: insertedPost,
                            state: mergedState,
                        });
                    }
                }

                // 비로그인 방문자 폴백: 온라인 예배당 자체 보드에 저장
                state.qtShares.unshift({
                    id: 'qs-' + Date.now(),
                    author,
                    passage,
                    content,
                    amens: 1,
                    createdAt: getKoreaTimeStamp(),
                });
                state.qtShares = state.qtShares.filter((s) => !String(s.id).startsWith('cp-')).slice(0, 40);
                await saveStateToDb(state, churchId);
                return NextResponse.json({
                    success: true,
                    syncedToSomy: false,
                    state: await attachLiveSomyQtShares(state, churchId),
                });
            }
        } else if (action === 'amen_qt_share') {
            const id = String(payload?.id || '');
            if (id.startsWith('cp-')) {
                const postId = id.slice(3);
                const likerKey = String(payload?.userId || payload?.clientId || `chapel_${Date.now()}`);
                const { data: postRow } = await supabaseAdmin
                    .from('community_posts')
                    .select('id, liker_ids')
                    .eq('id', postId)
                    .maybeSingle();
                if (postRow) {
                    const prevLikers = Array.isArray(postRow.liker_ids) ? postRow.liker_ids : [];
                    if (!prevLikers.includes(likerKey)) {
                        await supabaseAdmin
                            .from('community_posts')
                            .update({ liker_ids: [...prevLikers, likerKey] })
                            .eq('id', postId);
                    }
                }
                return NextResponse.json({ success: true, state: await attachLiveSomyQtShares(state, churchId) });
            }

            const target = state.qtShares.find((s) => s.id === id);
            if (target) {
                target.amens = (target.amens || 0) + 1;
                state.qtShares = state.qtShares.filter((s) => !String(s.id).startsWith('cp-'));
                await saveStateToDb(state, churchId);
            }
            return NextResponse.json({ success: true, state: await attachLiveSomyQtShares(state, churchId) });
        } else if (action === 'add_bible_log') {
            const reader = String(payload?.reader || '성도').trim().slice(0, 24);
            const planName = String(payload?.planName || '성경통독').trim().slice(0, 36);
            const rangeLabel = String(payload?.rangeLabel || '오늘의 말씀').trim().slice(0, 60);
            const chaptersCount = Math.max(1, Math.min(50, Number(payload?.chaptersCount) || 1));
            let comment = String(payload?.comment || '예스통독!').trim().slice(0, 240);
            if (!comment.includes('예스통독')) {
                comment = `예스통독! ${comment}`.trim();
            }

            const newLog: BibleTongdokLog = {
                id: 'bl-' + Date.now(),
                reader,
                planName,
                rangeLabel,
                chaptersCount,
                comment,
                amens: 1,
                createdAt: getKoreaTimeStamp(),
                dateKey: getKoreaDateString(),
            };
            if (!Array.isArray(state.bibleLogs)) state.bibleLogs = [];
            state.bibleLogs.unshift(newLog);
            state.bibleLogs = state.bibleLogs.slice(0, 120);
            await saveStateToDb(state, churchId);
            return NextResponse.json({ success: true, log: newLog, state: await attachLiveSomyQtShares(state, churchId) });
        } else if (action === 'amen_bible_log') {
            const id = String(payload?.id || '');
            if (Array.isArray(state.bibleLogs)) {
                const target = state.bibleLogs.find((l) => l.id === id);
                if (target) {
                    target.amens = (target.amens || 0) + 1;
                    await saveStateToDb(state, churchId);
                }
            }
            return NextResponse.json({ success: true, state: await attachLiveSomyQtShares(state, churchId) });
        } else if (action === 'update_room_board') {
            const roomKey = String(payload?.roomKey || 'sanctuary');
            const boardData = payload?.board || {};
            const safeSlides = Array.isArray(boardData.slideImages)
                ? boardData.slideImages.filter((u: string) => typeof u === 'string' && u.length < 2000).slice(0, 20)
                : undefined;
            state.roomBoards[roomKey] = {
                mode: boardData.mode || 'slide',
                badge: String(boardData.badge || '').slice(0, 80),
                body: String(boardData.body || '').slice(0, 600),
                embedUrl: String(boardData.embedUrl || '').slice(0, 500),
                slideImages: safeSlides,
                slideIndex: Number(boardData.slideIndex || 0),
                youtubeId: String(boardData.youtubeId || '').slice(0, 24),
            };
            await saveStateToDb(state, churchId);
            return NextResponse.json({ success: true, state: await attachLiveSomyQtShares(state, churchId) });
        } else if (action === 'add_candle') {
            const name = String(payload?.name || '익명 성도').trim().slice(0, 24);
            const text = String(payload?.text || '').trim().slice(0, 120);
            if (text) {
                state.candles.unshift({
                    id: Date.now(),
                    name,
                    text,
                    amens: 1,
                    angle: (Math.random() - 0.5) * 1.04,
                });
                state.candles = state.candles.slice(0, 24);
                await saveStateToDb(state, churchId);
            }
            return NextResponse.json({ success: true, state: await attachLiveSomyQtShares(state, churchId) });
        } else if (action === 'amen_candle') {
            const id = Number(payload?.id);
            const c = state.candles.find((x) => x.id === id);
            if (c) {
                c.amens++;
                await saveStateToDb(state, churchId);
            }
            return NextResponse.json({ success: true, state: await attachLiveSomyQtShares(state, churchId) });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (e: any) {
        console.error('[ChapelWorld POST Error]', e);
        return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 });
    }
}
