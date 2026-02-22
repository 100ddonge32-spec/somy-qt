"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type View = "home" | "chat" | "qt" | "community" | "qtManage" | "stats";

const SOMY_IMG = "/somy.png";
const CHURCH_LOGO = process.env.NEXT_PUBLIC_CHURCH_LOGO_URL || "https://cdn.imweb.me/thumbnail/20210813/569458bf12dd0.png";
const CHURCH_URL = process.env.NEXT_PUBLIC_CHURCH_URL || "https://jesus-in.imweb.me/index";
const CHURCH_NAME = process.env.NEXT_PUBLIC_CHURCH_NAME || "예수인교회";
const APP_SUBTITLE = process.env.NEXT_PUBLIC_APP_SUBTITLE || "큐티 동반자";
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "pastorbaek@kakao.com,kakao_4761026797@kakao.somy-qt.local").toLowerCase().split(',').map(e => e.trim());


const QT_DATA = {
    date: new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }),
    verse: "여호와는 나의 목자시니 내게 부족함이 없으리로다",
    reference: "시편 23:1",
    fullPassage: `여호와는 나의 목자시니 내게 부족함이 없으리로다
그가 나를 푸른 풀밭에 누이시며
쉴 만한 물 가으로 인도하시는도다
내 영혼을 소생시키시고
자기 이름을 위하여 의의 길로 인도하시는도다`,
    questions: [
        "오늘 하나님께서 나의 어떤 필요를 채워주셨나요?",
        "내 삶에서 '부족함이 없다'고 느껴지는 영역은 어디인가요?",
        "하나님이 나를 인도하시는 길에서 내가 저항하는 부분은 없나요?",
    ],
    prayer: "선하신 목자 되신 주님, 오늘도 저를 인도해 주심에 감사드립니다. 제 삶의 모든 필요를 아시는 주님께 온전히 의지하게 하소서. 아멘.",
};

interface Comment {
    id: any;
    user_id: string;
    user_name: string;
    content: string;
    created_at: string;
}

interface Post {
    id: any;
    user_id: string;
    user_name: string;
    avatar_url: string | null;
    content: string;
    created_at: string;
    comments: Comment[];
}

