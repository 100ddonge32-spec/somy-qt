"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getGraceVerse } from '@/lib/navigator-verses';
import { getTodayCcm, CcmVideo, CCM_LIST } from "@/lib/ccm";
import * as XLSX from 'xlsx';

type View = "home" | "chat" | "qt" | "community" | "qtManage" | "stats" | "history" | "admin" | "ccm" | "sermon" | "sermonManage" | "guide" | "profile" | "memberSearch";

const SOMY_IMG = "/somy.png";
const CHURCH_LOGO = process.env.NEXT_PUBLIC_CHURCH_LOGO_URL || "https://cdn.imweb.me/thumbnail/20210813/569458bf12dd0.png";
const CHURCH_URL = process.env.NEXT_PUBLIC_CHURCH_URL || "https://jesus-in.imweb.me/index";
const CHURCH_NAME = process.env.NEXT_PUBLIC_CHURCH_NAME || "예수인교회";
const APP_SUBTITLE = process.env.NEXT_PUBLIC_APP_SUBTITLE || "큐티 동반자";
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "pastorbaek@kakao.com,kakao_4761026797@kakao.somy-qt.local").toLowerCase().split(',').map(e => e.trim());


const QT_DATA = {
    date: "", // 하이드레이션 오류 방지를 위해 초기값 비움
    verse: "여호와는 나의 목자시니 내게 부족함이 없으리로다",
    reference: "시편 23:1",
    fullPassage: `여호와는 나의 목자시니 내게 부족함이 없으리로다
그가 나를 푸른 풀밭에 누이시며
쉴 만한 물 가으로 인도하시는도다
내 영혼을 소생시키시고
자기 이름을 위하여 의의 길로 인도하시는도다`,
    interpretation: `하나님은 우리 삶의 선한 목자가 되셔서, 가장 필요한 것을 푸른 풀밭과 쉴 만한 물가처럼 넉넉히 공급해 주십니다. 때로는 우리가 걷는 길이 험난해 보일지라도, 목자 되신 주님께서 앞서 걸으시며 우리의 영혼을 회복시키시고 가장 올바른 의의 길로 인도하고 계심을 확신할 수 있습니다.`,
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
    is_private?: boolean; // 비공개 여부
}

interface Notification {
    id: number;
    user_id: string;
    actor_name: string;
    type: 'comment';
    post_id: number;
    is_read: boolean;
    created_at: string;
}

// [초극강 최적화] YouTube API 스크립트를 파일 파싱 즉시 로드 시작 (병렬 처리 극대화)
if (typeof window !== 'undefined' && !document.getElementById('yt-api-script')) {
    const tag = document.createElement('script');
    tag.id = 'yt-api-script';
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    document.head.appendChild(tag);
}

// YouVersion(bible.com) 성경 본문 직통 연결 로직 (개역한글: 88)
const YOUVERSION_BOOKS: Record<string, string> = {
    "창세기": "GEN", "출애굽기": "EXO", "레위기": "LEV", "민수기": "NUM", "신명기": "DEU",
    "여호수아": "JOS", "사사기": "JDG", "룻기": "RUT", "사무엘상": "1SA", "사무엘하": "2SA",
    "열왕기상": "1KI", "열왕기하": "2KI", "역대상": "1CH", "역대하": "2CH", "에스라": "EZR",
    "느헤미야": "NEH", "에스더": "EST", "욥기": "JOB", "시편": "PSA", "잠언": "PRO",
    "전도서": "ECC", "아가": "SNG", "이사야": "ISA", "예레미야": "JER", "예레미야애가": "LAM",
    "에스겔": "EZK", "다니엘": "DAN", "호세아": "HOS", "요엘": "JOL", "아모스": "AMO",
    "오바댜": "OBA", "요나": "JON", "미가": "MIC", "나훔": "NAM", "하박국": "HAB",
    "스바냐": "ZEP", "학개": "HAG", "스가랴": "ZEC", "말라기": "MAL",
    "마태복음": "MAT", "마가복음": "MRK", "누가복음": "LUK", "요한복음": "JHN", "사도행전": "ACT",
    "로마서": "ROM", "고린도전서": "1CO", "고린도후서": "2CO", "갈라디아서": "GAL", "에베소서": "EPH",
    "빌립보서": "PHP", "골로새서": "COL", "데살로니가전서": "1TH", "데살로니가후서": "2TH", "디모데전서": "1TI",
    "디모데후서": "2TI", "디도서": "TIT", "빌레몬서": "PHM", "히브리서": "HEB", "야고보서": "JAS",
    "베드로전서": "1PE", "베드로후서": "2PE", "요한일서": "1JN", "요한이서": "2JN", "요한삼서": "3JN",
    "유다서": "JUD", "요한계시록": "REV"
};

