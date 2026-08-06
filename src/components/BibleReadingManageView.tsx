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
    const [publishedAt, setPublishedAt] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFile2, setSelectedFile2] = useState<File | null>(null);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [readings, setReadings] = useState<any[]>([]);
    
    const [isUploading, setIsUploading] = useState(false);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [uploadStatus, setUploadStatus] = useState('');

    const [editingReading, setEditingReading] = useState<any | null>(null);
    const [clearAudio2, setClearAudio2] = useState(false);

    useEffect(() => {
        fetchReadings();
    }, [churchId]);

    // 이미지 파일 선택 핸들러
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            const invalidFile = files.find(file => !file.type.startsWith('image/'));
            if (invalidFile) {
                alert('이미지 파일 형식만 업로드 가능합니다.');
                return;
            }
            setSelectedImages(files);
        }
    };

    // 새로 선택한 이미지 삭제 핸들러
    const removeSelectedImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
        const imgInput = document.getElementById('image-file-input') as HTMLInputElement;
        if (imgInput) imgInput.value = '';
    };

    // 기존 등록된 이미지 삭제 핸들러
    const removeExistingImage = (index: number) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
    };

    // 수정 시작 핸들러
    const startEdit = (reading: any) => {
        setEditingReading(reading);
        setTitle(reading.title);
        setDescription(reading.description || '');
        setSelectedFile(null);
        setSelectedFile2(null);
        setSelectedImages([]);
        
        // 기존 이미지 주소 파싱
        const parseUrls = (val: string | null | undefined) => {
            if (!val) return [];
            if (val.startsWith('[') && val.endsWith(']')) {
                try { return JSON.parse(val); } catch(e) {}
            }
            if (val && val.includes(',')) {
                return val.split(',').map(s => s.trim()).filter(Boolean);
            }
            return val ? [val] : [];
        };
        setExistingImages(parseUrls(reading.image_url));
        
        // published_at 예약 시간 파싱 (datetime-local 용: YYYY-MM-DDTHH:MM 형식으로 변환)
        if (reading.published_at) {
            const d = new Date(reading.published_at);
            const pad = (n: number) => String(n).padStart(2, '0');
            const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            setPublishedAt(localStr);
        } else {
            setPublishedAt('');
        }
        
        setClearAudio2(false);

        // 파일 인풋들 비워주기
        const fileInput = document.getElementById('audio-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        const fileInput2 = document.getElementById('audio-file-input-2') as HTMLInputElement;
        if (fileInput2) fileInput2.value = '';
        const imgInput = document.getElementById('image-file-input') as HTMLInputElement;
        if (imgInput) imgInput.value = '';
        
        // 폼 영역으로 부드럽게 스크롤
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 수정 취소 핸들러
    const cancelEdit = () => {
        setEditingReading(null);
        setTitle('');
        setDescription('');
        setSelectedFile(null);
        setSelectedFile2(null);
        setSelectedImages([]);
        setExistingImages([]);
        setClearAudio2(false);
        setPublishedAt('');

        const fileInput = document.getElementById('audio-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        const fileInput2 = document.getElementById('audio-file-input-2') as HTMLInputElement;
        if (fileInput2) fileInput2.value = '';
        const imgInput = document.getElementById('image-file-input') as HTMLInputElement;
        if (imgInput) imgInput.value = '';
    };

    // 1. 회차 목록 로드
    const fetchReadings = async () => {
        setIsLoadingList(true);
        try {
            const res = await fetch(`/api/bible-readings?church_id=${churchId}&user_id=${user?.id}`);
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

    // 2. 등록 및 파일 업로드 전송 (수정 모드 포함)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!title.trim() || !user?.id) {
            alert('회차 제목은 필수입니다.');
            return;
        }
        if (!editingReading && !selectedFile) {
            alert('신규 등록 시 첫 번째 오디오 파일 선택은 필수입니다.');
            return;
        }

        setIsUploading(true);
        setUploadStatus('작업 준비 중...');

        let audioFilePath: string | null = null;
        let audioFilePath2: string | null = null;
        const uploadedImagePaths: string[] = [];

        // 에러 시 이번 전송 중에 업로드된 스토리지 파일들만 롤백 처리
        const rollbackFiles = async () => {
            const deletePaths = [];
            if (audioFilePath) deletePaths.push(audioFilePath);
            if (audioFilePath2) deletePaths.push(audioFilePath2);
            if (uploadedImagePaths.length > 0) deletePaths.push(...uploadedImagePaths);
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

            // --- 1. 첫 번째 오디오 파일 업로드 처리 ---
            let audioPublicUrl = editingReading ? editingReading.audio_url : null;
            if (selectedFile) {
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

                const { data: { publicUrl } } = supabase.storage
                    .from('church-assets')
                    .getPublicUrl(audioFilePath);
                audioPublicUrl = publicUrl;
            }

            // --- 2. 두 번째 오디오 파일 업로드 처리 ---
            let audioPublicUrl2 = editingReading ? (clearAudio2 ? null : editingReading.audio_url_2) : null;
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

            // --- 3. 본문 이미지 파일들 업로드 처리 ---
            const uploadedImageUrls: string[] = [];
            if (selectedImages.length > 0) {
                for (let i = 0; i < selectedImages.length; i++) {
                    const img = selectedImages[i];
                    setUploadStatus(`본문 참고 이미지 ${i + 1}/${selectedImages.length} 업로드 중...`);
                    const imgExt = img.name.split('.').pop()?.toLowerCase() || 'png';
                    const imgFileName = `${safeChurchId}-bible-img-${Date.now()}-${i}.${imgExt}`;
                    const imgPath = `bible-readings/${imgFileName}`;

                    const { error: imgUploadError } = await supabase.storage
                        .from('church-assets')
                        .upload(imgPath, img, {
                            cacheControl: '31536000',
                            contentType: img.type || 'image/jpeg',
                            upsert: false
                        });

                    if (imgUploadError) throw new Error(`이미지 ${i + 1} 업로드 실패: ${imgUploadError.message}`);
                    uploadedImagePaths.push(imgPath);

                    const { data: { publicUrl: imgUrl } } = supabase.storage
                        .from('church-assets')
                        .getPublicUrl(imgPath);
                    uploadedImageUrls.push(imgUrl);
                }
            }

            const finalImageUrlsList = editingReading 
                ? [...existingImages, ...uploadedImageUrls] 
                : [...uploadedImageUrls];
            const imagePublicUrl = finalImageUrlsList.length > 0 ? JSON.stringify(finalImageUrlsList) : null;

            // --- 4. 백엔드 API 서버 전송 ---
            setUploadStatus(editingReading ? '서버 데이터베이스 수정 중...' : '서버 데이터베이스 기록 중...');
            const apiEndpoint = '/api/admin/bible-readings';
            const apiMethod = editingReading ? 'PUT' : 'POST';
            
            const reqBody: any = {
                title: title.trim(),
                description: description.trim(),
                audio_url: audioPublicUrl,
                audio_url_2: audioPublicUrl2,
                image_url: imagePublicUrl,
                church_id: churchId,
                user_id: user.id,
                published_at: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString()
            };
            if (editingReading) {
                reqBody.id = editingReading.id;
            }

            const res = await fetch(apiEndpoint, {
                method: apiMethod,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reqBody)
            });

            const data = await res.json();
            if (res.ok) {
                alert(editingReading ? '성경통독 회차가 성공적으로 수정되었습니다.' : '성경통독 음원이 성공적으로 등록되었습니다.');
                
                // 완료 후 모든 상태 초기화
                setTitle('');
                setDescription('');
                setSelectedFile(null);
                setSelectedFile2(null);
                setSelectedImages([]);
                setExistingImages([]);
                setEditingReading(null);
                setClearAudio2(false);
                setPublishedAt('');

                // 파일 인풋들 초기화
                const fileInput = document.getElementById('audio-file-input') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
                const fileInput2 = document.getElementById('audio-file-input-2') as HTMLInputElement;
                if (fileInput2) fileInput2.value = '';
                const imgInput = document.getElementById('image-file-input') as HTMLInputElement;
                if (imgInput) imgInput.value = '';
                
                await fetchReadings();
            } else {
                await rollbackFiles();
                alert(`전송 실패: ${data.error || '알 수 없는 오류'}`);
            }
        } catch (err: any) {
            console.error('Submit failed:', err);
            await rollbackFiles();
            alert(`등록/수정 중 오류가 발생했습니다: ${err.message || err}`);
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

            {/* 신규 통독 업로드 및 수정 폼 */}
            <div style={{ background: 'white', borderRadius: '20px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '28px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#2C3E50', marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {editingReading ? '✏️ 성경통독 회차 수정' : '➕ 신규 통독 음원 업로드'}
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

                    {/* 예약 배포 설정 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#4A5568' }}>예약 배포 일시 (선택)</label>
                        <input
                            type="datetime-local"
                            value={publishedAt}
                            onChange={(e) => setPublishedAt(e.target.value)}
                            style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', color: '#2C3E50', width: '100%' }}
                        />
                        <div style={{ fontSize: '11px', color: '#718096', fontWeight: 600, marginTop: '2px', lineHeight: '1.4' }}>
                            설정하지 않으면 즉시 업로드되어 모든 성도님들께 공개되며, 예약 시간을 정하면 해당 시간 이후에만 성도들에게 노출됩니다.
                        </div>
                    </div>

                    {/* 수정 가이드 정보 안내 */}
                    {editingReading && (
                        <div style={{ padding: '10px 12px', background: '#FFF8F0', border: '1px solid #FEF0D8', borderRadius: '8px', fontSize: '11px', color: '#AA7C11', lineHeight: 1.4, fontWeight: 600 }}>
                            💡 수정 모드에서는 변경하려는 파일만 새로 선택하시면 됩니다. 선택하지 않은 파일은 기존에 등록된 오디오 및 이미지 리소스가 그대로 유지됩니다.
                        </div>
                    )}

                    {/* 파일 선택 1 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#4A5568' }}>
                            {editingReading ? '첫 번째 오디오 파일 변경 (선택)' : '첫 번째 오디오 파일 업로드 (.mp3) *'}
                        </label>
                        <input
                            id="audio-file-input"
                            type="file"
                            accept="audio/*,audio/mpeg,audio/mp3,audio/x-m4a,audio/x-mpeg,.mp3,.m4a,.wav"
                            onChange={handleFileChange}
                            style={{ fontSize: '12px', color: '#4A5568' }}
                            required={!editingReading}
                        />
                        {selectedFile && (
                            <div style={{ fontSize: '11px', color: '#718096', fontWeight: 600, marginTop: '2px' }}>
                                선택된 파일 크기: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                            </div>
                        )}
                        {editingReading && !selectedFile && (
                            <div style={{ fontSize: '11px', color: '#7F8C8D', fontWeight: 600 }}>
                                📁 기존 오디오 파일 등록됨: <a href={editingReading.audio_url} target="_blank" rel="noreferrer" style={{ color: '#3498DB', textDecoration: 'underline' }}>링크 보기</a>
                            </div>
                        )}
                    </div>

                    {/* 파일 선택 2 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#4A5568' }}>
                            {editingReading ? '두 번째 오디오 파일 변경 (선택)' : '두 번째 오디오 파일 업로드 (.mp3) (선택)'}
                        </label>
                        <input
                            id="audio-file-input-2"
                            type="file"
                            accept="audio/*,audio/mpeg,audio/mp3,audio/x-m4a,audio/x-mpeg,.mp3,.m4a,.wav"
                            onChange={handleFile2Change}
                            style={{ fontSize: '12px', color: '#4A5568' }}
                        />
                        {selectedFile2 && (
                            <div style={{ fontSize: '11px', color: '#718096', fontWeight: 600, marginTop: '2px' }}>
                                선택된 파일 크기: {(selectedFile2.size / (1024 * 1024)).toFixed(2)} MB
                            </div>
                        )}
                        {editingReading && editingReading.audio_url_2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                                <div style={{ fontSize: '11px', color: '#7F8C8D', fontWeight: 600 }}>
                                    📁 기존 파트 2 오디오 등록됨: <a href={editingReading.audio_url_2} target="_blank" rel="noreferrer" style={{ color: '#3498DB', textDecoration: 'underline' }}>링크 보기</a>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#E11D48', cursor: 'pointer', fontWeight: 800 }}>
                                    <input
                                        type="checkbox"
                                        checked={clearAudio2}
                                        onChange={(e) => setClearAudio2(e.target.checked)}
                                    />
                                    기존 등록된 파트 2 오디오 파일 완전히 제거하기
                                </label>
                            </div>
                        )}
                    </div>

                    {/* 본문 이미지 선택 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#4A5568' }}>본문 이미지 파일 업로드 (중복 선택 가능 / 선택)</label>
                        <input
                            id="image-file-input"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageChange}
                            style={{ fontSize: '12px', color: '#4A5568' }}
                        />

                        {/* 새로 선택한 이미지 목록 */}
                        {selectedImages.length > 0 && (
                            <div style={{ marginTop: '6px' }}>
                                <div style={{ fontSize: '11px', color: '#1A5D55', fontWeight: 800, marginBottom: '4px' }}>
                                    새로 선택한 이미지 ({selectedImages.length}개)
                                </div>
                                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0' }}>
                                    {selectedImages.map((img, idx) => {
                                        let url = '';
                                        try { url = URL.createObjectURL(img); } catch (e) {}
                                        return (
                                            <div key={idx} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #CBD5E1', flexShrink: 0 }}>
                                                {url && <img
                                                    src={url}
                                                    alt="preview"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />}
                                                <button
                                                    type="button"
                                                    onClick={() => removeSelectedImage(idx)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '2px',
                                                        right: '2px',
                                                        width: '16px',
                                                        height: '16px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(0,0,0,0.6)',
                                                        color: 'white',
                                                        border: 'none',
                                                        fontSize: '10px',
                                                        fontWeight: 'bold',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 기존에 등록된 이미지 목록 (수정 모드일 때) */}
                        {editingReading && existingImages.length > 0 && (
                            <div style={{ marginTop: '6px' }}>
                                <div style={{ fontSize: '11px', color: '#7F8C8D', fontWeight: 800, marginBottom: '4px' }}>
                                    🖼️ 기존 등록된 이미지 ({existingImages.length}개)
                                </div>
                                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0' }}>
                                    {existingImages.map((url, idx) => (
                                        <div key={idx} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #CBD5E1', flexShrink: 0 }}>
                                            <img
                                                src={url}
                                                alt="existing"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeExistingImage(idx)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '2px',
                                                    right: '2px',
                                                    width: '16px',
                                                    height: '16px',
                                                    borderRadius: '50%',
                                                    background: 'rgba(225,29,72,0.9)',
                                                    color: 'white',
                                                    border: 'none',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ fontSize: '10px', color: '#AA7C11', marginTop: '4px', fontWeight: 600 }}>
                                    (삭제 버튼 ✕ 클릭 후 '정보 수정 완료' 버튼을 눌러야 실제 저장/삭제가 반영됩니다)
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 전송 버튼 구역 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                        <button
                            type="submit"
                            disabled={isUploading || !title.trim() || (!editingReading && !selectedFile)}
                            style={{
                                padding: '14px',
                                background: isUploading ? '#A0AEC0' : '#1A5D55',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: 800,
                                cursor: (isUploading || !title.trim() || (!editingReading && !selectedFile)) ? 'default' : 'pointer',
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
                            ) : (editingReading ? '회차 정보 수정 완료하기' : '등록하기')}
                        </button>

                        {editingReading && (
                            <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={isUploading}
                                style={{
                                    padding: '12px',
                                    background: '#F3F4F6',
                                    color: '#4A5568',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    cursor: isUploading ? 'default' : 'pointer',
                                    textAlign: 'center'
                                }}
                            >
                                수정 취소
                            </button>
                        )}
                    </div>
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
                                    alignItems: 'center',
                                    boxShadow: editingReading?.id === reading.id ? '0 0 0 2px #1A5D55' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden', paddingRight: '16px' }}>
                                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#2C3E50', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {reading.title}
                                        {reading.audio_url_2 && <span style={{ fontSize: '10px', background: '#E2F1E8', color: '#1A5D55', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>파트 2</span>}
                                        {reading.image_url && <span style={{ fontSize: '10px', background: '#FFF3CD', color: '#856404', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>이미지</span>}
                                        {(() => {
                                            const isFuture = reading.published_at && new Date(reading.published_at).getTime() > Date.now();
                                            if (isFuture) {
                                                return (
                                                    <span style={{ fontSize: '10px', background: '#DBEAFE', color: '#1E40AF', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                                        ⏰ 예약: {new Date(reading.published_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                                    </span>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#A0AEC0', wordBreak: 'break-all', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '280px' }}>
                                        {reading.description || '설명 없음'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                    <button
                                        onClick={() => startEdit(reading)}
                                        style={{
                                            padding: '6px 12px',
                                            background: '#F0FDF4',
                                            color: '#16A34A',
                                            border: '1px solid #BBF7D0',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        수정
                                    </button>
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
                                            cursor: 'pointer'
                                        }}
                                    >
                                        삭제
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
