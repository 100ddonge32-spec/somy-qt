import { useEffect, useState, useRef } from 'react';

interface BibleReadingPlayerProps {
    audioUrl: string;
    title: string;
    initialPosition?: number;
    onProgressUpdate?: (currentTime: number, isCompleted: boolean) => void;
    onPlaybackComplete?: () => void;
}

export default function BibleReadingPlayer({
    audioUrl,
    title,
    initialPosition = 0,
    onProgressUpdate,
    onPlaybackComplete
}: BibleReadingPlayerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(1.0);
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);

    const speedOptions = [0.8, 1.0, 1.25, 1.5, 2.0];

    // 오디오 파일 변경 또는 초기 마운트 시 동작
    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);

        const audio = audioRef.current;
        if (audio) {
            audio.load();
            audio.playbackRate = speed;
            audio.volume = isMuted ? 0 : volume;
        }
    }, [audioUrl]);

    // 메타데이터 로드 시 재생길이 설정 및 이어듣기 설정
    const handleLoadedMetadata = () => {
        const audio = audioRef.current;
        if (!audio) return;
        setDuration(audio.duration);
        
        // 이어듣기 초 위치가 전달되었고 올바른 범위 내에 있을 때 적용
        if (initialPosition > 0 && initialPosition < audio.duration) {
            audio.currentTime = initialPosition;
            setCurrentTime(initialPosition);
        }
    };

    // 재생 상태 토글
    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
            // 재생을 멈췄을 때 현재 지점 서버에 자동 업데이트
            if (onProgressUpdate) {
                onProgressUpdate(audio.currentTime, audio.currentTime >= audio.duration - 2);
            }
        } else {
            audio.play()
                .then(() => {
                    setIsPlaying(true);
                })
                .catch(err => {
                    console.error("[Bible Player] 재생 오류:", err);
                    alert("오디오를 불러올 수 없습니다. 인터넷 상태를 확인해 주세요.");
                });
        }
    };

    // 시간 경과에 따른 상태 업데이트
    const handleTimeUpdate = () => {
        const audio = audioRef.current;
        if (!audio) return;
        setCurrentTime(audio.currentTime);

        // 정기적으로 10초 간격으로 진행 상황을 업데이트 (부하 최소화)
        if (onProgressUpdate && Math.floor(audio.currentTime) % 10 === 0) {
            onProgressUpdate(audio.currentTime, audio.currentTime >= audio.duration - 2);
        }
    };

    // 오디오 재생 완료 시 호출
    const handleEnded = () => {
        setIsPlaying(false);
        if (onPlaybackComplete) {
            onPlaybackComplete();
        }
        if (onProgressUpdate && audioRef.current) {
            onProgressUpdate(audioRef.current.duration, true);
        }
    };

    // 속도(배속) 조절
    const changeSpeed = (newSpeed: number) => {
        setSpeed(newSpeed);
        if (audioRef.current) {
            audioRef.current.playbackRate = newSpeed;
        }
        setShowSpeedMenu(false);
    };

    // 재생 구간 탐색 (SeekBar 조절)
    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio) return;
        const seekTime = parseFloat(e.target.value);
        audio.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const handleSeekEnd = () => {
        if (onProgressUpdate && audioRef.current) {
            onProgressUpdate(audioRef.current.currentTime, audioRef.current.currentTime >= audioRef.current.duration - 2);
        }
    };

    // 음량 조절
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        setIsMuted(val === 0);
        if (audioRef.current) {
            audioRef.current.volume = val;
            audioRef.current.muted = val === 0;
        }
    };

    // 음소거 토글
    const toggleMute = () => {
        const nextMute = !isMuted;
        setIsMuted(nextMute);
        if (audioRef.current) {
            audioRef.current.muted = nextMute;
            audioRef.current.volume = nextMute ? 0 : volume;
        }
    };

    // 시간 포맷팅 (00:00)
    const formatTime = (time: number) => {
        if (isNaN(time)) return '00:00';
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{
            background: 'linear-gradient(135deg, #1C2D37 0%, #0F171E 100%)',
            padding: '24px',
            borderRadius: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            userSelect: 'none',
            fontFamily: 'inherit',
            position: 'relative',
            overflow: 'visible'
        }}>
            {/* HTML5 Audio 태그 */}
            <audio
                ref={audioRef}
                src={audioUrl}
                preload="metadata"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
            />

            {/* 타이틀 및 재생 상태 설명 */}
            <div style={{ textAlign: 'center', margin: '4px 0' }}>
                <div style={{ color: '#D4AF37', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase' }}>Now Playing</div>
                <div style={{ fontSize: '18px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
            </div>

            {/* 재생 바 & 진행 시간 정보 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeekChange}
                        onMouseUp={handleSeekEnd}
                        onTouchEnd={handleSeekEnd}
                        style={{
                            width: '100%',
                            height: '5px',
                            borderRadius: '5px',
                            background: `linear-gradient(to right, #D4AF37 0%, #D4AF37 ${(currentTime / (duration || 1)) * 100}%, #3A4E5C ${(currentTime / (duration || 1)) * 100}%, #3A4E5C 100%)`,
                            appearance: 'none',
                            outline: 'none',
                            cursor: 'pointer',
                            margin: 0
                        }}
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#90A4AE', fontWeight: 600 }}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* 컨트롤 패널 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                {/* 10초 뒤로 가기 */}
                <button
                    onClick={() => {
                        if (audioRef.current) {
                            audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                            setCurrentTime(audioRef.current.currentTime);
                        }
                    }}
                    style={iconBtnStyle}
                    title="10초 뒤로"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                        <text x="7" y="15" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">10</text>
                    </svg>
                </button>

                {/* 재생 / 일시정지 */}
                <button
                    onClick={togglePlay}
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)',
                        color: 'white',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 8px 16px rgba(212,175,55,0.3)',
                        transition: 'transform 0.1s active'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    {isPlaying ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M8 5v14l11-7z" /></svg>
                    )}
                </button>

                {/* 10초 앞으로 가기 */}
                <button
                    onClick={() => {
                        if (audioRef.current) {
                            audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
                            setCurrentTime(audioRef.current.currentTime);
                        }
                    }}
                    style={iconBtnStyle}
                    title="10초 앞으로"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                        <path d="M21 3v5h-5" />
                        <text x="10" y="15" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">10</text>
                    </svg>
                </button>
            </div>

            {/* 부가 설정 영역 (배속 설정 + 음량 제어) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #233340', paddingTop: '14px', marginTop: '4px' }}>
                
                {/* 배속 캡슐 선택기 */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        style={{
                            background: '#1F2E3A',
                            border: '1px solid #364858',
                            color: '#D4AF37',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <span>⏱️ {speed.toFixed(2)}x</span>
                    </button>

                    {showSpeedMenu && (
                        <div style={{
                            position: 'absolute',
                            bottom: '36px',
                            left: 0,
                            background: '#233340',
                            border: '1px solid #364858',
                            borderRadius: '12px',
                            padding: '6px 0',
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: '90px',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                            zIndex: 99
                        }}>
                            {speedOptions.map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => changeSpeed(opt)}
                                    style={{
                                        background: opt === speed ? 'rgba(212,175,55,0.15)' : 'transparent',
                                        border: 'none',
                                        color: opt === speed ? '#D4AF37' : 'white',
                                        padding: '8px 16px',
                                        fontSize: '13px',
                                        fontWeight: opt === speed ? 800 : 500,
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        width: '100%'
                                    }}
                                >
                                    {opt === 1.0 ? '기본 (1.0x)' : `${opt.toFixed(2)}x`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 음량 조절 컴포넌트 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: '#90A4AE', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                        {isMuted ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                        )}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        style={{
                            width: '70px',
                            height: '4px',
                            background: '#3A4E5C',
                            accentColor: '#D4AF37',
                            cursor: 'pointer'
                        }}
                    />
                </div>
            </div>

            {/* Slider 튠 CSS 주입 */}
            <style jsx>{`
                input[type="range"]::-webkit-slider-thumb {
                    appearance: none;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: #ffffff;
                    border: 2px solid #D4AF37;
                    cursor: pointer;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                }
            `}</style>
        </div>
    );
}

const iconBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#90A4AE',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    borderRadius: '50%',
    transition: 'background 0.2s',
    outline: 'none'
};
