import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
    const [selectedFile2, setSelectedFile2] = useState<File | null>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [readings, setReadings] = useState<any[]>([]);
    
    const [isUploading, setIsUploading] = useState(false);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [uploadStatus, setUploadStatus] = useState('');

    useEffect(() => {
        fetchReadings();
    }, [churchId]);

    // 이미지 파일 선택 핸들러
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (!file.type.startsWith('image/')) {
                alert('이미지 파일 형식만 업로드 가능합니다.');
                return;
            }
            setSelectedImage(file);
        }
    };

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

    // 두 번째 파일 선택 핸들러
    const handleFile2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            // 오디오 파일 형식 점검
            if (!file.type.startsWith('audio/')) {
                alert('MP3와 같은 오디오 파일 형식만 업로드 가능합니다.');
                return;
            }
            setSelectedFile2(file);
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
        setUploadStatus('첫 번째 오디오 파일 업로드 준비 중...');

        let audioFilePath = null;
        let audioFilePath2 = null;
        let imageFilePath = null;

        const rollbackFiles = async () => {
            const deletePaths = [];
            if (audioFilePath) deletePaths.push(audioFilePath);
            if (audioFilePath2) deletePaths.push(audioFilePath2);
            if (imageFilePath) deletePaths.push(imageFilePath);
            if (deletePaths.length > 0) {
                try {
                    await supabase.storage.from('church-assets').remove(deletePaths);
                    console.log('[Rollback] Deleted:', deletePaths);
                } catch (rollbackErr) {
                    console.error('[Rollback Error]:', rollbackErr);
                }
            }
        };

        try {
            const safeChurchId = churchId.replace(/[^a-z0-9]/gi, '_').toLowerCase();

            // 1. 첫 번째 오디오 업로드
            setUploadStatus('첫 번째 오디오 파일 업로드 중...');
            const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || 'mp3';
            const audioFileName = `${safeChurchId}-bible-${Date.now()}.${fileExt}`;
            audioFilePath = `bible-readings/${audioFileName}`;

            const { error: uploadError } = await supabase.storage
                .from('church-assets')
                .upload(audioFilePath, selectedFile, {
                    cacheControl: '31536000',
                    contentType: 'audio/mpeg',
                    upsert: false
                });

            if (uploadError) throw new Error(`첫 번째 오디오 업로드 실패: ${uploadError.message}`);

            const { data: { publicUrl: audioPublicUrl } } = supabase.storage
                .from('church-assets')
                .getPublicUrl(audioFilePath);

            // 2. 두 번째 오디오 업로드 (선택)
            let audioPublicUrl2 = null;
            if (selectedFile2) {
                setUploadStatus('두 번째 오디오 파일 업로드 중...');
                const fileExt2 = selectedFile2.name.split('.').pop()?.toLowerCase() || 'mp3';
                const audioFileName2 = `${safeChurchId}-bible-part2-${Date.now()}.${fileExt2}`;
                audioFilePath2 = `bible-readings/${audioFileName2}`;

                const { error: uploadError2 } = await supabase.storage
                    .from('church-assets')
                    .upload(audioFilePath2, selectedFile2, {
                        cacheControl: '31536000',
                        contentType: 'audio/mpeg',
                        upsert: false
                    });

                if (uploadError2) throw new Error(`두 번째 오디오 업로드 실패: ${uploadError2.message}`);

                const { data: { publicUrl: audioUrl2 } } = supabase.storage
                    .from('church-assets')
                    .getPublicUrl(audioFilePath2);
                audioPublicUrl2 = audioUrl2;
            }

            // 3. 본문 이미지 업로드 (선택)
            let imagePublicUrl = null;
            if (selectedImage) {
                setUploadStatus('본문 참고 이미지 업로드 중...');
                const imgExt = selectedImage.name.split('.').pop()?.toLowerCase() || 'png';
                const imgFileName = `${safeChurchId}-bible-img-${Date.now()}.${imgExt}`;
                imageFilePath = `bible-readings/${imgFileName}`;

                const { error: imgUploadError } = await supabase.storage
                    .from('church-assets')
                    .upload(imageFilePath, selectedImage, {
                        cacheControl: '31536000',
                        contentType: selectedImage.type || 'image/jpeg',
                        upsert: false
                    });

                if (imgUploadError) throw new Error(`이미지 업로드 실패: ${imgUploadError.message}`);

                const { data: { publicUrl: imgUrl } } = supabase.storage
                    .from('church-assets')
                    .getPublicUrl(imageFilePath);
                imagePublicUrl = imgUrl;
            }

            // 4. Next.js API 호출로 메타데이터 기록
            setUploadStatus('서버 데이터베이스 기록 중...');
            const res = await fetch('/api/admin/bible-readings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim(),
                    audio_url: audioPublicUrl,
                    audio_url_2: audioPublicUrl2,
                    image_url: imagePublicUrl,
                    church_id: churchId,
                    user_id: user.id
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert('성경통독 음원이 성공적으로 등록되었습니다.');
                setTitle('');
                setDescription('');
                setSelectedFile(null);
                setSelectedFile2(null);
                setSelectedImage(null);
                // 파일 인풋 초기화
                const fileInput = document.getElementById('audio-file-input') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
                const fileInput2 = document.getElementById('audio-file-input-2') as HTMLInputElement;
                if (fileInput2) fileInput2.value = '';
                const imgInput = document.getElementById('image-file-input') as HTMLInputElement;
                if (imgInput) imgInput.value = '';
                
                await fetchReadings();
            } else {
                // 실패 시 업로드된 파일들 삭제
                await rollbackFiles();
                alert(`등록 실패: ${data.error || '알 수 없는 오류'}`);
            }
        } catch (err: any) {
            console.error('Upload failed:', err);
            await rollbackFiles();
            alert(`등록 중 오류가 발생했습니다: ${err.message || err}`);
        } finally {
            setIsUploading(false);
            setUploadStatus('');
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

                    {/* 파일 선택 1 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#4A5568' }}>첫 번째 오디오 파일 업로드 (.mp3) *</label>
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

                    {/* 파일 선택 2 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#4A5568' }}>두 번째 오디오 파일 업로드 (.mp3) (선택)</label>
                        <input
                            id="audio-file-input-2"
                            type="file"
                            accept="audio/*"
                            onChange={handleFile2Change}
                            style={{ fontSize: '12px', color: '#4A5568' }}
                        />
                        {selectedFile2 && (
                            <div style={{ fontSize: '11px', color: '#718096', fontWeight: 600, marginTop: '2px' }}>
                                선택된 파일 크기: {(selectedFile2.size / (1024 * 1024)).toFixed(2)} MB
                            </div>
                        )}
                    </div>

                    {/* 본문 이미지 선택 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#4A5568' }}>본문 이미지 파일 업로드 (선택)</label>
                        <input
                            id="image-file-input"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            style={{ fontSize: '12px', color: '#4A5568' }}
                        />
                        {selectedImage && (
                            <div style={{ fontSize: '11px', color: '#718096', fontWeight: 600, marginTop: '2px' }}>
                                선택된 이미지 크기: {(selectedImage.size / (1024 * 1024)).toFixed(2)} MB
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
                                {uploadStatus || '대용량 파일 전송 및 업로드 중...'}
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
