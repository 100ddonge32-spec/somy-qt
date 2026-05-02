const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

const newAdminGrid = `
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', width: '100%' }}>
                            {/* 1. 교회 설정 */}
                            <button onClick={() => { setSettingsForm({ ...churchSettings }); setView('churchSettings'); }} style={{ padding: '20px 12px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                <div style={{ width: '48px', height: '48px', background: '#FFF9C4', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>⛪</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#333', marginBottom: '2px' }}>교회 설정</div>
                                    <div style={{ fontSize: '10px', color: '#999' }}>로고/이름/찬양 관리</div>
                                </div>
                            </button>

                            {/* 2. 성도 관리 */}
                            <button onClick={async () => {
                                setView('memberManage');
                                try {
                                    const r = await fetch(\`/api/admin?action=list_members&church_id=\${churchId}\`);
                                    const data = await r.json();
                                    if (Array.isArray(data)) setMemberList(data);
                                } catch (e) { }
                            }} style={{ padding: '20px 12px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                <div style={{ width: '48px', height: '48px', background: '#E3F2FD', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👥</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#333', marginBottom: '2px' }}>성도 관리</div>
                                    <div style={{ fontSize: '10px', color: '#999' }}>명단/승인/엑셀</div>
                                </div>
                            </button>

                            {/* 3. 말씀 관리 */}
                            <button onClick={async () => {
                                const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
                                setQtForm({
                                    date: today, reference: '', passage: '', interpretation: '',
                                    question1: '', question2: '', question3: '', prayer: '',
                                    youthInterpretation: '', youthQuestion1: '', youthQuestion2: '', youthQuestion3: ''
                                });
                                setAiLoading(true);
                                try {
                                    const res = await fetch(\`/api/qt?date=\${today}&church_id=\${churchId}\`, { cache: 'no-store' });
                                    const { qt } = await res.json();
                                    if (qt) {
                                        const { fullPassage, interpretation, youthData } = parsePassage(qt.passage);
                                        setQtForm({
                                            date: qt.date, reference: qt.reference, passage: fullPassage, interpretation: interpretation,
                                            question1: qt.question1 || '', question2: qt.question2 || '', question3: qt.question3 || '', prayer: qt.prayer || '',
                                            youthInterpretation: youthData?.interpretation || '', youthQuestion1: youthData?.questions?.[0] || '', youthQuestion2: youthData?.questions?.[1] || '', youthQuestion3: youthData?.questions?.[2] || '',
                                        });
                                    }
                                } catch (e) {} finally { setAiLoading(false); setView('qtManage'); }
                            }} style={{ padding: '20px 12px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                <div style={{ width: '48px', height: '48px', background: '#E1F5FE', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📖</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#333', marginBottom: '2px' }}>말씀 관리</div>
                                    <div style={{ fontSize: '10px', color: '#999' }}>큐티 등록 및 수정</div>
                                </div>
                            </button>

                            {/* 4. 설교 요약 */}
                            <button onClick={() => {
                                setSermonManageForm({
                                    script: '', summary: churchSettings.sermon_summary || '',
                                    q1: churchSettings.sermon_q1 || '', q2: churchSettings.sermon_q2 || '', q3: churchSettings.sermon_q3 || '',
                                    videoUrl: churchSettings.manual_sermon_url || '', inputType: churchSettings.manual_sermon_url ? 'video' : 'text'
                                });
                                setView('sermonManage');
                            }} style={{ padding: '20px 12px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                <div style={{ width: '48px', height: '48px', background: '#FCE4EC', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎙️</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#333', marginBottom: '2px' }}>설교 요약</div>
                                    <div style={{ fontSize: '10px', color: '#999' }}>AI 설교 분석/요약</div>
                                </div>
                            </button>

                            {/* 5. 활동 통계 */}
                            <button onClick={async () => {
                                setView('statsManage');
                                setIsAdminsLoading(true);
                                try {
                                    setStatsError(null);
                                    const res = await fetch(\`/api/stats?church_id=\${churchId || 'jesus-in'}&t=\${Date.now()}\`);
                                    const data = await res.json();
                                    if (data) setStats(data);
                                } catch (e) { setStatsError("통계 로딩 실패"); }
                                finally { setIsAdminsLoading(false); }
                            }} style={{ padding: '20px 12px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                <div style={{ width: '48px', height: '48px', background: '#FFF3E0', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📊</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#333', marginBottom: '2px' }}>활동 통계</div>
                                    <div style={{ fontSize: '10px', color: '#999' }}>출석 및 완주 랭킹</div>
                                </div>
                            </button>

                            {/* 6. 목회 인사이트 */}
                            <button onClick={async () => {
                                setView('pastoralInsightsManage');
                                setIsPastoralLoading(true);
                                setPastoralInsights(null);
                                try {
                                    const res = await fetch(\`/api/admin/pastoral-insights?church_id=\${churchId}&user_id=\${user?.id}\`);
                                    const data = await res.json();
                                    if (data.insights) setPastoralInsights(data.insights);
                                    else setPastoralInsights("활동 데이터가 부족합니다.");
                                } catch (e) { setPastoralInsights("오류 발생"); }
                                finally { setIsPastoralLoading(false); }
                            }} style={{ padding: '20px 12px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                <div style={{ width: '48px', height: '48px', background: '#E8F5E9', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💡</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#333', marginBottom: '2px' }}>목회 인사이트</div>
                                    <div style={{ fontSize: '10px', color: '#999' }}>AI 성도 영성 분석</div>
                                </div>
                            </button>

                            {/* 7. 갤러리 관리 */}
                            <button onClick={async () => {
                                setView('galleryManage');
                                fetchGalleryPosts();
                            }} style={{ padding: '20px 12px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                <div style={{ width: '48px', height: '48px', background: '#F3E5F5', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📸</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#333', marginBottom: '2px' }}>갤러리 관리</div>
                                    <div style={{ fontSize: '10px', color: '#999' }}>사진 게시물 삭제/관리</div>
                                </div>
                            </button>

                            {/* 8. 권한 관리 */}
                            <button onClick={async () => {
                                setView('adminManage');
                                fetchAllAdmins();
                            }} style={{ padding: '20px 12px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                <div style={{ width: '48px', height: '48px', background: '#E0F2F1', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🔐</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#333', marginBottom: '2px' }}>권한 관리</div>
                                    <div style={{ fontSize: '10px', color: '#999' }}>부관리자 지정/해제</div>
                                </div>
                            </button>

                            {/* 9. 데이터 초기화 */}
                            <button onClick={() => setView('dataReset')} style={{ padding: '20px 12px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                <div style={{ width: '48px', height: '48px', background: '#FFEBEE', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🗑️</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#333', marginBottom: '2px' }}>데이터 초기화</div>
                                    <div style={{ fontSize: '10px', color: '#999' }}>게시판/통계 리셋</div>
                                </div>
                            </button>

                            {/* 10. 마스터 (슈퍼관리자) */}
                            {isSuperAdmin && (
                                <button onClick={() => { fetchAllAdmins(); fetchChurchStats(); setView('masterManage'); }} style={{ padding: '20px 12px', background: '#FFFDE7', border: '1px solid #FFF176', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,235,59,0.1)' }}>
                                    <div style={{ width: '48px', height: '48px', background: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👑</div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#856404', marginBottom: '2px' }}>마스터</div>
                                        <div style={{ fontSize: '10px', color: '#B8924A' }}>전체 시스템 관리</div>
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* 알림 발송 & 가이드 (하단 액션바) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
                             <button onClick={async () => {
                                if (confirm('모든 성도님들께 오늘의 큐티 알림을 전송하시겠습니까?')) {
                                    try {
                                        const res = await fetch(\`/api/push-send-daily?secret=somy-push-secret-123&church_id=\${churchId}\`);
                                        const data = await res.json();
                                        if (data.success) alert(\`📢 알림 발송 완료! (성공: \${data.sentCount}명)\`);
                                        else alert('⚠️ 발송 실패: ' + (data.error || '알 수 없는 오류'));
                                    } catch (e) { alert('연결 실패'); }
                                }
                            }} style={{ padding: '14px', background: '#333', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>🔔 전체 알림 발송</button>
                            
                            <button onClick={() => setView('adminGuide')} style={{ padding: '14px', background: '#F5F5F5', color: '#666', border: '1px solid #EEE', borderRadius: '15px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>📘 사용 가이드</button>
                        </div>
`;

const startTag = '<div style={{ display: \\'grid\\', gridTemplateColumns: \\'repeat(3, 1fr)\\', gap: \\'12px\\', width: \\'100%\\' }}>';
const endTag = '</div>'; // This might be tricky if there are nested divs

// Let's use a more specific search
const regex = /<div style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(3, 1fr\)', gap: '12px', width: '100%' \}\}>[\\s\\S]+?<\/div>/;

// Actually, I'll just replace the whole content from line 6312 to 6494
const lines = code.split('\\n');
const startLine = 6312 - 1;
const endLine = 6494;
lines.splice(startLine, endLine - startLine, newAdminGrid);
code = lines.join('\\n');

fs.writeFileSync('src/app/page.tsx', code);