export default function App() {
    const [view, setView] = useState<View>("home");
    const [messages, setMessages] = useState([
        { role: "assistant", content: "안녕하세요! 저는 예수인교회의 큐티 동반자 소미예요 😊\n오늘 어떤 말씀을 함께 나눠볼까요?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [answers, setAnswers] = useState<string[]>(new Array(QT_DATA.questions.length).fill(""));
    const [graceInput, setGraceInput] = useState("");
    const [qtStep, setQtStep] = useState<"read" | "reflect" | "grace" | "pray" | "done">("read");
    const [communityPosts, setCommunityPosts] = useState<Post[]>([]);
    const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({});
    const [passageInput, setPassageInput] = useState("");
    const [passageChat, setPassageChat] = useState<{ role: string; content: string }[]>([]);
    const [isPassageLoading, setIsPassageLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [adminInfo, setAdminInfo] = useState<any>(null);
    const [isApproved, setIsApproved] = useState(false);
    const [churchId, setChurchId] = useState('jesus-in');
    const isAdmin = !!adminInfo && (adminInfo.role === 'super_admin' || adminInfo.role === 'church_admin');
    const isSuperAdmin = adminInfo?.role === 'super_admin';
    const [editingPostId, setEditingPostId] = useState<any>(null);
    const [editContent, setEditContent] = useState("");

    useEffect(() => {
        if (user) {
            // DB 기반 관리자 권한 체크
            fetch(`/api/admin?action=check_admin&email=${user.email}`)
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                    if (data) {
                        setAdminInfo(data);
                        console.log("관리자 정보:", data);
                    }
                })
                .catch(err => console.log("관리자 체크 실패 (조용히 넘어감):", err));

            // 성도 승인 및 교회 정보 체크
            supabase.from('profiles').select('is_approved, church_id').eq('id', user.id).single()
                .then(({ data, error }) => {
                    if (error) {
                        console.log("프로필 정보 조회 실패:", error.message);
                        return;
                    }
                    if (data) {
                        setIsApproved(data.is_approved);
                        if (data.church_id) setChurchId(data.church_id);
                    }
                });
        } else {
            setAdminInfo(null);
            setIsApproved(false);
        }
    }, [user]);
    const [qtData, setQtData] = useState({
        date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
        reference: QT_DATA.reference,
        fullPassage: QT_DATA.fullPassage,
        verse: QT_DATA.verse,
        questions: QT_DATA.questions,
        prayer: QT_DATA.prayer,
    });
    const [qtForm, setQtForm] = useState({ date: '', reference: '', passage: '', question1: '', question2: '', question3: '', prayer: '' });
    const [aiLoading, setAiLoading] = useState(false);
    const [stats, setStats] = useState<{ today: { count: number; members: { user_name: string; avatar_url: string | null }[] }; ranking: { name: string; avatar: string | null; count: number }[]; totalCompletions: number } | null>(null);
    const [statsError, setStatsError] = useState<string | null>(null);
    const [churchSettings, setChurchSettings] = useState({
        church_name: CHURCH_NAME,
        church_logo_url: CHURCH_LOGO,
        church_url: CHURCH_URL,
        app_subtitle: APP_SUBTITLE,
        plan: 'free', // 기본값 free
    });
    const [showSettings, setShowSettings] = useState(false);
    const [settingsForm, setSettingsForm] = useState({
        church_name: CHURCH_NAME,
        church_logo_url: CHURCH_LOGO,
        church_url: CHURCH_URL,
        app_subtitle: APP_SUBTITLE,
        plan: 'free',
    });
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [adminTab, setAdminTab] = useState<"settings" | "members" | "master">("settings");
    const [memberList, setMemberList] = useState<any[]>([]);
    const [isManagingMembers, setIsManagingMembers] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        const hasVisited = localStorage.getItem('somy_visited');
        if (!hasVisited) {
            setShowWelcome(true);
        }
    }, []);
    const scrollRef = useRef<HTMLDivElement>(null);
    const passageRef = useRef<HTMLDivElement>(null);

    const [isQtLoading, setIsQtLoading] = useState(false);

    const fetchQt = async () => {
        setIsQtLoading(true);
        try {
            const r = await fetch('/api/qt', { cache: 'no-store' });
            const { qt } = await r.json();
            if (qt) {
                setQtData({
                    date: new Date(qt.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
                    reference: qt.reference,
                    fullPassage: qt.passage,
                    verse: qt.passage.split('\n')[0],
                    questions: [qt.question1, qt.question2, qt.question3].filter(Boolean),
                    prayer: qt.prayer,
                });
                setAnswers(new Array([qt.question1, qt.question2, qt.question3].filter(Boolean).length).fill(''));
            }
        } catch (e) {
            console.error("큐티 로딩 실패:", e);
        } finally {
            setIsQtLoading(false);
        }
    };

    useEffect(() => {
        const checkUser = async () => {
            const hash = window.location.hash;
            if (hash && hash.includes('access_token=')) {
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');
                if (accessToken && refreshToken) {
                    const { data } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    if (data?.session?.user) {
                        setUser(data.session.user);
                        window.history.replaceState(null, '', window.location.pathname);
                        return;
                    }
                }
            }
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
        };
        checkUser();

        // 교회 설정 로드
        fetch('/api/settings', { cache: 'no-store' })
            .then(r => r.json())
            .then(({ settings }) => {
                if (settings) {
                    setChurchSettings(settings);
                    setSettingsForm(settings);
                }
            })
            .catch(() => { });

        // 오늘의 큐티 로드
        fetchQt();

        // 인증 상태 변화 감지 (supabase logic)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async (provider: 'google' | 'kakao') => {
        if (provider === 'kakao') {
            // Supabase 내장 카카오 OAuth는 account_email을 강제 요청하므로
            // 카카오 직접 연동으로 우회 (이메일 권한 불필요)
            const kakaoAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize');
            kakaoAuthUrl.searchParams.set('client_id', 'c205e6ad80a115b72fc7b53749e204d9');
            kakaoAuthUrl.searchParams.set('redirect_uri', `${window.location.origin}/api/kakao-callback`);
            kakaoAuthUrl.searchParams.set('response_type', 'code');
            kakaoAuthUrl.searchParams.set('scope', 'profile_nickname,profile_image');
            window.location.href = kakaoAuthUrl.toString();
            return;
        }
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: { redirectTo: window.location.origin }
            });
            if (error) throw error;
        } catch (err: any) {
            alert("로그인 중 오류가 발생했어요: " + err.message);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setView("home");
    };

    const handleSaveSettings = async () => {
        setSettingsSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsForm),
            });
            const data = await res.json();
            if (data.success) {
                setChurchSettings({ ...settingsForm });
                setShowSettings(false);
                alert('설정이 저장되었습니다! ✅');
                // 요금제가 바뀌었을 수 있으므로 큐티 다시 불러오기
                fetchQt();
            } else {
                alert('저장 실패: ' + data.error);
            }
        } catch {
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setSettingsSaving(false);
        }
    };

    const handleAnswerChange = (index: number, value: string) => {
        const newAnswers = [...answers];
        newAnswers[index] = value;
        setAnswers(newAnswers);
    };

    const handlePassageAsk = async () => {
        if (!passageInput.trim() || isPassageLoading) return;
        const userMsg = { role: "user", content: passageInput };
        setPassageChat(prev => [...prev, userMsg]);
        setPassageInput("");
        setIsPassageLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: `당신은 성경 말씀을 알기 쉽게 설명해주는 큐티 조력자 소미입니다. 다음 성경 본문에 대해 질문하는 사용자에게 친절하고 영성 있게 답해주세요.\n본문: ${QT_DATA.fullPassage}` },
                        ...passageChat,
                        userMsg
                    ]
                }),
            });
            const data = await response.json();
            setPassageChat(prev => [...prev, { role: "assistant", content: data.content || data.error }]);
        } catch {
            setPassageChat(prev => [...prev, { role: "assistant", content: "말씀을 묵상하던 중 잠시 문제가 생겼어요 🙏" }]);
        } finally {
            setIsPassageLoading(false);
            if (passageRef.current) {
                setTimeout(() => {
                    passageRef.current?.scrollTo({ top: passageRef.current.scrollHeight, behavior: 'smooth' });
                }, 100);
            }
        }
    };

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const userMessage = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: [...messages, userMessage] }),
            });
            const data = await response.json();
            setMessages((prev) => [...prev, { role: "assistant", content: data.content || data.error }]);
        } catch {
            setMessages((prev) => [...prev, { role: "assistant", content: "잠시 연결이 불안정해요 🙏" }]);
        } finally {
            setIsLoading(false);
        }
    };

    const baseFont = { fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" };

    /* ══════════════════════════════
       STYLES
    ══════════════════════════════ */
    const styles = (
        <style>{`
      @keyframes float { 0%,100%{ transform:translateY(0) rotateY(0deg); } 50%{ transform:translateY(-15px) rotateY(5deg); } }
      @keyframes halo-pulse { 0%,100%{ opacity:.7; transform:translateX(-50%) scaleX(1); } 50%{ opacity:1; transform:translateX(-50%) scaleX(1.1); } }
      @keyframes shadow-pulse { 0%,100%{ transform:translateX(-50%) scaleX(1); opacity:.2; } 50%{ transform:translateX(-50%) scaleX(.7); opacity:.1; } }
      @keyframes fade-in { from{ opacity:0; transform:translateY(20px); } to{ opacity:1; transform:translateY(0); } }
      @keyframes slide-right { from{ opacity:0; transform:translateX(20px); } to{ opacity:1; transform:translateX(0); } }
      @keyframes bounce-dot { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-7px); } }
    `}</style>
    );

    const renderContent = () => {
        if (view === "home") {
            return (
                <div style={{
                    minHeight: "100vh",
                    background: "linear-gradient(180deg, #FFF8F0 0%, #FEF0D8 50%, #F5E0BB 100%)",
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "space-between", padding: "40px 24px 60px 24px",
                    maxWidth: "480px", margin: "0 auto", ...baseFont,
                }}>
                    {styles}

                    {/* 환영 모달 */}
                    {showWelcome && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px' }}>
                            <div style={{ background: 'white', borderRadius: '30px', padding: '40px 30px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', textAlign: 'center', animation: 'fade-in 1s ease-out' }}>
                                <div style={{ fontSize: '50px', marginBottom: '25px' }}>🌿</div>
                                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#333', marginBottom: '15px', lineHeight: 1.4 }}>환영합니다</h2>
                                <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.8, marginBottom: '30px', wordBreak: 'keep-all' }}>
                                    성도 여러분을 쉴만한 물가로 인도할 묵상 챗봇으로 오신 것을 환영합니다.<br /><br />
                                    이제 바쁜 삶 속에서도 말씀을 손에서 놓지 않는 성도님들이 되시길 바랍니다.
                                </p>
                                <button
                                    onClick={() => {
                                        setShowWelcome(false);
                                        localStorage.setItem('somy_visited', 'true');
                                    }}
                                    style={{ width: '100%', padding: '16px', background: '#333', color: 'white', border: 'none', borderRadius: '18px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}>
                                    들어가기
                                </button>
                                <div style={{ marginTop: '15px', fontSize: '12px', color: '#999' }}>소미와 함께 따뜻한 성경 이야기를 시작해볼까요?</div>
                            </div>
                        </div>
                    )}

                    {/* 배경 음악 오디오 플레이어 (숨김) - 여기서 제거하고 하단 공통 영역으로 이동 */}

                    {/* Church Logo Header */}
                    <a href={churchSettings.church_url} target="_blank" rel="noopener noreferrer" style={{
                        textDecoration: "none",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "20px",
                        animation: "fade-in 0.8s ease-out"
                    }}>
                        <img src={churchSettings.church_logo_url} alt={`${churchSettings.church_name} 로고`} style={{ height: "45px", objectFit: "contain" }} />
                        <div style={{ fontSize: "12px", color: "#666", letterSpacing: "1px", fontWeight: 500 }}>{(churchSettings.church_name || "").toUpperCase()}</div>
                    </a>

                    {/* 설정 모달 */}
                    {showSettings && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                            <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>⚙️ {adminTab === 'settings' ? '교회 설정' : adminTab === 'members' ? '성도 관리' : '슈퍼 관리'}</h2>
                                    <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
                                </div>

                                {/* 설정 탭 메뉴 */}
                                <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', background: '#F5F5F5', padding: '4px', borderRadius: '10px' }}>
                                    <button onClick={() => setAdminTab('settings')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: adminTab === 'settings' ? 'white' : 'transparent', boxShadow: adminTab === 'settings' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}>🎨 설정</button>
                                    <button onClick={async () => {
                                        setAdminTab('members');
                                        setIsManagingMembers(true);
                                        try {
                                            const r = await fetch('/api/admin?action=list_members');
                                            const data = await r.json();
                                            if (Array.isArray(data)) setMemberList(data);
                                        } finally { setIsManagingMembers(false); }
                                    }} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: adminTab === 'members' ? 'white' : 'transparent', boxShadow: adminTab === 'members' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}>👥 성도</button>
                                    {isSuperAdmin && (
                                        <button onClick={() => setAdminTab('master')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: adminTab === 'master' ? 'white' : 'transparent', boxShadow: adminTab === 'master' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}>👑 마스터</button>
                                    )}
                                </div>

                                {adminTab === 'settings' ? (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                            {[
                                                ['church_name', '교회 이름', '예: 예수인교회'],
                                                ['app_subtitle', '앱 부제목', '예: 큐티 동반자'],
                                                ['church_logo_url', '교회 로고 URL', 'https://...'],
                                                ['church_url', '교회 홈페이지 URL', 'https://...']
                                            ].map(([key, label, placeholder]) => (
                                                <div key={key}>
                                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '6px' }}>{label}</label>
                                                    <input
                                                        type="text"
                                                        value={settingsForm[key as keyof typeof settingsForm]}
                                                        onChange={e => setSettingsForm(prev => ({ ...prev, [key]: e.target.value }))}
                                                        placeholder={placeholder}
                                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
                                                    />
                                                </div>
                                            ))}
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '6px' }}>💎 요금제 설정</label>
                                                <select
                                                    value={settingsForm.plan}
                                                    onChange={e => setSettingsForm(prev => ({ ...prev, plan: e.target.value }))}
                                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '13px', outline: 'none', background: 'white' }}
                                                >
                                                    <option value="free">무료 버전 (수동 관리)</option>
                                                    <option value="premium">유료 버전 (AI 자동 생성)</option>
                                                </select>
                                                <p style={{ fontSize: '11px', color: '#999', marginTop: '6px', lineHeight: 1.4 }}>
                                                    * 유료 버전은 말씀이 준비되지 않았을 때 AI가 자동으로 성경 읽기표에 맞춰 말씀을 생성합니다.
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                            <button onClick={() => setShowSettings(false)} style={{ flex: 1, padding: '12px', background: '#F5F5F5', color: '#666', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>취소</button>
                                            <button onClick={handleSaveSettings} disabled={settingsSaving} style={{ flex: 2, padding: '12px', background: '#D4AF37', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', opacity: settingsSaving ? 0.7 : 1 }}>
                                                {settingsSaving ? '저장 중...' : '💾 저장하기'}
                                            </button>
                                        </div>
                                    </>
                                ) : adminTab === 'members' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
                                        {isManagingMembers ? <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>로딩 중...</div> :
                                            memberList.length === 0 ? <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '13px' }}>등록된 성도가 없습니다.</div> :
                                                memberList.map(member => (
                                                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#F9F9F9', borderRadius: '14px', border: '1px solid #F0F0F0' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EEE', overflow: 'hidden' }}>
                                                                <img src={member.avatar_url || 'https://via.placeholder.com/32'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#333' }}>{member.full_name || '이름 없음'}</div>
                                                                <div style={{ fontSize: '10px', color: '#999' }}>{member.email}</div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                const newStatus = !member.is_approved;
                                                                const res = await fetch('/api/admin', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ action: 'approve_user', user_id: member.id, is_approved: newStatus })
                                                                });
                                                                if (res.ok) {
                                                                    setMemberList(memberList.map(m => m.id === member.id ? { ...m, is_approved: newStatus } : m));
                                                                }
                                                            }}
                                                            style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: member.is_approved ? '#E8F5E9' : '#333', color: member.is_approved ? '#2E7D32' : 'white', boxShadow: member.is_approved ? 'none' : '0 2px 6px rgba(0,0,0,0.1)' }}>
                                                            {member.is_approved ? '승인됨' : '승인하기'}
                                                        </button>
                                                    </div>
                                                ))
                                        }
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div style={{ fontSize: '13px', color: '#666', background: '#F5F5F3', padding: '14px', borderRadius: '12px', lineHeight: 1.5 }}>
                                            🛡️ <strong>슈퍼 관리자 전용</strong><br />
                                            새로운 교회 관리자나 부관리자를 임명합니다. 해당 이메일 사용자는 관리자 모드에 접근할 수 있습니다.
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '8px' }}>추가할 관리자 이메일</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <input id="admin-email-input" type="email" placeholder="example@kakao.com" style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '13px', outline: 'none' }} />
                                                <button onClick={async () => {
                                                    const emailInput = document.getElementById('admin-email-input') as HTMLInputElement;
                                                    const email = emailInput?.value;
                                                    if (!email) { alert('이메일을 입력해주세요.'); return; }
                                                    const res = await fetch('/api/admin', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ action: 'add_admin', email, role: 'church_admin', church_id: 'jesus-in' })
                                                    });
                                                    if (res.ok) {
                                                        alert('성공적으로 등록되었습니다!');
                                                        emailInput.value = '';
                                                    } else {
                                                        alert('등록에 실패했습니다.');
                                                    }
                                                }} style={{ padding: '0 18px', background: '#333', color: 'white', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>등록</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {user && (
                        <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '6px 12px', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', fontSize: '12px' }}>
                            <span style={{ color: '#333', fontWeight: 600 }}>{user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]}님</span>
                            {isAdmin && <button onClick={() => { setSettingsForm({ ...churchSettings }); setShowSettings(true); }} style={{ background: 'none', border: 'none', color: '#B8924A', cursor: 'pointer', padding: '5px', fontSize: '18px' }} title="교회 설정">⚙️</button>}
                            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: 0 }}>로그아웃</button>
                        </div>
                    )}

                    {/* Character Section */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center", flex: 1, justifyContent: 'center' }}>
                        <div style={{ position: "relative", perspective: "600px" }}>
                            <div style={{ position: "absolute", top: "-14px", left: "50%", width: "80px", height: "14px", border: "3px solid #D4AF37", borderRadius: "999px", animation: "halo-pulse 3s ease-in-out infinite", zIndex: 2 }} />
                            <div style={{
                                width: "170px", height: "170px", borderRadius: "50%",
                                background: "white",
                                boxShadow: "0 15px 45px rgba(212,175,55,.3), 0 5px 15px rgba(0,0,0,.08)",
                                border: "4px solid white", overflow: "hidden",
                                animation: "float 4s ease-in-out infinite",
                            }}>
                                <img src={SOMY_IMG} alt="소미" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                            <div style={{ position: "absolute", bottom: "-20px", left: "50%", width: "100px", height: "14px", background: "radial-gradient(ellipse,rgba(180,140,60,.3) 0%,transparent 70%)", animation: "shadow-pulse 4s ease-in-out infinite", borderRadius: "50%" }} />
                        </div>

                        <div style={{ animation: "fade-in 1s ease-out" }}>
                            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#333", margin: "0 0 8px 0", letterSpacing: "-0.5px", lineHeight: 1.3 }}>
                                저는 당신의 큐티도우미 <span style={{ color: "#D4AF37" }}>소미</span> 입니다
                            </h1>
                            <p style={{ fontSize: "15px", color: "#B8924A", fontWeight: 600, margin: "0 0 10px 0" }}>{churchSettings.church_name} {churchSettings.app_subtitle}</p>
                            <p style={{ fontSize: "16px", color: "#B8924A", fontWeight: 700, margin: "0 0 6px 0", letterSpacing: "0.5px" }}>바쁜 현대인을 위한 큐티 챗봇</p>
                            <p style={{ fontSize: "14px", color: "#777", lineHeight: 1.6, margin: 0 }}>내 삶 속에 예수 그리스도! 🐑</p>
                        </div>

                        {/* Verse Card */}
                        <div style={{ background: "white", borderRadius: "20px", padding: "20px", width: "280px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: "1px solid #F0ECE4", animation: "fade-in 1.2s ease-out", minHeight: "100px", display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            {isQtLoading ? (
                                <div style={{ textAlign: 'center', color: '#B8924A', fontSize: '13px' }}>
                                    <div style={{ marginBottom: '8px' }}>🤖 소미가 말씀을 준비 중이에요...</div>
                                    <div style={{ fontSize: '11px', color: '#999' }}>유료 버전용 AI 자동 생성 기능 작동 중</div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                                        <span style={{ fontSize: '14px' }}>📖</span>
                                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#B8924A" }}>오늘의 말씀</span>
                                    </div>
                                    <p style={{ fontSize: "13px", color: "#444", lineHeight: 1.6, margin: "0 0 8px 0", fontStyle: "italic" }}>"{qtData.verse}"</p>
                                    <p style={{ fontSize: "11px", color: "#999", fontWeight: 600, margin: 0 }}>— {qtData.reference}</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%", maxWidth: "320px", animation: "fade-in 1.4s ease-out", paddingBottom: "40px" }}>
                        {!user ? (
                            <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', border: '1px solid #EEE', textAlign: 'center' }}>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#333', marginBottom: '20px' }}>성도님, 먼저 로그인해주세요</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <button onClick={() => handleLogin('kakao')} style={{ width: '100%', padding: '14px', background: '#FEE500', color: '#3C1E1E', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(254,229,0,0.3)' }}>
                                        <span style={{ fontSize: '18px' }}>💬</span> 카카오로 로그인
                                    </button>
                                    <button onClick={() => handleLogin('google')} style={{ width: '100%', padding: '14px', background: 'white', color: '#333', border: '1px solid #DDD', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '18px' }}>G</span> 구글로 로그인
                                    </button>
                                </div>
                            </div>
                        ) : !isApproved && !isAdmin ? (
                            <div style={{ background: '#FFF9C4', padding: '24px', borderRadius: '20px', textAlign: 'center', border: '1px solid #FFF176', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>승인 대기 중입니다</div>
                                <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.5 }}>
                                    성도님 반가워요!<br />
                                    아직 관리자의 승인이 완료되지 않았습니다.<br />
                                    잠시만 기다려 주시면 곧 이용하실 수 있어요. 🐑
                                </div>
                            </div>
                        ) : (
                            <>
                                <button onClick={() => setView("chat")} style={{
                                    width: "100%", padding: "20px",
                                    background: "#333", color: "white",
                                    fontWeight: 800, fontSize: "18px", borderRadius: "18px",
                                    border: "none", cursor: "pointer", boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
                                    transition: "all .2s"
                                }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                    💬 소미와 대화하기
                                </button>

                                <button onClick={() => { setQtStep("read"); setView("qt"); }} style={{
                                    width: "100%", padding: "18px",
                                    background: "white", color: "#333",
                                    fontWeight: 700, fontSize: "17px", borderRadius: "18px",
                                    border: "2px solid #333", cursor: "pointer",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                                }}>
                                    ☀️ 오늘의 큐티 시작
                                </button>

                                <button onClick={async () => {
                                    setView("community");
                                    // 게시판 진입 시 현재 소속 교회 데이터만 로드
                                    try {
                                        const res = await fetch(`/api/community?church_id=${churchId}`);
                                        const data = await res.json();
                                        if (Array.isArray(data)) setCommunityPosts(data);
                                    } catch (e) { console.error("게시판 로드 실패:", e); }
                                }} style={{
                                    width: "100%", padding: "18px",
                                    background: "#E6A4B4", color: "white",
                                    fontWeight: 700, fontSize: "17px", borderRadius: "18px",
                                    border: "none", cursor: "pointer",
                                    boxShadow: "0 4px 12px rgba(230,164,180,0.3)"
                                }}>
                                    📝 은혜나눔 게시판
                                </button>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                                    <button onClick={async () => {
                                        setView('stats');
                                        setStatsError(null);
                                        setStats(null);
                                        const controller = new AbortController();
                                        const timeoutId = setTimeout(() => controller.abort(), 8000);
                                        try {
                                            const r = await fetch('/api/stats', { signal: controller.signal, cache: 'no-store' });
                                            clearTimeout(timeoutId);
                                            const data = await r.json();
                                            if (data) {
                                                setStats(data);
                                                if (data.error) setStatsError(data.error);
                                            }
                                        } catch (e: any) {
                                            setStatsError(e.name === 'AbortError' ? "시간 초과" : "연결 실패");
                                        }
                                    }} style={{
                                        flex: 1, padding: "14px",
                                        background: "#F5F2EA", color: "#B8924A",
                                        fontWeight: 700, fontSize: "14px", borderRadius: "14px",
                                        border: "none", cursor: "pointer"
                                    }}>
                                        👑 이달의 큐티왕
                                    </button>

                                    {isAdmin && (
                                        <button onClick={() => {
                                            const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
                                            setQtForm({ date: today, reference: '', passage: '', question1: '', question2: '', question3: '', prayer: '' });
                                            setView('qtManage');
                                        }} style={{
                                            flex: 1, padding: "14px",
                                            background: "#EEE", color: "#666",
                                            fontWeight: 700, fontSize: "14px", borderRadius: "14px",
                                            border: "none", cursor: "pointer"
                                        }}>
                                            ⚙️ 관리 모드
                                        </button>
                                    )}
                                </div>
                            </>
                        )}

                    </div>
                </div>
            );
        }

        /* ══════════════════════════════
           QT PAGE
        ══════════════════════════════ */
        if (view === "qt") {
            const handleShareGrace = async () => {
                if (!graceInput.trim()) return;

                if (user) {
                    try {
                        const res = await fetch('/api/community', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                user_id: user.id,
                                user_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "익명의 성도",
                                avatar_url: user.user_metadata?.avatar_url || null,
                                content: graceInput,
                                church_id: churchId
                            })
                        });
                        if (res.ok) {
                            const newPost = await res.json();
                            setCommunityPosts([newPost, ...communityPosts]);
                        }
                    } catch (e) { console.error("은혜나눔 저장 실패:", e); }
                }

                setQtStep("pray");
            };

            return (
                <div style={{ minHeight: "100vh", background: "white", maxWidth: "480px", margin: "0 auto", ...baseFont, position: 'relative' }}>
                    {styles}
                    {/* Header */}
                    <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #EEE", position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                        <button onClick={() => setView("home")} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: '#333' }}>←</button>
                        <img src={CHURCH_LOGO} alt="로고" style={{ height: "24px" }} />
                        <div style={{ fontWeight: 700, color: "#333", fontSize: "14px" }}>오늘의 큐티</div>
                        <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#999' }}>{qtData.date}</div>
                    </div>

                    <div style={{ padding: "24px 20px", display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '120px' }}>

                        {/* Somy mini float */}
                        <div style={{ display: "flex", justifyContent: "center" }}>
                            <div style={{ position: "relative", perspective: "400px" }}>
                                <div style={{ position: "absolute", top: "-10px", left: "50%", width: "50px", height: "10px", border: "2.5px solid #D4AF37", borderRadius: "999px", animation: "halo-pulse 3s ease-in-out infinite", zIndex: 2 }} />
                                <div style={{ width: "70px", height: "70px", borderRadius: "50%", border: "3px solid white", overflow: "hidden", boxShadow: "0 8px 25px rgba(212,175,55,.25)", animation: "float 4s ease-in-out infinite" }}>
                                    <img src={SOMY_IMG} alt="소미" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </div>
                                <div style={{ position: "absolute", bottom: "-10px", left: "50%", width: "45px", height: "8px", background: "radial-gradient(ellipse,rgba(180,140,60,.3) 0%,transparent 70%)", animation: "shadow-pulse 4s ease-in-out infinite", borderRadius: "50%" }} />
                            </div>
                        </div>

                        {/* Step Content Wrapper (Individual Screen Feel) */}
                        <div key={qtStep} style={{ animation: "slide-right 0.5s ease-out" }}>
                            {qtStep === 'read' && (
                                <div style={{ background: "#FDFCFB", borderRadius: "20px", padding: "24px", border: "1px solid #F0ECE4" }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                        <div style={{ width: 22, height: 22, background: '#333', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>1</div>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>말씀 읽기</h3>
                                    </div>
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#B8924A', marginBottom: '8px' }}>{qtData.reference}</div>
                                        <p style={{ lineHeight: 1.8, color: '#444', fontSize: '15px', whiteSpace: 'pre-line', margin: 0 }}>{qtData.fullPassage}</p>
                                    </div>

                                    {/* Passage Q&A Section */}
                                    <div style={{ borderTop: '1px dashed #DDD', paddingTop: '20px', marginTop: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                            <span style={{ fontSize: '14px' }}>✨</span>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#B8924A' }}>소미에게 궁금한점을 물어보세요</span>
                                        </div>
                                        <div ref={passageRef} style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {passageChat.length === 0 && <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', padding: '10px 0' }}>본문에서 궁금한 점을 아래에 입력해보세요!</div>}
                                            {passageChat.map((chat, i) => (
                                                <div key={i} style={{ alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start', background: chat.role === 'user' ? '#EEE' : '#F5F2EA', padding: '8px 12px', borderRadius: '12px', fontSize: '13px', maxWidth: '85%', lineHeight: 1.5, color: '#444' }}>{chat.content}</div>
                                            ))}
                                            {isPassageLoading && <div style={{ alignSelf: 'flex-start', fontSize: '12px', color: '#B8924A', fontStyle: 'italic' }}>소미가 본문을 묵상 중...</div>}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input type="text" value={passageInput} onChange={(e) => setPassageInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePassageAsk()} placeholder="예: '푸른 풀밭'은 어떤 의미인가요?" style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '13px', outline: 'none' }} />
                                            <button onClick={handlePassageAsk} disabled={isPassageLoading} style={{ padding: '0 15px', background: '#D4AF37', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: isPassageLoading ? 0.6 : 1 }}>묻기</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {qtStep === 'reflect' && (
                                <div style={{ background: "#FDFCFB", borderRadius: "20px", padding: "24px", border: "1px solid #F0ECE4" }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                        <div style={{ width: 22, height: 22, background: '#D4AF37', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>2</div>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>묵상 질문</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {qtData.questions.map((q, idx) => (
                                            <div key={idx} style={{ padding: '16px', background: 'white', borderRadius: '15px', border: '1px solid #EEE', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                                <div style={{ fontSize: '11px', color: '#B8924A', fontWeight: 700, marginBottom: '6px' }}>질문 {idx + 1}</div>
                                                <div style={{ fontSize: '14px', color: '#333', fontWeight: 600, marginBottom: '10px', lineHeight: 1.5 }}>{q}</div>
                                                <textarea value={answers[idx] || ""} onChange={(e) => handleAnswerChange(idx, e.target.value)} placeholder="여기에 답을 적어보세요..." style={{ width: '100%', height: '80px', border: '1px solid #F0F0F0', borderRadius: '10px', padding: '12px', boxSizing: 'border-box', outline: 'none', fontSize: '14px', background: '#FDFDFD', fontFamily: 'inherit' }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {qtStep === 'grace' && (
                                <div style={{ background: "#FDFCFB", borderRadius: "20px", padding: "24px", border: "1px solid #F0ECE4" }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                        <div style={{ width: 22, height: 22, background: '#E6A4B4', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>✨</div>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>은혜나눔</h3>
                                    </div>
                                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>오늘 말씀을 통해 받은 은혜를 기록해보세요.</p>
                                    <textarea value={graceInput} onChange={(e) => setGraceInput(e.target.value)} placeholder="성도들과 나누고 싶은 은혜를 자유롭게 적어주세요..." style={{ width: '100%', height: '200px', border: '1px solid #EEE', borderRadius: '15px', padding: '16px', boxSizing: 'border-box', outline: 'none', fontSize: '15px', background: 'white', fontFamily: 'inherit', lineHeight: 1.6 }} />
                                    <div style={{ marginTop: '12px', fontSize: '12px', color: '#999', textAlign: 'center' }}>나눈 은혜는 성도들과 함께 볼 수 있습니다.</div>
                                </div>
                            )}

                            {qtStep === 'pray' && (
                                <div style={{ background: "#FDFCFB", borderRadius: "20px", padding: "24px", border: "1px solid #F0ECE4" }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                        <div style={{ width: 22, height: 22, background: '#8E9775', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>3</div>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>마무리 기도</h3>
                                    </div>
                                    <div style={{ padding: '24px', background: 'rgba(142,151,117,0.05)', borderRadius: '15px', borderLeft: '4px solid #8E9775' }}>
                                        <p style={{ fontSize: '16px', fontStyle: 'italic', lineHeight: 1.8, color: '#444', margin: 0 }}>"{qtData.prayer}"</p>
                                    </div>
                                </div>
                            )}

                            {qtStep === 'done' && (
                                <div style={{ background: "#333", borderRadius: "20px", padding: "40px 30px", textAlign: 'center', color: 'white' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '15px' }}>💝</div>
                                    <h2 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>오늘의 큐티 완료!</h2>
                                    <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px' }}>말씀과 함께 승리하는 하루 되세요.</p>
                                    <button onClick={() => setView('community')} style={{ width: '100%', padding: '16px', background: '#D4AF37', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer', marginBottom: '10px' }}>은혜나눔 게시판 가기</button>
                                    <button onClick={async () => {
                                        setView('stats');
                                        setStatsError(null);
                                        setStats(null);
                                        const controller = new AbortController();
                                        const timeoutId = setTimeout(() => controller.abort(), 8000);
                                        try {
                                            const r = await fetch('/api/stats', { signal: controller.signal, cache: 'no-store' });
                                            clearTimeout(timeoutId);
                                            const data = await r.json();
                                            if (data) {
                                                setStats(data);
                                                if (data.error) setStatsError(data.error);
                                            }
                                        } catch (e) { }
                                    }} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>👑 이달의 큐티왕 보기</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Fix Action Button */}
                    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', padding: '15px 20px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderTop: '1px solid #EEE', boxSizing: 'border-box' }}>
                        {qtStep === 'read' && (
                            <button onClick={() => setQtStep('reflect')} style={{ width: '100%', padding: '16px', background: '#333', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' }}>묵상 질문으로</button>
                        )}
                        {qtStep === 'reflect' && (
                            <button onClick={() => setQtStep('grace')} style={{ width: '100%', padding: '16px', background: '#333', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' }}>은혜 나누러 가기</button>
                        )}
                        {qtStep === 'grace' && (
                            <button onClick={handleShareGrace} style={{ width: '100%', padding: '16px', background: '#E6A4B4', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' }}>기록하고 성도들과 나누기</button>
                        )}
                        {qtStep === 'pray' && (
                            <button onClick={async () => {
                                // 큐티 완료 기록
                                if (user) {
                                    try {
                                        const res = await fetch('/api/stats', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                user_id: user.id,
                                                user_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '성도',
                                                avatar_url: user.user_metadata?.avatar_url || null,
                                            }),
                                        });

                                        if (res.ok) {
                                            // 기록 성공 시 즉시 최신 통계 데이터 로드
                                            const statsRes = await fetch('/api/stats');
                                            const statsData = await statsRes.json();
                                            if (statsData && statsData.today) {
                                                setStats(statsData);
                                            }
                                        }
                                    } catch (e) {
                                        console.error("통계 기록 중 오류:", e);
                                    }
                                }
                                setQtStep('done');
                            }} style={{ width: '100%', padding: '16px', background: '#D4AF37', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' }}>큐티 마칠게요</button>
                        )}
                        {qtStep === 'done' && (
                            <button onClick={() => setView('home')} style={{ width: '100%', padding: '16px', background: '#EEE', color: '#333', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' }}>홈으로 이동</button>
                        )}
                    </div>
                </div>
            );
        }
        /* ══════════════════════════════
           QT MANAGE (Admin)
        ══════════════════════════════ */
        if (view === "qtManage") {
            const handleQtSave = async () => {
                if (!qtForm.date || !qtForm.reference || !qtForm.passage) {
                    alert('날짜, 성경구절, 본문은 필수입니다.');
                    return;
                }
                try {
                    const res = await fetch('/api/qt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(qtForm),
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('큐티 본문이 저장되었습니다! ✅');
                        const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
                        if (qtForm.date === today) {
                            setQtData({
                                date: new Date(qtForm.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
                                reference: qtForm.reference,
                                fullPassage: qtForm.passage,
                                verse: qtForm.passage.split('\n')[0],
                                questions: [qtForm.question1, qtForm.question2, qtForm.question3].filter(Boolean),
                                prayer: qtForm.prayer,
                            });
                        }
                        setView('home');
                    } else {
                        alert('저장 실패: ' + data.error);
                    }
                } catch {
                    alert('저장 중 오류가 발생했습니다.');
                }
            };

            const handleAiGenerate = async () => {
                if (!qtForm.reference || !qtForm.passage) {
                    alert('AI 생성을 위해 성경구절과 본문을 먼저 입력해주세요.');
                    return;
                }
                setAiLoading(true);
                try {
                    const res = await fetch('/api/qt-generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reference: qtForm.reference, passage: qtForm.passage }),
                    });
                    const data = await res.json();
                    if (data.question1) {
                        setQtForm(prev => ({
                            ...prev,
                            question1: data.question1,
                            question2: data.question2,
                            question3: data.question3,
                            prayer: data.prayer,
                        }));
                    } else {
                        alert('AI 생성 실패: ' + (data.error || '알 수 없는 오류'));
                    }
                } catch {
                    alert('AI 서버 연결 실패');
                } finally {
                    setAiLoading(false);
                }
            };

            const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '13px', boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'inherit' };

            return (
                <div style={{ minHeight: "100vh", background: "white", maxWidth: "480px", margin: "0 auto", ...baseFont }}>
                    {styles}
                    <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #EEE", position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                        <button onClick={() => setView("home")} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: '#333' }}>←</button>
                        <div style={{ fontWeight: 700, color: "#333", fontSize: "14px" }}>📝 큐티 본문 관리</div>
                    </div>
                    <div style={{ padding: "24px 20px", display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: '#FDFCFB', padding: '16px', borderRadius: '15px', border: '1px solid #F0ECE4', marginBottom: '8px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#B8924A', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                ✨ AI 추천 기능
                            </div>
                            <button onClick={async () => {
                                setAiLoading(true);
                                try {
                                    const res = await fetch(`/api/qt?date=${qtForm.date}&force=true`);
                                    const { qt } = await res.json();
                                    if (qt) {
                                        setQtForm({
                                            date: qt.date,
                                            reference: qt.reference,
                                            passage: qt.passage,
                                            question1: qt.question1 || '',
                                            question2: qt.question2 || '',
                                            question3: qt.question3 || '',
                                            prayer: qt.prayer || '',
                                        });
                                    } else {
                                        alert('오늘의 자동 생성 본문을 가져올 수 없습니다. 유료 버전 설정을 확인해주세요.');
                                    }
                                } catch { alert('데이터 로드 실패'); }
                                finally { setAiLoading(false); }
                            }} disabled={aiLoading} style={{ width: '100%', padding: '12px', background: '#333', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                                {aiLoading ? '🔄 로딩 중...' : '📅 오늘 성경 통독 본문 불러오기'}
                            </button>
                            <p style={{ fontSize: '11px', color: '#999', marginTop: '8px', textAlign: 'center' }}>
                                * 성경 읽기표에 따른 오늘 분량의 말씀과 내용을 자동으로 채워줍니다.
                            </p>
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '6px' }}>📅 날짜</label>
                            <input type="date" value={qtForm.date} onChange={e => setQtForm(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '6px' }}>📖 성경 구절 (예: 시편 23:1-3)</label>
                            <input type="text" value={qtForm.reference} onChange={e => setQtForm(p => ({ ...p, reference: e.target.value }))} placeholder="예: 시편 23:1-3" style={inputStyle} />
                            <button onClick={async () => {
                                if (!qtForm.reference) { alert('성경 구절을 먼저 입력해주세요.'); return; }
                                setAiLoading(true);
                                try {
                                    const res = await fetch('/api/bible', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: qtForm.reference }) });
                                    const data = await res.json();
                                    if (data.passage) { setQtForm(p => ({ ...p, passage: data.passage })); }
                                    else { alert('본문 가져오기 실패: ' + (data.error || '')); }
                                } catch { alert('서버 연결 실패'); }
                                finally { setAiLoading(false); }
                            }} disabled={aiLoading} style={{ marginTop: '6px', width: '100%', padding: '10px', background: '#F5F2EA', color: '#B8924A', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                                {aiLoading ? '📖 가져오는 중...' : '📖 성경 본문 자동 가져오기'}
                            </button>
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '6px' }}>📜 성경 본문</label>
                            <textarea value={qtForm.passage} onChange={e => setQtForm(p => ({ ...p, passage: e.target.value }))} placeholder="위 버튼으로 자동 가져오거나 직접 입력하세요" style={{ ...inputStyle, height: '120px' }} />
                        </div>
                        <button onClick={handleAiGenerate} disabled={aiLoading} style={{
                            width: '100%', padding: '14px', background: aiLoading ? '#ccc' : 'linear-gradient(135deg, #D4AF37, #B8924A)',
                            color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                        }}>
                            {aiLoading ? '🤖 AI가 생성 중...' : '🤖 AI로 질문 & 기도문 자동 생성 (베타 무료)'}
                        </button>
                        <div style={{ borderTop: '1px dashed #EEE', paddingTop: '16px', fontSize: '11px', color: '#999', textAlign: 'center' }}>
                            아래 항목은 직접 입력하거나, 위 AI 버튼으로 자동 생성할 수 있습니다
                        </div>
                        {(['question1', 'question2', 'question3'] as const).map((key, idx) => (
                            <div key={key}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '6px' }}>❓ 묵상 질문 {idx + 1}</label>
                                <input type="text" value={qtForm[key]} onChange={e => setQtForm(p => ({ ...p, [key]: e.target.value }))} placeholder="묵상 질문을 입력하세요" style={inputStyle} />
                            </div>
                        ))}
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '6px' }}>🙏 마무리 기도문</label>
                            <textarea value={qtForm.prayer} onChange={e => setQtForm(p => ({ ...p, prayer: e.target.value }))} placeholder="마무리 기도문을 입력하세요" style={{ ...inputStyle, height: '100px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button onClick={() => setView('home')} style={{ flex: 1, padding: '14px', background: '#F5F5F5', color: '#666', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>취소</button>
                            <button onClick={handleQtSave} style={{ flex: 2, padding: '14px', background: '#333', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>💾 저장하기</button>
                        </div>

                        <div style={{ marginTop: '20px', borderTop: '1px dashed #DDD', paddingTop: '20px', paddingBottom: '40px' }}>
                            <button onClick={async () => {
                                if (window.confirm('🚨 정말로 모든 묵상 통계 데이터를 초기화하시겠습니까? 복구할 수 없습니다.')) {
                                    try {
                                        const res = await fetch('/api/stats', { method: 'DELETE' });
                                        if (res.ok) {
                                            alert('✅ 통계 데이터가 초기화되었습니다.');
                                            setStats(null);
                                            setView('home');
                                        } else {
                                            alert('❌ 초기화 실패');
                                        }
                                    } catch {
                                        alert('서버 연결 실패');
                                    }
                                }
                            }} style={{ width: '100%', padding: '14px', background: '#FFF0F0', color: '#D32F2F', border: '1px solid #FFCDD2', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                                🧨 묵상 참여 기록 전체 초기화 (위험)
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        /* ══════════════════════════════
           STATS PAGE
        ══════════════════════════════ */
        if (view === "stats") {
            const medals = ['🥇', '🥈', '🥉'];
            return (
                <div style={{ minHeight: "100vh", background: "white", maxWidth: "480px", margin: "0 auto", ...baseFont }}>
                    {styles}
                    <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #EEE", position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                        <button onClick={() => setView("home")} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: '#333' }}>←</button>
                        <div style={{ fontWeight: 700, color: "#333", fontSize: "14px" }}>👑 이달의 큐티왕</div>
                    </div>

                    {statsError ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#E57373', fontSize: '14px' }}>
                            ⚠️ {statsError}<br />
                            <button onClick={() => setView('home')} style={{ marginTop: '20px', padding: '10px 20px', background: '#F5F5F5', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>← 홈으로 돌아가기</button>
                        </div>
                    ) : !stats ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                            데이터를 불러오는 중입니다... 🐑<br />
                            <span style={{ fontSize: '12px', opacity: 0.7 }}>(8초 이상 걸리면 자동으로 중단됩니다)</span>
                        </div>
                    ) : (
                        <div style={{ padding: "24px 20px", display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* 전체 통계 카드 */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1, background: 'linear-gradient(135deg, #D4AF37, #B8924A)', borderRadius: '16px', padding: '20px', color: 'white', textAlign: 'center' }}>
                                    <div style={{ fontSize: '28px', fontWeight: 800 }}>{stats?.today?.count || 0}</div>
                                    <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '4px' }}>오늘 참여</div>
                                </div>
                                <div style={{ flex: 1, background: '#333', borderRadius: '16px', padding: '20px', color: 'white', textAlign: 'center' }}>
                                    <div style={{ fontSize: '28px', fontWeight: 800 }}>{stats?.totalCompletions || 0}</div>
                                    <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '4px' }}>전체 큐티 횟수</div>
                                </div>
                            </div>

                            {/* 오늘 참여자 */}
                            <div style={{ background: '#FDFCFB', borderRadius: '16px', padding: '20px', border: '1px solid #F0ECE4' }}>
                                <h3 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 700 }}>☀️ 오늘 묵상한 성도</h3>
                                {(stats?.today?.members?.length || 0) === 0 ? (
                                    <div style={{ fontSize: '13px', color: '#999', textAlign: 'center', padding: '10px 0' }}>아직 오늘 묵상한 성도가 없습니다</div>
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {stats?.today?.members?.map((m: any, i: number) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', padding: '6px 12px', borderRadius: '20px', border: '1px solid #EEE', fontSize: '12px', fontWeight: 600 }}>
                                                {m?.avatar_url ? <img src={m.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} /> : <span>🐑</span>}
                                                {m?.user_name || '성도'}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 이번 달 랭킹 */}
                            <div style={{ background: '#FDFCFB', borderRadius: '16px', padding: '20px', border: '1px solid #F0ECE4' }}>
                                <h3 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 700 }}>🏆 이번 달 묵상 랭킹</h3>
                                {(stats?.ranking?.length || 0) === 0 ? (
                                    <div style={{ fontSize: '13px', color: '#999', textAlign: 'center', padding: '10px 0' }}>이번 달 기록이 없습니다</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {stats?.ranking?.map((r: any, i: number) => (
                                            <div key={i} style={{
                                                display: 'flex', alignItems: 'center', gap: '12px',
                                                padding: '12px 16px', background: i < 3 ? 'rgba(212,175,55,0.08)' : 'white',
                                                borderRadius: '12px', border: '1px solid #EEE',
                                            }}>
                                                <div style={{ fontSize: i < 3 ? '22px' : '14px', width: '30px', textAlign: 'center', fontWeight: 700, color: '#999' }}>
                                                    {i < 3 ? medals[i] : `${i + 1}`}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#333' }}>{r?.name || '성도'}</div>
                                                </div>
                                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#D4AF37' }}>{r?.count || 0}회</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button onClick={() => setView('home')} style={{ width: '100%', padding: '14px', background: '#F5F5F5', color: '#666', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', marginBottom: '20px' }}>홈으로 돌아가기</button>
                        </div>
                    )}
                </div>
            );
        }

        /* ══════════════════════════════
           COMMUNITY PAGE
        ══════════════════════════════ */
        if (view === "community") {
            const handleAddComment = async (postId: any) => {
                const commentText = commentInputs[postId];
                if (!commentText?.trim() || !user) return;

                try {
                    const res = await fetch('/api/community/comments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            post_id: postId,
                            user_id: user.id,
                            user_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "익명의 성도",
                            content: commentText
                        })
                    });
                    if (res.ok) {
                        const newComment = await res.json();
                        setCommunityPosts(communityPosts.map(post => {
                            if (post.id === postId) {
                                return {
                                    ...post,
                                    comments: [...(post.comments || []), newComment]
                                };
                            }
                            return post;
                        }));
                        setCommentInputs({ ...commentInputs, [postId]: "" });
                    }
                } catch (e) { console.error("댓글 저장 실패:", e); }
            };

            const handleDeletePost = async (postId: any) => {
                if (!confirm("이 게시글을 정말 삭제하시겠습니까?")) return;
                try {
                    const res = await fetch(`/api/community?id=${postId}`, { method: 'DELETE' });
                    if (res.ok) {
                        setCommunityPosts(communityPosts.filter(post => post.id !== postId));
                    } else {
                        alert("삭제 실패");
                    }
                } catch (e) { console.error("삭제 중 오류:", e); }
            };

            const handleUpdatePost = async () => {
                if (!editingPostId || !editContent.trim()) return;
                try {
                    const res = await fetch('/api/community', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: editingPostId, content: editContent })
                    });
                    if (res.ok) {
                        const updatedPost = await res.json();
                        setCommunityPosts(communityPosts.map(post =>
                            post.id === editingPostId ? { ...post, content: updatedPost.content } : post
                        ));
                        setEditingPostId(null);
                        setEditContent("");
                    }
                } catch (e) { console.error("수정 중 오류:", e); }
            };

            return (
                <div style={{ minHeight: "100vh", background: "#F8F8F8", maxWidth: "480px", margin: "0 auto", ...baseFont }}>
                    {styles}
                    <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #EEE", position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                        <button onClick={() => setView("home")} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: '#333' }}>←</button>
                        <div style={{ fontWeight: 800, color: "#333", fontSize: "16px" }}>은혜나눔 게시판</div>
                    </div>

                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {communityPosts.map(post => (
                            <div key={post.id} style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', animation: 'fade-in 0.5s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F0ECE4', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                                        {post.avatar_url ? <img src={post.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🐑'}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#333' }}>{post.user_name}</div>
                                        <div style={{ fontSize: '11px', color: '#999' }}>{new Date(post.created_at || Date.now()).toLocaleString()}</div>
                                    </div>
                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                                        {(user?.id === post.user_id) && (
                                            <button onClick={() => { setEditingPostId(post.id); setEditContent(post.content); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#B8924A', fontWeight: 600 }}>수정</button>
                                        )}
                                        {isAdmin && (
                                            <button onClick={() => handleDeletePost(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#999' }}>🗑️</button>
                                        )}
                                    </div>
                                </div>

                                {editingPostId === post.id ? (
                                    <div style={{ marginBottom: '15px' }}>
                                        <textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            style={{ width: '100%', minHeight: '100px', border: '1px solid #DDD', borderRadius: '12px', padding: '12px', boxSizing: 'border-box', marginBottom: '8px', fontSize: '14px', fontFamily: 'inherit' }}
                                        />
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={handleUpdatePost} style={{ padding: '8px 16px', background: '#333', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>저장</button>
                                            <button onClick={() => setEditingPostId(null)} style={{ padding: '8px 16px', background: '#EEE', color: '#666', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>취소</button>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#444', margin: '0 0 15px 0', whiteSpace: 'pre-line' }}>{post.content}</p>
                                )}

                                {/* Comments Section */}
                                <div style={{ borderTop: '1px solid #F5F5F5', paddingTop: '15px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', marginBottom: '10px' }}>댓글 {post.comments?.length || 0}개</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                                        {post.comments && Array.isArray(post.comments) && post.comments.map((comment: any) => (
                                            <div key={comment.id} style={{ background: '#FAFAFA', padding: '10px 15px', borderRadius: '12px', fontSize: '13px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span style={{ fontWeight: 700, color: '#555' }}>{comment.user_name || '성도'}</span>
                                                    <span style={{ fontSize: '10px', color: '#AAA' }}>
                                                        {comment.created_at ? new Date(comment.created_at).toLocaleTimeString() : '방금 전'}
                                                    </span>
                                                </div>
                                                <div style={{ color: '#666' }}>{comment.content}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Comment Input */}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={commentInputs[post.id] || ""}
                                            onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                                            placeholder="따뜻한 격려의 댓글을 달아주세요..."
                                            style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '13px', outline: 'none' }}
                                        />
                                        <button onClick={() => handleAddComment(post.id)} style={{ background: '#333', color: 'white', border: 'none', borderRadius: '10px', padding: '0 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>등록</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        /* ══════════════════════════════
           CHAT PAGE (Default)
        ══════════════════════════════ */
        return (
            <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: "480px", margin: "0 auto", background: "white", ...baseFont, position: 'relative' }}>
                <div style={{ padding: "15px 20px", borderBottom: "1px solid #EEE", display: "flex", alignItems: "center", gap: "12px" }}>
                    <button onClick={() => setView("home")} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>←</button>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', border: '1px solid #EEE' }}>
                        <img src={SOMY_IMG} alt="소미" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, color: "#333", fontSize: "14px" }}>소미 @예수인교회</div>
                        <div style={{ fontSize: "11px", color: "#999" }}>실시간 묵상 가이드</div>
                    </div>
                </div>

                <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px", background: "#FAFAFA", display: "flex", flexDirection: "column", gap: "15px" }}>
                    {messages.map((m, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                            <div style={{
                                maxWidth: "80%", padding: "12px 16px", borderRadius: "15px",
                                background: m.role === "user" ? "#333" : "white",
                                color: m.role === "user" ? "white" : "#333",
                                fontSize: "14px", lineHeight: 1.6,
                                boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                                border: m.role === "user" ? "none" : "1px solid #EEE"
                            }}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div style={{ background: 'white', padding: '10px 16px', borderRadius: '15px', alignSelf: 'flex-start', border: '1px solid #EEE', fontSize: '13px', color: '#B8924A', fontStyle: 'italic' }}>
                            소미가 묵상 중...
                        </div>
                    )}
                </div>

                <div style={{ padding: "15px", borderTop: "1px solid #EEE", display: "flex", gap: "10px" }}>
                    <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="메시지를 입력하세요..."
                        style={{ flex: 1, padding: "12px 15px", borderRadius: "10px", border: "1px solid #DDD", outline: "none" }} />
                    <button onClick={handleSend} style={{ padding: "12px 20px", background: "#333", color: "white", borderRadius: "10px", border: "none", fontWeight: 700 }}>전송</button>
                </div>
            </div>
        );
    };

    // 최종 렌더링: 김부장님의 원래 의도대로 컨텐츠만 깔끔하게 반환합니다.
    return renderContent();
}
