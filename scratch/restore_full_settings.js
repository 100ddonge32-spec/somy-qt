const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

const fullSettingsView = `
        if (view === "churchSettings") {
            return (
                <div style={{
                    minHeight: "100vh",
                    background: "#FDFCFB",
                    maxWidth: "600px",
                    margin: "0 auto",
                    ...baseFont,
                    paddingBottom: '80px',
                    position: 'relative',
                    paddingTop: 'env(safe-area-inset-top)'
                }}>
                    <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #F0F0F0", position: 'sticky', top: 'env(safe-area-inset-top)', background: 'white', zIndex: 10 }}>
                        <button onClick={() => setView('admin')} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: '#333', padding: '8px' }}>←</button>
                        <div style={{ fontWeight: 800, color: "#333", fontSize: "15px" }}>⛪ 교회 설정 (상세)</div>
                    </div>

                    <div style={{ padding: "20px" }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            
                            {/* 1. 기본 정보 섹션 */}
                            <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: '#333', borderLeft: '4px solid #D4AF37', paddingLeft: '10px' }}>⛪ 기본 교회 정보</div>
                                
                                {isSuperAdmin && (
                                    <div style={{ background: '#FFF9C4', padding: '12px 16px', borderRadius: '15px', border: '1px solid #FFF176', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#856404' }}>🔗 접속 주소</span>
                                            <span style={{ fontSize: '10px', color: '#B8924A' }}>{typeof window !== 'undefined' ? window.location.origin : ''}{churchId === 'somy-main' ? '' : \`/?church_id=\${churchId}\`}</span>
                                        </div>
                                        <button onClick={() => {
                                            const link = window.location.origin + (churchId === 'somy-main' ? '/' : \`/?church_id=\${churchId}\`);
                                            navigator.clipboard.writeText(link).then(() => alert('주소가 복사되었습니다!'));
                                        }} style={{ padding: '6px 12px', background: '#D4AF37', color: 'white', border: 'none', borderRadius: '8px', fontSize: '10px', fontWeight: 800 }}>복사</button>
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A' }}>교회 이름</label>
                                    <input type="text" value={settingsForm?.church_name || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, church_name: e.target.value }))} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '14px' }} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A' }}>앱 부제목 (슬로건)</label>
                                    <input type="text" value={settingsForm?.app_subtitle || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, app_subtitle: e.target.value }))} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '14px' }} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A' }}>교회 홈페이지 URL (선택)</label>
                                    <input type="text" value={settingsForm?.church_url || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, church_url: e.target.value }))} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '14px' }} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A' }}>⏰ 매일 큐티 알림 발송 시간</label>
                                    <input type="time" value={settingsForm?.qt_notification_time || '08:00'} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, qt_notification_time: e.target.value }))} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '14px' }} />
                                </div>
                            </section>

                            {/* 2. 로고 및 팝업 섹션 */}
                            <section style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '15px', background: '#F9F9F9', borderRadius: '20px' }}>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: '#333' }}>🖼️ 이미지 및 팝업 관리</div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#666' }}>교회 로고 이미지</label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <input type="text" value={settingsForm?.church_logo_url || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, church_logo_url: e.target.value }))} placeholder="URL을 입력하거나 업로드" style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #DDD', fontSize: '13px' }} />
                                        <input type="file" id="logo-upload-full" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                            const file = e.target.files?.[0]; if (!file) return;
                                            setIsLogoUploading(true);
                                            const formData = new FormData(); formData.append('file', file); formData.append('church_id', churchId);
                                            try {
                                                const res = await fetch('/api/admin/upload-logo', { method: 'POST', body: formData });
                                                const data = await res.json();
                                                if (data.url) setSettingsForm({ ...settingsForm, church_logo_url: data.url });
                                            } catch (err) { alert('업로드 실패'); } finally { setIsLogoUploading(false); }
                                        }} />
                                        <button onClick={() => document.getElementById('logo-upload-full')?.click()} style={{ padding: '10px 15px', background: 'white', border: '1px solid #DDD', borderRadius: '10px', fontSize: '12px', fontWeight: 700 }}>{isLogoUploading ? '...' : '파일'}</button>
                                    </div>
                                    {settingsForm?.church_logo_url && <img src={settingsForm.church_logo_url} style={{ width: '50px', height: '50px', objectFit: 'contain', background: 'white', borderRadius: '8px', border: '1px solid #EEE' }} />}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', padding: '12px', background: '#E3F2FD', borderRadius: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#1565C0' }}>🖼️ 행사 포스터 팝업 노출</label>
                                        <input type="checkbox" checked={!!settingsForm?.event_poster_visible} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, event_poster_visible: e.target.checked }))} style={{ width: '18px', height: '18px' }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <input type="text" value={settingsForm?.event_poster_url || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, event_poster_url: e.target.value }))} placeholder="포스터 URL" style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #BBDEFB', fontSize: '13px' }} />
                                        <input type="file" id="poster-upload-full" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                            const file = e.target.files?.[0]; if (!file) return;
                                            setIsPosterUploading(true);
                                            const formData = new FormData(); formData.append('file', file); formData.append('church_id', churchId);
                                            try {
                                                const res = await fetch('/api/admin/upload-logo', { method: 'POST', body: formData });
                                                const data = await res.json();
                                                if (data.url) setSettingsForm({ ...settingsForm, event_poster_url: data.url });
                                            } catch (err) { alert('업로드 실패'); } finally { setIsPosterUploading(false); }
                                        }} />
                                        <button onClick={() => document.getElementById('poster-upload-full')?.click()} style={{ padding: '10px 15px', background: 'white', border: '1px solid #BBDEFB', borderRadius: '10px', fontSize: '12px', fontWeight: 700 }}>{isPosterUploading ? '...' : '파일'}</button>
                                    </div>
                                    {settingsForm?.event_poster_url && <img src={settingsForm.event_poster_url} style={{ width: '100%', maxWidth: '120px', borderRadius: '8px', border: '1px solid #90CAF9' }} />}
                                </div>
                            </section>

                            {/* 3. 유튜브 및 찬양 섹션 */}
                            <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: '#333', borderLeft: '4px solid #FF0000', paddingLeft: '10px' }}>🎥 설교 및 찬양 설정</div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#666' }}>유튜브 채널 ID (자동 업데이트용)</label>
                                    <input type="text" value={settingsForm?.sermon_url || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, sermon_url: e.target.value }))} placeholder="예: UC4UTt4..." style={{ padding: '12px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '14px' }} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#666' }}>수동 설교 영상 주소 (최우선 표시)</label>
                                    <input type="text" value={settingsForm?.manual_sermon_url || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, manual_sermon_url: e.target.value }))} placeholder="https://youtu.be/..." style={{ padding: '12px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '14px' }} />
                                </div>

                                <div style={{ marginTop: '5px', padding: '15px', background: '#F5F5F3', borderRadius: '20px', border: '1px solid #EEE' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#333', marginBottom: '12px' }}>🎵 배경음악(CCM) 플레이리스트</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                        <input type="text" value={newCcmTitle} onChange={(e: any) => setNewCcmTitle(e.target.value)} placeholder="찬양 제목" style={{ padding: '10px', borderRadius: '10px', border: '1px solid #DDD', fontSize: '13px' }} />
                                        <input type="text" value={newCcmArtist} onChange={(e: any) => setNewCcmArtist(e.target.value)} placeholder="가수 (선택)" style={{ padding: '10px', borderRadius: '10px', border: '1px solid #DDD', fontSize: '13px' }} />
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <input type="text" value={newCcmUrl} onChange={(e: any) => setNewCcmUrl(e.target.value)} placeholder="유튜브 주소" style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #DDD', fontSize: '13px' }} />
                                            <button onClick={() => {
                                                if (!newCcmTitle || !newCcmUrl) return alert('제목과 주소를 넣어주세요');
                                                let vid = '';
                                                if (newCcmUrl.includes('v=')) vid = newCcmUrl.split('v=')[1].split('&')[0];
                                                else if (newCcmUrl.includes('youtu.be/')) vid = newCcmUrl.split('youtu.be/')[1].split('?')[0];
                                                else vid = newCcmUrl;
                                                const newList = [...(settingsForm?.custom_ccm_list || []), { title: newCcmTitle, artist: newCcmArtist || '추천 찬양', youtubeId: vid }];
                                                setSettingsForm({ ...settingsForm, custom_ccm_list: newList });
                                                setNewCcmTitle(""); setNewCcmArtist(""); setNewCcmUrl("");
                                            }} style={{ padding: '0 15px', background: '#333', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '12px' }}>추가</button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                                        {settingsForm?.custom_ccm_list?.map((ccm: any, idx: number) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '8px 12px', borderRadius: '10px', border: '1px solid #EEE' }}>
                                                <div style={{ flex: 1, fontSize: '12px' }}><b>{ccm.title}</b> <span style={{ color: '#999' }}>{ccm.artist}</span></div>
                                                <button onClick={() => {
                                                    const newList = settingsForm.custom_ccm_list.filter((_: any, i: number) => i !== idx);
                                                    setSettingsForm({ ...settingsForm, custom_ccm_list: newList });
                                                }} style={{ background: 'none', border: 'none', color: '#FF5252', fontSize: '16px', padding: '0 5px' }}>×</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* 4. 칼럼 및 말씀 섹션 */}
                            <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: '#333', borderLeft: '4px solid #4CAF50', paddingLeft: '10px' }}>✍️ 콘텐츠 관리 (칼럼/암송)</div>
                                
                                <div style={{ padding: '15px', background: '#FDF8F0', borderRadius: '20px', border: '1px solid #FAF0D7' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 800 }}>✍️ 담임목사 칼럼 관리</div>
                                        <button disabled={isGeneratingColumn} onClick={(e) => { e.preventDefault(); handleGenerateColumn(); }} style={{ padding: '6px 12px', background: '#333', color: 'white', border: 'none', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>{isGeneratingColumn ? '생성 중...' : '✨ AI 자동 생성'}</button>
                                    </div>
                                    <input type="text" value={settingsForm?.pastor_column_title || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, pastor_column_title: e.target.value }))} placeholder="칼럼 제목" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #DDD', fontSize: '13px', marginBottom: '8px' }} />
                                    <textarea value={settingsForm?.pastor_column_content || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, pastor_column_content: e.target.value }))} placeholder="칼럼 내용" style={{ width: '100%', minHeight: '120px', padding: '12px', borderRadius: '12px', border: '1px solid #DDD', fontSize: '13px', lineHeight: 1.6 }} />
                                </div>

                                <div style={{ padding: '15px', background: '#F1F8E9', borderRadius: '20px', border: '1px solid #DCEDC8' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '12px' }}>📖 암송 구절 커스텀</div>
                                    <input type="text" value={settingsForm?.today_verse_text || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, today_verse_text: e.target.value }))} placeholder="암송 말씀 내용" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #DDD', fontSize: '13px', marginBottom: '8px' }} />
                                    <input type="text" value={settingsForm?.today_verse_ref || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, today_verse_ref: e.target.value }))} placeholder="말씀 출처 (예: 시편 23:1)" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #DDD', fontSize: '13px' }} />
                                </div>
                            </section>

                            {/* 5. 추천 도서 섹션 */}
                            <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: '#333', borderLeft: '4px solid #673AB7', paddingLeft: '10px' }}>📚 이달의 추천 도서</div>
                                <div style={{ padding: '15px', background: '#F3E5F5', borderRadius: '20px', border: '1px solid #E1BEE7' }}>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                        <input type="text" value={settingsForm?.today_book_title || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, today_book_title: e.target.value }))} placeholder="책 제목" style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #DDD', fontSize: '13px' }} />
                                        <button disabled={isBookAiLoading} onClick={async () => {
                                            if (!settingsForm?.today_book_title) return alert('제목 입력 필요');
                                            setIsBookAiLoading(true);
                                            try {
                                                const res = await fetch('/api/book-generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: settingsForm.today_book_title }) });
                                                const data = await res.json();
                                                if (data.description) setSettingsForm({ ...settingsForm, today_book_description: data.description });
                                            } catch (e) { alert('AI 실패'); } finally { setIsBookAiLoading(false); }
                                        }} style={{ padding: '0 12px', background: '#333', color: 'white', border: 'none', borderRadius: '10px', fontSize: '11px' }}>{isBookAiLoading ? '...' : 'AI 생성'}</button>
                                    </div>
                                    <textarea value={settingsForm?.today_book_description || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, today_book_description: e.target.value }))} placeholder="추천 이유" style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '12px', border: '1px solid #DDD', fontSize: '13px', marginBottom: '10px' }} />
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <input type="file" id="book-upload-full" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                            const file = e.target.files?.[0]; if (!file) return;
                                            setIsBookUploading(true);
                                            const formData = new FormData(); formData.append('file', file); formData.append('church_id', churchId);
                                            try {
                                                const res = await fetch('/api/admin/upload-logo', { method: 'POST', body: formData });
                                                const data = await res.json();
                                                if (data.url) setSettingsForm({ ...settingsForm, today_book_image_url: data.url });
                                            } catch (err) { alert('업로드 실패'); } finally { setIsBookUploading(false); }
                                        }} />
                                        <button onClick={() => document.getElementById('book-upload-full')?.click()} style={{ flex: 1, padding: '10px', background: 'white', border: '1px solid #DDD', borderRadius: '10px', fontSize: '12px' }}>{isBookUploading ? '...' : '📁 책 표지 업로드'}</button>
                                        {settingsForm?.today_book_image_url && <img src={settingsForm.today_book_image_url} style={{ width: '40px', height: '55px', objectFit: 'cover', borderRadius: '4px' }} />}
                                    </div>
                                </div>
                            </section>

                        </div>

                        {/* 하단 저장 버튼 (고정) */}
                        <div style={{ position: 'sticky', bottom: '20px', left: 0, right: 0, marginTop: '40px' }}>
                            <button
                                onClick={async () => {
                                    setIsSettingsSaving(true);
                                    try {
                                        const res = await fetch('/api/settings', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ ...settingsForm, requester_id: user?.id, requester_email: user?.email })
                                        });
                                        if (res.ok) {
                                            alert('모든 설정이 안전하게 저장되었습니다! ✅');
                                            setChurchSettings(settingsForm);
                                        }
                                    } catch (e) { alert('저장 중 오류 발생'); }
                                    setIsSettingsSaving(false);
                                }}
                                disabled={isSettingsSaving}
                                style={{ width: '100%', padding: '18px', background: '#333', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 800, fontSize: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', cursor: 'pointer' }}
                            >
                                {isSettingsSaving ? '💾 저장하는 중...' : '✅ 설정 완료 및 저장하기'}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
`;

// Find where churchSettings view starts and ends to replace it
const startTag = '        if (view === "churchSettings") {';
const endTag = '            );\\n        }'; // Need to be careful with escaping

// Actually, I'll just find the block by regex
const regex = /        if \(view === "churchSettings"\) \{[\s\S]+?            \);\s+?}/;
if (code.match(regex)) {
    code = code.replace(regex, fullSettingsView);
    fs.writeFileSync('src/app/page.tsx', code);
    console.log('Church settings fully restored and enhanced!');
} else {
    console.log('Could not find existing churchSettings view to replace.');
}
