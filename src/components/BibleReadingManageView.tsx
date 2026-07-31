import { useState, useEffect } from 'react';

interface BibleReadingManageViewProps {
    user: any;
    churchId: string;
    onBack: () => void;
    baseFont: any;
}

export default function BibleReadingManageView({
    user,
    churchId,
    onBack,
    baseFont
}: BibleReadingManageViewProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [readings, setReadings] = useState<any[]>([]);
    
    const [isUploading, setIsUploading] = useState(false);
    const [isLoadingList, setIsLoadingList] = useState(true);

    useEffect(() => {
        fetchReadings();
    }, [churchId]);

    // 1. 회차 목록 로드
    const fetchReadings = async () => {
        setIsLoadingList(true);
        try {
            const res = await fetch(`/api/bible-readings?church_id=${churchId}`);
            if (res.ok) {
                const data = await res.json();
                setReadings(data);
            }
        } catch (err) {
            console.error('Failed to load readings:', err);
        } finally {
            setIsLoadingList(false);
        }
    };

    // 파일 선택 핸들러
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            // 오디오 파일 형식 점검
            if (!file.type.startsWith('audio/')) {
                alert('MP3와 같은 오디오 파일 형식만 업로드 가능합니다.');
                return;
            }
            setSelectedFile(file);
        }
    };

    // 2. 등록 및 파일 업로드 전송
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !title.trim() || !user?.id) {
            alert('제목 입력과 오디오 파일 선택은 필수입니다.');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', title.trim());
        formData.append('description', description.trim());
        formData.append('church_id', churchId);
        formData.append('user_id', user.id);

        try {
            const res = await fetch('/api/admin/bible-readings', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                alert('성경통독 음원이 성공적으로 등록되었습니다.');
                setTitle('');
                setDescription('');
                setSelectedFile(null);
                // 파일 인풋 초기화
                const fileInput = document.getElementById('audio-file-input') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
                
                await fetchReadings();
            } else {
                alert(`등록 실패: ${data.error || '알 수 없는 오류'}`);
            }
        } catch (err) {
            console.error('Upload request failed:', err);
            alert('서버 네트워크 오류가 발생했습니다.');
        } finally {
            setIsUploading(false);
        }
    };

    // 3. 회차 삭제
    const handleDelete = async (readingId: number) => {
        if (!confirm('정말 이 통독 회차를 삭제하시겠습니까?\n삭제 시 관련된 성도들의 진행도 및 댓글이 모두 영구 삭제됩니다.')) return;
        try {
            const res = await fetch('/api/admin/bible-readings', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: readingId,
                    user_id: user?.id,
                    church_id: churchId
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert('성공적으로 삭제되었습니다.');
                await fetchReadings();
            } else {
                alert(`삭제 실패: ${data.error || '알 수 없는 오류'}`);
            }
        } catch (err) {
            console.error('Delete request failed:', err);
            alert('삭제 중 서버 통신 오류가 발생했습니다.');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#F9FBF9', // 관리 센터 느낌의 깔끔하고 차분한 배경
            padding: '24px 20px 80px 20px',
            maxWidth: '600px',
            margin: '0 auto',
            position: 'relative',
            ...baseFont
        }}>
            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid #EEE', paddingBottom: '12px' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#2C3E50' }}>←</button>
                <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#2C3E50', margin: 0 }}>⚙️ 성경통독 관리자 센터</h1>
                <div style={{ width: '20px' }}></div>
            </div>

            {/* 신규 통독 업로드 폼 */}
            <div style={{ background: 'white', borderRadius: '20px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '28px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#2C3E50', marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ➕ 신규 통독 음원 업로드
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* 제목 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#4A5568' }}>회차 제목 *</label>
                        <input
                            type="text"
                            placeholder="예: Day 1 (창세기 1장 - 5장)"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                            required
                        />
                    </div>

                    {/* 설명 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#4A5568' }}>설명 또는 가이드 (선택)</label>
                        <textarea
                            placeholder="성도님들이 묵상하고 읽을 포인트나 요약을 입력해 주세요."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                        />
                    </div>

                    {/* 파일 선택 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#4A5568' }}>오디오 파일 업로드 (.mp3 권장) *</label>
                        <input
                            id="audio-file-input"
                            type="file"
                            accept="audio/*"
                            onChange={handleFileChange}
                            style={{ fontSize: '12px', color: '#4A5568' }}
                            required
                        />
                        {selectedFile && (
                            <div style={{ fontSize: '11px', color: '#718096', fontWeight: 600, marginTop: '2px' }}>
                                선택된 파일 크기: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                            </div>
                        )}
                    </div>

                    {/* 전송 버튼 */}
                    <button
                        type="submit"
                        disabled={isUploading || !title.trim() || !selectedFile}
                        style={{
                            marginTop: '6px',
                            padding: '14px',
                            background: isUploading ? '#A0AEC0' : '#1A5D55',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: 800,
                            cursor: (isUploading || !title.trim() || !selectedFile) ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 10px rgba(26,93,85,0.15)'
                        }}
                    >
                        {isUploading ? (
                            <>
                                <span style={{ animation: 'spin 1s infinite linear' }}>⏳</span>
                                대용량 파일 전송 및 업로드 중 (최대 1~2분 소요)...
                            </>
                        ) : '등록하기'}
                    </button>
                </form>
            </div>

            {/* 업로드된 통독 목록 및 삭제 관리 */}
            <div>
                <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#2C3E50', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📋 등록된 통독 리스트 ({readings.length})
                </h2>

                {isLoadingList ? (
                    <div style={{ textAlign: 'center', padding: '30px', fontSize: '13px', color: '#888' }}>리스트 로딩 중...</div>
                ) : readings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '20px', border: '1px solid #E2E8F0', color: '#A0AEC0', fontSize: '13px' }}>
                        등록된 통독 음원이 없습니다.<br />위 양식을 작성해 첫 음원을 올려주세요.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {readings.map((reading) => (
                            <div
                                key={reading.id}
                                style={{
                                    background: 'white',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    border: '1px solid #E2E8F0',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden', paddingRight: '16px' }}>
                                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#2C3E50' }}>{reading.title}</div>
                                    <div style={{ fontSize: '11px', color: '#A0AEC0', wordBreak: 'break-all', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '380px' }}>
                                        {reading.audio_url}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(reading.id)}
                                    style={{
                                        padding: '6px 12px',
                                        background: '#FFF1F2',
                                        color: '#E11D48',
                                        border: '1px solid #FDA4AF',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        flexShrink: 0
                                    }}
                                >
                                    삭제
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