function getYouVersionUrl(reference: string): string {
    const cleanRef = reference.replace(/\s+/g, '');
    const match = cleanRef.match(/^([가-힣]+(?:상|하|전|후|일|이|삼)?)([0-9]+)/);

    if (match) {
        let bookName = match[1];
        const chapter = match[2];
        const bookAbbrMap: Record<string, string> = {
            "창": "창세기", "출": "출애굽기", "레": "레위기", "민": "민수기", "신": "신명기",
            "수": "여호수아", "삿": "사사기", "룻": "룻기", "삼상": "사무엘상", "삼하": "사무엘하",
            "왕상": "열왕기상", "왕하": "열왕기하", "대상": "역대상", "대하": "역대하", "스": "에스라",
            "느": "느헤미야", "에": "에스더", "욥": "욥기", "시": "시편", "잠": "잠언",
            "전": "전도서", "아": "아가", "사": "이사야", "렘": "예레미야", "애": "예레미야애가",
            "겔": "에스겔", "단": "다니엘", "호": "호세아", "욜": "요엘", "암": "아모스",
            "옵": "오바댜", "욘": "요나", "미": "미가", "나": "나훔", "합": "하박국",
            "습": "스바냐", "학": "학개", "슥": "스가랴", "말": "말라기",
            "마": "마태복음", "막": "마가복음", "눅": "누가복음", "요": "요한복음", "행": "사도행전",
            "롬": "로마서", "고전": "고린도전서", "고후": "고린도후서", "갈": "갈라디아서", "엡": "에베소서",
            "빌": "빌립보서", "골": "골로새서", "살전": "데살로니가전서", "살후": "데살로니가후서", "딤전": "디모데전서",
            "딤후": "디모데후서", "딛": "디도서", "몬": "빌레몬서", "히": "히브리서", "약": "야고보서",
            "벧전": "베드로전서", "벧후": "베드로후서", "요일": "요한일서", "요이": "요한이서", "요삼": "요한삼서",
            "유": "유다서", "계": "요한계시록"
        };
        if (bookAbbrMap[bookName]) bookName = bookAbbrMap[bookName];

        const bookCode = YOUVERSION_BOOKS[bookName];
        if (bookCode && chapter) return `https://www.bible.com/bible/88/${bookCode}.${chapter}`;
    }

    return `https://www.bible.com/ko/search/bible?q=${encodeURIComponent(reference)}`;
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
    const [communityInput, setCommunityInput] = useState(""); // ✅ 게시판 전용 입력창 분리
    const [sermonReflection, setSermonReflection] = useState({ q1: '', q2: '', q3: '', mainGrace: '', isPrivate: false });
    const [qtStep, setQtStep] = useState<"read" | "interpret" | "reflect" | "grace" | "pray" | "done">("read");
    const [isMounted, setIsMounted] = useState(false); // 마운트 상태 추적
    const [communityPosts, setCommunityPosts] = useState<Post[]>([]);
    const [isPrivatePost, setIsPrivatePost] = useState(false); // 은혜나눔 비공개 여부
    const [lastToggleTime, setLastToggleTime] = useState(0); // 이중 트리거 방지용
    const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({});
    const [passageInput, setPassageInput] = useState("");

    // VAPID 키를 위한 Base64 변환 유틸
    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };
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
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotiList, setShowNotiList] = useState(false);
    const [ccmIndex, setCcmIndex] = useState<number | null>(null);
    const [todayCcm, setTodayCcm] = useState<CcmVideo | null>(null);
    const [ccmVolume, setCcmVolume] = useState(50);
    const [isCcmPlaying, setIsCcmPlaying] = useState(false);
    const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null); // ✅ 업로드 대기 파일 스테이트
    const [isMemberUploading, setIsMemberUploading] = useState(false); // ✅ 업로드 중 애니메이션 스테이트

    const [churchSettings, setChurchSettings] = useState<any>({
        church_name: CHURCH_NAME,
        church_logo_url: CHURCH_LOGO,
        church_url: CHURCH_URL,
        sermon_url: "",
        app_subtitle: APP_SUBTITLE,
        plan: 'free',
        community_visible: true,
        sermon_summary: '',
        sermon_q1: '',
        sermon_q2: '',
        sermon_q3: '',
        custom_ccm_list: [],
    });
    const [settingsForm, setSettingsForm] = useState<any>({
        church_name: CHURCH_NAME,
        church_logo_url: CHURCH_LOGO,
        church_url: CHURCH_URL,
        sermon_url: "",
        app_subtitle: APP_SUBTITLE,
        plan: 'free',
        community_visible: true,
        sermon_summary: '',
        sermon_q1: '',
        sermon_q2: '',
        sermon_q3: '',
        custom_ccm_list: [],
    });

    // [최적화] 커스텀 CCM 목록 우선순위 결정 로직
    const activeCcmList = (churchSettings?.custom_ccm_list && Array.isArray(churchSettings.custom_ccm_list) && churchSettings.custom_ccm_list.length > 0)
        ? churchSettings.custom_ccm_list
        : CCM_LIST;

    const [isApiReady, setIsApiReady] = useState(false);
    const [playRequested, _setPlayRequested] = useState(true); // 처음부터 재생 의도 On
    const playRequestedRef = useRef(true);
    const hasInteracted = useRef(false); // 사용자 터치 여부 (오디오 잠금 해제용)
    const setPlayRequested = (val: boolean) => {
        playRequestedRef.current = val;
        _setPlayRequested(val);
    };
    const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [showIpod, setShowIpod] = useState(true); // 아이팟 표시 여부
    const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<any>(null); // ✅ 성도 정보 수정을 위한 선택된 멤버
    const [showWelcome, setShowWelcome] = useState(false); // 소미 소개 카드 표시 여부 (기본 닫힘)
    const dragOffset = useRef({ x: 0, y: 0 });
    const playerRef = useRef<any>(null);

    useEffect(() => {
        // 화면 중앙 우측에 초기 위치 설정 (더 잘 보이도록)
        if (typeof window !== 'undefined') {
            setPlayerPos({ x: window.innerWidth - 110, y: window.innerHeight * 0.4 });
        }
    }, []);

    const [playerStatus, setPlayerStatus] = useState("Wait API...");
    const initAttempts = useRef(0);
    const pauseCooldown = useRef(false); // 일시정지 후 쿨다운 (유령 재생 방지용)

    // [최적화] 커스텀 CCM 목록 우선순위 결정 로직 (호이스팅 문제 방지를 위해 상단으로 이동)
    // const activeCcmList = (churchSettings?.custom_ccm_list && Array.isArray(churchSettings.custom_ccm_list) && churchSettings.custom_ccm_list.length > 0)
    //    ? churchSettings.custom_ccm_list
    //    : CCM_LIST;

    const handleNextCcm = useCallback(() => {
        setPlayRequested(true);
        setCcmIndex(prev => {
            if (activeCcmList.length <= 1) return 0;
            let nextIdx;
            const currentIdx = prev === null ? -1 : prev;
            do {
                nextIdx = Math.floor(Math.random() * activeCcmList.length);
            } while (nextIdx === currentIdx && activeCcmList.length > 1);
            return nextIdx;
        });
        setPlayerStatus("Next Song..");
    }, [activeCcmList]);

    const handlePrevCcm = useCallback(() => {
        setPlayRequested(true);
        setCcmIndex(prev => {
            if (activeCcmList.length <= 1) return 0;
            let nextIdx;
            const currentIdx = prev === null ? -1 : prev;
            do {
                nextIdx = Math.floor(Math.random() * activeCcmList.length);
            } while (nextIdx === currentIdx && activeCcmList.length > 1);
            return nextIdx;
        });
        setPlayerStatus("Prev Song..");
    }, [activeCcmList]);

    useEffect(() => {
        // [초강력 랜덤 시스템] 클라이언트 마운트 시점에 단 한 번 무작위 곡 선정 (Refresh 시 무조건 변경)
        const randomIdx = Math.floor(Math.random() * CCM_LIST.length);
        console.log("🎲 Random Pick Index:", randomIdx);
        setCcmIndex(randomIdx);

        // 첫 방문 여부 확인 (소미 소개 카드 토글용)
        const introSeen = localStorage.getItem('somy_intro_seen');
        if (!introSeen) {
            setShowWelcome(true);
            localStorage.setItem('somy_intro_seen', 'true');
        }
    }, []);

    useEffect(() => {
        if (ccmIndex === null) return;

        // 인덱스 범위 초과 방지 (목록이 바뀌었을 때 대비)
        const safeIdx = ccmIndex >= activeCcmList.length ? 0 : ccmIndex;
        const song = activeCcmList[safeIdx];

        if (!song) return;

        setTodayCcm(song);
        // 곡이 바뀌면 재생 시도
        if (playerRef.current && playerRef.current.loadVideoById) {
            if (playRequestedRef.current) {
                playerRef.current.loadVideoById(song.youtubeId);
            } else {
                playerRef.current.cueVideoById(song.youtubeId);
            }
            setPlayerStatus("Switching..");
        }
    }, [ccmIndex, activeCcmList]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // [초속 로딩] YouTube 서버 사전 연결
        const preconnects = [
            "https://www.youtube.com",
            "https://www.google.com",
            "https://s.ytimg.com",
            "https://i.ytimg.com"
        ];
        preconnects.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = url;
            document.head.appendChild(link);
        });

        // API 준비 콜백 정의
        (window as any).onYouTubeIframeAPIReady = () => {
            console.log("📥 YT API Ready (Stable)");
            setIsApiReady(true);
            setPlayerStatus("Engine Ready");
        };

        // 이미 로드된 경우 체크
        if ((window as any).YT && (window as any).YT.Player) {
            setIsApiReady(true);
            setPlayerStatus("Engine Ready");
        }
    }, []);

    const initPlayer = useCallback(() => {
        if (!isApiReady || !todayCcm || playerRef.current || ccmIndex === null) return;

        const container = document.getElementById('ccm-player-hidden-global');
        if (!container) return;

        console.log("🏗 Initializing Player...");
        setPlayerStatus("Loading..");

        try {
            playerRef.current = new (window as any).YT.Player('ccm-player-hidden-global', {
                height: '100%',
                width: '100%',
                videoId: todayCcm.youtubeId,
                playerVars: {
                    'autoplay': 0,
                    'mute': 1,
                    'controls': 1,
                    'showinfo': 0,
                    'rel': 0,
                    'iv_load_policy': 3,
                    'enablejsapi': 1,
                    'playsinline': 1,
                    'origin': window.location.origin
                },
                events: {
                    'onReady': (event: any) => {
                        console.log("✅ Player Ready");
                        setPlayerStatus("Ready");
                        // 만약 유저가 이미 재생을 눌렀다면 시동
                        if (playRequestedRef.current) {
                            event.target.playVideo();
                        }
                    },
                    'onStateChange': (event: any) => {
                        const state = event.data;
                        const YTState = (window as any).YT.PlayerState;

                        // MediaSession API 연동 (모바일 잠금화면 제어)
                        if ('mediaSession' in navigator && todayCcm) {
                            navigator.mediaSession.metadata = new MediaMetadata({
                                title: todayCcm.title,
                                artist: todayCcm.artist,
                                album: 'Somy QT CCM',
                                artwork: [
                                    { src: `https://img.youtube.com/vi/${todayCcm.youtubeId}/mqdefault.jpg`, sizes: '320x180', type: 'image/jpeg' }
                                ]
                            });

                            navigator.mediaSession.setActionHandler('play', () => { togglePlay(); });
                            navigator.mediaSession.setActionHandler('pause', () => { togglePlay(); });
                            navigator.mediaSession.setActionHandler('nexttrack', () => { handleNextCcm(); });
                            navigator.mediaSession.setActionHandler('previoustrack', () => { handlePrevCcm(); });

                            if (state === YTState.PLAYING) navigator.mediaSession.playbackState = 'playing';
                            else if (state === YTState.PAUSED) navigator.mediaSession.playbackState = 'paused';
                        }

                        if (state === YTState.PLAYING) {
                            setIsCcmPlaying(true);
                            setPlayerStatus("Playing");
                            if (hasInteracted.current) event.target.unMute();
                        } else if (state === YTState.PAUSED) {
                            setIsCcmPlaying(false);
                            setPlayerStatus("Paused");
                        } else if (state === YTState.ENDED) {
                            // 곡이 끝나면 자동으로 다음 (무작위) 곡 재생
                            handleNextCcm();
                        }
                    },
                    'onError': (e: any) => {
                        console.error("❌ Player Error:", e.data);
                        handleNextCcm(); // 에러 시 다음 곡으로 토스
                    }
                }
            });
        } catch (err) {
            console.error("Fatal Init Error:", err);
        }
    }, [isApiReady, todayCcm, handleNextCcm]);

    useEffect(() => {
        if (isApiReady && todayCcm && !playerRef.current) {
            initPlayer();
        }
    }, [isApiReady, todayCcm, initPlayer]);

    // YouTube 오버레이 동기화 로직 (DOM 구조는 고정하고 좌표만 추적해 Iframe 리로드 에러 원천 차단)
    useEffect(() => {
        const updatePosition = () => {
            const portal = document.getElementById('youtube-portal-storage');
            const wrapper = document.getElementById('ccm-player-hidden-global-wrapper');
            if (!portal || !wrapper) return;

            const largeScreen = document.getElementById('ccm-large-screen');
            const miniScreen = document.getElementById('ccm-mini-screen');

            // 포털 자체를 화면 맨 위 z-index로 부유시킴
            portal.style.position = 'fixed';
            portal.style.transition = isDragging ? 'none' : 'top 0.3s, left 0.3s, width 0.3s, height 0.3s';
            portal.style.overflow = 'hidden';

            if (view === 'ccm' && largeScreen) {
                const rect = largeScreen.getBoundingClientRect();
                portal.style.top = `${rect.top}px`;
                portal.style.left = `${rect.left}px`;
                portal.style.width = `${rect.width}px`;
                portal.style.height = `${rect.height}px`;
                portal.style.zIndex = '1000';
                portal.style.borderRadius = '16px';
                portal.style.pointerEvents = 'auto';
                wrapper.style.pointerEvents = 'auto'; // allow click to play
                portal.style.opacity = '1';
                portal.style.visibility = 'visible';
            } else if (showIpod && miniScreen) {
                const rect = miniScreen.getBoundingClientRect();
                portal.style.top = `${rect.top}px`;
                portal.style.left = `${rect.left}px`;
                portal.style.width = `${rect.width}px`;
                portal.style.height = `${rect.height}px`;
                portal.style.zIndex = '2100'; // 미니 플레이어(2000)보다 높게
                portal.style.borderRadius = '12px';
                portal.style.pointerEvents = 'none'; // 미니 플레이어에선 터치 통과 (휠 우선)
                wrapper.style.pointerEvents = 'none';
                portal.style.opacity = '1';
                portal.style.visibility = 'visible';
            } else {
                portal.style.top = '-5000px';
                portal.style.left = '-5000px';
                portal.style.opacity = '0';
                portal.style.pointerEvents = 'none';
                wrapper.style.pointerEvents = 'none';
            }
        };

        const timer = setTimeout(updatePosition, 10); // DOM 회복 딜레이

        window.addEventListener('resize', updatePosition);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updatePosition);
        };
    }, [view, showIpod, playerPos, isDragging]);

    // 강력한 재생 보장 watchdog
    useEffect(() => {
        const watchdog = setInterval(() => {
            if (!playerRef.current || !playerRef.current.getPlayerState) return;
            const state = playerRef.current.getPlayerState();
            const YTState = (window as any).YT.PlayerState;

            if (playRequestedRef.current && state !== YTState.PLAYING && state !== YTState.BUFFERING) {
                // 재생 요청 중인데 안 꺼져있으면 시도 (정책 우회를 위해 mute 상태 유지 가능)
                try {
                    if (!hasInteracted.current) playerRef.current.mute();
                    playerRef.current.playVideo();
                } catch (e) { }
            }
        }, 300); // 0.3초 주기로 초정밀 감시
        return () => clearInterval(watchdog);
    }, []);

    // 유저 전역 점화 시스템 (터치 이력이 생기는 순간 모든 오디오 엔진 부팅)
    useEffect(() => {
        const igniteEngine = () => {
            if (hasInteracted.current) return;
            console.log("🔥 Gospel Ignition: User Interacted");
            hasInteracted.current = true;

            if (playerRef.current && playRequestedRef.current) {
                try {
                    playerRef.current.unMute();
                    playerRef.current.setVolume(ccmVolume);
                    playerRef.current.playVideo();
                    setPlayerStatus("Playing");
                } catch (e) { }
            }
        };
        // 'once'를 쓰지 않고 명시적으로 플래그 체크 (더 확실함)
        window.addEventListener('click', igniteEngine);
        window.addEventListener('touchstart', igniteEngine);
        return () => {
            window.removeEventListener('click', igniteEngine);
            window.removeEventListener('touchstart', igniteEngine);
        };
    }, [ccmVolume]);

    // 승인 상태 및 교회 정보 체크 함수 (서버와 동기화 포함)
    const checkApprovalStatus = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase.from('profiles').select('is_approved, church_id').eq('id', user.id).single();

            if (error || !data) {
                console.log("프로필 정보가 없거나 조회 실패, 서버와 동기화 시도...");
                const syncRes = await fetch('/api/auth/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: user.id,
                        email: user.email,
                        name: user.user_metadata?.full_name || user.user_metadata?.name,
                        avatar_url: user.user_metadata?.avatar_url
                    })
                });
                if (syncRes.ok) {
                    const syncData = await syncRes.json();
                    setIsApproved(syncData.is_approved);
                    console.log("동기화 완료:", syncData);
                }
                return;
            }

            if (data) {
                setIsApproved(data.is_approved);
                if (data.church_id) {
                    console.log(`[Approval] Church ID found: ${data.church_id}`);
                    setChurchId(data.church_id);
                } else {
                    setChurchId('jesus-in'); // 기본값 강제
                }
            }
        } catch (err) {
            console.error("상태 확인 중 오류:", err);
        }
    }, [user, setIsApproved, setChurchId]);

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

            // 최초 1회 체크 및 동기화
            checkApprovalStatus();

            // 승인 대기 중일 때 15초마다 자동으로 상태 재확인 & 알림 폴링 (알림 배지 실시간 갱신용)
            const backgroundPoller = setInterval(() => {
                checkApprovalStatus();
                fetch(`/api/notifications?user_id=${user.id}`)
                    .then(r => r.ok ? r.json() : [])
                    .then(data => setNotifications(data))
                    .catch(e => { });
            }, 15000);

            // 알림 최초 1회 로드
            fetch(`/api/notifications?user_id=${user.id}`)
                .then(r => r.ok ? r.json() : [])
                .then(data => setNotifications(data))
                .catch(err => console.error("알림 로드 실패:", err));

            // [푸시 알림] 서비스 워커 등록 및 구독 처리
            if ('serviceWorker' in navigator && user) {
                navigator.serviceWorker.register('/sw.js').then(async (reg) => {
                    console.log('Service Worker Registered');

                    const subscribeUser = async () => {
                        try {
                            const subscribeOptions = {
                                userVisibleOnly: true,
                                applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BCpTn0SHIYSZzjST5xxL1Cv9svmlp3f9Xmvt9FSALBvo4QwLQCBlo_mu4ThoMHgINRmAk4c9sxwVwI2QtDyHr1I')
                            };
                            const subscription = await reg.pushManager.subscribe(subscribeOptions);
                            console.log('Push Subscribed:', subscription);

                            await fetch('/api/push-subscribe', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ user_id: user.id, subscription })
                            });
                        } catch (e) {
                            console.error('Push Subscription Error:', e);
                        }
                    };

                    if (Notification.permission === 'default') {
                        setTimeout(async () => {
                            if (confirm('오늘의 큐티 알림을 받아보시겠어요? 😊')) {
                                const permission = await Notification.requestPermission();
                                if (permission === 'granted') await subscribeUser();
                            }
                        }, 3000);
                    } else if (Notification.permission === 'granted') {
                        await subscribeUser();
                    }
                });
            }

            return () => clearInterval(backgroundPoller);
        } else {
            setAdminInfo(null);
            setIsApproved(false);
            setNotifications([]);
        }
    }, [user]);

    // [김부장의 신의 한 수] 유저의 교회 정보가 확인되면 즉시 해당 교회 설정 로드
    useEffect(() => {
        const loadSettings = async () => {
            const cId = churchId || 'jesus-in';
            console.log(`[Reactive Settings] Loading for: ${cId}`);
            try {
                const r = await fetch(`/api/settings?church_id=${cId}`, { cache: 'no-store' });
                const { settings } = await r.json();
                if (settings) {
                    const saneSettings = {
                        ...settings,
                        community_visible: settings.community_visible ?? true
                    };
                    setChurchSettings(saneSettings);
                    setSettingsForm(saneSettings);
                }
            } catch (err) {
                console.error("[Settings] Load Failed:", err);
            }
        };
        loadSettings();
    }, [churchId]);
    const [qtData, setQtData] = useState({
        date: "",
        reference: QT_DATA.reference,
        fullPassage: QT_DATA.fullPassage,
        interpretation: QT_DATA.interpretation,
        verse: QT_DATA.verse,
        questions: QT_DATA.questions,
        prayer: QT_DATA.prayer,
    });
    const [qtForm, setQtForm] = useState({ date: '', reference: '', passage: '', interpretation: '', question1: '', question2: '', question3: '', prayer: '' });
    const [sermonManageForm, setSermonManageForm] = useState({ script: '', summary: '', q1: '', q2: '', q3: '', videoUrl: '', inputType: 'text' as 'text' | 'video' });
    const [aiLoading, setAiLoading] = useState(false);
    const [stats, setStats] = useState<{ today: { count: number; members: { user_name: string; avatar_url: string | null }[] }; ranking: { name: string; avatar: string | null; count: number }[]; totalCompletions: number } | null>(null);
    const [statsError, setStatsError] = useState<string | null>(null);

    const [showSettings, setShowSettings] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallGuide, setShowInstallGuide] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setDeferredPrompt(null);
        } else {
            // iOS나 기타 환경에서는 안내 모달 표시
            setShowInstallGuide(true);
        }
    };
    const [history, setHistory] = useState<any[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const fetchHistory = async () => {
        if (!user) return;
        setIsHistoryLoading(true);
        try {
            const res = await fetch(`/api/qt/history?user_id=${user.id}`);
            const data = await res.json();
            if (Array.isArray(data)) setHistory(data);
        } catch (e) { console.error("히스토리 로드 실패:", e); }
        finally { setIsHistoryLoading(false); }
    };
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [adminTab, setAdminTab] = useState<"settings" | "members" | "master">("settings");
    const [memberList, setMemberList] = useState<any[]>([]);
    const [isManagingMembers, setIsManagingMembers] = useState(false);
    const [isHistoryMode, setIsHistoryMode] = useState(false);
    const [churchStats, setChurchStats] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        setIsMounted(true);

        // ✅ URL 파라미터에서 교회 ID 읽어오기 (?church=교회ID)
        const params = new URLSearchParams(window.location.search);
        const churchFromUrl = params.get('church');
        if (churchFromUrl) {
            setChurchId(churchFromUrl);
            console.log(`[Initialize] Church set from URL: ${churchFromUrl}`);
        }

        const hasVisited = localStorage.getItem('somy_intro_seen');
        if (!hasVisited) {
            setShowWelcome(true);
        }

        // 초기 날짜 설정
        const todayStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        setQtData(prev => ({ ...prev, date: todayStr }));

        // 글로벌 스타일 동적 주입
        const styleId = 'somy-ipod-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                @keyframes wave-music {
                    0%, 100% { height: 4px; }
                    50% { height: 24px; }
                }
                @keyframes halo-pulse {
                    0% { opacity: 0.3; transform: scaleX(1); }
                    50% { opacity: 1; transform: scaleX(1.5); }
                    100% { opacity: 0.3; transform: scaleX(1); }
                }
            `;
            document.head.appendChild(style);
        }
    }, []);
    const scrollRef = useRef<HTMLDivElement>(null);
    const passageRef = useRef<HTMLDivElement>(null);

    const [isQtLoading, setIsQtLoading] = useState(false);

    const parsePassage = (raw: string) => {
        if (!raw) return { fullPassage: '', interpretation: '' };

        let fullPassage = '';
        let interpretation = '';

        // 1. 표준 구분자 '|||' 확인 (서버에서 이 포맷으로 전달됨)
        if (raw.includes('|||')) {
            const parts = raw.split('|||');
            fullPassage = parts[0]?.trim() || '';
            interpretation = parts[1]?.trim() || '';
        }
        // 2. 키워드 기반 분리 시도 (구분자가 깨졌을 경우 대비)
        else if (raw.includes('[AI 본문 해설]')) {
            const parts = raw.split('[AI 본문 해설]');
            fullPassage = parts[0]?.trim();
            interpretation = parts[1]?.trim();
        }
        else {
            fullPassage = raw.trim();
            interpretation = '';
        }

        // [최종 데이터 세정] 
        // 본문 안에 해설 유도 태그가 남아있거나, 본문 자체가 해설처럼 보일 때의 보정
        const tags = ['[AI 본문 해설]', '본문 요약:', '묵상 포인트:', '해설:'];
        tags.forEach(tag => {
            if (fullPassage.includes(tag)) {
                // 만약 본문 칸에 해설 태그가 들어있다면, 그 이후는 해설로 넘김
                const parts = fullPassage.split(tag);
                if (parts[1]) interpretation = parts[1].trim();
                fullPassage = parts[0].trim();
            }
            fullPassage = fullPassage.replace(tag, '').trim();
        });

        // 결과가 비정상적일 때의 보강
        if (!fullPassage && interpretation) {
            fullPassage = "본문을 불러오지 못했습니다. 잠시 후 다시 '불러오기'를 눌러주세요.";
        }

        return { fullPassage, interpretation };
    };

    const fetchQt = async () => {
        setIsQtLoading(true);
        setIsHistoryMode(false); // 새로운 큐티이므로 히스토리 모드 해제
        try {
            const r = await fetch('/api/qt', { cache: 'no-store' });
            const { qt } = await r.json();
            if (qt) {
                const { fullPassage, interpretation } = parsePassage(qt.passage);
                console.log("[fetchQt] Parsed Qt:", { fullPassage: fullPassage.substring(0, 20), interpretation: interpretation?.substring(0, 20) });
                setQtData({
                    date: new Date(qt.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
                    reference: qt.reference,
                    fullPassage,
                    interpretation: interpretation || "",
                    verse: fullPassage.split('\n')[0],
                    questions: [qt.question1, qt.question2, qt.question3].filter(Boolean),
                    prayer: qt.prayer,
                });
                setAnswers(new Array([qt.question1, qt.question2, qt.question3].filter(Boolean).length).fill(''));
            } else {
                // 데이터가 없을 경우 기본값으로 리셋
                setQtData({
                    date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
                    reference: QT_DATA.reference,
                    fullPassage: QT_DATA.fullPassage,
                    interpretation: QT_DATA.interpretation,
                    verse: QT_DATA.verse,
                    questions: QT_DATA.questions,
                    prayer: QT_DATA.prayer,
                });
                setAnswers(new Array(QT_DATA.questions.length).fill(''));
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

        // 오늘의 큐티 로드
        console.log("[FetchQt] Starting...");
        fetchQt();

        // 오늘의 큐티 로드
        console.log("[FetchQt] Starting...");
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

    const handleBack = () => {
        if (view === "qt") {
            if (qtStep === "interpret") setQtStep("read");
            else if (qtStep === "reflect") setQtStep("interpret");
            else if (qtStep === "grace") setQtStep("reflect");
            else if (qtStep === "pray") setQtStep("grace");
            else setView("home");
        } else {
            setView("home");
        }
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            {
                "교인사진": "(이 칸은 비워두거나 사진 파일명을 입력하세요)",
                "성명": "홍길동",
                "교적번호": "2024-001",
                "생년월일": "1990-01-01",
                "성별": "남",
                "교회직분": "성도",
                "휴대폰": "010-1234-5678",
                "주소": "서울특별시 ..."
            }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "성도양식");
        XLSX.writeFile(wb, "성도명단_표준양식.xlsx");
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
      @keyframes float-gentle { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(0); } } /* 흔들림 완전 차단 */
      @keyframes halo-pulse { 0%,100%{ opacity:.7; transform:translateX(-50%) scaleX(1); } 50%{ opacity:1; transform:translateX(-50%) scaleX(1.1); } }
      @keyframes shadow-pulse { 0%,100%{ transform:translateX(-50%) scaleX(1); opacity:.2; } 50%{ transform:translateX(-50%) scaleX(.7); opacity:.1; } }
      @keyframes fade-in { from{ opacity:0; transform:translateY(10px); } to{ opacity:1; transform:translateY(0); } }
      @keyframes slide-right { from{ opacity:0; transform:translateX(10px); } to{ opacity:1; transform:translateX(0); } }
      @keyframes bounce-dot { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-7px); } }
      @keyframes bell-swing {
          0%, 100% { transform: rotate(0); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(15deg); }
          20%, 40%, 60%, 80% { transform: rotate(-15deg); }
      }
      @keyframes bounce-light {
          from { transform: translateY(0); }
          to { transform: translateY(-3px); }
      }
      @keyframes slide-up {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
      button:active {
          transform: scale(0.96) !important;
          transition: transform 0.1s ease !important;
      }
      a:active {
          transform: scale(0.98);
          opacity: 0.8;
      }
    `}</style>
    );

    const hapticClick = useCallback((e: React.MouseEvent | React.TouchEvent, action: () => void) => {
        e.stopPropagation();
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
        action();
    }, []);

    const togglePlay = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
        if (e) {
            e.stopPropagation();
            // [모바일 이중 트리거 방지] 300ms 내 재입력 차단
            const now = Date.now();
            if (now - lastToggleTime < 300) return;
            setLastToggleTime(now);
        }

        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);

        hasInteracted.current = true;

        if (!playerRef.current) {
            setPlayRequested(true);
            initPlayer();
            return;
        }

        try {
            const state = playerRef.current.getPlayerState?.();
            const YTState = (window as any).YT.PlayerState;

            if (state === YTState.PLAYING) {
                setPlayRequested(false);
                playerRef.current.pauseVideo();
                setPlayerStatus("Paused");
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
            } else {
                setPlayRequested(true);
                playerRef.current.unMute();
                playerRef.current.setVolume(ccmVolume);
                playerRef.current.playVideo();
                setPlayerStatus("Playing");
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
            }
        } catch (err) {
            console.error("Play Toggle Error:", err);
            initPlayer();
        }
    }, [ccmVolume, initPlayer, lastToggleTime]);

    const renderContent = () => {
        if (view === "home") {
            return (
                <div style={{
                    minHeight: "100vh",
                    background: "linear-gradient(180deg, #FFF8F0 0%, #FEF0D8 50%, #F5E0BB 100%)",
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "space-between", padding: "40px 24px 60px 24px",
                    maxWidth: "480px", margin: "0 auto", ...baseFont,
                    position: 'relative'
                }}>
                    {/* 우측 상단 소미 & 사용자 정보 */}
                    <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 10 }}>
                        {user && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'rgba(255,255,255,0.7)', padding: '6px 12px',
                                borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                fontSize: '12px', border: '1px solid rgba(255,255,255,0.8)',
                                backdropFilter: 'blur(5px)'
                            }}>
                                <span style={{ color: '#333', fontWeight: 700 }}>{user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]}님</span>
                                <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontWeight: 600, fontSize: '11px', padding: 0 }}>로그아웃</button>
                            </div>
                        )}
                        {/* 소미 미니 아바타 (누르면 인트로 다시 보기) */}
                        <div onClick={() => setShowWelcome(true)} style={{ width: "38px", height: "38px", borderRadius: "50%", background: "white", border: "2px solid #D4AF37", overflow: "hidden", boxShadow: "0 4px 10px rgba(0,0,0,0.1)", cursor: "pointer" }}>
                            <img src={SOMY_IMG} alt="소미" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                    </div>
                    {styles}

                    {/* 환영 모달 (인트로 스크린) */}
                    {showWelcome && (
                        <div style={{ position: 'fixed', inset: 0, background: "linear-gradient(180deg, #FFF8F0 0%, #FEF0D8 100%)", zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px' }}>
                            <div style={{ display: "flex", justifyContent: "center", marginBottom: "30px" }}>
                                <div style={{ position: "relative" }}>
                                    <div style={{ position: "absolute", top: "-10px", left: "50%", width: "120px", height: "15px", border: "3px solid #D4AF37", borderRadius: "999px", zIndex: 2 }} />
                                    <div style={{ width: "170px", height: "170px", borderRadius: "50%", background: "white", boxShadow: "0 15px 45px rgba(212,175,55,.3), 0 5px 15px rgba(0,0,0,.08)", border: "4px solid white", overflow: "hidden" }}>
                                        <img src={SOMY_IMG} alt="소미" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    </div>
                                    <div style={{ position: "absolute", bottom: "-20px", left: "50%", width: "100px", height: "14px", background: "radial-gradient(ellipse,rgba(180,140,60,.3) 0%,transparent 70%)", borderRadius: "50%" }} />
                                </div>
                            </div>
                            <div style={{ animation: "fade-in 1s ease-out", textAlign: "center", marginBottom: "30px" }}>
                                <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#333", margin: "0 0 10px 0", letterSpacing: "-0.5px" }}>
                                    저는 당신의 큐티도우미 <span style={{ color: "#D4AF37" }}>소미</span> 입니다
                                </h1>
                                <p style={{ fontSize: "16px", color: "#B8924A", fontWeight: 600, margin: 0 }}>{churchSettings.church_name} {churchSettings.app_subtitle}</p>
                            </div>

                            <div style={{ background: "rgba(255, 255, 255, 0.6)", padding: "24px", borderRadius: "24px", border: "1px solid rgba(212, 175, 55, 0.2)", maxWidth: "320px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", textAlign: "center", marginBottom: "40px", animation: "fade-in 1.2s ease-out" }}>
                                <p style={{ fontSize: "15px", color: "#8B6E3F", lineHeight: 1.6, margin: "0 0 12px 0", wordBreak: 'keep-all', fontWeight: 500 }}>
                                    <strong style={{ color: "#D4AF37", fontSize: "16px" }}>소미(SOMY)</strong>는 <strong style={{ color: "#D4AF37" }}>'포솜포솜한 양'</strong>과 <br />
                                    하나님의 <strong style={{ color: "#D4AF37" }}>'말씀의 소리(Sori)'</strong>를 합친 이름이에요.
                                </p>
                                <div style={{ height: '1px', background: 'rgba(212, 175, 55, 0.1)', margin: '15px 0' }} />
                                <p style={{ fontSize: "14px", color: "#8B6E3F", lineHeight: 1.6, margin: 0 }}>
                                    매일 아침, 포근한 양의 모습으로 찾아와 <br />
                                    말씀의 세미한 음성을 들려주는 동반자랍니다. ✨
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    setShowWelcome(false);
                                    localStorage.setItem('somy_intro_seen', 'true');
                                }}
                                style={{ width: '100%', maxWidth: '300px', padding: '16px', background: '#333', color: 'white', border: 'none', borderRadius: '18px', fontSize: '17px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}>
                                은혜의 자리로 들어가기
                            </button>
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
                        marginTop: "30px", // 겹침 방지를 위해 위쪽 여백 추가
                        marginBottom: "20px",
                        animation: "fade-in 0.8s ease-out"
                    }}>
                        <img src={churchSettings.church_logo_url} alt={`${churchSettings.church_name} 로고`} style={{ height: "45px", objectFit: "contain" }} />
                        <div style={{ fontSize: "12px", color: "#666", letterSpacing: "1px", fontWeight: 700 }}>홈페이지</div>
                    </a>
                    {/* Character Section */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center", flex: 1, justifyContent: 'center', width: "100%", minHeight: '400px' }}>
                        <div
                            style={{
                                background: "rgba(255, 255, 255, 0.9)",
                                borderRadius: "24px",
                                padding: "24px",
                                width: "100%",
                                maxWidth: "320px",
                                boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
                                border: "1px solid #F0ECE4",
                                animation: "fade-in 0.8s ease-out",
                                minHeight: "330px",
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'flex-start',
                                textAlign: 'left',
                                backdropFilter: 'blur(10px)',
                                transition: 'none', // 급격한 변화 방지
                                transform: 'none', // 물리적인 움직임 원천 차단
                                userSelect: 'none' // 드래그로 인한 흔들림 방지
                            }}>
                            {(() => {
                                const graceVerse = getGraceVerse();
                                return (
                                    <>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                                            <div style={{ width: '32px', height: '32px', background: '#F5F2EA', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>📖</div>
                                            <span style={{ fontSize: "15px", fontWeight: 800, color: "#9E7B31", letterSpacing: '-0.2px' }}>오늘의 말씀</span>
                                        </div>
                                        <div style={{ position: 'relative', padding: '0 4px' }}>
                                            <p style={{ position: 'relative', zIndex: 1, fontSize: "15px", color: "#444", lineHeight: 1.8, margin: "0 0 16px 0", fontWeight: 500, wordBreak: 'keep-all', textAlign: 'center' }}>
                                                "{graceVerse.verse}"
                                            </p>
                                        </div>
                                        <p style={{ fontSize: "13px", color: "#B8924A", fontWeight: 700, margin: 0, textAlign: 'right' }}>
                                            — {graceVerse.book} {graceVerse.ref} <span style={{ fontSize: '10px', color: '#CCC', fontWeight: 400 }}>(개역한글)</span>
                                        </p>

                                        <div style={{ width: '100%', height: '1px', background: 'repeating-linear-gradient(to right, #EEEEEE 0, #EEEEEE 4px, transparent 4px, transparent 8px)', margin: '20px 0' }} />

                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            <div style={{ fontSize: '13px', color: '#999', fontWeight: 700, letterSpacing: '0.5px' }}>💡 오늘의 한줄!</div>
                                            {(() => {
                                                const quotes = [
                                                    "하나님은 우리가 감당할 수 없는 시련을 주시지는 않는다. - 고린도전서 10:13 강해 중",
                                                    "기도는 하나님의 팔을 움직이는 가장 조용한 힘이다. - 찰스 스펄전",
                                                    "하나님께서 나의 계획을 무너뜨리시는 것은, 나의 계획이 나를 무너뜨릴 수 있기 때문이다. - 코리 텐 붐",
                                                    "우리가 하나님을 온전히 신뢰할 때, 하나님은 우리의 모든 상황을 그분의 목적을 위해 사용하신다. - A.W. 토저",
                                                    "고난은 하나님의 변장된 축복이다. 그것은 우리를 하나님께로 더 가까이 이끈다. - C.S. 루이스",
                                                    "우리가 하나님 외에 다른 곳에서 만족을 찾으려 할 때, 우리는 결코 만족을 얻을 수 없다. - 어거스틴",
                                                    "성경은 단순히 읽기 위한 책이 아니라, 우리 삶이 읽혀지기 위한 거울이다. - D.L. 무디"
                                                ];
                                                const todayIndex = new Date().getDate() % quotes.length;
                                                return (
                                                    <div style={{
                                                        fontSize: '14.5px',
                                                        color: '#2D2D2D',
                                                        lineHeight: 1.7,
                                                        wordBreak: 'keep-all',
                                                        fontStyle: 'normal',
                                                        fontWeight: 500,
                                                        background: 'rgba(212, 175, 55, 0.04)',
                                                        padding: '12px 16px',
                                                        borderRadius: '12px',
                                                        borderLeft: '4px solid #D4AF37',
                                                        letterSpacing: '-0.3px'
                                                    }}>
                                                        "{quotes[todayIndex]}"
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%", maxWidth: "320px", animation: "fade-in 1.4s ease-out", paddingBottom: "40px", marginTop: "30px" }}>
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
                            <div style={{ background: '#FFFDE7', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)', border: '1px solid #FFF59D', textAlign: 'center' }}>
                                <div style={{ fontSize: '40px', marginBottom: '15px' }}>🔒</div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#333', marginBottom: '8px' }}>승인 대기 중입니다</div>
                                <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.6, marginBottom: '24px' }}>
                                    성도님 반가워요!<br />아직 관리자의 승인이 완료되지 않았습니다.<br />잠시만 기다려 주시면 곧 이용하실 수 있어요.
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', margin: '15px auto 0', border: '2px solid #EEE' }}>
                                        <img src={SOMY_IMG} alt="소미" style={{ width: '100%', height: '100%', objectFit: "cover" }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button
                                        onClick={() => {
                                            const btn = document.getElementById('refresh-btn');
                                            if (btn) btn.innerText = "상태 확인 중...";
                                            checkApprovalStatus().finally(() => {
                                                if (btn) btn.innerText = "🔄 상태 다시 확인하기";
                                            });
                                        }}
                                        id="refresh-btn"
                                        style={{ width: '100%', padding: '14px', background: '#333', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    >
                                        🔄 상태 다시 확인하기
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        style={{ width: '100%', padding: '12px', background: 'transparent', color: '#999', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        다른 계정으로 로그인하기
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <button onClick={() => setView("chat")} style={{
                                    width: "100%", padding: "16px 20px",
                                    background: "linear-gradient(145deg, #ffffff 0%, #f0f8f8 100%)", color: "#1A5D55",
                                    fontWeight: 800, fontSize: "16px", borderRadius: "20px",
                                    border: "1px solid #cbe4e1", cursor: "pointer",
                                    boxShadow: "0 12px 24px rgba(0, 0, 0, 0.08), 0 6px 12px rgba(0, 105, 92, 0.08), inset 0 3px 5px rgba(255,255,255,1), inset 0 -3px 0 rgba(255,255,255,0.8)",
                                    display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '14px',
                                    transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                                }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                    <div style={{ width: '42px', height: '42px', background: 'white', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid #F0F0F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)' }}>💬</div>
                                    소미와 대화하기
                                </button>

                                <button onClick={() => {
                                    fetchQt();
                                    setQtStep("read");
                                    setView("qt");
                                }} style={{
                                    width: "100%", padding: "16px 20px",
                                    background: "linear-gradient(145deg, #ffffff 0%, #fffbea 100%)", color: "#8E754C",
                                    fontWeight: 800, fontSize: "16px", borderRadius: "20px",
                                    border: "1px solid #f2e29e", cursor: "pointer",
                                    boxShadow: "0 12px 24px rgba(0, 0, 0, 0.08), 0 6px 12px rgba(184, 152, 0, 0.08), inset 0 3px 5px rgba(255,255,255,1), inset 0 -3px 0 rgba(255,255,255,0.8)",
                                    display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '14px',
                                    transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                                }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                    <div style={{ width: '42px', height: '42px', background: 'white', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid #F0F0F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)' }}>☀️</div>
                                    오늘의 큐티 시작
                                </button>

                                <div style={{ position: 'relative', width: '100%' }}>
                                    <button onClick={async () => {
                                        setView("community");
                                        try {
                                            const res = await fetch(`/api/community?church_id=${churchId}`);
                                            const data = await res.json();
                                            if (Array.isArray(data)) setCommunityPosts(data);
                                        } catch (e) { console.error("게시판 로드 실패:", e); }
                                    }} style={{
                                        width: "100%", padding: "16px 20px",
                                        background: "linear-gradient(145deg, #ffffff 0%, #fff0f5 100%)", color: "#9E2A5B",
                                        fontWeight: 800, fontSize: "16px", borderRadius: "20px",
                                        border: "1px solid #f2cddb", cursor: "pointer",
                                        boxShadow: "0 12px 24px rgba(0, 0, 0, 0.08), 0 6px 12px rgba(173, 20, 87, 0.08), inset 0 3px 5px rgba(255,255,255,1), inset 0 -3px 0 rgba(255,255,255,0.8)",
                                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '14px',
                                        transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                                    }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                        <div style={{ width: '42px', height: '42px', background: 'white', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid #F0F0F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)' }}>📝</div>
                                        은혜나눔 게시판
                                    </button>

                                    {/* 알림종: 항상 표시하되 안 읽은 알림이 있을 때만 효과 */}
                                    <div onClick={(e) => { e.stopPropagation(); setShowNotiList(!showNotiList); }} style={{
                                        position: 'absolute',
                                        top: '50%',
                                        right: '15px',
                                        transform: 'translateY(-50%)',
                                        width: '36px',
                                        height: '36px',
                                        background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 8px 16px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1), inset 0 2px 4px white',
                                        cursor: 'pointer',
                                        zIndex: 1200,
                                        border: '2px solid #E6A4B4',
                                        animation: notifications.filter(n => !n.is_read).length > 0 ? 'bell-swing 2s infinite ease-in-out' : 'none',
                                        transition: 'all 0.2s'
                                    }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-50%) scale(1.1) rotate(10deg)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(-50%) scale(1) rotate(0)"}>
                                        <span style={{ fontSize: '18px' }}>🔔</span>
                                        {notifications.filter(n => !n.is_read).length > 0 && (
                                            <div style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#FF3D00', color: 'white', fontSize: '10px', fontWeight: 900, minWidth: '18px', height: '18px', padding: '0 4px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                                {notifications.filter(n => !n.is_read).length}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '14px', width: '100%' }}>
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
                                        flex: 1, padding: "14px 10px",
                                        background: "linear-gradient(145deg, #ffffff 0%, #faf6ec 100%)", color: "#8B6B38",
                                        fontWeight: 800, fontSize: "14px", borderRadius: "20px",
                                        border: "1px solid #e8dcc4", cursor: "pointer",
                                        boxShadow: "0 10px 20px rgba(0, 0, 0, 0.06), 0 4px 8px rgba(184, 146, 74, 0.08), inset 0 3px 5px rgba(255,255,255,1), inset 0 -3px 0 rgba(255,255,255,0.8)",
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                        transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                                    }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                        <div style={{ width: '42px', height: '42px', background: 'white', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid #F0F0F0', boxShadow: '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' }}>👑</div>
                                        <span>이달의 큐티왕</span>
                                    </button>

                                    <button onClick={() => {
                                        setView('history');
                                        fetchHistory();
                                    }} style={{
                                        flex: 1, padding: "14px 10px",
                                        background: "linear-gradient(145deg, #ffffff 0%, #f1f8f3 100%)", color: "#507558",
                                        fontWeight: 800, fontSize: "14px", borderRadius: "20px",
                                        border: "1px solid #cee8d8", cursor: "pointer",
                                        boxShadow: "0 10px 20px rgba(0, 0, 0, 0.06), 0 4px 8px rgba(112, 145, 118, 0.08), inset 0 3px 5px rgba(255,255,255,1), inset 0 -3px 0 rgba(255,255,255,0.8)",
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                        transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                                    }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                        <div style={{ width: '42px', height: '42px', background: 'white', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid #F0F0F0', boxShadow: '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' }}>📜</div>
                                        <span>나의 묵상 기록</span>
                                    </button>
                                </div>

                                <button onClick={() => setView('ccm')} style={{
                                    width: "100%", padding: "16px 20px",
                                    background: "linear-gradient(145deg, #ffffff 0%, #f4f6fa 100%)", color: "#465293",
                                    fontWeight: 800, fontSize: "16px", borderRadius: "20px",
                                    border: "1px solid #cfd5f0", cursor: "pointer",
                                    boxShadow: "0 12px 24px rgba(0, 0, 0, 0.08), 0 6px 12px rgba(63, 81, 181, 0.08), inset 0 3px 5px rgba(255,255,255,1), inset 0 -3px 0 rgba(255,255,255,0.8)",
                                    display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '14px',
                                    transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                                }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                    <div style={{ width: '42px', height: '42px', background: 'white', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid #F0F0F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)' }}>🎵</div>
                                    오늘의 CCM 듣기
                                </button>

                                <button onClick={() => setView('memberSearch')} style={{
                                    width: "100%", padding: "16px 20px",
                                    background: "linear-gradient(145deg, #ffffff 0%, #f1f8f3 100%)", color: "#2E7D32",
                                    fontWeight: 800, fontSize: "16px", borderRadius: "20px",
                                    border: "1px solid #C8E6C9", cursor: "pointer",
                                    boxShadow: "0 12px 24px rgba(0, 0, 0, 0.08), 0 6px 12px rgba(46, 125, 50, 0.08), inset 0 3px 5px rgba(255,255,255,1), inset 0 -3px 0 rgba(255,255,255,0.8)",
                                    display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '14px',
                                    transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                                }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                    <div style={{ width: '42px', height: '42px', background: 'white', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid #F0F0F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)' }}>🔍</div>
                                    성도 주소록 / 검색
                                </button>

                                {churchSettings.sermon_url && (
                                    <button onClick={() => {
                                        if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
                                            playerRef.current.pauseVideo();
                                            setPlayRequested(false);
                                        }
                                        setView('sermon');
                                    }} style={{
                                        width: "100%", padding: "16px 20px",
                                        background: "linear-gradient(145deg, #ffffff 0%, #fff4f2 100%)", color: "#BA2D0B",
                                        fontWeight: 800, fontSize: "16px", borderRadius: "20px",
                                        border: "1px solid #fcd3c8", cursor: "pointer",
                                        boxShadow: "0 12px 24px rgba(0, 0, 0, 0.08), 0 6px 12px rgba(230, 48, 0, 0.09), inset 0 3px 5px rgba(255,255,255,1), inset 0 -3px 0 rgba(255,255,255,0.8)",
                                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '14px',
                                        transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                                    }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                        <div style={{ width: '42px', height: '42px', background: 'white', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid #F0F0F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)' }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                <path fillRule="evenodd" clipRule="evenodd" d="M22.95 6.643C22.71 5.717 21.996 5.002 21.071 4.762C19.167 4.25 12 4.25 12 4.25C12 4.25 4.833 4.25 2.929 4.762C2.004 5.002 1.29 5.717 1.05 6.643C0.5 8.547 0.5 12.5 0.5 12.5C0.5 12.5 0.5 16.453 1.05 18.357C1.29 19.283 2.004 19.998 2.929 20.238C4.833 20.75 12 20.75 12 20.75C12 20.75 19.167 20.75 21.071 20.238C21.996 19.998 22.71 19.283 22.95 18.357C23.5 16.453 23.5 12.5 23.5 12.5C23.5 12.5 23.5 8.547 22.95 6.643Z" fill="#FF0000" />
                                                <path d="M9.75 16.5L16.25 12.5L9.75 8.5V16.5Z" fill="white" />
                                            </svg>
                                        </div>
                                        담임목사 설교
                                    </button>
                                )}
                                <button onClick={() => setView('profile')} style={{
                                    width: '100%', padding: "16px",
                                    background: "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)",
                                    color: "#1976D2",
                                    fontWeight: 800, fontSize: "15px", borderRadius: "18px",
                                    border: "1px solid #90CAF9", cursor: "pointer",
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    boxShadow: '0 4px 12px rgba(25,118,210,0.1)',
                                    transition: 'all 0.2s'
                                }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                    👤 내 프로필 & 정보 수정
                                </button>
                            </>
                        )}
                    </div>

                    <div style={{ padding: '0 20px 40px 20px', width: '100%', maxWidth: '360px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                        <button onClick={() => setView('guide')} style={{
                            width: '100%', padding: "16px",
                            background: "linear-gradient(135deg, #F9F7F2 0%, #F4F0E6 100%)",
                            color: "#8B6B38",
                            fontWeight: 800, fontSize: "15px", borderRadius: "18px",
                            border: "1px solid #E8DCC4", cursor: "pointer",
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            boxShadow: '0 4px 12px rgba(139,107,56,0.1)',
                            transition: 'all 0.2s'
                        }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                            📖 소미 활용 가이드 보기
                        </button>

                        {isAdmin && (
                            <button onClick={() => setView('admin')} style={{
                                width: '100%', padding: "16px",
                                background: "#F5F5F5", color: "#757575",
                                fontWeight: 800, fontSize: "15px", borderRadius: "18px",
                                border: "1px solid #E0E0E0", cursor: "pointer",
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s'
                            }} onMouseOver={e => e.currentTarget.style.background = "#EEEEEE"} onMouseOut={e => e.currentTarget.style.background = "#F5F5F5"}>
                                ⚙️ 관리자 센터 들어가기
                            </button>
                        )}

                        {/* 앱 설치 버튼 (모바일 웹 환경일 때 표시) */}
                        {typeof window !== 'undefined' && !window.matchMedia('(display-mode: standalone)').matches && (
                            <button onClick={handleInstallClick} style={{
                                width: '100%', padding: "16px",
                                background: "linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)",
                                color: "#827717",
                                fontWeight: 800, fontSize: "15px", borderRadius: "18px",
                                border: "1px solid #FBC02D", cursor: "pointer",
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                boxShadow: '0 8px 20px rgba(251,192,45,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
                                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                            }} onMouseOver={e => e.currentTarget.style.transform = "scale(1.02)"} onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}>
                                📱 어플로 간편하게 홈화면에 추가
                            </button>
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
                                church_id: churchId,
                                is_private: isPrivatePost  // ✅ 비공개 여부 전달
                            })
                        });
                        if (res.ok) {
                            const newPost = await res.json();
                            setCommunityPosts([newPost, ...communityPosts]);
                            setIsPrivatePost(false); // 저장 후 초기화
                            // ✅ 여기서 큐티 관련 입력값들을 비우지 않도록 코드 확인 (유지)
                        }
                    } catch (e) { console.error("은혜나눔 저장 실패:", e); }
                }

                setQtStep("pray");
            };

            return (
                <div style={{
                    minHeight: "100vh",
                    background: "white",
                    maxWidth: "480px",
                    margin: "0 auto",
                    ...baseFont,
                    position: 'relative',
                    paddingTop: 'env(safe-area-inset-top)'
                }}>
                    {styles}
                    {/* Header */}
                    <div style={{
                        padding: "12px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        borderBottom: "1px solid #F0F0F0",
                        position: 'sticky',
                        top: 'env(safe-area-inset-top)',
                        background: 'white',
                        zIndex: 10
                    }}>
                        <button onClick={handleBack} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: '#333' }}>←</button>
                        <img src={churchSettings.church_logo_url} alt="로고" style={{ height: "24px", objectFit: 'contain' }} />
                        <div style={{ fontWeight: 700, color: "#333", fontSize: "14px" }}>
                            {isHistoryMode ? "지난 묵상 기록" : "오늘의 큐티"}
                        </div>
                        {isHistoryMode && (
                            <div style={{ background: "#709176", color: "white", fontSize: "10px", padding: "2px 6px", borderRadius: "10px", fontWeight: 700 }}>다시보기</div>
                        )}
                        <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#999' }}>{qtData.date || "날짜 로딩 중..."}</div>
                    </div>

                    <div style={{ padding: "24px 20px", display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '120px' }}>

                        {/* Somy mini float */}
                        <div style={{ display: "flex", justifyContent: "center" }}>
                            <div style={{ position: "relative" }}>
                                <div style={{ position: "absolute", top: "-10px", left: "50%", width: "50px", height: "10px", border: "2.5px solid #D4AF37", borderRadius: "999px", animation: "halo-pulse 3s ease-in-out infinite", zIndex: 2 }} />
                                <div style={{ width: "70px", height: "70px", borderRadius: "50%", border: "3px solid white", overflow: "hidden", boxShadow: "0 8px 25px rgba(212,175,55,.25)" }}>
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
                                    <div style={{ marginBottom: '16px', borderBottom: '1px solid #F5F0E8', paddingBottom: '12px' }}>
                                        <a
                                            href={getYouVersionUrl(qtData.reference)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: '#B8924A', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '15px' }}
                                        >
                                            📍 {qtData.reference}
                                            <span style={{ fontSize: '11px', background: '#FDF3DF', padding: '3px 8px', borderRadius: '6px', color: '#8A6A27', fontWeight: 700, border: '1px solid #F5E0BB' }}>
                                                📖 클릭 개역개정
                                            </span>
                                        </a>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {(qtData.fullPassage || '').split('\n').filter(l => l.trim()).map((line, idx) => {
                                            const match = line.match(/^(\d+)[\.\s]+(.*)/);
                                            if (match) {
                                                return (
                                                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                        <span style={{ color: '#D4AF37', fontSize: '13px', fontWeight: 800, minWidth: '20px', textAlign: 'right', paddingTop: '4px', fontStyle: 'italic' }}>
                                                            {match[1]}
                                                        </span>
                                                        <span style={{ fontSize: '16px', lineHeight: 1.8, color: '#333', flex: 1, wordBreak: 'keep-all', fontWeight: 500 }}>
                                                            {match[2]}
                                                        </span>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <p key={idx} style={{ margin: 0, fontSize: '16px', lineHeight: 1.8, color: '#333', wordBreak: 'keep-all', fontWeight: 500, paddingLeft: '30px' }}>
                                                    {line}
                                                </p>
                                            );
                                        })}
                                        {!qtData.fullPassage && <p style={{ color: '#999', textAlign: 'center' }}>본문을 불러오는 중입니다...</p>}
                                    </div>
                                </div>
                            )}

                            {qtStep === 'interpret' && (
                                <div style={{ background: "#FDFCFB", borderRadius: "20px", padding: "24px", border: "1px solid #F0ECE4", animation: "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                        <div style={{ width: 22, height: 22, background: '#D4AF37', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>2</div>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>말씀 해설 및 묵상 가이드</h3>
                                    </div>
                                    <div style={{ fontSize: '15px', color: '#444', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'keep-all', padding: '15px', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '12px', borderLeft: '3px solid #D4AF37' }}>
                                        {qtData.interpretation || "기록된 본문 해설이 없습니다. 성령님의 내밀한 음성에 귀 기울이며 각자 본문을 묵상해 보세요."}
                                    </div>

                                    {/* Passage Q&A Section moved here */}
                                    <div style={{ borderTop: '1px dashed #DDD', paddingTop: '20px', marginTop: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                            <span style={{ fontSize: '14px' }}>✨</span>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#B8924A' }}>소미에게 이 구절에 대해 물어보세요</span>
                                        </div>
                                        <div ref={passageRef} style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {passageChat.length === 0 && <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', padding: '10px 0' }}>해설을 보고 궁금한 점을 입력해보세요!</div>}
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
                                        <div style={{ width: 22, height: 22, background: '#D4AF37', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>3</div>
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
                                        <div style={{ width: 22, height: 22, background: '#E6A4B4', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>4</div>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>은혜나눔</h3>
                                    </div>
                                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>오늘 말씀을 통해 받은 은혜를 기록해보세요.</p>
                                    <textarea value={graceInput} onChange={(e) => setGraceInput(e.target.value)} placeholder="성도들과 나누고 싶은 은혜를 자유롭게 적어주세요..." style={{ width: '100%', height: '200px', border: '1px solid #EEE', borderRadius: '15px', padding: '16px', boxSizing: 'border-box', outline: 'none', fontSize: '15px', background: 'white', fontFamily: 'inherit', lineHeight: 1.6 }} />
                                    {/* 비공개 토글 */}
                                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '12px', color: '#999' }}>
                                            {isPrivatePost ? '🔒 나와 관리자만 볼 수 있어요' : '🌐 성도들과 함께 볼 수 있습니다'}
                                        </span>
                                        <button
                                            onClick={() => setIsPrivatePost(!isPrivatePost)}
                                            style={{
                                                padding: '5px 12px', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                                background: isPrivatePost ? '#F3E5F5' : '#E8F5E9',
                                                color: isPrivatePost ? '#7B1FA2' : '#2E7D32',
                                                transition: 'all 0.2s'
                                            }}>
                                            {isPrivatePost ? '🔒 비공개' : '🌐 공개'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {qtStep === 'pray' && (
                                <div style={{ background: "#FDFCFB", borderRadius: "20px", padding: "24px", border: "1px solid #F0ECE4" }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                        <div style={{ width: 22, height: 22, background: '#8E9775', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>5</div>
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
                                    {(churchSettings.community_visible || isAdmin) && (
                                        <button onClick={() => setView('community')} style={{ width: '100%', padding: '16px', background: '#D4AF37', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer', marginBottom: '10px' }}>은혜나눔 게시판 가기</button>
                                    )}
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
                            <button onClick={() => setQtStep('interpret')} style={{ width: '100%', padding: '16px', background: '#333', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' }}>말씀 해설 보기</button>
                        )}
                        {qtStep === 'interpret' && (
                            <button onClick={() => setQtStep('reflect')} style={{ width: '100%', padding: '16px', background: '#333', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' }}>묵상 질문으로</button>
                        )}
                        {qtStep === 'reflect' && (
                            <button onClick={() => setQtStep('grace')} style={{ width: '100%', padding: '16px', background: '#333', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' }}>은혜 나누러 가기</button>
                        )}
                        {qtStep === 'grace' && (
                            <button
                                onClick={handleShareGrace}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: graceInput.trim().length > 0 ? '#C2185B' : '#E6A4B4',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '15px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'background-color 0.4s ease'
                                }}
                            >
                                기록하고 성도들과 나누기
                            </button>
                        )}
                        {qtStep === 'pray' && (
                            <button onClick={async () => {
                                // 히스토리 모드일 때는 저장하지 않고 바로 종료
                                if (isHistoryMode) {
                                    setQtStep('done');
                                    return;
                                }

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
                                                answers: answers // 답변 데이터 포함
                                            }),
                                        });

                                        if (res.ok) {
                                            // 기록 성공 시 즉시 최신 통계 데이터 로드
                                            const statsRes = await fetch('/api/stats');
                                            const statsData = await statsRes.json();
                                            if (statsData && statsData.today) {
                                                setStats(statsData);
                                            }
                                            // 히스토리 목록도 초기화 (다시 들어갈 때 최신화되도록)
                                            setHistory([]);
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
                </div >
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
                    const payload = {
                        ...qtForm,
                        passage: `${qtForm.passage}|||${qtForm.interpretation}`
                    };
                    const res = await fetch('/api/qt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
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
                                interpretation: qtForm.interpretation,
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
                            interpretation: data.interpretation || '',
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
                        <button onClick={handleBack} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: '#333' }}>←</button>
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
                                    const res = await fetch(`/api/qt?date=${qtForm.date}&force=true`, { cache: 'no-store' });
                                    const { qt } = await res.json();
                                    if (qt) {
                                        const { fullPassage, interpretation } = parsePassage(qt.passage);
                                        setQtForm({
                                            date: qt.date,
                                            reference: qt.reference,
                                            passage: fullPassage,
                                            interpretation: interpretation,
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
                            }} disabled={aiLoading} style={{ width: '100%', padding: '12px', background: '#333', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', marginBottom: '8px' }}>
                                {aiLoading ? '🔄 로딩 중...' : '📅 오늘 성경 통독 본문 불러오기'}
                            </button>

                            <button onClick={async () => {
                                const gv = getGraceVerse();
                                setAiLoading(true);
                                try {
                                    // 본문은 있으니 질문/기도문만 생성 요청
                                    const res = await fetch('/api/qt-generate', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ reference: `${gv.book} ${gv.ref}`, passage: gv.verse })
                                    });
                                    const data = await res.json();
                                    setQtForm({
                                        ...qtForm,
                                        reference: `${gv.book} ${gv.ref}`,
                                        passage: gv.verse,
                                        question1: data.question1 || '',
                                        question2: data.question2 || '',
                                        question3: data.question3 || '',
                                        prayer: data.prayer || '',
                                    });
                                } catch {
                                    setQtForm({ ...qtForm, reference: `${gv.book} ${gv.ref}`, passage: gv.verse });
                                    alert('말씀은 불러왔으나 질문 생성에 실패했습니다.');
                                } finally { setAiLoading(false); }
                            }} disabled={aiLoading} style={{ width: '100%', padding: '12px', background: '#F5F2EA', color: '#B8924A', border: '1px solid #B8924A', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                                🛳️ 네비게이토 은혜 말씀 불러오기
                            </button>

                            <p style={{ fontSize: '11px', color: '#999', marginTop: '8px', textAlign: 'center' }}>
                                * 통독 본문 또는 네비게이토 암송 구절을 자동으로 채워줍니다.
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
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '6px' }}>💡 본문 해설 (AI 추천 생성을 누르면 자동 채워집니다)</label>
                            <textarea value={qtForm.interpretation} onChange={e => setQtForm(p => ({ ...p, interpretation: e.target.value }))} placeholder="본문 해설이나 묵상 포인트를 입력하세요" style={{ ...inputStyle, height: '100px' }} />
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
                            }} style={{ width: '100%', padding: '14px', background: '#FFF0F0', color: '#D32F2F', border: '1px solid #FFCDD2', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                                🧨 묵상 참여 기록 전체 초기화 (위험)
                            </button>
                            <div style={{ height: '40px' }} />
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
                <div style={{
                    minHeight: "100vh",
                    background: "white",
                    maxWidth: "480px",
                    margin: "0 auto",
                    ...baseFont,
                    paddingTop: 'env(safe-area-inset-top)'
                }}>
                    {styles}
                    <div style={{
                        padding: "12px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        borderBottom: "1px solid #F0F0F0",
                        position: 'sticky',
                        top: 'env(safe-area-inset-top)',
                        background: 'white',
                        zIndex: 10
                    }}>
                        <button onClick={handleBack} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: '#333' }}>←</button>
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

            const handleDeleteComment = async (postId: any, commentId: any) => {
                if (!confirm("이 댓글을 삭제하시겠습니까?")) return;
                try {
                    const res = await fetch('/api/community/comments', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: commentId })
                    });
                    if (res.ok) {
                        setCommunityPosts(communityPosts.map(post => {
                            if (post.id === postId) {
                                return { ...post, comments: post.comments.filter((c: any) => c.id !== commentId) };
                            }
                            return post;
                        }));
                    } else {
                        alert("댓글 삭제에 실패했습니다.");
                    }
                } catch (e) {
                    console.error("댓글 삭제 실패:", e);
                    alert("오류가 발생했습니다.");
                }
            };

            const handleDeletePost = async (postId: any) => {
                if (!confirm("이 게시글을 정말 삭제하시겠습니까?")) return;
                try {
                    // id를 body에 담아 전송 (주소 URL 인코딩 문제 회피)
                    const res = await fetch('/api/community', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: postId })
                    });
                    if (res.ok) {
                        setCommunityPosts(communityPosts.filter(post => post.id !== postId));
                    } else {
                        const errData = await res.json().catch(() => ({}));
                        console.error("삭제 실패 상세:", errData);
                        alert(`삭제 실패: ${errData.error || '알 수 없는 오류'} (status: ${res.status})`);
                    }
                } catch (e) {
                    console.error("삭제 중 오류:", e);
                    alert("삭제 중 네트워크 오류가 발생했습니다.");
                }
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

            const handlePost = async () => {
                if (!communityInput.trim() || !user) return; // ✅ communityInput 사용
                try {
                    const res = await fetch('/api/community', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: user.id,
                            user_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "익명의 성도",
                            avatar_url: user.user_metadata?.avatar_url || null,
                            content: communityInput, // ✅ communityInput 사용
                            church_id: churchId,
                            is_private: isPrivatePost
                        })
                    });
                    if (res.ok) {
                        const newPost = await res.json();
                        setCommunityPosts([newPost, ...communityPosts]);
                        setCommunityInput(""); // ✅ 게시판 입력창만 깔끔하게 비움
                        setIsPrivatePost(false);
                    }
                } catch (e) { console.error("게시글 등록 실패:", e); }
            };

            return (
                <div style={{
                    minHeight: "100vh",
                    background: "#F8F8F8",
                    maxWidth: "480px",
                    margin: "0 auto",
                    ...baseFont,
                    paddingTop: 'env(safe-area-inset-top)'
                }}>
                    {styles}
                    <div style={{
                        padding: "12px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        borderBottom: "1px solid #F0F0F0",
                        position: 'sticky',
                        top: 'env(safe-area-inset-top)',
                        background: 'white',
                        zIndex: 10
                    }}>
                        <button onClick={handleBack} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: '#333' }}>←</button>
                        <div style={{ fontWeight: 800, color: "#333", fontSize: "16px", flex: 1 }}>은혜나눔 게시판</div>
                        {/* 게시판 알림종: 홈 스크린과 스타일 통일 */}
                        <div onClick={() => setShowNotiList(!showNotiList)} style={{
                            position: 'relative',
                            cursor: 'pointer',
                            width: '36px',
                            height: '36px',
                            background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                            border: '1.5px solid #E6A4B4',
                            animation: notifications.filter(n => !n.is_read).length > 0 ? 'bell-swing 2s infinite ease-in-out' : 'none'
                        }}>
                            <span style={{ fontSize: '18px' }}>🔔</span>
                            {notifications.filter(n => !n.is_read).length > 0 && (
                                <div style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#FF3D00', color: 'white', fontSize: '9px', fontWeight: 900, minWidth: '15px', height: '15px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid white' }}>
                                    {notifications.filter(n => !n.is_read).length}
                                </div>
                            )}
                        </div>
                    </div>

                    {!churchSettings.community_visible && !isAdmin ? (
                        <div style={{ padding: '60px 40px', textAlign: 'center' }}>
                            <div style={{ fontSize: '50px', marginBottom: '20px' }}>🔒</div>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#333', marginBottom: '10px' }}>비공개 게시판입니다</h3>
                            <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
                                현재 이 게시판은 교회 설정에 의해 <br />
                                관리자만 접근할 수 있도록 설정되어 있습니다.
                            </p>
                            <button onClick={handleBack} style={{ marginTop: '24px', padding: '12px 24px', background: '#333', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
                                뒤로 가기
                            </button>
                        </div>
                    ) : (
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* 직접 글쓰기 영역 */}
                            <div style={{ background: 'white', borderRadius: '20px', padding: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F0ECE4', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                                        {user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🐑'}
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#555' }}>
                                        {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || "성도님"}
                                    </span>
                                </div>
                                <textarea
                                    value={communityInput}
                                    onChange={(e) => setCommunityInput(e.target.value)}
                                    placeholder="성도들과 나누고 싶은 은혜를 적어보세요..."
                                    style={{ width: '100%', minHeight: '80px', border: '1px solid #F5F5F5', borderRadius: '12px', padding: '12px', boxSizing: 'border-box', outline: 'none', fontSize: '14px', background: '#FAFAFA', resize: 'none', fontFamily: 'inherit' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div
                                        onClick={() => setIsPrivatePost(!isPrivatePost)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: isPrivatePost ? '#7B1FA2' : '#666', background: isPrivatePost ? '#F3E5F5' : '#F5F5F5', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, transition: 'all 0.2s' }}
                                    >
                                        <span>{isPrivatePost ? '🔒 나만 보기' : '🌐 함께 나누기'}</span>
                                    </div>
                                    <button
                                        onClick={handlePost}
                                        disabled={!communityInput.trim()}
                                        style={{
                                            padding: '8px 20px',
                                            background: communityInput.trim() ? '#333' : '#EEE',
                                            color: communityInput.trim() ? 'white' : '#AAA',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontSize: '13px',
                                            fontWeight: 800,
                                            cursor: communityInput.trim() ? 'pointer' : 'default',
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        은혜 나누기
                                    </button>
                                </div>
                            </div>

                            {communityPosts
                                // ✅ 비공개 게시글 필터: 관리자는 전체, 본인관은 본인 작성 비공개글, 일반 성도는 공개글만
                                .filter(post => {
                                    if (!post.is_private) return true;           // 공개글: 모두
                                    if (isAdmin) return true;                    // 로니는 전체
                                    if (user?.id === post.user_id) return true;  // 본인 비공개글
                                    return false;
                                })
                                .map(post => (
                                    <div key={post.id} style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', animation: 'fade-in 0.5s' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F0ECE4', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                                                {post.avatar_url ? <img src={post.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🐑'}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {post.user_name}
                                                    {/* 표 비공개 배지 */}
                                                    {post.is_private && (
                                                        <span style={{ fontSize: '10px', background: '#F3E5F5', color: '#7B1FA2', padding: '2px 7px', borderRadius: '8px', fontWeight: 700 }}>
                                                            🔒 비공개
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#999' }}>{new Date(post.created_at || Date.now()).toLocaleString()}</div>
                                            </div>
                                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                                                {(user?.id === post.user_id) && (
                                                    <button onClick={() => { setEditingPostId(post.id); setEditContent(post.content); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#B8924A', fontWeight: 600 }}>수정</button>
                                                )}
                                                {(isAdmin || user?.id === post.user_id) && (
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
                                            <div style={{ fontSize: '15px', lineHeight: 1.7, color: '#444', margin: '0 0 15px 0', wordBreak: 'break-word' }}>
                                                {post.content.split('\n').map((line: string, i: number) => {
                                                    const trimmed = line.trim();
                                                    if (trimmed === '[말씀묵상]') {
                                                        return (
                                                            <div key={i} style={{ fontSize: "15px", fontWeight: 800, color: "#9E7B31", letterSpacing: '-0.2px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span>✨</span> 오늘의 묵상
                                                            </div>
                                                        );
                                                    }
                                                    if (trimmed.startsWith('[나의 결단과 은혜]')) {
                                                        return <div key={i} style={{ fontSize: "14px", fontWeight: 800, color: "#9E2A5B", marginTop: '16px', marginBottom: '6px' }}>💡 나의 결단과 은혜</div>;
                                                    }
                                                    if (trimmed.startsWith('[질문')) {
                                                        return <div key={i} style={{ fontSize: "13px", fontWeight: 800, color: "#333", marginTop: '14px', paddingLeft: '4px', borderLeft: '3px solid #D4AF37' }}>{line}</div>;
                                                    }
                                                    if (trimmed.startsWith('나의 묵상:')) {
                                                        return <div key={i} style={{ color: '#555', marginTop: '4px', marginBottom: '8px', paddingLeft: '7px' }}>{line}</div>;
                                                    }
                                                    return <span key={i}>{line}<br /></span>;
                                                })}
                                            </div>
                                        )}

                                        {/* Comments Section */}
                                        <div style={{ borderTop: '1px solid #F5F5F5', paddingTop: '15px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', marginBottom: '10px' }}>댓글 {post.comments?.length || 0}개</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                                                {post.comments && Array.isArray(post.comments) && post.comments.map((comment: any) => (
                                                    <div key={comment.id} style={{ background: '#FAFAFA', padding: '10px 15px', borderRadius: '12px', fontSize: '13px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                            <span style={{ fontWeight: 700, color: '#555' }}>{comment.user_name || '성도'}</span>
                                                            <span style={{ fontSize: '10px', color: '#AAA', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                {comment.created_at ? new Date(comment.created_at).toLocaleTimeString() : '방금 전'}
                                                                {(isAdmin || user?.id === comment.user_id) && (
                                                                    <button onClick={() => handleDeleteComment(post.id, comment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#999', padding: 0 }}>✕</button>
                                                                )}
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
                    )}
                </div>
            );
        }

        /* ══════════════════════════════
           HISTORY PAGE
        ══════════════════════════════ */
        if (view === "history") {
            return (
                <div style={{
                    minHeight: "100vh",
                    background: "#FDFCFB",
                    maxWidth: "480px",
                    margin: "0 auto",
                    ...baseFont,
                    paddingTop: 'env(safe-area-inset-top)'
                }}>
                    {styles}
                    <div style={{
                        padding: "12px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        borderBottom: "1px solid #F0F0F0",
                        position: 'sticky',
                        top: 'env(safe-area-inset-top)',
                        background: 'white',
                        zIndex: 10
                    }}>
                        <button onClick={handleBack} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: '#333', padding: '8px' }}>←</button>
                        <div style={{ fontWeight: 800, color: "#333", fontSize: "15px" }}>나의 묵상 기록</div>
                    </div>

                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '100px' }}>
                        {isHistoryLoading ? (
                            <div style={{ textAlign: 'center', padding: '100px 0', color: '#999' }}>기록을 불러오는 중입니다... 🐑</div>
                        ) : history.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '100px 0', color: '#999' }}>아직 저장된 묵상이 없어요. <br />오늘의 큐티를 시작해보세요!</div>
                        ) : (
                            history.map((h, idx) => (
                                <div key={idx} style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #F0ECE4' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#B8924A' }}>
                                            {new Date(h.completed_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                                        </div>
                                        <div style={{ fontSize: '12px', background: '#E8F5E9', padding: '4px 10px', borderRadius: '12px', color: '#2E7D32', fontWeight: 600 }}>완료 ✅</div>
                                    </div>

                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#333', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            📖 {h.daily_qt?.reference || "오늘의 말씀 묵상"}
                                        </div>
                                        {h.daily_qt?.passage ? (
                                            <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {h.daily_qt.passage.split('|||')[0].substring(0, 100)}...
                                            </p>
                                        ) : (
                                            <p style={{ fontSize: '13px', color: '#999', fontStyle: 'italic', margin: 0 }}>
                                                기록된 말씀 본문이 없습니다.
                                            </p>
                                        )}
                                    </div>

                                    <button onClick={() => {
                                        const qt = h.daily_qt;
                                        if (qt) {
                                            const { fullPassage, interpretation } = parsePassage(qt.passage);
                                            setQtData({
                                                date: new Date(qt.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
                                                reference: qt.reference,
                                                fullPassage,
                                                interpretation,
                                                verse: fullPassage.split('\n')[0],
                                                questions: [qt.question1, qt.question2, qt.question3].filter(Boolean),
                                                prayer: qt.prayer,
                                            });
                                            setAnswers(h.answers || []);
                                            setIsHistoryMode(true);
                                            setQtStep('read');
                                            setView('qt');
                                        }
                                    }} style={{ width: '100%', marginTop: '5px', padding: '12px', background: '#FDFCFB', border: '1px solid #EEE', borderRadius: '12px', color: '#666', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                        전체 내용 다시보기
                                    </button>
                                </div>
                            ))
                        )}
                        <button onClick={() => setView('home')} style={{ marginTop: '10px', width: '100%', padding: '16px', background: '#333', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' }}>홈으로 돌아가기</button>
                    </div>
                </div>
            );
        }

        /* ══════════════════════════════
           CCM VIEW
        ══════════════════════════════ */
        if (view === "ccm") {
            return (
                <div style={{
                    minHeight: "100vh",
                    background: "white",
                    maxWidth: "480px",
                    margin: "0 auto",
                    ...baseFont,
                    paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
                    paddingTop: 'env(safe-area-inset-top)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {styles}
                    <div style={{
                        padding: "12px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: 'white',
                        borderBottom: "1px solid #F0F0F0",
                        position: 'sticky',
                        top: 'env(safe-area-inset-top)',
                        zIndex: 10
                    }}>
                        <button onClick={handleBack} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: '#333', padding: '8px' }}>←</button>
                        <div style={{ fontWeight: 800, color: "#333", fontSize: "15px" }}>소미와 함께하는 오늘의 CCM 🎵</div>
                    </div>

                    <div style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                        <div style={{
                            width: '100%',
                            maxWidth: '320px',
                            background: 'linear-gradient(135deg, #FDFBF0 0%, #F5F0E1 100%)',
                            borderRadius: '32px',
                            padding: '30px 20px',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.15), inset 0 1px 2px white',
                            border: '2px solid #D4AF37',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}>
                            <div id="ccm-large-screen" style={{
                                width: '100%',
                                height: '200px',
                                background: '#1A1A1A',
                                borderRadius: '16px',
                                marginBottom: '30px',
                                boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.8)',
                                border: '1px solid #C0C0C0',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                            </div>

                            {/* 소미 전용 컨트롤 패드 */}
                            <div style={{
                                width: '100%',
                                background: '#FEFEFE',
                                borderRadius: '24px',
                                padding: '25px 15px',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                                border: '1px solid #EEE',
                                textAlign: 'center'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
                                    <button onClick={(e) => hapticClick(e, handlePrevCcm)} style={{ border: 'none', background: '#F5F5F5', borderRadius: '12px', width: '50px', height: '50px', fontSize: '20px', cursor: 'pointer', transition: 'all 0.1s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>⏮</button>
                                    <button onClick={(e) => hapticClick(e, () => togglePlay(e))} style={{ border: 'none', background: '#D4AF37', color: 'white', borderRadius: '15px', width: '80px', height: '50px', fontSize: '24px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(212,175,55,0.3)', transition: 'all 0.1s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                                        {isCcmPlaying ? '⏸' : '▶️'}
                                    </button>
                                    <button onClick={(e) => hapticClick(e, handleNextCcm)} style={{ border: 'none', background: '#F5F5F5', borderRadius: '12px', width: '50px', height: '50px', fontSize: '20px', cursor: 'pointer', transition: 'all 0.1s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>⏭</button>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <button onClick={(e) => hapticClick(e, () => togglePlay(e))} style={{ background: 'none', border: 'none', color: '#B8924A', fontSize: '12px', fontWeight: 900, cursor: 'pointer', letterSpacing: '2px' }}>RESET CONSOLE</button>
                                </div>
                            </div>
                        </div>

                        <div style={{ width: '100%', background: '#FFF', borderRadius: '24px', padding: '20px', display: 'flex', gap: '15px', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #FFD1DC' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid #FFD1DC' }}>
                                <img src={SOMY_IMG} alt="소미" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div style={{ fontSize: '13px', color: '#D81B60', lineHeight: 1.6, fontWeight: 600 }}>
                                <strong>소미의 팁!</strong> 찬양을 틀어두고 뒤로가기를 눌러보세요. 음악을 들으며 소미와 대화하거나 말씀을 묵상할 수 있어요! 🎵
                            </div>
                        </div>

                        <button onClick={() => setView('home')} style={{ width: '100%', padding: '16px', background: '#333', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 700, cursor: 'pointer' }}>홈으로 돌아가기</button>
                    </div>
                </div>
            );
        }

        /* ══════════════════════════════
           ADMIN PAGE
        ══════════════════════════════ */
        if (view === "admin") {
            return (
                <div style={{
                    minHeight: "100vh",
                    background: "#FDFCFB",
                    maxWidth: "480px",
                    margin: "0 auto",
                    ...baseFont,
                    padding: '0 20px 24px 20px',
                    position: 'relative',
                    paddingTop: 'env(safe-area-inset-top)'
                }}>
                    <div style={{
                        padding: "12px 0",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: 'transparent',
                        position: 'sticky',
                        top: 'env(safe-area-inset-top)',
                        zIndex: 10,
                        marginBottom: '12px'
                    }}>
                        <button onClick={handleBack} style={{ background: "white", border: "1px solid #EEE", borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: "16px", cursor: "pointer", color: '#333', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>←</button>
                        <div style={{ fontWeight: 800, color: "#333", fontSize: "15px" }}>⚙️ 교회 관리자 센터</div>
                    </div>

                    <>
                        <div style={{ background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '24px', textAlign: 'center', border: '1px solid #F0ECE4' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#F5F2EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px' }}>👑</div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#333', marginBottom: '4px' }}>{user?.user_metadata?.full_name || '관리자'}님, 반갑습니다. </div>
                            <div style={{ fontSize: '13px', color: '#999', marginBottom: '16px' }}>{user?.email}</div>
                            <button onClick={handleLogout} style={{ padding: '8px 20px', background: '#F5F5F5', color: '#666', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>시스템 로그아웃</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <button onClick={() => { setAdminTab('settings'); setSettingsForm({ ...churchSettings }); setShowSettings(true); }} style={{ width: '100%', padding: '24px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                                <div style={{ width: '48px', height: '48px', background: '#FFF9C4', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>⛪</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#333', marginBottom: '2px' }}>교회 정보 및 환경 설정</div>
                                    <div style={{ fontSize: '12px', color: '#999' }}>로고, 이름, 홈페이지, 요금제 등을 관리합니다.</div>
                                </div>
                            </button>

                            <button onClick={() => {
                                const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
                                setQtForm({ date: today, reference: '', passage: '', interpretation: '', question1: '', question2: '', question3: '', prayer: '' });
                                setView('qtManage');
                            }} style={{ width: '100%', padding: '24px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                                <div style={{ width: '48px', height: '48px', background: '#E3F2FD', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📖</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#333', marginBottom: '2px' }}>오늘의 큐티 말씀 관리</div>
                                    <div style={{ fontSize: '12px', color: '#999' }}>매일의 묵상 본문과 질문을 수정하고 등록합니다.</div>
                                </div>
                            </button>

                            <button onClick={() => {
                                setSermonManageForm({
                                    script: '',
                                    summary: churchSettings.sermon_summary || '',
                                    q1: churchSettings.sermon_q1 || '',
                                    q2: churchSettings.sermon_q2 || '',
                                    q3: churchSettings.sermon_q3 || '',
                                    videoUrl: '',
                                    inputType: 'text'
                                });
                                setView('sermonManage');
                            }} style={{ width: '100%', padding: '24px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                                <div style={{ width: '48px', height: '48px', background: '#FCE4EC', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🎙️</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#333', marginBottom: '2px' }}>주일 설교 요약 및 질문 관리</div>
                                    <div style={{ fontSize: '12px', color: '#999' }}>설교 원고를 입력하여 AI로 자동 요약하고 묵상 질문을 만듭니다.</div>
                                </div>
                            </button>
                            <button onClick={async () => {
                                if (confirm('모든 성도님들께 오늘의 큐티 알림을 전송하시겠습니까?')) {
                                    try {
                                        const res = await fetch('/api/push-send-daily?secret=somy-push-secret-123');
                                        const data = await res.json();
                                        if (data.success) {
                                            alert(`성공적으로 전송되었습니다! (성공: ${data.sentCount}명, 실패: ${data.failedCount}명)`);
                                        } else {
                                            alert('전송 실패: ' + data.error);
                                        }
                                    } catch (e) { alert('네트워크 오류가 발생했습니다.'); }
                                }
                            }} style={{ width: '100%', padding: '24px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                                <div style={{ width: '48px', height: '48px', background: '#E8F5E9', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🔔</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#333', marginBottom: '2px' }}>큐티 시작 알림 전송</div>
                                    <div style={{ fontSize: '12px', color: '#999' }}>모든 성도님께 오늘의 말씀 페이지로 연결되는 푸시 알림을 보냅니다.</div>
                                </div>
                            </button>
                        </div>

                        <button onClick={() => setView('home')} style={{ marginTop: '32px', width: '100%', padding: '16px', background: '#F5F5F5', color: '#333', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' }}>홈으로 돌아가기</button>
                    </>
                </div>
            );
        }

        /* ══════════════════════════════
           SERMON VIEW
        ══════════════════════════════ */
        if (view === "sermon") {
            const getYoutubeEmbedUrl = (url: string) => {
                const targetUrl = url || "https://www.youtube.com/watch?v=dQw4w9WgXcQ"; // 영상 없을 때 기본 안내용 영상(또는 샘플)

                if (targetUrl.startsWith('UC') && targetUrl.length > 20) {
                    const playlistId = 'UU' + targetUrl.substring(2);
                    return `https://www.youtube.com/embed?listType=playlist&list=${playlistId}`;
                }

                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                const match = targetUrl.match(regExp);
                const videoId = (match && match[2].length === 11) ? match[2] : null;

                return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1` : null;
            };
            const embedUrl = getYoutubeEmbedUrl(churchSettings?.sermon_url || "");

            return (
                <div style={{
                    minHeight: "100vh",
                    background: "white",
                    maxWidth: "480px",
                    margin: "0 auto",
                    ...baseFont,
                    paddingTop: 'env(safe-area-inset-top)'
                }}>
                    {styles}
                    <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #F0F0F0", position: 'sticky', top: 'env(safe-area-inset-top)', background: 'white', zIndex: 10 }}>
                        <button onClick={handleBack} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: '#333', padding: '8px' }}>←</button>
                        <div style={{ fontWeight: 800, color: "#333", fontSize: "15px" }}>🎥 담임목사 설교</div>
                    </div>
                    <div style={{ padding: "20px" }}>
                        <div style={{ background: '#FFF3E0', padding: '15px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #FFCC80' }}>
                            <p style={{ margin: 0, fontSize: '14px', color: '#E65100', fontWeight: 600, textAlign: 'center' }}>
                                아래 영상을 눌러 오늘의 말씀을 시청하세요 ✨
                            </p>
                        </div>
                        {embedUrl ? (
                            <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                                <iframe
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                                    src={embedUrl}
                                    title="YouTube video player"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '100px 20px', color: '#999' }}>
                                등록된 설교 영상이 없거나 주소가 올바르지 않습니다.
                            </div>
                        )}
                        <div style={{ marginTop: '30px', background: '#F9F9F9', padding: '20px', borderRadius: '20px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 10px 0' }}>💡 말씀과 함께하는 묵상</h3>

                            {churchSettings.sermon_summary ? (
                                <>
                                    <div style={{ fontSize: '14px', color: '#555', lineHeight: 1.6, marginBottom: '20px', padding: '15px', background: 'white', borderRadius: '12px', border: '1px solid #EEE' }}>
                                        {churchSettings.sermon_summary.split('\n').map((line: string, i: number) => (
                                            <span key={i}>{line}<br /></span>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {[churchSettings.sermon_q1, churchSettings.sermon_q2, churchSettings.sermon_q3].map((q, idx) => {
                                            if (!q) return null;
                                            return (
                                                <div key={idx} style={{ padding: '15px', background: '#FFF9C4', borderRadius: '15px', borderLeft: '4px solid #D4AF37' }}>
                                                    <div style={{ fontSize: '14px', color: '#333', fontWeight: 600, marginBottom: '10px' }}>
                                                        {idx + 1}. {q}
                                                    </div>
                                                    <textarea
                                                        value={sermonReflection[`q${idx + 1}` as keyof typeof sermonReflection] as string}
                                                        onChange={(e) => setSermonReflection(prev => ({ ...prev, [`q${idx + 1}`]: e.target.value }))}
                                                        placeholder="나의 생각이나 결단을 적어보세요..."
                                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EBE4A5', outline: 'none', fontSize: '13px', minHeight: '80px', background: 'white', resize: 'vertical' }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.6, margin: 0, marginBottom: '20px' }}>
                                    말씀 설교를 시청하신 후, 하나님의 풍성한 은혜를 누리시는 오늘 하루 되시길 축복합니다.
                                </p>
                            )}

                            <div style={{ marginTop: '20px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#333', marginBottom: '10px' }}>📝 전체적인 은혜 나누기</div>
                                <textarea
                                    value={sermonReflection.mainGrace}
                                    onChange={(e) => setSermonReflection(prev => ({ ...prev, mainGrace: e.target.value }))}
                                    placeholder="전체적으로 깨달은 점, 개인적으로 적용하고 싶은 결단이나 다짐 등을 자유롭게 적어주세요!"
                                    style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #E7E7E7', outline: 'none', fontSize: '14px', minHeight: '120px', resize: 'vertical', background: 'white' }}
                                />
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '10px', fontSize: '13px', color: '#666' }}>
                                    <input type="checkbox" checked={sermonReflection.isPrivate} onChange={e => setSermonReflection(prev => ({ ...prev, isPrivate: e.target.checked }))} style={{ width: '16px', height: '16px' }} />
                                    나만 보기 (체크 시 게시판에 공개되지 않습니다)
                                </label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '30px', padding: '0 20px 30px' }}>
                            <button onClick={async () => {
                                if (!sermonReflection.mainGrace.trim() && !sermonReflection.q1.trim() && !sermonReflection.q2.trim() && !sermonReflection.q3.trim()) {
                                    alert('나눌 은혜나 질문에 대한 답변을 한 가지 이상 적어주세요!');
                                    return;
                                }

                                if (!user) {
                                    alert("로그인이 필요합니다.");
                                    return;
                                }

                                let user_name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "익명의 성도";
                                let avatar_url = user.user_metadata?.avatar_url || '';

                                let combinedContent = "";
                                if (sermonReflection.q1) combinedContent += `[질문 1] ${churchSettings.sermon_q1}\n나의 묵상: ${sermonReflection.q1}\n\n`;
                                if (sermonReflection.q2) combinedContent += `[질문 2] ${churchSettings.sermon_q2}\n나의 묵상: ${sermonReflection.q2}\n\n`;
                                if (sermonReflection.q3) combinedContent += `[질문 3] ${churchSettings.sermon_q3}\n나의 묵상: ${sermonReflection.q3}\n\n`;
                                if (sermonReflection.mainGrace) combinedContent += `[나의 결단과 은혜]\n${sermonReflection.mainGrace}`;

                                try {
                                    const postRes = await fetch('/api/community', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            user_id: user.id,
                                            user_name,
                                            avatar_url,
                                            content: '[말씀묵상] \n' + combinedContent.trim(),
                                            is_private: sermonReflection.isPrivate,
                                            church_id: churchId
                                        })
                                    });
                                    if (postRes.ok) {
                                        setSermonReflection({ q1: '', q2: '', q3: '', mainGrace: '', isPrivate: false });
                                        setView("community");
                                        const res = await fetch(`/api/community?church_id=${churchId}`);
                                        const data = await res.json();
                                        if (Array.isArray(data)) setCommunityPosts(data);
                                    } else {
                                        alert("게시물 등록에 실패했습니다.");
                                    }
                                } catch (e) {
                                    console.error("게시판 등록 실패:", e);
                                    alert("오류가 발생했습니다.");
                                }
                            }} style={{
                                width: '100%',
                                padding: '14px',
                                background: (sermonReflection.mainGrace.trim() || sermonReflection.q1.trim() || sermonReflection.q2.trim() || sermonReflection.q3.trim()) ? '#C2185B' : '#E6A4B4',
                                color: 'white',
                                border: 'none',
                                borderRadius: '15px',
                                fontWeight: 800,
                                fontSize: '15px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(173, 20, 87, 0.1)',
                                transition: 'background-color 0.4s ease'
                            }}>
                                <span style={{ fontSize: '16px' }}>📝</span> 은혜 나누기
                            </button>
                            <button onClick={() => setView('home')} style={{ width: '100%', padding: '14px', background: '#F5F5F5', color: '#555', border: '1px solid #EEE', borderRadius: '15px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>홈으로 이동</button>
                        </div>
                    </div>
                </div>
            );
        }

        /* ══════════════════════════════
           SERMON MANAGE VIEW (Admin)
        ══════════════════════════════ */
        if (view === "sermonManage") {
            const handleGenerateSermon = async () => {
                if (sermonManageForm.inputType === 'text' && !sermonManageForm.script.trim()) {
                    alert("설교 원고(또는 메모)를 입력해주세요.");
                    return;
                }
                if (sermonManageForm.inputType === 'video' && !sermonManageForm.videoUrl.trim()) {
                    alert("유튜브 영상 주소를 입력해주세요.");
                    return;
                }

                setAiLoading(true);
                try {
                    const payload = sermonManageForm.inputType === 'text'
                        ? { script: sermonManageForm.script }
                        : { videoUrl: sermonManageForm.videoUrl };

                    const res = await fetch('/api/sermon-generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if (data.error) {
                        alert("AI 생성 실패: " + data.error);
                    } else {
                        setSermonManageForm(prev => ({
                            ...prev,
                            summary: data.summary || '',
                            q1: data.question1 || '',
                            q2: data.question2 || '',
                            q3: data.question3 || ''
                        }));
                    }
                } catch (e) {
                    alert('AI 생성 중 오류가 발생했습니다.');
                } finally {
                    setAiLoading(false);
                }
            };

            const handleSaveSermonManage = async () => {
                const newSettings = {
                    ...churchSettings,
                    sermon_summary: sermonManageForm.summary,
                    sermon_q1: sermonManageForm.q1,
                    sermon_q2: sermonManageForm.q2,
                    sermon_q3: sermonManageForm.q3
                };

                const res = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newSettings),
                });

                if (res.ok) {
                    setChurchSettings(newSettings);
                    alert("설교 요약과 질문이 성공적으로 저장되었습니다!");
                    setView('admin');
                } else {
                    alert("저장에 실패했습니다.");
                }
            };

            return (
                <div style={{ padding: "20px", maxWidth: "480px", margin: "0 auto", background: "#FDFCFB", minHeight: "100vh", ...baseFont, paddingTop: 'env(safe-area-inset-top)' }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                        <button onClick={() => setView('admin')} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: '#333' }}>←</button>
                        <div style={{ fontWeight: 800, fontSize: "16px", color: '#333' }}>🎙️ 주일 설교 자동 요약봇</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <button onClick={() => setSermonManageForm(prev => ({ ...prev, inputType: 'text' }))} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, border: 'none', background: sermonManageForm.inputType === 'text' ? '#333' : '#F5F5F5', color: sermonManageForm.inputType === 'text' ? 'white' : '#666', cursor: 'pointer' }}>📝 설교 원고 입력</button>
                                <button onClick={() => setSermonManageForm(prev => ({ ...prev, inputType: 'video' }))} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, border: 'none', background: sermonManageForm.inputType === 'video' ? '#D4AF37' : '#F5F5F5', color: sermonManageForm.inputType === 'video' ? 'white' : '#666', cursor: 'pointer' }}>🎥 유튜브 자동 요약</button>
                            </div>

                            {sermonManageForm.inputType === 'text' ? (
                                <>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '6px' }}>📝 설교 원고 (또는 핵심 메모)</label>
                                    <textarea
                                        value={sermonManageForm.script}
                                        onChange={e => setSermonManageForm(prev => ({ ...prev, script: e.target.value }))}
                                        placeholder="여기에 설교 원고 전체나 핵심 메모를 붙여넣으세요..."
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '13px', minHeight: '150px', outline: 'none', resize: 'vertical' }}
                                    />
                                </>
                            ) : (
                                <>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '6px' }}>🎥 유튜브 영상 주소</label>
                                    <input
                                        type="text"
                                        value={sermonManageForm.videoUrl}
                                        onChange={e => setSermonManageForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                                        placeholder="예: https://youtu.be/..."
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '13px', outline: 'none', marginBottom: '10px' }}
                                    />
                                    <p style={{ fontSize: '11px', color: '#999', margin: '0 0 10px 0' }}>* 해당 영상에 자동 자막(한국어)이 생성된 상태여야 정상 작동합니다.</p>
                                </>
                            )}

                            <button onClick={handleGenerateSermon} disabled={aiLoading} style={{ marginTop: '8px', width: '100%', padding: '14px', background: sermonManageForm.inputType === 'video' ? '#D4AF37' : '#333', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', opacity: aiLoading ? 0.7 : 1 }}>
                                {aiLoading ? '✨ 소미가 설교를 열심히 분석하고 요약하는 중...' : '✨ AI 자동 요약 및 묵상질문 만들기'}
                            </button>
                        </div>

                        <div style={{ background: 'white', padding: '15px', borderRadius: '15px', border: '1px solid #F0ECE4' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '6px' }}>📖 설교 요약</label>
                            <textarea
                                value={sermonManageForm.summary}
                                onChange={e => setSermonManageForm(prev => ({ ...prev, summary: e.target.value }))}
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '13px', minHeight: '100px', outline: 'none', marginBottom: '10px' }}
                            />

                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '6px' }}>💬 나눔 질문 1</label>
                            <input
                                value={sermonManageForm.q1}
                                onChange={e => setSermonManageForm(prev => ({ ...prev, q1: e.target.value }))}
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '13px', outline: 'none', marginBottom: '10px' }}
                            />
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '6px' }}>💬 나눔 질문 2</label>
                            <input
                                value={sermonManageForm.q2}
                                onChange={e => setSermonManageForm(prev => ({ ...prev, q2: e.target.value }))}
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '13px', outline: 'none', marginBottom: '10px' }}
                            />
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '6px' }}>💬 나눔 질문 3</label>
                            <input
                                value={sermonManageForm.q3}
                                onChange={e => setSermonManageForm(prev => ({ ...prev, q3: e.target.value }))}
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '13px', outline: 'none', marginBottom: '10px' }}
                            />
                        </div>
                    </div>

                    <button onClick={handleSaveSermonManage} style={{ marginTop: '20px', width: '100%', padding: '16px', background: '#D4AF37', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' }}>
                        💾 완성된 요약 및 질문 저장하기
                    </button>
                </div>
            )
        }

        /* ══════════════════════════════
           CHAT VIEW
        ══════════════════════════════ */
        if (view === "chat") {
            return (
                <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: "480px", margin: "0 auto", background: "white", ...baseFont, position: 'relative' }}>
                    <div style={{ padding: "15px 20px", borderBottom: "1px solid #EEE", display: "flex", alignItems: "center", gap: "12px" }}>
                        <button onClick={handleBack} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>←</button>
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

        if (view === "guide") {
            return renderGuidePage();
        }

        if (view === "profile") {
            return <ProfileView user={user} supabase={supabase} setView={setView} baseFont={baseFont} />;
        }

        if (view === "memberSearch") {
            return <MemberSearchView churchId={churchId} setView={setView} baseFont={baseFont} />;
        }

        return null; // 모든 뷰에 해당하지 않을 때
    };

    // 알림 리스트 팝업
    const renderNotificationList = () => {
        if (!showNotiList) return null;
        return (
            <>
                {/* 배경 오버레이 (바깥 클릭 시 닫기) */}
                <div onClick={() => setShowNotiList(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.1)', zIndex: 1999 }} />

                <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '340px', background: 'white', borderRadius: '24px', boxShadow: '0 15px 50px rgba(0,0,0,0.2)', zIndex: 2000, border: '2px solid #E6A4B4', overflow: 'hidden', animation: 'slide-up 0.3s ease-out' }}>
                    <div style={{ padding: '15px', borderBottom: '1px solid #F5F5F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FDFCFB' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#333' }}>🔔 새 소식</span>
                        <button onClick={() => setShowNotiList(false)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>닫기</button>
                    </div>
                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#AAA', fontSize: '13px' }}>
                                아직 도착한 소식이 없어요 🐑<br />
                                <span style={{ fontSize: '11px', opacity: 0.6, marginTop: '5px', display: 'block' }}>은혜나눔의 댓글 알림이 여기에 표시됩니다.</span>
                            </div>
                        ) : (
                            [...notifications].reverse().map(n => (
                                <div key={n.id} onClick={async () => {
                                    // 읽음 처리
                                    if (!n.is_read) {
                                        await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) });
                                        setNotifications(notifications.map(noti => noti.id === n.id ? { ...noti, is_read: true } : noti));
                                    }
                                    // 게시판으로 이동 및 데이터 새로고침
                                    try {
                                        const res = await fetch(`/api/community?church_id=${churchId}`);
                                        const data = await res.json();
                                        if (Array.isArray(data)) setCommunityPosts(data);
                                    } catch (e) { }

                                    setView('community');
                                    setShowNotiList(false);
                                }} style={{ padding: '15px', borderBottom: '1px solid #F9F9F9', cursor: 'pointer', background: n.is_read ? 'white' : '#FFF9F9', transition: 'background 0.2s', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: n.is_read ? 'transparent' : '#FF3D00', marginTop: '5px', flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '13px', color: '#333', lineHeight: 1.5 }}>
                                            <strong>{n.actor_name}</strong>님이 성도님의 은혜나눔에 따뜻한 댓글을 남기셨습니다.
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#999', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span>🕒</span>
                                            {new Date(n.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {notifications.length > 0 && (
                        <div style={{ padding: '10px 15px', textAlign: 'center', background: '#FDFCFB', borderTop: '1px solid #F0F0F0', display: 'flex', gap: '10px' }}>
                            {notifications.some(n => !n.is_read) && (
                                <button onClick={async (e) => {
                                    e.stopPropagation();
                                    // 모든 알림 읽음 처리 (API)
                                    try {
                                        await fetch('/api/notifications', {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ user_id: user.id }) // 백엔드에서 action: 'read_all' 처리하도록 구현하거나, 유저ID만 보내서 전체 처리
                                        });
                                        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
                                    } catch (e) { console.error("전체 읽음 처리 실패:", e); }
                                }} style={{ flex: 1, background: '#F5F5F5', border: 'none', color: '#666', fontSize: '12px', fontWeight: 600, padding: '8px', borderRadius: '10px', cursor: 'pointer' }}>모두 읽음</button>
                            )}
                            <button onClick={() => setShowNotiList(false)} style={{ flex: 1, background: '#333', border: 'none', color: 'white', fontSize: '12px', fontWeight: 700, padding: '8px', borderRadius: '10px', cursor: 'pointer' }}>닫기</button>
                        </div>
                    )}
                </div>
            </>
        );
    };

    // 사용 가이드 페이지
    const renderGuidePage = () => {
        const guideItems = [
            { title: "📖 오늘의 큐티", desc: "매일 아침 배달되는 성경 본문을 읽고, 5단계(읽기-해설-질문-나눔-기도) 과정을 통해 깊이 있는 묵상을 할 수 있습니다.", icon: "✨" },
            { title: "💬 소미와 대화하기", desc: "말씀을 보다가 궁금한 점이 생기면 AI 친구 '소미'에게 물어보세요. 따뜻하고 지혜로운 답변을 해줍니다.", icon: "🐑" },
            { title: "✍️ 은혜나눔 게시판", desc: "묵상한 내용을 성도들과 나누어 보세요. 서로의 글에 따뜻한 댓글과 격려로 풍성한 공동체를 만듭니다.", icon: "💌" },
            { title: "🎵 찬양 플레이어", desc: "화면 어딘가에 떠 있는 아이패드 스타일 플레이어를 통해 추천 CCM을 들으며 묵상에 집중해 보세요.", icon: "🎧" },
            { title: "📽️ 주일 설교 리뷰", desc: "주일 설교를 다시 보고, AI가 요약해준 핵심 내용과 묵상 질문으로 은혜를 되새길 수 있습니다.", icon: "🎙️" },
            { title: "🔔 푸시 알림 설정", desc: "매일 아침 8시, 큐티 시간을 알려드려요! 앱 접속 시 나타나는 알림 권한을 반드시 '허용'해 주세요.", icon: "📱" },
        ];

        return (
            <div style={{ minHeight: "100vh", background: "#FDFCFB", maxWidth: "480px", margin: "0 auto", padding: "30px 24px", ...baseFont }}>
                {/* 헤더 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                    <button onClick={() => setView('home')} style={{ background: "white", border: "1px solid #EEE", borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: "16px", cursor: "pointer", boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>←</button>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#333', margin: 0 }}>소미 활용 가이드</h2>
                </div>

                {/* 메인 배너 */}
                <div style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #B8924A 100%)', borderRadius: '24px', padding: '25px', color: 'white', marginBottom: '30px', boxShadow: '0 10px 25px rgba(184,146,74,0.2)' }}>
                    <div style={{ width: '50px', height: '50px', background: 'white', borderRadius: '50%', padding: '4px', marginBottom: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                        <img src={SOMY_IMG} alt="소미" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: '50%' }} />
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>소미와 함께 말씀과 더 가까워지는 법</div>
                    <div style={{ fontSize: '13px', lineHeight: 1.6, opacity: 0.9 }}>
                        예수인교회 성도님들의 풍성한 신앙 생활을 위해<br />
                        소미가 준비한 기능들을 소개합니다.
                    </div>
                </div>

                {/* 가이드 리스트 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {guideItems.map((item, idx) => (
                        <div key={idx} style={{ background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #F0ECE4', display: 'flex', gap: '16px', alignItems: 'flex-start', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                            <div style={{ width: '40px', height: '40px', minWidth: '40px', background: '#F9F7F2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{item.icon}</div>
                            <div>
                                <div style={{ fontSize: '15px', fontWeight: 700, color: '#333', marginBottom: '6px' }}>{item.title}</div>
                                <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.5 }}>{item.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 마무리 인사 */}
                <div style={{ marginTop: '40px', textAlign: 'center', padding: '30px 0', borderTop: '1px solid #EEE' }}>
                    <div style={{ width: '70px', height: '70px', background: 'white', borderRadius: '50%', border: '2px solid #D4AF37', padding: '5px', margin: '0 auto 15px', boxShadow: '0 8px 16px rgba(0,0,0,0.06)' }}>
                        <img src={SOMY_IMG} alt="소미" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: '50%' }} />
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>매일 아침 소미와 함께해요!</div>
                    <div style={{ fontSize: '13px', color: '#999', lineHeight: 1.5, marginBottom: '25px' }}>
                        궁금한 점이 있거나 이용에 어려운 점이 있다면<br />
                        언제든지 소미에게 물어보세요.
                    </div>
                    <button onClick={() => setView('home')} style={{ padding: '14px 40px', background: '#333', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}>홈으로 돌아가기</button>
                </div>
            </div>
        );
    };

    // [성도 관련 컴포넌트는 파일 하단 독립 컴포넌트 구역으로 이동되었습니다]


    // 앱 설치 안내 모달
    const renderInstallGuide = () => {
        if (!showInstallGuide) return null;

        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

        return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px' }}>
                <div style={{ background: 'white', borderRadius: '30px', padding: '30px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center', animation: 'fade-in 0.3s ease-out' }}>
                    <div style={{ fontSize: '40px', marginBottom: '15px' }}>📱</div>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#333', marginBottom: '10px' }}>홈 화면에 어플 추가</h3>

                    {isIos ? (
                        <>
                            {/* iOS 안내 */}
                            <div style={{ background: '#FFF3E0', border: '1px solid #FFB74D', padding: '12px 16px', borderRadius: '14px', marginBottom: '16px', textAlign: 'left' }}>
                                <p style={{ fontSize: '13px', color: '#E65100', fontWeight: 700, margin: 0 }}>
                                    ⚠️ 아이폰은 <strong>사파리(Safari)</strong>에서 가능합니다!
                                </p>
                            </div>
                            <div style={{ background: '#F9F7F2', padding: '20px', borderRadius: '20px', textAlign: 'left', marginBottom: '25px' }}>
                                <p style={{ fontSize: '14px', color: '#555', lineHeight: '2', margin: 0 }}>
                                    1️⃣ 하단 중앙 <strong>공유 버튼</strong> 탭 (네모↑)<br />
                                    2️⃣ 아래로 스크롤 후 <strong>[홈 화면에 추가]</strong> 탭<br />
                                    3️⃣ 오른쪽 위 <strong>[추가]</strong> 탭하면 완성! 🎉
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Android 안내 */}
                            <div style={{ background: '#E3F2FD', border: '1px solid #90CAF9', padding: '12px 16px', borderRadius: '14px', marginBottom: '16px', textAlign: 'left' }}>
                                <p style={{ fontSize: '13px', color: '#1565C0', fontWeight: 700, margin: 0 }}>
                                    ✨ 안드로이드는 <strong>크롬(Chrome)</strong>에서 가능합니다!
                                </p>
                            </div>
                            <div style={{ background: '#F9F7F2', padding: '20px', borderRadius: '20px', textAlign: 'left', marginBottom: '25px' }}>
                                <p style={{ fontSize: '14px', color: '#555', lineHeight: '2', margin: 0 }}>
                                    1️⃣ 오른쪽 위 <strong>점 3개(⋮)</strong> 메뉴 탭<br />
                                    2️⃣ <strong>[홈 화면에 추가]</strong> 또는 <strong>[앱 설치]</strong> 탭<br />
                                    3️⃣ 팝업에서 <strong>[추가/설치]</strong> 버튼 클릭하면 완성! 🎉
                                </p>
                            </div>
                        </>
                    )}

                    <button
                        onClick={() => setShowInstallGuide(false)}
                        style={{ width: '100%', padding: '16px', background: '#333', color: 'white', border: 'none', borderRadius: '18px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}>
                        알겠어요!
                    </button>
                    <p style={{ marginTop: '15px', fontSize: '12px', color: '#999' }}>아이콘이 생기면 훨씬 편하게 들어올 수 있어요!</p>
                </div>
            </div>
        );
    };

    // 성도 상세 정보 수정 모달 (관리자용)
    const renderMemberEditModal = () => {
        if (!selectedMemberForEdit) return null;
        const m = selectedMemberForEdit;
        return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(5px)' }}>
                <div style={{ background: 'white', borderRadius: '24px', padding: '30px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', animation: 'modal-up 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>📝 성도 정보 상세 수정</h3>
                        <button onClick={() => setSelectedMemberForEdit(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', position: 'relative' }}>
                            <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                                <img
                                    alt="member photo"
                                    src={m.avatar_url || 'https://via.placeholder.com/80'}
                                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid #F0ECE4' }}
                                />
                                <label
                                    htmlFor="modal-avatar-upload"
                                    style={{ position: 'absolute', bottom: 0, right: 0, background: '#333', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid white', fontSize: '14px' }}
                                >
                                    📸
                                </label>
                                <input
                                    id="modal-avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const formData = new FormData();
                                        formData.append('file', file);
                                        formData.append('user_id', m.id);
                                        try {
                                            const res = await fetch('/api/admin/upload-avatar', { method: 'POST', body: formData });
                                            const result = await res.json();
                                            if (res.ok) {
                                                const newUrl = result.url;
                                                setMemberList((prev: any[]) => prev.map(item => item.id === m.id ? { ...item, avatar_url: newUrl } : item));
                                                setSelectedMemberForEdit({ ...m, avatar_url: newUrl });
                                                alert('사진이 성공적으로 업로드되었습니다!');
                                            } else {
                                                alert('업로드 실패: ' + result.error);
                                            }
                                        } catch (err) {
                                            alert('업로드 중 오류가 발생했습니다.');
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>성함</label>
                            <input id="edit-name" defaultValue={m.full_name} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>직분</label>
                            <input id="edit-rank" defaultValue={m.church_rank} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>전화번호</label>
                            <input id="edit-phone" defaultValue={m.phone} placeholder="010-0000-0000" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>생년월일</label>
                            <input id="edit-birth" type="date" defaultValue={m.birthdate} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>주소</label>
                            <input id="edit-addr" defaultValue={m.address} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                        <button onClick={() => setSelectedMemberForEdit(null)} style={{ flex: 1, padding: '14px', background: '#F5F5F5', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', color: '#666' }}>취소</button>
                        <button
                            onClick={async () => {
                                const updateData = {
                                    full_name: (document.getElementById('edit-name') as any)?.value || '',
                                    church_rank: (document.getElementById('edit-rank') as any)?.value || '',
                                    phone: (document.getElementById('edit-phone') as any)?.value || '',
                                    birthdate: (document.getElementById('edit-birth') as any)?.value || '',
                                    address: (document.getElementById('edit-addr') as any)?.value || '',
                                };
                                const res = await fetch('/api/admin', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'update_member', user_id: m.id, update_data: updateData })
                                });
                                if (res.ok) {
                                    setMemberList((prev: any[]) => prev.map((item: any) => item.id === m.id ? { ...item, ...updateData } : item));
                                    setSelectedMemberForEdit(null);
                                    alert('정보가 성공적으로 수정되었습니다! ✨');
                                } else {
                                    alert('수정 중 오류가 발생했습니다.');
                                }
                            }}
                            style={{ flex: 2, padding: '14px', background: '#333', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>
                            수정 완료
                        </button>
                    </div>
                </div>
            </div>
        );
    };


    // 소미 시그니처 레트로 플레이어 (저작권 걱정 없는 독자적 디자인)
    const renderMiniPlayer = () => {
        if (!todayCcm || view === 'ccm') return null;

        const handleStart = (clientX: number, clientY: number) => {
            setIsDragging(true);
            dragOffset.current = {
                x: clientX - playerPos.x,
                y: clientY - playerPos.y
            };
        };

        const handleMove = (clientX: number, clientY: number) => {
            if (!isDragging) return;
            const newX = Math.max(0, Math.min(window.innerWidth - 110, clientX - dragOffset.current.x));
            const newY = Math.max(0, Math.min(window.innerHeight - 180, clientY - dragOffset.current.y));
            setPlayerPos({ x: newX, y: newY });
        };

        const handleEnd = () => setIsDragging(false);

        return (
            <div
                style={{
                    position: 'fixed',
                    left: `${playerPos.x}px`,
                    top: `${playerPos.y}px`,
                    width: '125px',
                    height: '220px',
                    zIndex: 2000,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    background: 'linear-gradient(135deg, #FDFBF0 0%, #F5F0E1 100%)', // 부드러운 상아색
                    borderRadius: '20px',
                    padding: '30px 10px 15px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.25), inset 0 2px 2px white',
                    border: '1.5px solid #D4AF37', // 금색 테두리로 교회 느낌 강조
                    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    userSelect: 'none',
                    touchAction: 'none'
                }}
                onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
                onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchEnd={handleEnd}
            >
                {/* 닫기 버튼 */}
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        hapticClick(e, () => setShowIpod(false));
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        width: '26px',
                        height: '26px',
                        background: '#333',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#FFF',
                        cursor: 'pointer',
                        zIndex: 9999,
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                        border: '2px solid white',
                    }}
                >✕</div>

                {/* 1. 스크린 영역 */}
                <div
                    id="ccm-mini-screen"
                    onClick={() => setView('ccm')}
                    style={{
                        width: '100%',
                        height: '80px',
                        background: '#1A1A1A',
                        borderRadius: '12px',
                        marginBottom: '15px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
                        border: '1px solid #C0C0C0'
                    }}
                >
                    {/* 유튜브 영상 탑재 */}
                </div>

                {/* 2. 소미 컨트롤 패드 (Modern Retro Console) */}
                <div style={{
                    width: '100%',
                    background: '#FEFEFE',
                    borderRadius: '15px',
                    padding: '10px 5px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                    border: '1px solid #EEE'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                        <button onClick={(e) => hapticClick(e, handlePrevCcm)} style={{ border: 'none', background: '#F5F5F5', borderRadius: '8px', padding: '8px', fontSize: '14px', cursor: 'pointer' }}>⏮</button>
                        <button onClick={(e) => hapticClick(e, () => togglePlay(e))} style={{ border: 'none', background: '#D4AF37', color: 'white', borderRadius: '8px', padding: '8px 15px', fontSize: '16px', cursor: 'pointer' }}>
                            {isCcmPlaying ? '⏸' : '▶️'}
                        </button>
                        <button onClick={(e) => hapticClick(e, handleNextCcm)} style={{ border: 'none', background: '#F5F5F5', borderRadius: '8px', padding: '8px', fontSize: '14px', cursor: 'pointer' }}>⏭</button>
                    </div>
                    <div
                        onClick={(e) => hapticClick(e, () => setView('ccm'))}
                        style={{ fontSize: '10px', color: '#999', textAlign: 'center', fontWeight: 700, cursor: 'pointer' }}>
                        SOMY PLAYER
                    </div>
                </div>
            </div>
        );
    };

    // 최종 렌더링
    if (!isMounted) return <div style={{ minHeight: "100vh", background: "#FFF8F0" }} />;

    return (
        <div style={{ position: 'relative', maxWidth: '480px', margin: '0 auto' }}>
            {/* 유튜브 진짜 Iframe 보관소 (어디에도 안 띄워야 할 경우 숨겨둘 투명 금고 역할) */}
            <div
                id="youtube-portal-storage"
                style={{ position: 'fixed', left: '-1000px', top: '-1000px', width: '10px', height: '10px', overflow: 'hidden' }}
            >
                {/* 이 래퍼(Wrapper) 껍데기가 DOM 사이를 순간 이동합니다! */}
                <div
                    id="ccm-player-hidden-global-wrapper"
                    style={{ width: '100%', height: '100%', flex: 1, display: 'block' }}
                >
                    {/* 실제 유튜브 Iframe (React가 아닌 YouTube API에 의해 생성, 파괴되면 에러가 남) */}
                    <div id="ccm-player-hidden-global"></div>
                </div>
            </div>
            {renderContent()}

            {/* 전역으로 분리한 설정 모달 */}
            {showSettings && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '24px',
                        padding: '28px',
                        width: '100%',
                        maxWidth: '420px',
                        maxHeight: '85vh',
                        overflowY: 'auto',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
                        position: 'relative',
                        animation: 'modal-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}>
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
                                    {(
                                        [
                                            ['church_name', '교회 이름', '예: 예수인교회'],
                                            ['app_subtitle', '앱 부제목', '예: 큐티 동반자'],
                                            ['church_logo_url', '교회 로고 URL', 'https://...'],
                                            ['church_url', '교회 홈페이지 URL', 'https://...'],
                                            ['sermon_url', '교회 유튜브 채널 ID (또는 URL)', '예: UC... 혹은 https://...']
                                        ] as [string, string, string][]
                                    ).map(([key, label, placeholder]) => (
                                        <div key={key}>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '6px' }}>{label}</label>
                                            <input
                                                type="text"
                                                value={String(settingsForm[key as keyof typeof settingsForm])}
                                                onChange={e => setSettingsForm((prev: any) => ({ ...prev, [key]: e.target.value }))}
                                                placeholder={placeholder}
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
                                            />
                                        </div>
                                    ))}
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '6px' }}>💎 요금제 설정</label>
                                        <select
                                            value={settingsForm.plan}
                                            onChange={e => setSettingsForm((prev: any) => ({ ...prev, plan: e.target.value }))}
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '13px', outline: 'none', background: 'white' }}
                                        >
                                            <option value="free">무료 버전 (수동 관리)</option>
                                            <option value="premium">유료 버전 (AI 자동 생성)</option>
                                        </select>
                                        <p style={{ fontSize: '11px', color: '#999', marginTop: '6px', lineHeight: 1.4 }}>
                                            * 유료 버전은 말씀이 준비되지 않았을 때 AI가 자동으로 성경 읽기표에 맞춰 말씀을 생성합니다.
                                        </p>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '8px' }}>📋 은혜 게시판 공개 설정</label>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', border: '1px solid #EEE', background: '#FAFAFA' }}>
                                            <span style={{ fontSize: '13px', color: '#555' }}>{settingsForm.community_visible ? '🟢 공개 (성도 누구나 볼 수 있음)' : '🔴 비공개 (관리자만 볼 수 있음)'}</span>
                                            <button onClick={() => setSettingsForm((prev: any) => ({ ...prev, community_visible: !prev.community_visible }))} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', background: settingsForm.community_visible ? '#E8F5E9' : '#FFEBEE', color: settingsForm.community_visible ? '#2E7D32' : '#C62828' }}>
                                                {settingsForm.community_visible ? '비공개로 전환' : '공개로 전환'}
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '10px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '8px' }}>🎵 커스텀 CCM 목록 관리</label>

                                        {/* 저작권 및 운영 안내 */}
                                        <div style={{ background: '#F0F7FF', padding: '12px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #CFE2FF' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#084298', marginBottom: '5px' }}>🛡️ 저작권 및 운영 안내</div>
                                            <p style={{ margin: 0, fontSize: '11px', color: '#084298', lineHeight: 1.6 }}>
                                                • 본 앱은 유튜브 공식 API를 통한 <strong>단순 임베드(Embed)</strong> 방식만 제공합니다.<br />
                                                • 영상의 조회수와 광고 수익은 원작자에게 귀속되므로 저작권 문제에서 안전합니다.<br />
                                                • <strong>주의:</strong> 퍼가기가 비활성화된 영상은 재생되지 않습니다.<br />
                                                • 등록된 콘텐츠에 대한 최종 관리 책임은 해당 교회 관리자에게 있습니다.
                                            </p>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {settingsForm.custom_ccm_list?.map((ccm: any, idx: number) => (
                                                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#F9F9F9', padding: '10px', borderRadius: '10px', border: '1px solid #EEE' }}>
                                                    <div style={{ flex: 1, fontSize: '12px' }}>
                                                        <strong>{ccm.title}</strong><br />
                                                        <span style={{ color: '#999' }}>ID: {ccm.youtubeId}</span>
                                                    </div>
                                                    <button onClick={() => {
                                                        const newList = [...settingsForm.custom_ccm_list];
                                                        newList.splice(idx, 1);
                                                        setSettingsForm((prev: any) => ({ ...prev, custom_ccm_list: newList }));
                                                    }} style={{ background: '#FFEBEE', color: '#C62828', border: 'none', borderRadius: '5px', padding: '5px 8px', fontSize: '11px', cursor: 'pointer' }}>삭제</button>
                                                </div>
                                            ))}
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                                                <input id="new-ccm-title" type="text" placeholder="찬양 제목 (예: 은혜로다)" style={{ flex: 2, padding: '8px', fontSize: '12px', borderRadius: '5px', border: '1px solid #EEE', outline: 'none' }} />
                                                <input id="new-ccm-id" type="text" placeholder="유튜브 주소 또는 ID" style={{ flex: 2, padding: '8px', fontSize: '12px', borderRadius: '5px', border: '1px solid #EEE', outline: 'none' }} />
                                                <button onClick={() => {
                                                    const titleInput = document.getElementById('new-ccm-title') as HTMLInputElement;
                                                    const idInput = document.getElementById('new-ccm-id') as HTMLInputElement;
                                                    if (!titleInput.value || !idInput.value) return;

                                                    // 유튜브 ID 추출 로직 (대표님/부장님의 실수를 방지하는 스마트 파싱!)
                                                    let finalId = idInput.value.trim();
                                                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                                                    const match = finalId.match(regExp);
                                                    if (match && match[2].length === 11) {
                                                        finalId = match[2];
                                                    } else if (finalId.length > 11) {
                                                        alert('올바른 유튜브 주소 형식이 아닙니다. 다시 확인해 주세요!');
                                                        return;
                                                    }

                                                    const newList = [...(settingsForm.custom_ccm_list || []), {
                                                        title: titleInput.value,
                                                        artist: CHURCH_NAME,
                                                        youtubeId: finalId
                                                    }];
                                                    setSettingsForm((prev: any) => ({ ...prev, custom_ccm_list: newList }));
                                                    titleInput.value = '';
                                                    idInput.value = '';
                                                }} style={{ flex: 1, background: '#D4AF37', color: 'white', border: 'none', borderRadius: '5px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>추가</button>
                                            </div>
                                        </div>
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '500px', overflowY: 'auto' }}>
                                {/* 엑셀 업로드 영역 */}
                                <div style={{ background: '#F9F7F2', padding: '18px', borderRadius: '15px', border: '1px dashed #D4AF37', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#333' }}>📊 성도 명단 엑셀 업로드</div>
                                        <button
                                            onClick={downloadTemplate}
                                            style={{
                                                padding: '4px 10px',
                                                fontSize: '11px',
                                                background: '#FFF',
                                                color: '#B8924A',
                                                border: '1px solid #D4AF37',
                                                borderRadius: '6px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            📥 양식 다운로드
                                        </button>
                                    </div>
                                    <div style={{ background: 'white', padding: '12px', borderRadius: '10px', border: '1px solid #F0ECE4', marginBottom: '12px' }}>
                                        <input id="excel-upload-input" type="file" accept=".xlsx, .xls" onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setSelectedUploadFile(file);
                                        }} style={{ display: 'none' }} />

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {!selectedUploadFile ? (
                                                <button
                                                    onClick={() => document.getElementById('excel-upload-input')?.click()}
                                                    style={{ width: '100%', padding: '12px', background: '#FAFAFA', border: '2px dashed #EEE', borderRadius: '10px', color: '#999', fontSize: '13px', cursor: 'pointer' }}
                                                >
                                                    📁 엑셀 파일 선택하기
                                                </button>
                                            ) : (
                                                <div style={{ padding: '10px', background: '#FFF9C4', borderRadius: '10px', border: '1px solid #FFF176', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ fontSize: '12px', color: '#856404', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                                                        📄 {selectedUploadFile.name}
                                                        <span onClick={() => setSelectedUploadFile(null)} style={{ cursor: 'pointer', color: '#999' }}>✕</span>
                                                    </div>
                                                    <button
                                                        disabled={isMemberUploading}
                                                        onClick={async () => {
                                                            if (!selectedUploadFile) return;
                                                            setIsMemberUploading(true); // ✅ 애니메이션 시작
                                                            const formData = new FormData();
                                                            formData.append('file', selectedUploadFile);
                                                            formData.append('church_id', churchId);

                                                            try {
                                                                const res = await fetch('/api/admin/bulk-upload', {
                                                                    method: 'POST',
                                                                    body: formData
                                                                });
                                                                const result = await res.json();
                                                                if (result.success) {
                                                                    alert(`${result.count}명의 성도 정보가 업데이트 되었습니다! ✅`);
                                                                    setSelectedUploadFile(null);
                                                                    // 리스트 새로고침
                                                                    const r = await fetch('/api/admin?action=list_members');
                                                                    const data = await r.json();
                                                                    if (Array.isArray(data)) setMemberList(data);
                                                                } else {
                                                                    const errorMsg = result.errors ? `\n\n[심층진단]:\n${result.errors.join('\n')}` : `\n(DB에 해당 데이터 칸이 없을 수 있습니다.)`;
                                                                    alert(`업데이트 실패: ${result.count || 0}명 성공${errorMsg}`);
                                                                }
                                                            } catch (e) {
                                                                alert('파일 처리 중 오류가 발생했습니다.');
                                                            } finally {
                                                                setIsMemberUploading(false); // ✅ 애니메이션 종료
                                                            }
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '12px',
                                                            background: isMemberUploading ? '#999' : '#333',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            fontWeight: 800,
                                                            fontSize: '13px',
                                                            cursor: isMemberUploading ? 'default' : 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '8px',
                                                            transition: 'all 0.3s'
                                                        }}
                                                    >
                                                        {isMemberUploading ? (
                                                            <>
                                                                <div className="spinner-small" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                                                                업로드 중... 잠시만 기다려주세요
                                                            </>
                                                        ) : (
                                                            '🚀 성도 명단 업로드 시작'
                                                        )}
                                                    </button>
                                                    <style>{`
                                                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                                                    `}</style>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#888', lineHeight: 1.5 }}>
                                        <strong style={{ color: '#D4AF37' }}>💡 권장 양식:</strong><br />
                                        성명 | 휴대폰 | 생년월일 | 성별 | 교회직분 | 교적번호 | 주소<br />
                                        <span style={{ color: '#999' }}>(※ 엑셀 내부 사진 삽입은 지원되지 않습니다. 사진은 개별 수정으로 등록해 주세요.)</span>
                                    </div>
                                </div>

                                {/* 오늘의 생일 알림 */}
                                {(() => {
                                    const kstTime = new Date().getTime() + (9 * 60 * 60 * 1000);
                                    const kstDate = new Date(kstTime);
                                    const today = kstDate.toISOString().slice(5, 10); // MM-DD
                                    const birthdayBoys = (memberList || []).filter(m => m?.birthdate && String(m.birthdate).slice(5, 10) === today);
                                    if (birthdayBoys.length > 0) {
                                        return (
                                            <div style={{ background: '#FFF9C4', padding: '12px 16px', borderRadius: '12px', border: '1px solid #FFF176', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '18px' }}>🎂</span>
                                                <div style={{ fontSize: '13px', color: '#333', fontWeight: 600 }}>
                                                    오늘 생일이신 분: {birthdayBoys.map(m => m.full_name).join(', ')}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {isManagingMembers ? <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>로딩 중...</div> :
                                    memberList.length === 0 ? <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '13px' }}>등록된 성도가 없습니다.</div> :
                                        memberList.map(member => (
                                            <div key={member.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px', background: '#F9F9F9', borderRadius: '16px', border: '1px solid #F0F0F0', gap: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                                    <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
                                                        <img alt="" src={member.avatar_url || 'https://via.placeholder.com/32'} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#EEE' }} />
                                                        <label htmlFor={`avatar-upload-${member.id}`} style={{ position: 'absolute', bottom: -4, right: -4, background: 'white', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer', border: '1px solid #DDD', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>📸</label>
                                                        <input
                                                            id={`avatar-upload-${member.id}`}
                                                            type="file"
                                                            accept="image/*"
                                                            style={{ display: 'none' }}
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;

                                                                // 피드백을 위해 임시로 텍스트나 로딩 표시를 줄 수 있지만, 간단히 진행
                                                                const formData = new FormData();
                                                                formData.append('file', file);
                                                                formData.append('user_id', member.id);

                                                                try {
                                                                    const res = await fetch('/api/admin/upload-avatar', {
                                                                        method: 'POST',
                                                                        body: formData
                                                                    });
                                                                    const result = await res.json();
                                                                    if (res.ok) {
                                                                        setMemberList(memberList.map(m => m.id === member.id ? { ...m, avatar_url: result.url } : m));
                                                                        alert('사진이 성공적으로 교체되었습니다!');
                                                                    } else {
                                                                        alert('사진 업로드 실패: ' + result.error);
                                                                    }
                                                                } catch (err) {
                                                                    alert('사진 업로드 중 오류가 발생했습니다.');
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.full_name || '이름 없음'}</div>
                                                        <div style={{ fontSize: '11px', color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.email}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end', flexShrink: 0 }}>
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                        <button
                                                            onClick={() => setSelectedMemberForEdit(member)}
                                                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'white', color: '#666' }}>
                                                            📝 정보 수정
                                                        </button>
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
                                                            style={{ padding: '6px 10px', minWidth: '70px', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: member.is_approved ? '#E8F5E9' : '#333', color: member.is_approved ? '#2E7D32' : 'white', whiteSpace: 'nowrap' }}>
                                                            {member.is_approved ? '승인됨' : '승인하기'}
                                                        </button>
                                                    </div>

                                                    {/* 관리자 전용 프라이버시 토글 */}
                                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                        {(['phone', 'birthdate', 'address'] as const).map(type => {
                                                            const isPublic = member[`is_${type}_public`];
                                                            return (
                                                                <button
                                                                    key={type}
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        const field = `is_${type}_public`;
                                                                        const newValue = !isPublic;
                                                                        const res = await fetch('/api/admin', {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({
                                                                                action: 'update_member',
                                                                                user_id: member.id,
                                                                                update_data: { [field]: newValue }
                                                                            })
                                                                        });
                                                                        if (res.ok) {
                                                                            setMemberList(memberList.map(m => m.id === member.id ? { ...m, [field]: newValue } : m));
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        fontSize: '10px',
                                                                        padding: '4px 8px',
                                                                        borderRadius: '20px',
                                                                        border: '1px solid',
                                                                        borderColor: isPublic ? '#D4AF37' : '#EEE',
                                                                        cursor: 'pointer',
                                                                        background: isPublic ? '#FFFDE7' : 'white',
                                                                        color: isPublic ? '#856404' : '#999',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '3px',
                                                                        fontWeight: 700,
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    <span>{type === 'phone' ? '📞 전번' : type === 'birthdate' ? '🎂 생일' : '🏠 주소'}</span>
                                                                    <span style={{ fontSize: '8px' }}>{isPublic ? '공개' : '비공'}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                }
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ fontSize: '13px', color: '#666', background: '#F5F5F3', padding: '14px', borderRadius: '12px', lineHeight: 1.5 }}>
                                    🛡️ <strong>슈퍼 관리자 전용 (마스터 모드)</strong><br />
                                    전체 교회의 현황을 파악하고 관리자를 지정합니다.
                                </div>

                                {/* 교회별 등록 인원 통계 */}
                                <div style={{ background: '#FFF9C4', padding: '18px', borderRadius: '18px', border: '1px solid #FFF176' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#333', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>⛪ 교회별 등록 성도수</span>
                                        <button onClick={async () => {
                                            const r = await fetch('/api/admin?action=get_church_stats');
                                            const data = await r.json();
                                            if (data) setChurchStats(data);
                                        }} style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}>새로고침</button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {Object.keys(churchStats).length > 0 ? (
                                            Object.entries(churchStats).map(([cid, count]) => (
                                                <div key={cid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.5)', padding: '8px 12px', borderRadius: '10px' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#555' }}>📍 {cid}</span>
                                                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#D4AF37' }}>{count}명</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', padding: '10px' }}>'새로고침'을 눌러 통계를 확인하세요.</div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '8px' }}>새 관리자 정보 등록</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <input id="admin-email-input" type="email" placeholder="관리자 이메일 (예: pastor@kakao.com)" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '13px', outline: 'none' }} />
                                            <input id="admin-church-id-input" type="text" placeholder="교회 아이디 (영문 추천, 예: sarang)" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '13px', outline: 'none' }} />
                                            <button onClick={async () => {
                                                const emailInput = document.getElementById('admin-email-input') as HTMLInputElement;
                                                const churchIdInput = document.getElementById('admin-church-id-input') as HTMLInputElement;
                                                const email = emailInput?.value;
                                                const cId = churchIdInput?.value;
                                                if (!email || !cId) { alert('이메일과 교회 아이디를 모두 입력해주세요.'); return; }
                                                const res = await fetch('/api/admin', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ action: 'add_admin', email: email.trim(), role: 'church_admin', church_id: cId.trim() })
                                                });
                                                if (res.ok) {
                                                    alert(`[${cId}] 관리자가 성공적으로 등록되었습니다!\n이제 해당 관리자에게 접속 링크를 전달하세요.`);
                                                    emailInput.value = '';
                                                    churchIdInput.value = '';
                                                } else {
                                                    alert('등록에 실패했습니다.');
                                                }
                                            }} style={{ padding: '14px', background: '#333', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                                                🚀 새로운 교회 등록 및 관리자 임명
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ background: '#F0F4F8', padding: '15px', borderRadius: '15px', border: '1px solid #D1D9E6' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#4A5568', marginBottom: '8px' }}>💡 새로운 교회 시작 가이드</div>
                                        <ol style={{ fontSize: '11px', color: '#718096', paddingLeft: '18px', lineHeight: 1.6, margin: 0 }}>
                                            <li>위에서 관리자 이메일과 <strong>교회 아이디</strong>를 등록합니다.</li>
                                            <li>등록한 아이디가 포함된 링크를 전달합니다.<br />
                                                <code style={{ background: '#E2E8F0', padding: '2px 4px', borderRadius: '4px', fontSize: '10px' }}>?church=[아이디]</code></li>
                                            <li>관리자가 접속 후 [관리자 센터]에서 교회 이름, 로고를 직접 세팅하면 끝!</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {renderMemberEditModal()}
            {renderNotificationList()}
            {user && (
                <>
                    {view !== 'sermon' && (showIpod ? renderMiniPlayer() : (
                        <div
                            onClick={() => {
                                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
                                setShowIpod(true);
                            }}
                            style={{
                                position: 'fixed',
                                bottom: '25px',
                                left: '25px', // 버튼 방해를 방지하기 위해 왼쪽으로 이동
                                width: '44px',
                                height: '44px',
                                background: 'rgba(51, 51, 51, 0.85)',
                                color: 'white',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '22px',
                                zIndex: 2500,
                                cursor: 'pointer',
                                boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
                                backdropFilter: 'blur(8px)',
                                border: '1.5px solid rgba(255,255,255,0.3)',
                                animation: 'fade-in 0.3s',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = "scale(1.1)"}
                            onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
                        >
                            🎧
                        </div>
                    ))}
                </>
            )}
            {renderInstallGuide()}
        </div>
    );
}

// === 독립 컴포넌트 구역 (App 외부에 정의하여 불필요한 리마운트 방지) ===

// 내 프로필 화면 컴포넌트
const ProfileView = ({ user, supabase, setView, baseFont }: any) => {
    const [profileForm, setProfileForm] = useState({
        full_name: user?.user_metadata?.full_name || '',
        phone: '',
        birthdate: '',
        address: '',
        is_phone_public: false,
        is_birthdate_public: false,
        is_address_public: false
    });
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            if (!user?.id) return;
            try {
                // 1. ID로 먼저 시도 (기존 연결된 프로필)
                let { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();

                // 2. ID로 없으면 이메일로 매칭 시도 (엑셀 업로드 유저 구출 로직)
                if (!data && user.email) {
                    console.log("ID로 프로필을 찾을 수 없어 이메일 매칭을 시도합니다:", user.email);
                    const { data: emailMatch } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('email', user.email)
                        .is('id', null) // 아직 어떤 계정과도 연결되지 않은 행만
                        .maybeSingle();

                    if (emailMatch) {
                        console.log("이메일 매칭 성공! 프로필을 현재 계정과 연결합니다.");
                        const { error: linkError } = await supabase
                            .from('profiles')
                            .update({ id: user.id })
                            .eq('email', user.email);

                        if (!linkError) {
                            const { data: linkedData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                            data = linkedData;
                        }
                    } else {
                        const { data: anyMatch } = await supabase.from('profiles').select('*').eq('email', user.email).maybeSingle();
                        if (anyMatch) {
                            console.log("이메일은 같으나 ID가 다른 데이터 발견. 현재 ID로 업데이트합니다.");
                            await supabase.from('profiles').update({ id: user.id }).eq('email', user.email);
                            data = { ...anyMatch, id: user.id };
                        }
                    }
                }

                if (data) {
                    setProfileForm({
                        full_name: data.full_name || user?.user_metadata?.full_name || '',
                        phone: data.phone || '',
                        birthdate: data.birthdate || '',
                        address: data.address || '',
                        is_phone_public: data.is_phone_public || false,
                        is_birthdate_public: data.is_birthdate_public || false,
                        is_address_public: data.is_address_public || false
                    });
                }
            } catch (e) { console.error("프로필 로딩 에러:", e); }
        };
        loadProfile();
    }, [user, supabase]);

    const handleSubmit = async () => {
        if (!user?.id) return;
        setIsSavingProfile(true);
        try {
            const { error } = await supabase.from('profiles').update(profileForm).eq('id', user.id);
            if (error) throw error;
            alert('프로필 정보가 저장되었습니다! ✨');
        } catch (e) { alert('저장 실패: ' + (e as Error).message); }
        finally { setIsSavingProfile(false); }
    };

    return (
        <div style={{ minHeight: "100vh", background: "#FDFCFB", maxWidth: "480px", margin: "0 auto", padding: "30px 24px", ...baseFont, paddingTop: 'env(safe-area-inset-top)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                <button onClick={() => setView('home')} style={{ background: "white", border: "1px solid #EEE", borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: "16px", cursor: "pointer", boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>←</button>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#333', margin: 0 }}>내 프로필 관리</h2>
            </div>
            <div style={{ background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '24px', border: '1px solid #F0ECE4' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '8px' }}>👤 성함</label>
                        <input type="text" value={profileForm.full_name} onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #EEE', outline: 'none' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '8px' }}>📞 전화번호</label>
                        <input type="tel" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="010-0000-0000" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #EEE', outline: 'none' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                            <input type="checkbox" id="phone_pub" checked={profileForm.is_phone_public} onChange={e => setProfileForm({ ...profileForm, is_phone_public: e.target.checked })} />
                            <label htmlFor="phone_pub" style={{ fontSize: '12px', color: '#888' }}>다른 성도님들께 전화번호를 공개합니다.</label>
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '8px' }}>🎂 생년월일</label>
                        <input type="date" value={profileForm.birthdate} onChange={e => setProfileForm({ ...profileForm, birthdate: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #EEE', outline: 'none' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                            <input type="checkbox" id="birth_pub" checked={profileForm.is_birthdate_public} onChange={e => setProfileForm({ ...profileForm, is_birthdate_public: e.target.checked })} />
                            <label htmlFor="birth_pub" style={{ fontSize: '12px', color: '#888' }}>다른 성도님들께 생일을 공개합니다.</label>
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '8px' }}>🏠 주소</label>
                        <input type="text" value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #EEE', outline: 'none' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                            <input type="checkbox" id="address_pub" checked={profileForm.is_address_public} onChange={e => setProfileForm({ ...profileForm, is_address_public: e.target.checked })} />
                            <label htmlFor="address_pub" style={{ fontSize: '12px', color: '#888' }}>다른 성도님들께 주소를 공개합니다.</label>
                        </div>
                    </div>
                </div>
                <button onClick={handleSubmit} disabled={isSavingProfile} style={{ width: '100%', padding: '16px', background: '#333', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer', marginTop: '30px' }}>
                    {isSavingProfile ? '저장 중...' : '💾 정보 수정하기'}
                </button>
            </div>
        </div>
    );
};

// 성도 검색/주소록 컴포넌트
const MemberSearchView = ({ churchId, setView, baseFont }: any) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null);

    useEffect(() => {
        const fetchInitial = async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/members?church_id=${churchId}`);
                const data = await res.json();
                if (Array.isArray(data)) setResults(data);
            } catch (e) { console.error("멤버 로딩 실패:", e); }
            finally { setIsSearching(false); }
        };
        fetchInitial();
    }, [churchId]);

    const handleSearch = async () => {
        setIsSearching(true);
        try {
            const res = await fetch(`/api/members?church_id=${churchId}&query=${encodeURIComponent(searchTerm)}`);
            const data = await res.json();
            if (Array.isArray(data)) setResults(data);
        } catch (e) { console.error("검색 실패:", e); }
        finally { setIsSearching(false); }
    };

    return (
        <div style={{ minHeight: "100vh", background: "#FDFCFB", maxWidth: "480px", margin: "0 auto", padding: "30px 20px", ...baseFont, paddingTop: 'env(safe-area-inset-top)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px' }}>
                <button onClick={() => setView('home')} style={{ background: "white", border: "1px solid #EEE", borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: "16px", cursor: "pointer", boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>←</button>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#333', margin: 0 }}>교회 성도 검색</h2>
            </div>
            <div style={{ position: 'sticky', top: 'env(safe-area-inset-top)', background: '#FDFCFB', zIndex: 10, paddingBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="성함을 입력하세요 (예: 홍길동)" style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '14px', outline: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }} />
                    <button onClick={handleSearch} style={{ padding: '0 20px', background: '#333', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>검색</button>
                </div>
            </div>

            {/* 오늘의 생일 알림 (전체 성도 목록에서 확인) */}
            {(() => {
                const kstBase = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
                const todayMMDD = kstBase.toISOString().slice(5, 10); // MM-DD
                const birthdayMembers = (results || []).filter(m => m?.birthdate && String(m.birthdate).slice(5, 10) === todayMMDD);

                if (birthdayMembers.length > 0) {
                    return (
                        <div style={{ background: 'linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)', padding: '16px', borderRadius: '20px', marginBottom: '16px', border: '1px solid #FFF176', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 15px rgba(255,235,59,0.2)', animation: 'pulse 2s infinite' }}>
                            <div style={{ fontSize: '24px' }}>🎉</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#856404' }}>오늘 생일인 성도님이 계세요!</div>
                                <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                                    {birthdayMembers.map(m => m.full_name).join(', ')}님, 축하드립니다! 🎂
                                </div>
                            </div>
                        </div>
                    );
                }
                return null;
            })()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                {isSearching ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>성도 정보를 불러오는 중...</div>
                ) : results.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>검색 결과가 없습니다.</div>
                ) : (
                    results.map(member => (
                        <div
                            key={member.id}
                            onClick={() => setSelectedMember(member)}
                            style={{ background: 'white', padding: '16px', borderRadius: '20px', border: '1px solid #F0ECE4', display: 'flex', gap: '14px', alignItems: 'flex-start', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer' }}
                        >
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F5F2EA', overflow: 'hidden', flexShrink: 0 }}>
                                <img alt="" src={member.avatar_url || 'https://via.placeholder.com/44'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#333' }}>{member.full_name}</span>
                                    {member.church_rank && <span style={{ fontSize: '11px', background: '#F5F2EA', color: '#B8924A', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>{member.church_rank}</span>}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ fontSize: '12px', color: member.phone ? '#555' : '#BBB' }}>📞 {member.phone || (member.is_phone_public ? '미등록' : '비공개')}</div>
                                </div>
                            </div>
                            {member.phone && (
                                <button onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${member.phone}`; }} style={{ background: '#E8F5E9', border: 'none', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <span style={{ fontSize: '18px' }}>📞</span>
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* 성도 상세 정보 모달 */}
            {selectedMember && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'end', justifyContent: 'center' }} onClick={() => setSelectedMember(null)}>
                    <div
                        style={{ background: 'white', width: '100%', maxWidth: '480px', borderRadius: '32px 32px 0 0', padding: '40px 24px', position: 'relative', animation: 'slide-up 0.3s ease-out' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button onClick={() => setSelectedMember(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: '#F5F5F3', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>×</button>

                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#F5F2EA', margin: '0 auto 16px', padding: '4px', border: '1px solid #F0ECE4' }}>
                                <img alt="" src={selectedMember.avatar_url || 'https://via.placeholder.com/100'} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            </div>
                            <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#333', margin: '0 0 6px' }}>{selectedMember.full_name}</h3>
                            {selectedMember.church_rank && <span style={{ fontSize: '14px', background: '#F5F2EA', color: '#B8924A', padding: '4px 12px', borderRadius: '10px', fontWeight: 700 }}>{selectedMember.church_rank}</span>}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ background: '#FDFCFB', padding: '20px', borderRadius: '24px', border: '1px solid #F0ECE4' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#B8924A', fontWeight: 700, marginBottom: '2px' }}>휴대폰 번호</div>
                                            <div style={{ fontSize: '16px', fontWeight: 600, color: selectedMember.phone ? '#333' : '#BBB' }}>{selectedMember.phone || (selectedMember.is_phone_public ? '미등록' : '비공개')}</div>
                                        </div>
                                        {selectedMember.phone && (
                                            <a href={`tel:${selectedMember.phone}`} style={{ textDecoration: 'none', background: '#333', color: 'white', padding: '10px 18px', borderRadius: '14px', fontSize: '14px', fontWeight: 700 }}>전화걸기</a>
                                        )}
                                    </div>
                                    <div style={{ borderTop: '1px solid #F0ECE4', paddingTop: '15px' }}>
                                        <div style={{ fontSize: '12px', color: '#B8924A', fontWeight: 700, marginBottom: '2px' }}>생년월일</div>
                                        <div style={{ fontSize: '16px', fontWeight: 600, color: selectedMember.birthdate ? '#333' : '#BBB' }}>{selectedMember.birthdate || (selectedMember.is_birthdate_public ? '미등록' : '비공개')}</div>
                                    </div>
                                    <div style={{ borderTop: '1px solid #F0ECE4', paddingTop: '15px' }}>
                                        <div style={{ fontSize: '12px', color: '#B8924A', fontWeight: 700, marginBottom: '2px' }}>주소</div>
                                        <div style={{ fontSize: '16px', fontWeight: 600, color: selectedMember.address ? '#333' : '#BBB' }}>{selectedMember.address || (selectedMember.is_address_public ? '미등록' : '비공개')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button onClick={() => setSelectedMember(null)} style={{ width: '100%', padding: '16px', background: '#F5F5F3', color: '#666', border: 'none', borderRadius: '16px', fontWeight: 700, cursor: 'pointer', marginTop: '24px' }}>닫기</button>
                    </div>
                </div>
            )}
        </div>
    );
};
