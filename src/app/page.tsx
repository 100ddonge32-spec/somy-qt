"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type View = "home" | "chat" | "qt" | "community";

const SOMY_IMG = "/somy.png";
const CHURCH_LOGO = process.env.NEXT_PUBLIC_CHURCH_LOGO_URL || "https://cdn.imweb.me/thumbnail/20210813/569458bf12dd0.png";
const CHURCH_URL = process.env.NEXT_PUBLIC_CHURCH_URL || "https://jesus-in.imweb.me/index";
const CHURCH_NAME = process.env.NEXT_PUBLIC_CHURCH_NAME || "예수인교회";
const APP_SUBTITLE = process.env.NEXT_PUBLIC_APP_SUBTITLE || "큐티 동반자";


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
    id: number;
    user: string;
    content: string;
    date: string;
}

interface Post {
    id: number;
    user: string;
    content: string;
    date: string;
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
    const [communityPosts, setCommunityPosts] = useState<Post[]>([
        { id: 1, user: "사무엘 성도", content: "오늘 말씀을 통해 선하신 목자 되신 주님을 다시금 기억하게 되었습니다. 어떤 상황에서도 부족함이 없게 하시는 하나님을 찬양합니다.", date: "2시간 전", comments: [{ id: 1, user: "마리아 권사", content: "아멘! 참 은혜로운 고백입니다.", date: "1시간 전" }] },
        { id: 2, user: "안나 집사", content: "쉴 만한 물가로 인도하시는 하나님의 세밀한 손길을 느끼는 하루였습니다.", date: "5시간 전", comments: [] }
    ]);
    const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({});
    const [passageInput, setPassageInput] = useState("");
    const [passageChat, setPassageChat] = useState<{ role: string; content: string }[]>([]);
    const [isPassageLoading, setIsPassageLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [churchSettings, setChurchSettings] = useState({
        church_name: CHURCH_NAME,
        church_logo_url: CHURCH_LOGO,
        church_url: CHURCH_URL,
        app_subtitle: APP_SUBTITLE,
    });
    const [showSettings, setShowSettings] = useState(false);
    const [settingsForm, setSettingsForm] = useState({
        church_name: CHURCH_NAME,
        church_logo_url: CHURCH_LOGO,
        church_url: CHURCH_URL,
        app_subtitle: APP_SUBTITLE,
    });
    const [settingsSaving, setSettingsSaving] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const passageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // URL 해시에서 세션 토큰 직접 처리 (Next.js App Router 호환)
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
                        // URL에서 해시 제거 (깔끔하게)
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
        fetch('/api/settings')
            .then(r => r.json())
            .then(({ settings }) => {
                if (settings) {
                    setChurchSettings(settings);
                    setSettingsForm(settings);
                }
            })
            .catch(() => { });

        // 인증 상태 변화 감지
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

    /* ══════════════════════════════
       HOME
    ══════════════════════════════ */
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
                    <div style={{ fontSize: "12px", color: "#666", letterSpacing: "1px", fontWeight: 500 }}>{churchSettings.church_name.toUpperCase()}</div>
                </a>

                {/* 설정 모달 */}
                {showSettings && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>⚙️ 교회 설정</h2>
                                <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {[['church_name', '교회 이름', '예: 예수인교회'], ['app_subtitle', '앱 부제목', '예: 큐티 동반자'], ['church_logo_url', '교회 로고 URL', 'https://...'], ['church_url', '교회 홈페이지 URL', 'https://...']].map(([key, label, placeholder]) => (
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
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button onClick={() => setShowSettings(false)} style={{ flex: 1, padding: '12px', background: '#F5F5F5', color: '#666', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>취소</button>
                                <button onClick={handleSaveSettings} disabled={settingsSaving} style={{ flex: 2, padding: '12px', background: '#D4AF37', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', opacity: settingsSaving ? 0.7 : 1 }}>
                                    {settingsSaving ? '저장 중...' : '💾 저장하기'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {user && (
                    <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '6px 12px', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', fontSize: '12px' }}>
                        <span style={{ color: '#333', fontWeight: 600 }}>{user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]}님</span>
                        <button onClick={() => { setSettingsForm({ ...churchSettings }); setShowSettings(true); }} style={{ background: 'none', border: 'none', color: '#B8924A', cursor: 'pointer', padding: 0, fontSize: '14px' }} title="교회 설정">⚙️</button>
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
                        <h1 style={{ fontSize: "40px", fontWeight: 800, color: "#333", margin: "0 0 4px 0", letterSpacing: "-1px" }}>소미</h1>
                        <p style={{ fontSize: "15px", color: "#B8924A", fontWeight: 600, margin: "0 0 10px 0" }}>{CHURCH_NAME} {APP_SUBTITLE}</p>
                        <p style={{ fontSize: "12px", color: "#B8924A", fontWeight: 600, margin: "0 0 6px 0", letterSpacing: "0.5px", opacity: 0.85 }}>바쁜 현대인을 위한 큐티 챗봇</p>
                        <p style={{ fontSize: "14px", color: "#777", lineHeight: 1.6, margin: 0 }}>내 삶 속에 예수 그리스도!<br />소미가 당신의 묵상을 도와드릴게요 🐑</p>
                    </div>

                    {/* Verse Card */}
                    <div style={{ background: "white", borderRadius: "20px", padding: "20px", width: "280px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: "1px solid #F0ECE4", animation: "fade-in 1.2s ease-out" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                            <span style={{ fontSize: '14px' }}>📖</span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#B8924A" }}>오늘의 말씀</span>
                        </div>
                        <p style={{ fontSize: "13px", color: "#444", lineHeight: 1.6, margin: "0 0 8px 0", fontStyle: "italic" }}>"{QT_DATA.verse}"</p>
                        <p style={{ fontSize: "11px", color: "#999", fontWeight: 600, margin: 0 }}>— {QT_DATA.reference}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "300px", animation: "fade-in 1.4s ease-out" }}>
                    {!user ? (
                        <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 5px 20px rgba(0,0,0,0.05)', border: '1px solid #EEE', textAlign: 'center' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#333', marginBottom: '16px' }}>성도님, 먼저 로그인해주세요</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <button onClick={() => handleLogin('kakao')} style={{ width: '100%', padding: '12px', background: '#FEE500', color: '#3C1E1E', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '16px' }}>💬</span> 카카오로 로그인
                                </button>
                                <button onClick={() => handleLogin('google')} style={{ width: '100%', padding: '12px', background: 'white', color: '#333', border: '1px solid #DDD', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '16px' }}>G</span> 구글로 로그인
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <button onClick={() => setView("chat")} style={{
                                width: "100%", padding: "16px",
                                background: "#333", color: "white",
                                fontWeight: 700, fontSize: "16px", borderRadius: "15px",
                                border: "none", cursor: "pointer", boxShadow: "0 5px 15px rgba(0,0,0,.1)",
                                transition: "all .2s"
                            }} onMouseOver={e => e.currentTarget.style.background = "#000"} onMouseOut={e => e.currentTarget.style.background = "#333"}>
                                💬 소미와 대화하기
                            </button>
                            <button onClick={() => { setQtStep("read"); setView("qt"); }} style={{
                                width: "100%", padding: "16px",
                                background: "white", color: "#333",
                                fontWeight: 600, fontSize: "15px", borderRadius: "15px",
                                border: "1px solid #DDD", cursor: "pointer"
                            }}>
                                ☀️ 오늘의 큐티 시작
                            </button>
                        </>
                    )}

                    <a href={CHURCH_URL} target="_blank" rel="noopener noreferrer" style={{
                        marginTop: "10px", textAlign: "center", textDecoration: "none", color: "#999", fontSize: "13px", fontWeight: 500
                    }}>
                        {CHURCH_NAME} 홈페이지 방문하기 →
                    </a>
                </div>
            </div>
        );
    }

    /* ══════════════════════════════
       QT PAGE
    ══════════════════════════════ */
    if (view === "qt") {
        const handleShareGrace = () => {
            if (!graceInput.trim()) return;
            const newPost: Post = {
                id: Date.now(),
                user: user?.email?.split('@')[0] || "익명의 성도",
                content: graceInput,
                date: "방금 전",
                comments: []
            };
            setCommunityPosts([newPost, ...communityPosts]);
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
                    <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#999' }}>{QT_DATA.date}</div>
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
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#B8924A', marginBottom: '8px' }}>{QT_DATA.reference}</div>
                                    <p style={{ lineHeight: 1.8, color: '#444', fontSize: '15px', whiteSpace: 'pre-line', margin: 0 }}>{QT_DATA.fullPassage}</p>
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
                                    {QT_DATA.questions.map((q, idx) => (
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
                                    <p style={{ fontSize: '16px', fontStyle: 'italic', lineHeight: 1.8, color: '#444', margin: 0 }}>"{QT_DATA.prayer}"</p>
                                </div>
                            </div>
                        )}

                        {qtStep === 'done' && (
                            <div style={{ background: "#333", borderRadius: "20px", padding: "40px 30px", textAlign: 'center', color: 'white' }}>
                                <div style={{ fontSize: '40px', marginBottom: '15px' }}>💝</div>
                                <h2 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>오늘의 큐티 완료!</h2>
                                <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px' }}>말씀과 함께 승리하는 하루 되세요.</p>
                                <button onClick={() => setView('community')} style={{ width: '100%', padding: '16px', background: '#D4AF37', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' }}>은혜나눔 게시판 가기</button>
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
                        <button onClick={() => setQtStep('done')} style={{ width: '100%', padding: '16px', background: '#D4AF37', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' }}>큐티 마칠게요</button>
                    )}
                    {qtStep === 'done' && (
                        <button onClick={() => setView('home')} style={{ width: '100%', padding: '16px', background: '#EEE', color: '#333', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' }}>홈으로 이동</button>
                    )}
                </div>
            </div>
        );
    }

    /* ══════════════════════════════
       COMMUNITY PAGE
    ══════════════════════════════ */
    if (view === "community") {
        const handleAddComment = (postId: number) => {
            const commentText = commentInputs[postId];
            if (!commentText?.trim()) return;

            setCommunityPosts(communityPosts.map(post => {
                if (post.id === postId) {
                    return {
                        ...post,
                        comments: [...post.comments, {
                            id: Date.now(),
                            user: user?.email?.split('@')[0] || "예수인 성도",
                            content: commentText,
                            date: "방금 전"
                        }]
                    };
                }
                return post;
            }));
            setCommentInputs({ ...commentInputs, [postId]: "" });
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
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F0ECE4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🐑</div>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#333' }}>{post.user}</div>
                                    <div style={{ fontSize: '11px', color: '#999' }}>{post.date}</div>
                                </div>
                            </div>
                            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#444', margin: '0 0 15px 0', whiteSpace: 'pre-line' }}>{post.content}</p>

                            {/* Comments Section */}
                            <div style={{ borderTop: '1px solid #F5F5F5', paddingTop: '15px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', marginBottom: '10px' }}>댓글 {post.comments.length}개</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                                    {post.comments.map(comment => (
                                        <div key={comment.id} style={{ background: '#FAFAFA', padding: '10px 15px', borderRadius: '12px', fontSize: '13px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 700, color: '#555' }}>{comment.user}</span>
                                                <span style={{ fontSize: '10px', color: '#AAA' }}>{comment.date}</span>
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
       CHAT PAGE
    ══════════════════════════════ */
    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: "480px", margin: "0 auto", background: "white", ...baseFont }}>
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
}
