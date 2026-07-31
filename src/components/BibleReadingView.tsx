import { useState, useEffect } from 'react';
import BibleReadingPlayer from './BibleReadingPlayer';

interface BibleReadingViewProps {
    user: any;
    churchId: string;
    onBack: () => void;
    baseFont: any;
    isAdmin: boolean;
}

export default function BibleReadingView({
    user,
    churchId,
    onBack,
    baseFont,
    isAdmin
}: BibleReadingViewProps) {
    const [readings, setReadings] = useState<any[]>([]);
    const [progress, setProgress] = useState<any>({ total: 0, completed: 0, percent: 0, progressList: [] });
    const [activeReading, setActiveReading] = useState<any | null>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isCompletedChecked, setIsCompletedChecked] = useState(false);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isCommentsLoading, setIsCommentsLoading] = useState(false);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    useEffect(() => {
        loadData();
    }, [churchId, user?.id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([fetchReadings(), fetchProgress()]);
        } catch (e) {
            console.error('Data loading error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    // 1. 회차 목록 로드
    const fetchReadings = async () => {
        try {
            const res = await fetch(`/api/bible-readings?church_id=${churchId}`);
            if (res.ok) {
                const data = await res.json();
                setReadings(data);
            }
        } catch (err) {
            console.error('Failed to fetch readings:', err);
        }
    };

    // 2. 진행도 로드
    const fetchProgress = async () => {
        if (!user?.id) return;
        try {
            const res = await fetch(`/api/bible-readings/progress?user_id=${user.id}&church_id=${churchId}`);
            if (res.ok) {
                const data = await res.json();
                setProgress(data);
            }
        } catch (err) {
            console.error('Failed to fetch progress:', err);
        }
    };

    // 3. 댓글 로드
    const fetchComments = async (readingId: number) => {
        setIsCommentsLoading(true);
        try {
            const res = await fetch(`/api/bible-readings/comments?reading_id=${readingId}`);
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } catch (err) {
            console.error('Failed to fetch comments:', err);
        } finally {
            setIsCommentsLoading(false);
        }
    };

    // 4. 진행 현황 업데이트 (실시간 오디오 청취 위치 저장 및 완료 처리)
    const handleProgressUpdate = async (currentTime: number, isCompleted: boolean) => {
        if (!user?.id || !activeReading) return;
        try {
            const res = await fetch('/api/bible-readings/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    reading_id: activeReading.id,
                    church_id: churchId,
                    last_position: Math.floor(currentTime),
                    is_completed: isCompleted
                })
            });

            if (res.ok) {
                // 내부 진행도 상태만 업데이트 (새로고침 없이 로컬 리스트 갱신)
                setProgress((prev: any) => {
                    const existingList = [...prev.progressList];
                    const idx = existingList.findIndex(p => p.reading_id === activeReading.id);
                    const updateObj = {
                        user_id: user.id,
                        reading_id: activeReading.id,
                        church_id: churchId,
                        last_position: Math.floor(currentTime),
                        is_completed: isCompleted,
                        completed_at: isCompleted ? new Date().toISOString() : null
                    };

                    if (idx > -1) {
                        existingList[idx] = { ...existingList[idx], ...updateObj };
                    } else {
                        existingList.push(updateObj);
                    }

                    const completedCount = existingList.filter(p => p.is_completed).length;
                    return {
                        ...prev,
                        completed: completedCount,
                        percent: prev.total > 0 ? Math.round((completedCount / prev.total) * 100) : 0,
                        progressList: existingList
                    };
                });
            }
        } catch (e) {
            console.error('Failed to save progress:', e);
        }
    };

    // 5. 오디오 완독 시 호출되는 콜백
    const handlePlaybackComplete = () => {
        handleProgressUpdate(0, true);
        setIsCompletedChecked(true); // 오디오를 끝까지 들으면 댓글 작성창에 "통독 완료" 체크 자동 활성화
        alert('🎉 이 회차의 성경통독을 완료하셨습니다! 완료 은혜나눔 글을 남겨주세요.');
    };

    // 6. 댓글 등록
    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !activeReading || !user?.id) return;

        setIsSubmittingComment(true);
        try {
            const res = await fetch('/api/bible-readings/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reading_id: activeReading.id,
                    user_id: user.id,
                    user_name: user.full_name || user.name || '성도',
                    content: newComment.trim(),
                    is_completed_comment: isCompletedChecked
                })
            });

            if (res.ok) {
                setNewComment('');
                setIsCompletedChecked(false);
                await Promise.all([fetchComments(activeReading.id), fetchProgress()]);
            }
        } catch (err) {
            console.error('Comment submit failed:', err);
        } finally {
            setIsSubmittingComment(false);
        }
    };

    // 7. 댓글 삭제
    const handleCommentDelete = async (commentId: number) => {
        if (!confirm('댓글을 삭제하시겠습니까?')) return;
        try {
            const res = await fetch('/api/bible-readings/comments', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: commentId,
                    user_id: user?.id,
                    is_admin: isAdmin
                })
            });
            if (res.ok && activeReading) {
                await fetchComments(activeReading.id);
            }
        } catch (e) {
            console.error('Comment delete failed:', e);
        }
    };

    // 회차 선택 핸들러
    const selectReading = (reading: any) => {
        setActiveReading(reading);
        setIsCompletedChecked(false);
        fetchComments(reading.id);
    };

    // 특정 회차의 진행도 반환 헬퍼
    const getReadingProgress = (readingId: number) => {
        return progress.progressList.find((p: any) => p.reading_id === readingId);
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#FFF8F0', ...baseFont }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '30px', animation: 'spin 1s infinite linear', marginBottom: '10px' }}>⏳</div>
                    <div style={{ fontWeight: 700, color: '#8E754C' }}>성경통독 데이터를 불러오고 있습니다...</div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #FFF8F0 0%, #FEF0D8 50%, #F5E0BB 100%)',
            padding: '24px 20px 80px 20px',
            maxWidth: '600px',
            margin: '0 auto',
            position: 'relative',
            ...baseFont
        }}>
            {/* 상단 네비게이션 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#8E754C' }}>←</button>
                <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#333', margin: 0, letterSpacing: '-0.5px' }}>🎧 성경통독</h1>
                <div style={{ width: '20px' }}></div> {/* 정렬용 가상 박스 */}
            </div>

            {/* 통독 진행 현황 대시보드 카드 */}
            {!activeReading && (
                <div style={{
                    background: 'white',
                    borderRadius: '24px',
                    padding: '22px 20px',
                    boxShadow: '0 10px 30px rgba(142,117,76,0.1)',
                    border: '1.5px solid white',
                    marginBottom: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '13px', color: '#888', fontWeight: 600 }}>{user?.full_name || '성도'}님의 통독 현황</span>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#2C3E50', marginTop: '2px' }}>
                                총 {progress.total}회 중 <span style={{ color: '#AA7C11' }}>{progress.completed}회</span> 완료!
                            </div>
                        </div>
                        <div style={{ fontSize: '32px' }}>👑</div>
                    </div>

                    {/* 슬라이드 진행 바 */}
                    <div style={{ width: '100%', height: '8px', background: '#EEE', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                        <div style={{
                            width: `${progress.percent}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #D4AF37 0%, #AA7C11 100%)',
                            borderRadius: '4px',
                            transition: 'width 0.5s ease-out'
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888', fontWeight: 700 }}>
                        <span>완료율</span>
                        <span>{progress.percent}%</span>
                    </div>
                </div>
            )}

            {/* 활성화된 오디오 플레이어 영역 */}
            {activeReading && (
                <div style={{ marginBottom: '24px', animation: 'fade-in 0.3s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <button
                            onClick={() => {
                                // 뒤로가기 시 progress 새로고침 수행하여 목록 데이터 연동 일치화
                                fetchProgress();
                                setActiveReading(null);
                            }}
                            style={{ background: '#FFF', border: '1px solid #EBE5D8', borderRadius: '12px', padding: '6px 12px', fontSize: '12px', fontWeight: 800, color: '#8E754C', cursor: 'pointer' }}
                        >
                            닫고 전체 목록 보기
                        </button>
                    </div>

                    <BibleReadingPlayer
                        audioUrl={activeReading.audio_url}
                        title={activeReading.title}
                        initialPosition={getReadingProgress(activeReading.id)?.last_position || 0}
                        onProgressUpdate={handleProgressUpdate}
                        onPlaybackComplete={handlePlaybackComplete}
                    />

                    {/* 활성화된 통독 설명 */}
                    {activeReading.description && (
                        <div style={{ background: '#FFF', borderRadius: '20px', padding: '16px 20px', border: '1px solid #EEE', marginTop: '12px', fontSize: '14px', color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {activeReading.description}
                        </div>
                    )}

                    {/* 댓글 및 은혜나눔 소통 파트 */}
                    <div style={{ marginTop: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#333', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>💬</span> 은혜나눔 및 완료 인증
                        </h3>

                        {/* 댓글 입력 폼 */}
                        <form onSubmit={handleCommentSubmit} style={{ background: 'white', padding: '16px', borderRadius: '20px', border: '1px solid #EEE', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#AA7C11', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={isCompletedChecked}
                                        onChange={(e) => setIsCompletedChecked(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: '#D4AF37' }}
                                    />
                                    🔥 이번 통독 완료 인증하기
                                </label>
                            </div>
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="오디오 성경을 듣고 받은 은혜나 깨달은 것을 자유롭게 작성해 보세요."
                                rows={3}
                                style={{ width: '100%', padding: '12px', border: '1px solid #DDD', borderRadius: '12px', outline: 'none', resize: 'none', fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.6' }}
                                required
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    type="submit"
                                    disabled={isSubmittingComment || !newComment.trim()}
                                    style={{
                                        padding: '8px 16px',
                                        background: newComment.trim() ? '#2C3E50' : '#BBB',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '12px',
                                        fontWeight: 800,
                                        cursor: newComment.trim() ? 'pointer' : 'default'
                                    }}
                                >
                                    {isSubmittingComment ? '등록중...' : '등록'}
                                </button>
                            </div>
                        </form>

                        {/* 댓글 목록 */}
                        {isCommentsLoading ? (
                            <div style={{ textAlign: 'center', padding: '20px', fontSize: '13px', color: '#888' }}>로딩중...</div>
                        ) : comments.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px', color: '#999', fontSize: '13px', background: 'white', borderRadius: '20px', border: '1px solid #EEE' }}>
                                아직 등록된 은혜나눔이 없습니다.<br />첫 번째 댓글의 주인공이 되어보세요! ✨
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {comments.map((comment) => (
                                    <div key={comment.id} style={{ background: 'white', padding: '16px', borderRadius: '20px', border: '1px solid #EEE', display: 'flex', gap: '12px', position: 'relative' }}>
                                        {/* 프로필 이미지 */}
                                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#EEE', overflow: 'hidden', flexShrink: 0 }}>
                                            {comment.profiles?.avatar_url ? (
                                                <img src={comment.profiles.avatar_url} alt={comment.user_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', background: '#E0E7FF', color: '#4F46E5', fontWeight: 800 }}>
                                                    {comment.user_name.slice(0, 1)}
                                                </div>
                                            )}
                                        </div>

                                        {/* 내용 그룹 */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 800, fontSize: '13px', color: '#333' }}>{comment.user_name}</span>
                                                
                                                {/* 통독 완료 뱃지 */}
                                                {comment.is_completed_comment && (
                                                    <span style={{ background: 'linear-gradient(135deg, #FFF8F0 0%, #FEF0D8 100%)', border: '1px solid #D4AF37', color: '#AA7C11', fontSize: '10px', fontWeight: 900, padding: '2px 6px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                        👑 통독완료
                                                    </span>
                                                )}
                                                
                                                <span style={{ fontSize: '10px', color: '#AAA' }}>{new Date(comment.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginTop: '2px' }}>{comment.content}</div>
                                        </div>

                                        {/* 삭제 버튼 (본인 또는 관리자) */}
                                        {(comment.user_id === user?.id || isAdmin) && (
                                            <button
                                                onClick={() => handleCommentDelete(comment.id)}
                                                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#FF7675', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: '2px' }}
                                            >
                                                삭제
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 전체 성경통독 목록 */}
            {!activeReading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 900, color: '#8E754C', margin: '4px 0 2px 0' }}>📋 통독 리스트</h2>
                    {readings.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '24px', border: '1.5px solid white', color: '#999', fontSize: '14px' }}>
                            아직 올라온 성경통독 음원이 없습니다.<br />관리자의 업로드를 기다려주세요! ⛪
                        </div>
                    ) : (
                        readings.map((reading) => {
                            const prog = getReadingProgress(reading.id);
                            const isCompleted = prog?.is_completed;
                            const currentPos = prog?.last_position || 0;

                            return (
                                <div
                                    key={reading.id}
                                    onClick={() => selectReading(reading)}
                                    style={{
                                        background: 'white',
                                        borderRadius: '20px',
                                        padding: '18px 20px',
                                        border: activeReading?.id === reading.id ? '2px solid #D4AF37' : '1.5px solid white',
                                        boxShadow: '0 6px 15px rgba(142,117,76,0.06)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '12px' }}>
                                        <div style={{ fontWeight: 800, fontSize: '15px', color: '#333' }}>{reading.title}</div>
                                        {reading.description && (
                                            <div style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                                                {reading.description}
                                            </div>
                                        )}
                                        {/* 이어듣기 안내 텍스트 */}
                                        {currentPos > 0 && !isCompleted && (
                                            <div style={{ fontSize: '11px', color: '#3498DB', fontWeight: 600 }}>
                                                ⏱️ 이어듣기 가능 ({Math.floor(currentPos / 60)}분 {currentPos % 60}초 지점)
                                            </div>
                                        )}
                                    </div>

                                    {/* 상태 뱃지 */}
                                    <div>
                                        {isCompleted ? (
                                            <span style={{
                                                background: 'linear-gradient(135deg, #FFF8F0 0%, #FEF0D8 100%)',
                                                border: '1px solid #D4AF37',
                                                color: '#AA7C11',
                                                padding: '5px 12px',
                                                borderRadius: '20px',
                                                fontSize: '11px',
                                                fontWeight: 900,
                                                boxShadow: '0 2px 5px rgba(212,175,55,0.1)'
                                            }}>
                                                완료 👑
                                            </span>
                                        ) : (
                                            <span style={{
                                                background: '#F0F3F4',
                                                color: '#7F8C8D',
                                                padding: '5px 12px',
                                                borderRadius: '20px',
                                                fontSize: '11px',
                                                fontWeight: 700
                                            }}>
                                                {currentPos > 0 ? '진행중' : '시작하기'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
