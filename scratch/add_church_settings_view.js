const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

const churchSettingsView = `
        if (view === "churchSettings") {
            return (
                <div style={{
                    minHeight: "100vh",
                    background: "#FDFCFB",
                    maxWidth: "600px",
                    margin: "0 auto",
                    ...baseFont,
                    paddingBottom: '40px',
                    position: 'relative',
                    paddingTop: 'env(safe-area-inset-top)'
                }}>
                    <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #F0F0F0", position: 'sticky', top: 'env(safe-area-inset-top)', background: 'white', zIndex: 10 }}>
                        <button onClick={() => setView('admin')} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: '#333', padding: '8px' }}>←</button>
                        <div style={{ fontWeight: 800, color: "#333", fontSize: "15px" }}>⛪ 교회 설정</div>
                    </div>
                    <div style={{ padding: "20px" }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {isSuperAdmin && (
                                <div style={{
                                    background: '#FFF9C4',
                                    padding: '12px 16px',
                                    borderRadius: '15px',
                                    border: '1px solid #FFF176',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '5px'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#856404' }}>🔗 교회 접속 주소</span>
                                        <span style={{ fontSize: '10px', color: '#B8924A' }}>{typeof window !== 'undefined' ? window.location.origin : ''}{churchId === 'somy-main' ? '' : \`/?church_id=\${churchId}\`}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const link = window.location.origin + (churchId === 'somy-main' ? '/' : \`/?church_id=\${churchId}\`);
                                            navigator.clipboard.writeText(link).then(() => alert('교회 접속 주소가 복사되었습니다! 🔗'));
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            background: '#D4AF37',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}
                                    >
                                        주소 복사
                                    </button>
                                </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A' }}>교회 이름</label>
                                <input type="text" value={settingsForm?.church_name || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, church_name: e.target.value }))} placeholder="앱 메인에 표시될 교회 이름 (예: 샘플교회)" style={{ padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A' }}>앱 부제목 (슬로건)</label>
                                <input type="text" value={settingsForm?.app_subtitle || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, app_subtitle: e.target.value }))} placeholder="예: 말씀과 기도로 거룩해지는 공동체" style={{ padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A' }}>교회 로고 이미지 URL (정사각형 권장)</label>
                                <input type="text" value={settingsForm?.church_logo_url || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, church_logo_url: e.target.value }))} placeholder="https://..." style={{ padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A' }}>이벤트 팝업 포스터 URL</label>
                                <input type="text" value={settingsForm?.event_poster_url || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, event_poster_url: e.target.value }))} placeholder="공지사항이나 이벤트 포스터 이미지 URL" style={{ padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <input type="checkbox" id="poster_visible" checked={!!settingsForm?.event_poster_visible} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, event_poster_visible: e.target.checked }))} />
                                    <label htmlFor="poster_visible" style={{ fontSize: '12px', color: '#666', cursor: 'pointer' }}>유저들에게 이 팝업을 노출합니다.</label>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#9E7B31' }}>⏰ 매일 큐티 알림 발송 시간</label>
                                <input type="time" value={settingsForm?.qt_notification_time || ''} onChange={(e: any) => setSettingsForm((prev: any) => ({ ...prev, qt_notification_time: e.target.value }))} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                            </div>
                        </div>

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
                                        alert('설정이 저장되었습니다. ✅');
                                        setChurchSettings(settingsForm);
                                    }
                                } catch (e) { }
                                setIsSettingsSaving(false);
                            }}
                            disabled={isSettingsSaving}
                            style={{ width: '100%', marginTop: '20px', padding: '16px', background: '#333', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        >
                            {isSettingsSaving ? '저장 중...' : '💾 설정 저장하기'}
                        </button>
                    </div>
                </div>
            );
        }
`;

// Insert it right before `if (view === "memberManage") {`
code = code.replace(
    '        if (view === "memberManage") {',
    churchSettingsView + '\n        if (view === "memberManage") {'
);

fs.writeFileSync('src/app/page.tsx', code);
console.log('churchSettings view added!');
