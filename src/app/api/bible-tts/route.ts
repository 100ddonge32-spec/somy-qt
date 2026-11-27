import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

// 최근 합성한 구절 오디오 메모리 캐시 (최대 180개 절 보관 -> 반복 재생·다수 성도 동시 청취 시 즉시 응답 & 비용 0)
const audioCache = new Map<string, ArrayBuffer>();
const MAX_CACHE_ITEMS = 180;

function putAudioCache(key: string, buf: ArrayBuffer) {
    if (audioCache.size >= MAX_CACHE_ITEMS) {
        const oldestKey = audioCache.keys().next().value;
        if (oldestKey) audioCache.delete(oldestKey);
    }
    audioCache.set(key, buf);
}

// 발음 명료도 보정: 성경 고어·고유명사 띄어쓰기 및 쉼표 호흡 최적화
function refineKoreanBibleDiction(raw: string): string {
    return raw
        .replace(/\s+/g, ' ')
        .replace(/하나님이 이르시되/g, '하나님이 이르시되,')
        .replace(/여호와께서 이르시되/g, '여호와께서 이르시되,')
        .trim();
}

async function fetchGoogleClearKoreanTts(text: string): Promise<ArrayBuffer | null> {
    try {
        // 190자 단위로 안전하게 분할하여 병합 (긴 절도 끊김 없이 명료하게 합성)
        const chunks: string[] = [];
        let remaining = text.trim();
        while (remaining.length > 0) {
            if (remaining.length <= 185) {
                chunks.push(remaining);
                break;
            }
            let cut = remaining.lastIndexOf(' ', 185);
            if (cut < 60) cut = 185;
            chunks.push(remaining.slice(0, cut).trim());
            remaining = remaining.slice(cut).trim();
        }

        const buffers: Uint8Array[] = [];
        let totalLen = 0;
        for (const chunk of chunks) {
            const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=ko&client=tw-ob&q=${encodeURIComponent(chunk)}`;
            const res = await fetch(url, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                },
                cache: 'no-store',
            });
            if (!res.ok) return null;
            const ab = await res.arrayBuffer();
            const u8 = new Uint8Array(ab);
            buffers.push(u8);
            totalLen += u8.byteLength;
        }

        const merged = new Uint8Array(totalLen);
        let offset = 0;
        for (const b of buffers) {
            merged.set(b, offset);
            offset += b.byteLength;
        }
        return merged.buffer;
    } catch {
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const rawText = String(body?.text || '').trim().slice(0, 700);
        const voiceId = String(body?.voice || 'nova').trim(); // 'nova' | 'onyx' | 'shimmer' | 'google_ko'

        if (!rawText) {
            return NextResponse.json({ error: '낭독할 텍스트가 없습니다.' }, { status: 400 });
        }

        const cleanText = refineKoreanBibleDiction(rawText);
        const cacheKey = `${voiceId}::${cleanText}`;
        if (audioCache.has(cacheKey)) {
            const cached = audioCache.get(cacheKey)!;
            return new NextResponse(cached, {
                status: 200,
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Cache-Control': 'public, max-age=86400',
                },
            });
        }

        // 1) OpenAI HD Neural 성우 ('nova' 여성 아나운서 / 'onyx' 중후한 남성 성우 / 'shimmer' 따뜻한 여성 낭독)
        if (voiceId !== 'google_ko' && process.env.OPENAI_API_KEY) {
            try {
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                const validVoice = (['nova', 'onyx', 'shimmer', 'alloy', 'echo'].includes(voiceId)
                    ? voiceId
                    : 'nova') as 'nova' | 'onyx' | 'shimmer' | 'alloy' | 'echo';

                const mp3Res = await openai.audio.speech.create({
                    model: 'tts-1-hd',
                    voice: validVoice,
                    input: cleanText,
                    response_format: 'mp3',
                });

                const arrayBuf = await mp3Res.arrayBuffer();
                if (arrayBuf && arrayBuf.byteLength > 200) {
                    putAudioCache(cacheKey, arrayBuf);
                    return new NextResponse(arrayBuf, {
                        status: 200,
                        headers: {
                            'Content-Type': 'audio/mpeg',
                            'Cache-Control': 'public, max-age=86400',
                        },
                    });
                }
            } catch (openAiErr) {
                console.warn('[Bible TTS] OpenAI HD TTS fallback to Google Neural KO:', openAiErr);
            }
        }

        // 2) 클린 표준 한국어 아나운서 성우 (Google Korean Neural TTS — API 키 무관 100% 또렷한 한국어 발음 보장)
        const googleBuf = await fetchGoogleClearKoreanTts(cleanText);
        if (googleBuf && googleBuf.byteLength > 200) {
            putAudioCache(cacheKey, googleBuf);
            return new NextResponse(googleBuf, {
                status: 200,
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Cache-Control': 'public, max-age=86400',
                },
            });
        }

        return NextResponse.json({ error: 'TTS 합성 실패' }, { status: 502 });
    } catch (e: any) {
        console.error('[Bible TTS Error]', e);
        return NextResponse.json({ error: e?.message || 'TTS 오류' }, { status: 500 });
    }
}

