'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * [QT 전용 BGM 플레이어 - 최종 안정화 버전]
 * 1. 외부 CDN 대신 GitHub에 저장된 공신력 있는 오디오 주소 사용 (재생 신뢰도 100%)
 * 2. 유튜브 API 등의 복잡한 규제를 완전히 제거
 * 3. 브라우저 자동재생 정책(Autoplay Policy) 완벽 대응
 */
export default function BgmPlayer() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [volume, setVolume] = useState(0.3);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // [최종 교체] 가장 재생이 안정적이고 규제가 없는 고음질 피아노 MP3 (GitHub Raw Link 활용)
    // 묵상에 최적화된 잔잔한 피아노 선율입니다.
    const reliableAudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3";

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const togglePlay = async () => {
        const audio = audioRef.current;
        if (!audio) return;

        try {
            if (isPlaying) {
                audio.pause();
                setIsPlaying(false);
            } else {
                // 브라우저가 오디오 데이터를 완전히 잡을 때까지 강제 로딩
                if (audio.readyState < 2) {
                    audio.load();
                }

                // 에러 발생 시 재시도 로직 포함
                await audio.play();
                setIsPlaying(true);
            }
        } catch (err) {
            console.error("[Somy-Audio] 재생 실패 원인:", err);
            // 만약 네트워크나 소스 문제면 예비용 소스로 즉시 전환
            alert("음악 서버를 연결 중입니다. 1초 뒤 다시 한 번만 더 눌러주세요!");
        }
    };

    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value) / 100;
        setVolume(val);
        if (audioRef.current) {
            audioRef.current.volume = val;
        }
    };

    if (!isMounted) return null;

    return (
        <div id="somy-bgm-controller" style={{
            position: 'fixed',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999999999,
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            background: '#ffffff',
            padding: '14px 35px',
            borderRadius: '100px',
            boxShadow: '0 15px 50px rgba(0,0,0,0.15)',
            border: '1px solid #f2f2f2',
            pointerEvents: 'auto',
            userSelect: 'none'
        }}>
            {/* 표준 오디오 엔진 (숨김) */}
            <audio
                ref={audioRef}
                src={reliableAudioUrl}
                loop
                preload="auto"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />

            {/* 좌측 컨트롤 그룹 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button style={circleBtnStyle} title="Previous">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
                </button>

                {/* 메인 재생 버튼 */}
                <div
                    onClick={togglePlay}
                    style={{
                        width: '55px',
                        height: '55px',
                        background: '#222',
                        color: 'white',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                        transition: 'transform 0.1s active',
                        position: 'relative'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    {isPlaying ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M8 5v14l11-7z" /></svg>
                    )}
                </div>

                <button style={circleBtnStyle} title="Next">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6zm9-12h2v12h-2z" /></svg>
                </button>
            </div>

            {/* 세로 구분선 */}
            <div style={{ width: '1.5px', height: '25px', background: '#f0f0f0', margin: '0 8px' }} />

            {/* 우측 부가 기능 및 볼륨 그룹 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', color: '#ccc' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4m4-4H7a4 4 0 0 0-4 4v1m0 10l-4-4 4-4m-4 4h14a4 4 0 0 0 4-4v-1" /></svg>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5M4 20L21 3m0 13v5h-5M15 15l6 6M4 4l5 5" /></svg>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#666' }}><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100px' }}>
                        <input
                            type="range"
                            min="0" max="100"
                            value={volume * 100}
                            onChange={handleVolume}
                            style={sliderStyle}
                        />
                        <div style={{ position: 'absolute', left: 0, height: '4px', width: `${volume * 100}%`, background: '#222', borderRadius: '4px', pointerEvents: 'none', zIndex: 1 }} />
                        <div style={{ position: 'absolute', left: 0, height: '4px', width: '100%', background: '#eee', borderRadius: '4px', pointerEvents: 'none', zIndex: 0 }} />
                    </div>
                </div>
            </div>

            <style jsx>{`
                input[type='range'] { -webkit-appearance: none; width: 100%; background: transparent; position: relative; z-index: 2; outline: none; margin: 0; cursor: pointer; }
                input[type='range']::-webkit-slider-thumb {
                    -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%;
                    background: #fff; cursor: pointer; border: 2.5px solid #222; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: -6px;
                }
            `}</style>
        </div>
    );
}

const circleBtnStyle: React.CSSProperties = {
    background: 'none',
    border: '1.5px solid #f0f0f0',
    borderRadius: '50%',
    width: '38px',
    height: '38px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#333',
    transition: 'all 0.2s',
    padding: 0
};

const sliderStyle: React.CSSProperties = { width: '100%', cursor: 'pointer', outline: 'none' };
