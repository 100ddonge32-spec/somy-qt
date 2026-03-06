"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getGraceVerse } from '@/lib/navigator-verses';
import { getTodayCcm, CcmVideo, CCM_LIST } from "@/lib/ccm";
import * as XLSX from 'xlsx';

type View = "home" | "chat" | "qt" | "community" | "thanksgiving" | "counseling" | "qtManage" | "stats" | "history" | "admin" | "ccm" | "sermon" | "sermonManage" | "guide" | "adminGuide" | "brandGuide" | "profile" | "memberSearch" | "book" | "pastorColumn";

const SOMY_IMG = "/somy.png";
const CHURCH_LOGO = process.env.NEXT_PUBLIC_CHURCH_LOGO_URL || "https://lfjrfyylsxhvwosdpujv.supabase.co/storage/v1/object/public/church-assets/jesus-in-logo.png";
const CHURCH_URL = process.env.NEXT_PUBLIC_CHURCH_URL || "";
const CHURCH_NAME = process.env.NEXT_PUBLIC_CHURCH_NAME || "예수인교회";
const APP_SUBTITLE = process.env.NEXT_PUBLIC_APP_SUBTITLE || "말씀과 기도로 거룩해지는 공동체";
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

const getLunarTodayMMDD = () => {
    try {
        const parts = new Intl.DateTimeFormat('ko-KR-u-ca-chinese', { month: '2-digit', day: '2-digit' }).format(new Date()).match(/\d+/g);
        if (parts && parts.length >= 2) return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    } catch (e) { }
    return null;
};
interface Comment {
    id: any;
    user_id: string;
    user_name: string;
    content: string;
    created_at: string;
    is_private?: boolean; // 비공개 여부
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
    liker_ids?: string[]; // 좋아요 누른 유저 ID 목록
    is_qt?: boolean; // ✅ 묵상나눔 여부
}

interface Notification {
    id: number;
    user_id: string;
    actor_name: string;
    type: string;
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

// ✅ 한국 전화번호 자동 포맷팅 (하이픈 추가)
function formatPhone(phone: string): string {
    if (!phone) return "";
    const cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.length === 11) {
        return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
    } else if (cleaned.length === 10) {
        if (cleaned.startsWith("02")) {
            return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "$1-$2-$3");
        }
        return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    } else if (cleaned.length === 9) {
        return cleaned.replace(/(\d{2})(\d{3})(\d{4})/, "$1-$2-$3");
    } else if (cleaned.length === 8) {
        return cleaned.replace(/(\d{4})(\d{4})/, "$1-$2");
    }
    return phone;
}

const BookView = ({ book, onBack }: { book: any, onBack: () => void }) => {
    // ... (rest of BookView unchanged)
    return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fade-in 0.4s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={onBack} style={{ background: '#F5F5F5', border: 'none', width: '36px', height: '36px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px' }}>←</button>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>📚 이달의 책 추천</h2>
            </div>

            <div style={{ background: 'white', borderRadius: '28px', padding: '28px', border: '1px solid #F0ECE4', boxShadow: '0 15px 35px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                <div style={{ width: '100%', maxWidth: '200px', aspectRatio: '2/3', background: '#F9F7F2', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', position: 'relative' }}>
                    {book.today_book_image_url ? (
                        <img src={book.today_book_image_url} alt={book.today_book_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: '#DDD' }}>📖</div>
                    )}
                </div>

                <div style={{ textAlign: 'center', width: '100%' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#333', marginBottom: '8px', wordBreak: 'keep-all' }}>{book.today_book_title || '이달의 추천 도서'}</h3>
                    <div style={{ width: '40px', height: '3px', background: '#D4AF37', margin: '12px auto', borderRadius: '2px' }}></div>
                </div>

                <div style={{ width: '100%', background: '#F9F7F2', padding: '24px', borderRadius: '20px', border: '1px solid #F0ECE4' }}>
                    <p style={{ margin: 0, fontSize: '15px', color: '#555', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>
                        {book.today_book_description || '교회 성도님들을 위해 엄선한 이달의 추천 도서입니다. 풍성한 영적 독서의 시간을 가져보세요.'}
                    </p>
                </div>
            </div>

            <button onClick={onBack} style={{ width: '100%', padding: '16px', background: '#333', color: 'white', border: 'none', borderRadius: '16px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginTop: '10px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>확인</button>
        </div>
    );
};

const EventPosterPopup = ({ imageUrl, onClose }: { imageUrl: string, onClose: () => void }) => {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(5px)' }}>
            <div style={{ position: 'relative', maxWidth: '400px', width: '100%', animation: 'scale-up 0.3s ease-out' }}>
                <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                    <img src={imageUrl} alt="행사 포스터" style={{ width: '100%', height: 'auto', display: 'block' }} />
                    <div style={{ padding: '12px', background: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button onClick={() => {
                            const cleanUrl = imageUrl.split('?')[0];
                            const hideKey = `somy_hide_poster_${btoa(cleanUrl).substring(0, 32)}`;
                            localStorage.setItem(hideKey, new Date().toDateString());
                            onClose();
                        }} style={{ background: 'none', border: 'none', color: '#BBB', fontSize: '13px', cursor: 'pointer' }}>오늘 하루 안보기</button>
                        <button onClick={onClose} style={{ background: '#D4AF37', border: 'none', color: 'white', padding: '6px 20px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>닫기</button>
                    </div>
                </div>
                <button onClick={onClose} style={{ position: 'absolute', top: '-15px', right: '-15px', width: '36px', height: '36px', background: 'white', borderRadius: '50%', border: 'none', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', cursor: 'pointer' }}>✕</button>
            </div>
        </div>
    );
};

const StatsView = ({ memberList }: { memberList: any[] }) => {
    // Gender Calculation
    const maleCount = memberList.filter(m => m.gender === '남' || m.gender === '남성').length;
    const femaleCount = memberList.filter(m => m.gender === '여' || m.gender === '여성').length;
    const totalGender = maleCount + femaleCount || 1;

    // Age Calculation
    const currentYear = new Date().getFullYear();
    const ageGroups = [
        { label: '10대 이하', min: 0, max: 19 },
        { label: '20대', min: 20, max: 29 },
        { label: '30대', min: 30, max: 39 },
        { label: '40대', min: 40, max: 49 },
        { label: '50대', min: 50, max: 59 },
        { label: '60대', min: 60, max: 69 },
        { label: '70대 이상', min: 70, max: 150 },
    ];

    const ageData = ageGroups.map(group => {
        const count = memberList.filter(m => {
            if (!m.birthdate) return false;
            const birthYear = new Date(m.birthdate).getFullYear();
            const age = currentYear - birthYear;
            return age >= group.min && age <= group.max;
        }).length;
        return { ...group, count };
    });

    const maxAgeCount = Math.max(...ageData.map(d => d.count), 1);

    // Registration Trend (Last 6 months)
    const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return d.toISOString().slice(0, 7); // YYYY-MM
    });

    const trendData = months.map(month => {
        const count = memberList.filter(m => m.created_at?.startsWith(month)).length;
        return { month, count };
    });

    const maxTrendCount = Math.max(...trendData.map(d => d.count), 1);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Summary Card */}
            <div style={{ background: 'linear-gradient(135deg, #333 0%, #555 100%)', padding: '22px', borderRadius: '22px', color: 'white', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '4px' }}>전체 등록 성도</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{memberList.length} <span style={{ fontSize: '16px', fontWeight: 600 }}>명</span></div>
            </div>

            {/* Gender Chart */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #EEE', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#333', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🚻</span> 성별 통계
                </div>
                <div style={{ display: 'flex', height: '32px', borderRadius: '16px', overflow: 'hidden', background: '#F5F5F3', marginBottom: '12px', border: '1px solid #F0F0F0' }}>
                    <div style={{ width: `${(maleCount / totalGender) * 100}%`, background: 'linear-gradient(90deg, #42A5F5, #2196F3)', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                    <div style={{ width: `${(femaleCount / totalGender) * 100}%`, background: 'linear-gradient(90deg, #F06292, #EC407A)', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', fontSize: '12px', fontWeight: 700 }}>
                    <div style={{ color: '#1E88E5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#42A5F5' }}></div>
                        남성: {maleCount}명 ({Math.round((maleCount / totalGender) * 100)}%)
                    </div>
                    <div style={{ color: '#D81B60', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        여성: {femaleCount}명 ({Math.round((femaleCount / totalGender) * 100)}%)
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#EC407A' }}></div>
                    </div>
                </div>
            </div>

            {/* Age Chart */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #EEE', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#333', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🎂</span> 연령대별 분포
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {ageData.map((group, idx) => (
                        <div key={group.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '64px', fontSize: '11px', color: '#666', fontWeight: 700 }}>{group.label}</div>
                            <div style={{ flex: 1, background: '#F8F9FA', height: '14px', borderRadius: '7px', overflow: 'hidden', border: '1px solid #F1F3F5' }}>
                                <div style={{
                                    width: `${(group.count / maxAgeCount) * 100}%`,
                                    background: `linear-gradient(90deg, ${idx % 2 === 0 ? '#D4AF37' : '#B8924A'}, ${idx % 2 === 0 ? '#F9D423' : '#D4AF37'})`,
                                    height: '100%',
                                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                                    borderRadius: '0 7px 7px 0'
                                }} />
                            </div>
                            <div style={{ width: '36px', fontSize: '12px', fontWeight: 800, color: '#333', textAlign: 'right' }}>{group.count}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Trend Chart */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #EEE', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#333', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📈</span> 가입 추이 (최근 6개월)
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '140px', padding: '0 4px', gap: '12px' }}>
                    {trendData.map(d => (
                        <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', height: '100%' }}>
                            <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <div style={{
                                    width: '100%',
                                    maxWidth: '32px',
                                    background: 'linear-gradient(0deg, #333333 0%, #555555 100%)',
                                    height: `${(d.count / maxTrendCount) * 100}%`,
                                    borderRadius: '6px 6px 4px 4px',
                                    position: 'relative',
                                    transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                                }}>
                                    {d.count > 0 && <span style={{ position: 'absolute', top: '-22px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', fontWeight: 900, color: '#333' }}>{d.count}</span>}
                                </div>
                            </div>
                            <div style={{ fontSize: '10px', color: '#888', fontWeight: 600, marginTop: '4px' }}>{d.month.split('-')[1]}월</div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ fontSize: '11px', color: '#AAA', textAlign: 'center', padding: '10px' }}>
                ※ 생년월일이나 성별이 등록되지 않은 성도는 통계에서 제외될 수 있습니다.
            </div>
        </div>
    );
};

export default function App() {
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [view, setView] = useState<View>("home");
    const [memberList, setMemberList] = useState<any[]>([]); // ✅ 성도 목록

    const [showBirthdayPopup, setShowBirthdayPopup] = useState(false); // ✅ 생일 팝업 노출 여부
    const [todayBirthdayMembers, setTodayBirthdayMembers] = useState<any[]>([]); // ✅ 오늘 생일인 성도 목록
    const [messages, setMessages] = useState([
        { role: "assistant", content: `안녕하세요! 저는 성도님의 큐티 동반자 소미예요 😊\n오늘 어떤 말씀을 함께 나눠볼까요?` }
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

    // 감사일기 상태
    const [thanksgivingDiaries, setThanksgivingDiaries] = useState<Post[]>([]);
    const [counselingRequests, setCounselingRequests] = useState<any[]>([]);
    const [counselingInput, setCounselingInput] = useState('');
    const [counselingReplyInput, setCounselingReplyInput] = useState<{ [id: string]: string }>({});
    const [isPrivateThanksgiving, setIsPrivateThanksgiving] = useState(false);
    const [thanksgivingInput, setThanksgivingInput] = useState("");
    const [expandedPosts, setExpandedPosts] = useState<{ [id: string]: boolean }>({});

    // 공지사항 상태
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [isAnnouncementsExpanded, setIsAnnouncementsExpanded] = useState(false);
    const [newAnnouncementTitle, setNewAnnouncementTitle] = useState("");
    const [newAnnouncementContent, setNewAnnouncementContent] = useState("");

    const [lastToggleTime, setLastToggleTime] = useState(0); // 이중 트리거 방지용
    const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({});
    const [commentPrivateStates, setCommentPrivateStates] = useState<{ [key: number]: boolean }>({});
    const [passageInput, setPassageInput] = useState("");
    const [fontScale, setFontScale] = useState(1);

    useEffect(() => {
        const saved = localStorage.getItem('somyFontScale');
        if (saved) setFontScale(Number(saved));
    }, []);

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
    const [profileName, setProfileName] = useState<string | null>(null);
    const [profileBirthdate, setProfileBirthdate] = useState<string | null>(null);
    const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
    const [churchId, setChurchId] = useState('');
    const [isCheckingAuth, setIsCheckingAuth] = useState(true); // ✅ 권한 확인 중 상태 (깜빡임 방지)
    // [보안/개선] adminInfo가 일시적으로 null일 때도 톱니바퀴가 사라지지 않도록 하드코딩된 마스터 체크 추가
    const MASTER_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "pastorbaek@kakao.com,kakao_4761026797@kakao_4761026797.somy-qt.local").toLowerCase().split(',').map(e => e.trim());
    const isHardcodedAdmin = !!user && !!user.email && MASTER_EMAILS.includes(user.email.toLowerCase().trim());
    const isMasterName = !!user && (user.user_metadata?.full_name === '백동희' || user.user_metadata?.name === '백동희' || profileName === '백동희');

    // [전략] 마스터이거나, adminInfo에 권한이 있으면 관리자로 인정 (소속 불일치 시에도 버튼은 보여줌)
    const isAdmin = isHardcodedAdmin || isMasterName || (!!adminInfo && (adminInfo.role === 'super_admin' || ['church_admin', 'sub_admin', 'admin'].includes(adminInfo.role)));
    const isSuperAdmin = isHardcodedAdmin || isMasterName || (!!adminInfo && adminInfo.role === 'super_admin');
    const isMainAdmin = isHardcodedAdmin || isMasterName || (!!adminInfo && (adminInfo.role === 'super_admin' || ((adminInfo.role === 'church_admin' || adminInfo.role === 'admin') && (adminInfo.church_id === churchId || adminInfo.mismatch))));
    const [editingPostId, setEditingPostId] = useState<any>(null);
    const [editContent, setEditContent] = useState("");
    const [editingCommentId, setEditingCommentId] = useState<any>(null);
    const [editCommentContent, setEditCommentContent] = useState("");
    const [isEditPrivate, setIsEditPrivate] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotiList, setShowNotiList] = useState(false);
    const [ccmIndex, setCcmIndex] = useState<number | null>(null);
    const [todayCcm, setTodayCcm] = useState<CcmVideo | null>(null);
    const [ccmVolume, setCcmVolume] = useState(50);
    const [isCcmPlaying, setIsCcmPlaying] = useState(false);
    const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null); // ✅ 업로드 대기 파일 스테이트
    const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null); // ✅ 로고 업로드 대기 파일
    const [isMemberUploading, setIsMemberUploading] = useState(false); // ✅ 업로드 중 애니메이션 스테이트
    const [isLogoUploading, setIsLogoUploading] = useState(false); // ✅ 로고 업로드 중
    const lastNotifiedId = useRef<string | null>(null);
    const birthdayPopupRef = useRef<string | null>(null);
    const [isBookUploading, setIsBookUploading] = useState(false); // ✅ 책 이미지 업로드 중
    const [isBookAiLoading, setIsBookAiLoading] = useState(false); // ✅ 책 소개 AI 생성 중
    const [isPosterUploading, setIsPosterUploading] = useState(false); // ✅ 포스터 업로드 중
    const [showEventPopup, setShowEventPopup] = useState(false); // ✅ 이벤트 팝업 노출 여부 (유저 클라이언트용)
    const [isManualSermon, setIsManualSermon] = useState(false); // ✅ 수동 설교 지정 모드 여부
    const [hasNewCommunity, setHasNewCommunity] = useState(false);
    const [hasNewThanksgiving, setHasNewThanksgiving] = useState(false);
    const [hasNewSermon, setHasNewSermon] = useState(false);
    const [editingCounselingId, setEditingCounselingId] = useState<any>(null);
    const [editingCounselingField, setEditingCounselingField] = useState<string | null>(null);
    const [editCounselingContent, setEditCounselingContent] = useState("");

    // ✅ 상담 알림Derivation (실시간 알림 목록에서 계산)
    const hasNewCounseling = notifications.some(n => !n.is_read && ['counseling_reply', 'counseling_req', 'counseling_user_reply'].includes(n.type));

    const [churchSettings, setChurchSettings] = useState<any>({
        church_name: CHURCH_NAME,
        church_logo_url: CHURCH_LOGO,
        church_url: CHURCH_URL,
        sermon_url: "",
        manual_sermon_url: "",
        app_subtitle: APP_SUBTITLE,
        plan: 'free',
        community_visible: true,
        allow_member_edit: false,
        sermon_summary: '',
        sermon_q1: '',
        sermon_q2: '',
        sermon_q3: '',
        custom_ccm_list: [],
        today_book_title: '',
        today_book_description: '',
        today_book_image_url: '',
        event_poster_url: '',
        event_poster_visible: false,
        pastor_column_title: '',
        pastor_column_content: '',
    });
    const [settingsForm, setSettingsForm] = useState<any>({
        church_name: CHURCH_NAME,
        church_logo_url: CHURCH_LOGO,
        church_url: CHURCH_URL,
        sermon_url: "",
        manual_sermon_url: "",
        app_subtitle: APP_SUBTITLE,
        plan: 'free',
        community_visible: true,
        allow_member_edit: false,
        sermon_summary: '',
        sermon_q1: '',
        sermon_q2: '',
        sermon_q3: '',
        custom_ccm_list: [],
        today_book_title: '',
        today_book_description: '',
        today_book_image_url: '',
        event_poster_url: '',
        event_poster_visible: false,
        pastor_column_title: '',
        pastor_column_content: '',
    });
    const [isGeneratingColumn, setIsGeneratingColumn] = useState(false);

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
    const [memberEditForm, setMemberEditForm] = useState<any>(null);
    const [initialMemberEditForm, setInitialMemberEditForm] = useState<any>(null);
    const [showWelcome, setShowWelcome] = useState(false); // 소미 소개 카드 표시 여부 (기본 닫힘)
    const [newCcmTitle, setNewCcmTitle] = useState(""); // ✅ 새로운 찬양 제목
    const [newCcmArtist, setNewCcmArtist] = useState(""); // ✅ 새로운 찬양 가수
    const [newCcmUrl, setNewCcmUrl] = useState(""); // ✅ 새로운 찬양 유튜브 주소
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]); // ✅ 단체문자 등을 위한 선택된 성도 ID 목록
    const [isSubmittingCounseling, setIsSubmittingCounseling] = useState(false); // ✅ 상담 요청 중복 방지
    const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null); // ✅ 상담 답변 중복 방지
    const [userCounselingReplyInput, setUserCounselingReplyInput] = useState<{ [id: string]: string }>({}); // 성도 추가 답글 입력
    const [submittingUserReplyId, setSubmittingUserReplyId] = useState<string | null>(null);
    const [submittingCommentId, setSubmittingCommentId] = useState<any>(null); // ✅ 댓글 등록 중복 방지
    const [allAdminList, setAllAdminList] = useState<any[]>([]); // ✅ 전체 관리자 목록 (슈퍼관리자용)

    // [신의 한 수] 좋아요 명단 및 생일 알림을 위해 성도 기초 정보(이름 등)를 미리 로드합니다.
    useEffect(() => {
        if (isApproved && churchId && churchId !== 'somy-main') {
            const loadInitMembers = async () => {
                console.log(`[Init] Fetching member profiles for ${churchId} icons/names...`);
                try {
                    const r = await fetch(`/api/members?church_id=${churchId}`);
                    if (r.ok) {
                        const data = await r.json();
                        if (Array.isArray(data)) {
                            setMemberList(data);
                            console.log(`[Init] Loaded ${data.length} member profiles.`);
                        }
                    }
                } catch (e) { console.error("성도 정보 초기 로드 실패:", e); }
            };
            loadInitMembers();
        }
    }, [isApproved, churchId]);

    const [isAdminsLoading, setIsAdminsLoading] = useState(false); // ✅ 관리자 목록 로딩 상태
    const [showVerification, setShowVerification] = useState(false); // ✅ 실명 인증 폼 노출 여부
    const [isInApp, setIsInApp] = useState(false); // ✅ 카톡 등 인앱 브라우저 여부
    const [vName, setVName] = useState(""); // ✅ 인증용 성함
    const [vPhone, setVPhone] = useState(""); // ✅ 인증용 연락처
    const [vBirthdate, setVBirthdate] = useState(""); // ✅ 인증용 생년월일
    const [loginName, setLoginName] = useState(""); // ✅ 로그인용 성함
    const [loginPhoneTail, setLoginPhoneTail] = useState(""); // ✅ 로그인용 전화번호 뒷자리
    const [loginBirthdate, setLoginBirthdate] = useState(""); // ✅ 로그인용 생년월일
    const [loginChurchId, setLoginChurchId] = useState(""); // ✅ 로그인용 교회 ID
    const [loginPin, setLoginPin] = useState(""); // ✅ 관리자용 보안 PIN
    const [isDirectLoggingIn, setIsDirectLoggingIn] = useState(false); // ✅ 로그인 처리 중 상태
    const [editingAdminId, setEditingAdminId] = useState<string | null>(null); // ✅ 수정 중인 관리자 ID
    const [isLinking, setIsLinking] = useState(false); // ✅ 링크 처리 중 상태
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
        if (ccmIndex === null || (!user && churchId !== 'demo')) return; // ✅ 로그인 전에는 음악을 준비하지 않음 (단, 데모는 허용)

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
    }, [ccmIndex, activeCcmList, user]); // ✅ user 상태 변화 감지 추가

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleScroll = () => {
            if (window.scrollY > 400) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };
        window.addEventListener('scroll', handleScroll);

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
        if (!isApiReady || !todayCcm || playerRef.current || ccmIndex === null || (!user && churchId !== 'demo')) return;

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
        };
    }, [ccmVolume]);

    // [이과장의 푸시 엔진] 브라우저 알림 권한을 얻고 서버에 구독 정보를 저장합니다.
    const subscribePush = async (userId: string) => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        try {
            const registration = await navigator.serviceWorker.ready;

            // [김부장의 팁] 기존 구독이 가끔 꼬이는 경우가 있어, 매번 새로 갱신해 주는 것이 가장 확실합니다.
            const existingSub = await registration.pushManager.getSubscription();
            if (existingSub) await existingSub.unsubscribe();

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BCpTn0SHIYSZzjST5xxL1Cv9svmlp3f9Xmvt9FSALBvo4QwLQCBlo_mu4ThoMHgINRmAk4c9sxwVwI2QtDyHr1I')
            });

            // 모든 푸시 알람 구독은 하나의 API로 통일했습니다.
            await fetch('/api/push-subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, subscription })
            });
            console.log("✅ 푸시 알림 서버 등록 완료!");
        } catch (e) {
            console.error("❌ 푸시 알림 구독 실패:", e);
        }
    };

    // [이과장의 배지 시스템] 새로운 글이 있는지 시간을 비교하여 N 배지를 결정합니다.
    const fetchCounseling = useCallback(async () => {
        if (!churchId) return;
        try {
            const url = `/api/counseling?church_id=${churchId}${isMainAdmin ? '&admin=true' : (user ? `&user_id=${user.id}` : '')}`;
            const r = await fetch(url, { cache: 'no-store' });
            const data = await r.json();
            if (Array.isArray(data)) setCounselingRequests(data);
        } catch (e) {
            console.error("상담 목록 로딩 실패:", e);
        }
    }, [churchId, adminInfo, user]);

    useEffect(() => {
        if (view === 'counseling') fetchCounseling();
    }, [view, fetchCounseling]);

    const checkNewContent = useCallback(async () => {
        if (!churchId) return;
        const cId = churchId;
        const kstOffset = 9 * 60 * 60 * 1000;
        const today = new Date(Date.now() + kstOffset).toISOString().split('T')[0];

        try {
            // 1. 은혜나눔 (오늘 올라온 글이 있거나, 마지막으로 본 시간보다 이후 글이 있는지)
            const { data: latestPost } = await supabase.from('community_posts').select('created_at').eq('church_id', cId).order('created_at', { ascending: false }).limit(1).single();
            const lastCommunity = localStorage.getItem(`last_view_community_${cId}`) || '0';
            const isLatestPostToday = latestPost && new Date(new Date(latestPost.created_at).getTime() + kstOffset).toISOString().split('T')[0] === today;
            const isLatestPostUnseen = latestPost && new Date(latestPost.created_at).getTime() > Number(lastCommunity);
            setHasNewCommunity(!!(isLatestPostToday || isLatestPostUnseen));

            // 2. 감사일기
            const { data: latestThanks } = await supabase.from('thanksgiving_diaries').select('created_at').eq('church_id', cId).order('created_at', { ascending: false }).limit(1).single();
            const lastThanks = localStorage.getItem(`last_view_thanks_${cId}`) || '0';
            const isLatestThanksToday = latestThanks && new Date(new Date(latestThanks.created_at).getTime() + kstOffset).toISOString().split('T')[0] === today;
            const isLatestThanksUnseen = latestThanks && new Date(latestThanks.created_at).getTime() > Number(lastThanks);
            setHasNewThanksgiving(!!(isLatestThanksToday || isLatestThanksUnseen));

            // 3. 설교 업데이트
            const r = await fetch(`/api/settings?church_id=${cId}`, { cache: 'no-store' });
            const { settings } = await r.json();
            if (settings) {
                const updatedAt = new Date(settings.updated_at || settings.created_at);
                const updatedKST = new Date(updatedAt.getTime() + kstOffset).toISOString().split('T')[0];
                const lastSermon = localStorage.getItem(`last_view_sermon_${cId}`) || '0';
                const isSermonTodayValue = updatedKST === today;
                const isSermonUnseen = updatedAt.getTime() > Number(lastSermon);
                setHasNewSermon(!!(isSermonTodayValue || isSermonUnseen));
            }
        } catch (e) {
            console.error("Badges check failed", e);
        }
    }, [churchId]);

    // 승인 상태 및 교회 정보 체크 (안드로이드/인앱 브라우저 캐시 무시 버전)
    const checkApprovalStatus = useCallback(async (force = false) => {
        if (!user) {
            setIsCheckingAuth(false);
            return;
        }

        try {
            const cacheBuster = Date.now();
            if (force) await supabase.auth.refreshSession();

            const { data, error } = await supabase
                .from('profiles')
                .select('is_approved, church_id, full_name, avatar_url, birthdate, phone')
                .eq('id', user.id)
                .neq('email', `cache_bust_${cacheBuster}`)
                .single();

            if (error || !data) {
                const metaName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.nickname || user.user_metadata?.display_name || user.user_metadata?.user_name || '';
                const metaPhone = user.phone || user.user_metadata?.phone || user.user_metadata?.phone_number || user.user_metadata?.mobile || '';
                const metaBirth = user.user_metadata?.birth || user.user_metadata?.birthdate || '';
                const isKakaoUser = user.email?.includes('kakao.somy-qt.local');
                const isAnonymousUser = !user.email || user.email.includes('anonymous.local') || user.is_anonymous;

                const hasRealInfo = (metaName && metaName.length >= 2) || (metaPhone && metaPhone.length > 5);
                if (isAnonymousUser && !hasRealInfo && !isKakaoUser) {
                    setIsApproved(false);
                    setShowVerification(true);
                    return;
                }
                const syncRes = await fetch(`/api/auth/sync?t=${cacheBuster}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: user.id, email: user.email, name: metaName,
                        avatar_url: user.user_metadata?.avatar_url, phone: metaPhone,
                        birthdate: metaBirth, church_id: churchId
                    })
                });
                if (syncRes.ok) {
                    const syncData = await syncRes.json();
                    setIsApproved((isHardcodedAdmin || isMasterName) ? true : !!syncData.is_approved);

                    if (syncData.church_id) {
                        const urlParams = new URLSearchParams(window.location.search);
                        const rawPathName = window.location.pathname.replace(/^\//, '');
                        const pathName = rawPathName ? decodeURIComponent(rawPathName) : '';
                        const hasSpecificChurchUrl = urlParams.get('church') || urlParams.get('church_id') || (pathName !== '' ? pathName : null);

                        let safeChurch = hasSpecificChurchUrl ? hasSpecificChurchUrl : (syncData.church_id || 'somy-main');
                        if (safeChurch === '예수인교회' || safeChurch === encodeURIComponent('예수인교회')) safeChurch = 'jesus-in';

                        setChurchId(safeChurch);
                        localStorage.setItem('church_id', safeChurch);
                    }
                    setProfileName(syncData.full_name || syncData.name || metaName);
                    if (syncData.is_approved) {
                        subscribePush(user.id);
                        checkNewContent();
                    }
                }
            } else {
                setIsApproved((isHardcodedAdmin || isMasterName) ? true : !!data.is_approved);
                if (data.full_name) setProfileName(data.full_name);
                if (data.avatar_url) setProfileAvatar(data.avatar_url);

                // [버그 수정] 사용자가 특정 교회 주소로 접속 중일 때(URL 기반 churchId 존재 시), 
                // 프로필에 저장된 소속 교회 정보(data.church_id)가 현재 상태를 덮어씌우지 않도록 방지합니다.
                const urlParams = new URLSearchParams(window.location.search);
                const rawPathName = window.location.pathname.replace(/^\//, '');
                const pathName = rawPathName ? decodeURIComponent(rawPathName) : '';
                const hasSpecificChurchUrl = urlParams.get('church') || urlParams.get('church_id') || (pathName !== '' ? pathName : null);

                if (data.church_id && !hasSpecificChurchUrl && !isSuperAdmin) {
                    setChurchId(data.church_id);
                    localStorage.setItem('church_id', data.church_id);
                }

                if (data.is_approved || isHardcodedAdmin || isMasterName) {
                    subscribePush(user.id);
                    checkNewContent();
                }
            }
        } catch (e) {
            console.error("Approval Check Error:", e);
        } finally {
            setIsCheckingAuth(false);
        }
    }, [user, churchId, isHardcodedAdmin, isMasterName, checkNewContent, subscribePush]);

    useEffect(() => {
        if (!user) {
            setIsCheckingAuth(false);
            setAdminInfo(null);
            setIsApproved(false);
            return;
        }

        // 1. 관리자 권한 정밀 체크
        fetch(`/api/admin?action=check_admin&email=${user.email}&user_id=${user.id}&church_id=${churchId}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data && ['church_admin', 'super_admin', 'admin', 'sub_admin'].includes(data.role)) {
                    setAdminInfo(data);
                }
            }).catch(() => { });

        // 2. 알림 초기 로드
        fetch(`/api/notifications?user_id=${user.id}`)
            .then(r => r.ok ? r.json() : [])
            .then(data => {
                setNotifications(data);
                if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator && typeof navigator.setAppBadge === 'function') {
                    const unreadCount = data?.filter((n: any) => !n.is_read)?.length || 0;
                    if (unreadCount > 0) navigator.setAppBadge(unreadCount);
                    else navigator.clearAppBadge();
                }
            }).catch(() => { });

        // 3. 승인 및 생일 체크 폴링
        let pollLoopCount = 0;
        const runPoller = () => {
            // [💡 Vercel API 호출 폭발(무한 루프) 방지 최적화]
            // 미승인(대기) 상태일 때는 15초마다 승인 여부를 확인하지만,
            // 이미 승인된 사용자는 불필요한 서버 호출을 막기 위해 10분(40번째 주기)에 한 번만 실행합니다.
            if (!isApproved || pollLoopCount % 40 === 0) {
                checkApprovalStatus();
            }
            pollLoopCount++;

            // [생일 팝업 로직 복구]
            if (memberList.length > 0) {
                const kstNow = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
                const kstToday = kstNow.toISOString().slice(0, 10);
                const todaySolarMMDD = kstToday.slice(5, 10);
                const todayLunarMMDD = typeof getLunarTodayMMDD === 'function' ? getLunarTodayMMDD() : null;
                const bMembers = memberList.filter(m => {
                    if (!m?.birthdate) return false;
                    const bd = String(m.birthdate).slice(5, 10);
                    return m.is_birthdate_lunar ? (todayLunarMMDD && bd === todayLunarMMDD) : bd === todaySolarMMDD;
                });
                if (bMembers.length > 0 && kstToday !== birthdayPopupRef.current) {
                    setTodayBirthdayMembers(bMembers);
                    setShowBirthdayPopup(true);
                    birthdayPopupRef.current = kstToday;
                }
            }
        };

        runPoller();
        const poller = setInterval(runPoller, 15000);

        // 4. 서비스 워커 등록
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(async (reg) => {
                const permission = await Notification.permission;
                if (permission === 'granted') await subscribePush(user.id);
            }).catch(e => console.error("SW Register Error:", e));
        }

        return () => clearInterval(poller);
    }, [user, churchId, checkApprovalStatus, subscribePush, memberList, isApproved]);

    // [김부장의 신의 한 수] 유저의 교회 정보가 확인되면 즉시 해당 교회 설정 로드
    useEffect(() => {
        const loadSettings = async () => {
            const cId = churchId;
            if (!cId) return;
            console.log(`[Reactive Settings] Loading for: ${cId}`);

            // [방어] 교회 전환 시 이전 데이터의 잔상을 즉시 제거 (교차 오염 방지 핵심)
            // '...prev'를 사용하지 않고 상태를 완전히 비워야 ID(id:1 등)가 섞이지 않습니다.
            setChurchSettings({ loading: true } as any);

            try {
                const r = await fetch(`/api/settings?church_id=${cId}`, { cache: 'no-store' });
                const { settings } = await r.json();
                if (settings) {
                    const saneSettings = {
                        ...settings,
                        church_name: settings.church_name || CHURCH_NAME,
                        church_logo_url: settings.church_logo_url || CHURCH_LOGO,
                        app_subtitle: settings.app_subtitle || APP_SUBTITLE,
                        community_visible: settings.community_visible ?? true,
                        allow_member_edit: settings.allow_member_edit ?? false
                    };
                    setChurchSettings(saneSettings);
                    setSettingsForm(saneSettings);

                    // ✅ 행사 포스터 팝업 ([수정] 로그인 + 승인된 성도에게만 표시)
                    if (saneSettings.event_poster_url && saneSettings.event_poster_visible) {
                        const cleanUrl = saneSettings.event_poster_url.split('?')[0];
                        const hideKey = `somy_hide_poster_${btoa(cleanUrl).substring(0, 32)}`;
                        const hideDate = localStorage.getItem(hideKey);
                        // 로그인 + 승인 상태에서만 포스터 노출
                        // (user는 여기에서 주입 불가하므로 이후 checkApprovalStatus에서 별도 학대로 체크)
                        if (hideDate !== new Date().toDateString()) {
                            setShowEventPopup(true); // isApproved 체크는 렌더 조건에서 함
                        }
                    }
                } else {
                    // [추가] 데모 버전일 경우 초기 데이터 자동 생성 호출
                    if (cId === 'demo') {
                        try {
                            await fetch('/api/admin', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'seed_demo', church_id: 'demo' })
                            });
                            // 생성 후 다시 로드 시도
                            const retry = await fetch(`/api/settings?church_id=demo`, { cache: 'no-store' });
                            const { settings: demoData } = await retry.json();
                            if (demoData) {
                                setChurchSettings(demoData);
                                setSettingsForm(demoData);
                                return;
                            }
                        } catch (e) { console.error("데모 세팅 자동 생성 실패", e); }
                    }

                    // [추가] 교회 설정이 없으면 기존 스테이트 초기화 (다른 교회 정보 유출 방지)
                    const blank = {
                        church_name: CHURCH_NAME,
                        church_logo_url: CHURCH_LOGO,
                        church_url: CHURCH_URL,
                        sermon_url: "",
                        manual_sermon_url: "",
                        app_subtitle: APP_SUBTITLE,
                        plan: 'free',
                        community_visible: true,
                        allow_member_edit: false,
                        sermon_summary: '', sermon_q1: '', sermon_q2: '', sermon_q3: '',
                        event_poster_url: '', event_poster_visible: false
                    };
                    setChurchSettings(blank);
                    setSettingsForm(blank);
                    setShowEventPopup(false);
                }
            } catch (err) {
                console.error("[Settings] Load Failed:", err);
            }
        };
        loadSettings();

        const loadAnnouncements = async () => {
            const cId = churchId;
            if (!cId) return;
            try {
                const r = await fetch(`/api/announcements?church_id=${cId}`, { cache: 'no-store' });
                const data = await r.json();
                if (Array.isArray(data)) setAnnouncements(data);
            } catch (err) { }
        };
        if (churchId) loadAnnouncements();

        if (churchId) checkNewContent();

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
    const [qtForm, setQtForm] = useState({
        date: '', reference: '', passage: '', interpretation: '',
        question1: '', question2: '', question3: '', prayer: '',
        youthInterpretation: '', youthQuestion1: '', youthQuestion2: '', youthQuestion3: ''
    });
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

    const fetchAllAdmins = async () => {
        if (!isMainAdmin && !isSuperAdmin) return;
        setIsAdminsLoading(true);
        console.log("Fetching all admins...");
        try {
            const res = await fetch(`/api/admin?action=list_all_admins&t=${Date.now()}`, { cache: 'no-store' });
            const data = await res.json();
            if (Array.isArray(data)) {
                setAllAdminList(data);
                console.log("Admins fetched:", data.length);
            }
        } catch (err) {
            console.error("Failed to fetch admins:", err);
        } finally {
            setIsAdminsLoading(false);
        }
    };

    const fetchChurchStats = async () => {
        if (!isSuperAdmin) return;
        try {
            const r = await fetch('/api/admin?action=get_church_stats');
            const data = await r.json();
            if (data.registered) {
                setChurchStats(data);
            }
        } catch (err) {
            console.error("Failed to fetch church stats:", err);
        }
    };

    useEffect(() => {
        if (isSuperAdmin && allAdminList.length === 0) {
            fetchAllAdmins();
            fetchChurchStats();
        }
    }, [isSuperAdmin]);

    const handleDeleteAdmin = async (email: string) => {
        if (!confirm(`${email} 관리자를 삭제하시겠습니까?`)) return;
        try {
            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_admin', target_email: email, requester_id: user?.id })
            });
            const data = await res.json();
            if (res.ok) {
                alert('삭제되었습니다.');
                fetchAllAdmins();
            } else {
                alert('에러: ' + data.error);
            }
        } catch (err) {
            alert('삭제 실패');
        }
    };

    const handleDeleteChurch = async (cid: string) => {
        if (!confirm(`[위험] ${cid} 교회의 모든 설정과 관리자 권한을 삭제하시겠습니까?\n성도들의 소속 정보도 초기화됩니다.`)) return;
        try {
            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_church', target_church_id: cid, requester_id: user?.id })
            });
            const data = await res.json();
            if (res.ok) {
                alert('교회 정보가 성공적으로 삭제되었습니다.');
                // 새로고침 시뮬레이션
                const r = await fetch('/api/admin?action=get_church_stats');
                const d = await r.json();
                if (d) setChurchStats(d);
            } else {
                alert('실패: ' + data.error);
            }
        } catch (e) { alert('네트워크 오류'); }
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
    const [adminTab, setAdminTab] = useState<"settings" | "members" | "master" | "stats" | "reset" | "admins">("settings");

    const [isHistoryMode, setIsHistoryMode] = useState(false);
    const [churchStats, setChurchStats] = useState<any>(null); // ✅ { registered: [], orphans: [] }
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeTarget, setMergeTarget] = useState<any>(null); // 통합될 데이터 (관리자 등록본)
    const [mergeDestinationId, setMergeDestinationId] = useState<string>(''); // 통합할 대상 (카카오 가입 유저 ID)
    const [mergeSearchKeyword, setMergeSearchKeyword] = useState('');
    const [memberSortBy, setMemberSortBy] = useState<'name' | 'email' | 'rank'>('name');
    const [adminMemberSearchTerm, setAdminMemberSearchTerm] = useState('');
    const [showOnlyDuplicates, setShowOnlyDuplicates] = useState(false); // ✅ 중복 성도만 보기 필터


    useEffect(() => {
        setIsMounted(true);

        // ✅ URL 파라미터 또는 저장장치에서 교회 ID 읽어오기
        const params = new URLSearchParams(window.location.search);
        let churchFromUrl = params.get('church') || params.get('church_id');
        const initialView = params.get('view') as any;

        // [신규 기능] URL Path (예: /예수인교회) 지원을 위한 라우팅 확장
        const pathName = typeof window !== 'undefined' ? window.location.pathname.replace(/^\//, '') : '';
        if (!churchFromUrl && pathName && pathName !== '') {
            churchFromUrl = decodeURIComponent(pathName);
        }

        if (initialView) {
            setView(initialView);
        }

        const churchFromLocal = typeof window !== 'undefined' ? localStorage.getItem('church_id') : null;

        let resolvedChurch = churchFromUrl || churchFromLocal;

        // [신규 기능] 한글 URL 매핑 (예: https://somy-qt.vercel.app/예수인교회 -> jesus-in 자동 변환)
        if (resolvedChurch === '예수인교회' || resolvedChurch === encodeURIComponent('예수인교회')) {
            resolvedChurch = 'jesus-in';
        }

        if (resolvedChurch) {
            setChurchId(resolvedChurch);
            localStorage.setItem('church_id', resolvedChurch);
            console.log(`[Initialize] Church set: ${resolvedChurch}`);
        } else {
            // [분리] 최초 메인은 예수인교회가 아닌 소미 플랫폼(somy-main)으로 설정
            setChurchId('somy-main');
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
        if (!raw) return { fullPassage: '', interpretation: '', youthData: null };

        let fullPassage = '';
        let interpretation = '';
        let youthData: any = null;

        // 1. 표준 구분자 '|||' 확인 (서버에서 이 포맷으로 전달됨)
        if (raw.includes('|||')) {
            const parts = raw.split('|||');
            fullPassage = parts[0]?.trim() || '';
            interpretation = parts[1]?.trim() || '';
            // [추가] 세 번째 파트가 있으면 청소년용 데이터로 파싱
            if (parts[2]) {
                try {
                    const cleanJson = parts[2].trim();
                    if (cleanJson.startsWith('{')) {
                        youthData = JSON.parse(cleanJson);
                    }
                } catch (e) {
                    console.error("[parsePassage] Youth data parse failed:", e);
                }
            }
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
        const tags = ['[AI 본문 해설]', '본문 요약:', '묵상 포인트:', '해설:'];
        tags.forEach(tag => {
            if (fullPassage.includes(tag)) {
                const parts = fullPassage.split(tag);
                if (parts[1]) interpretation = parts[1].trim();
                fullPassage = parts[0].trim();
            }
            fullPassage = fullPassage.replace(tag, '').trim();
        });

        if (!fullPassage && interpretation) {
            fullPassage = "본문을 불러오지 못했습니다. 잠시 후 다시 '불러오기'를 눌러주세요.";
        }

        return { fullPassage, interpretation, youthData };
    };

    const fetchQt = async () => {
        setIsQtLoading(true);
        setIsHistoryMode(false);
        try {
            const r = await fetch(`/api/qt?church_id=${churchId}`, { cache: 'no-store' });
            const { qt } = await r.json();
            if (qt) {
                const { fullPassage, interpretation, youthData } = parsePassage(qt.passage);
                const initialQt = {
                    date: new Date(qt.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
                    reference: qt.reference,
                    fullPassage,
                    interpretation: interpretation || "",
                    verse: fullPassage.split('\n')[0],
                    questions: [qt.question1, qt.question2, qt.question3].filter(Boolean),
                    prayer: qt.prayer,
                };

                let userAge = 99;
                if (profileBirthdate) {
                    const birth = new Date(profileBirthdate);
                    const today = new Date();
                    userAge = today.getFullYear() - birth.getFullYear();
                    const m = today.getMonth() - birth.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) userAge--;
                }

                if (userAge <= 20) {
                    if (youthData && youthData.interpretation && youthData.questions?.length > 0) {
                        initialQt.interpretation = youthData.interpretation;
                        initialQt.questions = youthData.questions;
                    } else {
                        try {
                            const tailRes = await fetch('/api/chat', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    messages: [{
                                        role: 'user',
                                        content: `당신은 성경 말씀을 10대~20대 초반 청년들이 이해하기 쉽도록 '눈높이 맞춤형'으로 재구성해주는 힙하고 다정하며 지혜로운 멘토 목회자입니다.
- 원본 본문과 해설의 영적 깊이는 유지하되, 이들의 일상(학업, 진로, 관계, 자존감 등)과 직접 연결되는 언어와 사례를 사용하여 묵상 가이드와 질문을 다시 써주세요.
- 말투는 친구처럼 편안하면서도 따뜻한 존댓말('~해요', '~해볼까요?')을 사용하고, 적절하게 이모지(✨, 🌱, 💡 등)를 섞어 가독성을 높여주세요.

[원본 내용]
- 본문 성경구절: ${initialQt.reference}
- 본문 해설: ${initialQt.interpretation}
- 기존 질문: ${initialQt.questions.join(', ')}

반드시 JSON 형식으로만 답하세요: {"interpretation": "새롭게 구성된 청년용 해설", "questions": ["질문1", "질문2", "질문3"]}`
                                    }]
                                })
                            });
                            if (tailRes.ok) {
                                const tailData = await tailRes.json();
                                const tailJson = JSON.parse(tailData.content.match(/\{[\s\S]*\}/)![0]);
                                initialQt.interpretation = tailJson.interpretation;
                                initialQt.questions = tailJson.questions;
                            }
                        } catch (err) { }
                    }
                }

                setQtData(initialQt);
                setAnswers(new Array(initialQt.questions.length).fill(''));
            } else {
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

        // ★ URL 오류 파라미터 감지 (카카오 켜백 오류 안내)
        const urlParams = new URLSearchParams(window.location.search);
        const urlError = urlParams.get('error');
        if (urlError === 'admin_only') {
            alert('카카오 로그인은 관리자 전용입니다. \ud83d\udd12\n\n일반 성도님은 아래 "기존 성도 정보 연결" 에서\n이름·전화번호·생년월일을 입력해 주세요.');
            window.history.replaceState(null, '', window.location.pathname);
        } else if (urlError && urlError !== 'kakao_cancelled') {
            console.warn('[URL Error]', urlError);
            window.history.replaceState(null, '', window.location.pathname);
        }

        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('kakao') || ua.includes('line') || ua.includes('naver') || ua.includes('kakaotalk')) {
            setIsInApp(true);
        }

        // 오늘의 큐티 로드
        console.log("[FetchQt] Starting...");
        fetchQt();

        // 인증 상태 변화 감지 (supabase logic)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleDirectLogin = async () => {
        const targetChurch = loginChurchId.trim() || (churchId !== 'somy-main' ? churchId : '');
        if (!loginName.trim() || !loginPhoneTail.trim() || !targetChurch) {
            alert("교회 ID, 성함, 전화번호를 모두 입력해 주세요.");
            return;
        }

        setIsDirectLoggingIn(true);
        try {
            // 1. 익명 로그인 시도 (세션 생성용)
            // 이미 로그인된 사용자가 있는 경우 (다른 기기 등) 세션이 꼬일 수 있으므로 
            // 현재 세션이 있다면 그것을 쓰거나, 없으면 새로 생성
            const { data: { session: existingSession } } = await supabase.auth.getSession();
            let authId = existingSession?.user?.id;

            if (!authId) {
                const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
                if (authError) throw authError;
                authId = authData.user?.id;
            }

            // 2. 서버에 인증 정보 확인 및 프로필 연결 요청
            const res = await fetch('/api/auth/direct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: authId,
                    name: loginName.trim(),
                    phoneTail: loginPhoneTail.trim(),
                    birthdate: loginBirthdate.trim(),
                    church_id: loginChurchId.trim() || churchId,
                    pin: loginPin.trim() // [추가] 관리자 보안 PIN
                })
            });

            const result = await res.json();


            if (res.ok && result.success) {
                // [개선] 불필요한 알럿 창 제거 - 로그인 성공 시 즉시 메인으로 진입
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);

                if (result.church_id) setChurchId(result.church_id);
                if (result.name) setProfileName(result.name);

                // 상태 체크 후 내부 로직에 의해 자동으로 메인 화면으로 이동됨
                checkApprovalStatus(true);
            } else {
                throw new Error(result.error || "서버 인증 처리 중 오류가 발생했습니다.");
            }
        } catch (err: any) {
            console.error("[Login Error]", err);
            const msg = err.message || "알 수 없는 오류가 발생했습니다.";
            alert(`로그인 중 문제가 발생했습니다.\n\n${msg}\n\n⚙️ 개발자 참고: 서버 환경변수(익명 로그인, Service Role Key) 설정을 확인하세요.`);
        } finally {
            setIsDirectLoggingIn(false);
        }
    };

    // [추가] 고유 트라이얼(체험용) 교회 생성 및 진입


    const handleLogin = async (provider: 'google' | 'kakao') => {
        alert("카카오톡 로그인은 더 이상 지원되지 않습니다. 성도/관리자 통합 입구(정보 매칭)를 이용해 주세요.");
    };

    const handleVerification = async () => {
        if (!user || !vName.trim() || !vPhone.trim()) {
            alert("성함과 연락잘를 모두 입력해 주세요.");
            return;
        }
        if (!vBirthdate.trim()) {
            alert("정확한 인증을 위해 생년월일도 입력해 주세요.\n(예: 800101)");
            return;
        }

        setIsLinking(true);
        try {
            // [핵심] sync 대신 direct API 사용
            // 이름 + 전화번호 + 생년월일 3가지 정확히 일치해야만 즉시 승인
            // 불일치 시 유령 계정 생성 없이 오류 메시지만 표시
            const res = await fetch('/api/auth/direct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    name: vName.trim(),
                    phoneTail: vPhone.trim(),
                    birthdate: vBirthdate.trim(),
                    church_id: churchId
                })
            });

            const result = await res.json();
            const resultName = result.name || vName.trim();

            if (res.ok && result.success && result.status === 'linked' && result.is_approved) {
                // ✅ 3가지 정보 모두 일치 → 즉시 메인 화면!
                setProfileName(resultName);
                if (result.church_id) setChurchId(result.church_id);
                setShowVerification(false);
                checkApprovalStatus(true);
            } else {
                // 불일치 (not_found) → 유령 계정 없이 안내만 표시
                const errMsg = result.error || '일치하는 성도 정보를 찾지 못했습니다.';
                alert(`❌ ${errMsg}\n\n• 성함: 전체 이름 정확히 (예: 홍길동)\n• 연락처: 하이픈 없이 숫자만 (예: 01012345678)\n• 생년월일: 6자리 (예: 800101)\n\n확인 후 다시 시도하거나 관리자에게 문의해 주세요.`);
            }
        } catch (err: any) {
            alert("오류가 발생했습니다: " + err.message);
        } finally {
            setIsLinking(false);
        }
    };


    const handleLogout = async () => {
        await supabase.auth.signOut();

        // [수정] 로그아웃 시 예수인교회(blank)로 돌아가서 UI가 왜곡되는 현상(시각적 오염)을 방지
        // 대신 공식 플랫폼 메인으로 안전하게 초기화합니다.
        setChurchId('somy-main');
        setChurchSettings({ loading: true } as any);
        setSettingsForm({ loading: true } as any);
        setShowEventPopup(false);

        // [세션 초기화] 로그아웃 시 캐시된 교회 정보를 완전히 삭제
        localStorage.removeItem('church_id');
        sessionStorage.removeItem('church_id');

        setProfileName(null);
        setAdminInfo(null);
        setIsApproved(false);

        // URL 클리어 시도 (히스토리 스택 방지)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('church_id') || urlParams.has('church')) {
            window.history.replaceState({}, '', '/');
        }

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
                "교인사진": "(사진 파일명 또는 URL)",
                "성명": "홍길동",
                "교적번호": "2024-001",
                "생년월일": "1990-01-01",
                "성별": "남",
                "교회직분": "성도",
                "휴대폰": "010-1234-5678",
                "주소": "서울특별시 ...",
                "이메일": "hong@example.com (필수 아님)",
                "등록일": "2024-01-01"
            }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "성도양식");
        XLSX.writeFile(wb, "성도명단_표준양식.xlsx");
    };

    const handleSaveSettings = async () => {
        setSettingsSaving(true);
        try {
            // [핵심 버그 수정] settingsForm에만 없는 설교 관련 필드를 churchSettings에서 가져와 병합
            // 이렇게 해야 기본 설정 저장 시 설교 요약/질문 내용이 사라지지 않습니다.
            // [항상 표준화] 교회 ID 정규화 처리
            const finalChurchId = (churchId === '예수인교회' || churchId === encodeURIComponent('예수인교회')) ? 'jesus-in' : churchId;

            // 권한 검증용 Payload 구성
            const fullPayload = {
                ...churchSettings,
                ...settingsForm,
                church_id: finalChurchId,
                requester_id: user?.id,
                requester_email: user?.email
            };

            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullPayload),
            });
            const data = await res.json();
            if (data.success) {
                setChurchSettings(fullPayload);

                setShowSettings(false);
                alert('설정이 저장되었습니다! ✅');

                // ✅ 저장 후 즉시 포스터 팝업 체크
                if (settingsForm.event_poster_url && settingsForm.event_poster_visible) {
                    const cleanUrl = settingsForm.event_poster_url.split('?')[0];
                    const hideKey = `somy_hide_poster_${btoa(cleanUrl).substring(0, 32)}`;
                    if (localStorage.getItem(hideKey) !== new Date().toDateString()) {
                        setShowEventPopup(true);
                    }
                }
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

    const handleGenerateColumn = async () => {
        if (isGeneratingColumn) return;
        setIsGeneratingColumn(true);
        try {
            const verse = getGraceVerse();
            // ✅ 프롬프트를 더 풍성하고 깊이 있게 수정
            const prompt = `당신은 ${settingsForm.church_name || CHURCH_NAME}의 담임목사입니다. 오늘의 말씀 [${verse.book} ${verse.ref}: ${verse.verse}]을 바탕으로 성도들에게 깊은 위로와 영적 도전을 주는 '담임목사 칼럼'을 작성해주세요. 

[작성 가이드라인]
1. 분량: 약 500자 내외로 풍성하게 작성하세요.
2. 구조: 말씀 묵상 - 삶의 적용 - 따뜻한 격려와 축복의 순서로 구성하세요.
3. 말투: 성도를 진심으로 아끼는 마음이 담긴 자애롭고 은혜로운 목소리(존댓말)를 사용하세요.
4. 내용: 단순히 말씀을 설명하기보다, 오늘을 살아가는 성도들의 삶에 실제적인 힘이 되는 조언을 포함하세요.

반드시 아래 형식을 엄격히 지켜서 출력하세요:
제목: (강렬하고 은혜로운 제목)
내용: (깊이 있고 풍성한 권면의 글)

마크다운 기호(** 등)는 사용하지 말고 텍스트로만 정성스럽게 작성해주세요.`;

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 1000, // ✅ 글자수가 많아지므로 토큰 용량 상향
                    stream: false
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "AI 호출 실패");
            }

            const data = await res.json();
            const aiResponse = data.content || "";
            console.log("AI Column Response:", aiResponse);

            // ✅ 정규표현식 개선 (마크다운 ** 등이 포함되어도 인식 가능하도록)
            const titleMatch = aiResponse.match(/(?:제목|주제|Title)\s*[:：]\s*(.+)/i) || aiResponse.match(/\*\*(?:제목|주제|Title)\s*[:：]\s*\*\*(.+)/i);
            const contentMatch = aiResponse.match(/(?:내용|본문|Content)\s*[:：]\s*([\s\S]+)/i) || aiResponse.match(/\*\*(?:내용|본문|Content)\s*[:：]\s*\*\*(.+)/i);

            let newTitle = titleMatch ? titleMatch[1].replace(/\*/g, '').trim() : "오늘의 은혜";
            let newContent = contentMatch ? contentMatch[1].replace(/\*/g, '').trim() : aiResponse.trim();

            // 제목만 있고 내용 파싱 실패 시 aiResponse 전체를 내용으로 사용
            if (aiResponse.includes('제목:') && !aiResponse.includes('내용:')) {
                newContent = aiResponse.split('제목:')[1].split('\n').slice(1).join('\n').trim();
            }

            // ✅ 현재 settingsForm을 기반으로 저장 (사용자가 다른 설정을 바꿨을 수 있으므로)
            const updatedPayload = {
                ...settingsForm,
                church_id: churchId,
                pastor_column_title: newTitle,
                pastor_column_content: newContent,
                requester_id: user?.id
            };

            const saveRes = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPayload)
            });

            if (saveRes.ok) {
                setChurchSettings(updatedPayload);
                setSettingsForm(updatedPayload);
                alert("✨ AI가 오늘의 칼럼을 정성스럽게 작성했습니다!");
            } else {
                const saveError = await saveRes.json();
                throw new Error(saveError.error || "저장 실패");
            }
        } catch (e) {
            console.error("칼럼 생성 실패:", e);
            alert("칼럼 생성 중 오류가 발생했습니다: " + (e as Error).message);
        } finally {
            setIsGeneratingColumn(false);
        }
    };

    // [기능] 좋아요 누른 사람 이름 목록 가져오기 (김부장의 디테일)
    const getLikerNames = (likerIds: string[]) => {
        if (!likerIds || !Array.isArray(likerIds) || likerIds.length === 0) return null;
        const names = likerIds.map(id => {
            // memberList에서 먼저 찾고, 없으면 allAdminList(관리자)에서 이름을 찾습니다.
            const m = memberList.find(member => member.id === id) || allAdminList.find(a => a.id === id || a.user_id === id);
            return m?.full_name || m?.name || null;
        }).filter(Boolean);
        if (names.length === 0) return null;
        if (names.length <= 3) return names.join(", ") + "님이 좋아합니다";
        return `${names.slice(0, 2).join(", ")}님 외 ${names.length - 2}명이 좋아합니다`;
    };

    const handleAnswerChange = (index: number, value: string) => {
        const newAnswers = [...answers];
        newAnswers[index] = value;
        setAnswers(newAnswers);
    };

    const handlePassageAsk = async (directInput?: any) => {
        const query = typeof directInput === 'string' ? directInput : passageInput;
        if (!query.trim() || isPassageLoading) return;

        const userMsg = { role: "user", content: query };
        setPassageChat(prev => [...prev, userMsg]);
        if (!directInput) setPassageInput("");
        setIsPassageLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: `당신은 성경 말씀을 알기 쉽게 설명해주는 큐티 조력자 소미입니다. 다음 성경 본문에 대해 질문하는 사용자에게 친절하고 영성 있게 답해주세요.\n본문: ${qtData.fullPassage}` },
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
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    church_id: churchId // [추가] 사용량 체크를 위해 전달
                }),
            });
            const data = await response.json();
            setMessages((prev) => [...prev, { role: "assistant", content: data.content || data.error }]);
        } catch {
            setMessages((prev) => [...prev, { role: "assistant", content: "잠시 연결이 불안정해요 🙏" }]);
        } finally {
            setIsLoading(false);
        }
    };

    const baseFont = {
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        zoom: fontScale,
        WebkitTextSizeAdjust: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden'
    } as any;

    /* ══════════════════════════════
       STYLES
    ══════════════════════════════ */
    const styles = (
        <style>{`
      @keyframes float-gentle { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
      @keyframes halo-pulse { 0%, 100% { opacity: 0.6; transform: translateX(-50%) scaleX(1) translateY(0px); } 50% { opacity: 1; transform: translateX(-50%) scaleX(1.15) translateY(-5px); } }
      @keyframes shadow-pulse { 0%, 100% { transform: translateX(-50%) scaleX(1); opacity: 0.3; } 50% { transform: translateX(-50%) scaleX(0.7); opacity: 0.1; } }
      @keyframes fade-in { from{ opacity:0; transform:translateY(10px); } to{ opacity:1; transform:translateY(0); } }
      @keyframes slide-right { from{ opacity:0; transform:translateX(10px); } to{ opacity:1; transform:translateX(0); } }
      @keyframes bounce-dot { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-7px); } }
      @keyframes bell-swing {
          0%, 100% { transform: rotate(0); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(15deg); }
          20%, 40%, 60%, 80% { transform: rotate(-15deg); }
      }
      @keyframes bounce-light { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }

      /* 글씨 크기 조절을 위한 전역 스타일 */
      .main-action-button span {
          font-size: ${Math.round(15 * fontScale)}px !important;
      }
      
      .sub-action-button div, .sub-action-button span {
          font-size: ${Math.round(14 * fontScale)}px !important;
      }
      .sub-action-button .label {
          font-size: ${Math.round(13 * fontScale)}px !important;
      }

      .verse-text {
          font-size: ${Math.round(15 * fontScale)}px !important;
      }

      .quote-text {
          font-size: ${Math.round(14.5 * fontScale)}px !important;
      }
      @keyframes slide-up {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
      @keyframes pulse-soft {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.02); opacity: 0.9; }
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
        if (view === "book") {
            return <BookView book={churchSettings} onBack={handleBack} />;
        }
        if (view === "home") {
            return (
                <div style={{
                    minHeight: "100vh",
                    background: "linear-gradient(180deg, #FFF8F0 0%, #FEF0D8 50%, #F5E0BB 100%)",
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "space-between", padding: "40px 24px 60px 24px",
                    maxWidth: "600px", margin: "0 auto", ...baseFont,
                    position: 'relative'
                }}>
                    {/* 우측 상단 소미 & 사용자 정보 */}
                    <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 10 }}>
                        {user && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                background: 'rgba(255,255,255,0.85)', padding: '6px 14px',
                                borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                fontSize: '12px', border: '1.5px solid white',
                                backdropFilter: 'blur(10px)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {isSuperAdmin ? (
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <span style={{ background: '#333', color: 'white', fontSize: '9px', padding: '2px 5px', borderRadius: '4px', fontWeight: 900 }}>슈퍼관리자</span>
                                            <button
                                                onClick={() => {
                                                    const targetPath = churchId === 'somy-main' ? '예수인교회' : 'somy-main';
                                                    window.location.href = `/${targetPath}`;
                                                }}
                                                style={{ background: '#1A5D55', color: 'white', border: 'none', borderRadius: '4px', fontSize: '9px', fontWeight: 900, cursor: 'pointer', padding: '2px 5px', transition: 'all 0.2s' }}
                                            >
                                                {churchId === 'somy-main' ? '⛪ 본교회로 이동' : '🌐 플랫폼 메인 관리'}
                                            </button>
                                        </div>
                                    ) : isAdmin ? (
                                        <span style={{ background: '#666', color: 'white', fontSize: '9px', padding: '1px 5px', borderRadius: '4px', fontWeight: 900 }}>관리자</span>
                                    ) : null}
                                    <span style={{ color: '#333', fontWeight: 800 }}>{profileName || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]}님</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {isAdmin && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                                            <button
                                                onClick={() => setView('admin')}
                                                style={{ background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                                title="관리자 센터"
                                            >⚙️</button>
                                        </div>
                                    )}
                                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontWeight: 600, fontSize: '11px', padding: 0 }}>로그아웃</button>
                                </div>
                            </div>
                        )}
                        {/* 글씨 확대 버튼 (Aa) */}
                        <div
                            onClick={() => {
                                const next = fontScale >= 1.6 ? 1 : fontScale + 0.2;
                                setFontScale(next);
                                localStorage.setItem('somyFontScale', next.toString());
                            }}
                            style={{
                                width: "38px", height: "38px", borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.1)",
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#666',
                                boxShadow: "0 4px 10px rgba(0,0,0,0.05)", cursor: "pointer", backdropFilter: 'blur(5px)', userSelect: 'none'
                            }}
                            title="글씨 크기 조절"
                        >
                            <span style={{ transform: 'scale(1.1)' }}>Aa</span>
                        </div>
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
                                <div style={{ position: "relative", animation: "float-gentle 3.5s ease-in-out infinite" }}>
                                    <div style={{ position: "absolute", top: "-10px", left: "50%", width: "120px", height: "15px", border: "3px solid #D4AF37", borderRadius: "999px", zIndex: 2, transform: "translateX(-50%)", animation: "halo-pulse 3.5s ease-in-out infinite" }} />
                                    <div style={{ width: "170px", height: "170px", borderRadius: "50%", background: "white", boxShadow: "0 15px 45px rgba(212,175,55,.3), 0 5px 15px rgba(0,0,0,.08)", border: "4px solid white", overflow: "hidden" }}>
                                        <img src={SOMY_IMG} alt="소미" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    </div>
                                    <div style={{ position: "absolute", bottom: "-20px", left: "50%", width: "100px", height: "14px", background: "radial-gradient(ellipse,rgba(180,140,60,.3) 0%,transparent 70%)", borderRadius: "50%", transform: "translateX(-50%)", animation: "shadow-pulse 3.5s ease-in-out infinite" }} />
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

                    {/* 생일 축하 팝업 모달 */}
                    {showBirthdayPopup && todayBirthdayMembers.length > 0 && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                            <div style={{
                                background: 'white', width: '100%', maxWidth: '340px', borderRadius: '32px', padding: '30px 24px', textAlign: 'center',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden', animation: 'scale-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                            }}>
                                {/* 배경 장식 */}
                                <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '60px', opacity: 0.1 }}>🎈</div>
                                <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', fontSize: '60px', opacity: 0.1 }}>🎁</div>

                                <div style={{ fontSize: '50px', marginBottom: '20px', animation: 'bounce 2s infinite' }}>🎂</div>
                                <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#333', marginBottom: '10px' }}>생일을 축하합니다!</h2>
                                <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.6, marginBottom: '24px' }}>
                                    오늘 우리 교회에 <br />
                                    <span style={{ color: '#D4AF37', fontWeight: 900 }}>{todayBirthdayMembers.map(m => m.full_name).join(', ')}</span> 성도님의 <br />
                                    기쁜 생일이 찾아왔어요! ✨
                                </p>

                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '30px', flexWrap: 'wrap' }}>
                                    {todayBirthdayMembers.map(m => (
                                        <div key={m.id} style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid #D4AF37', padding: '2px', background: 'white' }}>
                                            <img src={m.avatar_url || SOMY_IMG} alt={m.full_name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setShowBirthdayPopup(false)}
                                    style={{
                                        width: '100%', padding: '16px', background: 'linear-gradient(135deg, #333 0%, #000 100%)',
                                        color: 'white', border: 'none', borderRadius: '18px', fontSize: '16px', fontWeight: 800,
                                        cursor: 'pointer', boxShadow: '0 8px 15px rgba(0,0,0,0.2)'
                                    }}>
                                    축하하며 닫기
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Church Logo Header */}
                    <div style={{ width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <a href={churchSettings.church_url} target="_blank" rel="noopener noreferrer" style={{
                            textDecoration: "none",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                            marginTop: "30px",
                            marginBottom: "20px",
                            animation: "fade-in 0.8s ease-out"
                        }}>
                            <div style={{ position: 'relative' }}>
                                {churchId && churchSettings.church_logo_url ? (
                                    <img src={churchSettings.church_logo_url} alt={`${churchSettings.church_name} 로고`} style={{ height: "45px", objectFit: "contain" }} />
                                ) : (
                                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#333' }}>{churchId ? churchSettings.church_name : ''}</div>
                                )}
                            </div>
                            <div style={{ fontSize: "12px", color: "#666", letterSpacing: "1px", fontWeight: 700 }}>홈페이지</div>
                        </a>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%", maxWidth: "340px", animation: "fade-in 1.4s ease-out", paddingBottom: "20px" }}>
                        {isCheckingAuth ? (
                            <div style={{ padding: '80px 0', textAlign: 'center', background: 'white', borderRadius: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '30px', animation: 'bounce 2s infinite', marginBottom: '15px' }}>✨</div>
                                <div style={{ fontSize: '15px', color: '#1A5D55', fontWeight: 800 }}>보안 연결 확인 중...</div>
                                <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>잠시만 기다려 주세요.</div>
                            </div>
                        ) : !user ? (
                            <div style={{ background: 'white', padding: '30px', borderRadius: '32px', boxShadow: '0 15px 50px rgba(0,0,0,0.1)', border: '1px solid #F0ECE4', textAlign: 'center' }}>
                                <div style={{ marginBottom: '25px', textAlign: 'center', animation: 'fade-in 0.8s ease' }}>
                                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#1A5D55', marginBottom: '12px' }}>성도 & 관리자 통합 입장 ⛪</div>
                                    <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.6 }}>
                                        교회 ID와 등록된 정보를 입력하시면<br />
                                        관리자 권한까지 즉시 연동됩니다. (카카오 불필요)
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ textAlign: 'left' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#B8924A', marginLeft: '4px', marginBottom: '6px', display: 'block' }}>교회 ID (식별자)</label>
                                        <input
                                            type="text"
                                            placeholder="교회 식별 아이디 (예: jesus-in)"
                                            value={loginChurchId || (churchId !== 'somy-main' ? churchId : '')}
                                            onChange={(e) => setLoginChurchId(e.target.value)}
                                            style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #EEE', fontSize: '15px', outline: 'none', background: '#FFFDF0', boxSizing: 'border-box', color: '#B8924A', fontWeight: 700 }}
                                        />
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#B8924A', marginLeft: '4px', marginBottom: '6px', display: 'block' }}>성함</label>
                                        <input
                                            type="text"
                                            placeholder="실명을 입력하세요 (예: 홍길동)"
                                            value={loginName}
                                            onChange={(e) => setLoginName(e.target.value)}
                                            style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #EEE', fontSize: '15px', outline: 'none', background: '#FAFAFA', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#B8924A', marginLeft: '4px', marginBottom: '6px', display: 'block' }}>전화번호 (010-0000-0000)</label>
                                        <input
                                            type="tel"
                                            placeholder="숫자만 입력해 주세요"
                                            value={loginPhoneTail}
                                            onChange={(e) => setLoginPhoneTail(e.target.value.replace(/[^0-9]/g, ''))}
                                            style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #EEE', fontSize: '15px', outline: 'none', background: '#FAFAFA', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#B8924A', marginLeft: '4px', marginBottom: '6px', display: 'block' }}>생년월일 (8자리: 19900101)</label>
                                        <input
                                            type="tel"
                                            maxLength={8}
                                            placeholder="19900101"
                                            value={loginBirthdate}
                                            onChange={(e) => setLoginBirthdate(e.target.value.replace(/[^0-9]/g, ''))}
                                            style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #EEE', fontSize: '15px', outline: 'none', background: '#FAFAFA', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div style={{ textAlign: 'left' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#B8924A', marginLeft: '4px', marginBottom: '6px', display: 'block' }}>관리자 보안 PIN (관리자만 입력)</label>
                                        <input
                                            type="password"
                                            maxLength={6}
                                            placeholder="숫자 4~6자리 (일반 성도는 비워두세요)"
                                            value={loginPin}
                                            onChange={(e) => setLoginPin(e.target.value.replace(/[^0-9]/g, ''))}
                                            style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #FFC9C9', fontSize: '15px', outline: 'none', background: '#FFF8F8', boxSizing: 'border-box' }}
                                        />
                                    </div>


                                    <button
                                        onClick={handleDirectLogin}
                                        disabled={isDirectLoggingIn}
                                        style={{
                                            marginTop: '10px',
                                            width: '100%',
                                            padding: '18px',
                                            background: (loginName && loginPhoneTail.length >= 4) ? '#333' : '#AAA',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '18px',
                                            fontSize: '16px',
                                            fontWeight: 800,
                                            cursor: (loginName && loginPhoneTail.length >= 4) ? 'pointer' : 'default',
                                            boxShadow: (loginName && loginPhoneTail.length >= 4) ? '0 10px 20px rgba(0,0,0,0.15)' : 'none',
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        {isDirectLoggingIn ? '정보 확인 중...' : '교인 정보로 바로 시작하기'}
                                    </button>
                                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '11px', color: '#BBB', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '14px' }}>🔒</span> 안전한 보안 입구 (성도 및 관리자 자동 인식)
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (!isApproved && !isAdmin && !isSuperAdmin) ? (
                            <div style={{ background: '#FFFDE7', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)', border: '1px solid #FFF59D', textAlign: 'center' }}>
                                <div style={{ fontSize: '40px', marginBottom: '15px' }}>⏳</div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#333', marginBottom: '8px' }}>자동 승인 대기 중</div>
                                <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.6, marginBottom: '24px' }}>
                                    {profileName || '성도'}님, 반가워요!<br />
                                    입력하신 정보가 성도 명단과 확인 중입니다.<br />
                                    잠시 후 자동으로 승인 처리됩니다.
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button
                                        onClick={() => {
                                            const btn = document.getElementById('refresh-btn');
                                            if (btn) btn.innerText = "상태 확인 중...";
                                            checkApprovalStatus(true).finally(() => {
                                                if (btn) btn.innerText = "🔄 승인 상태 재확인";
                                            });
                                        }}
                                        id="refresh-btn"
                                        style={{ width: '100%', padding: '14px', background: '#333', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    >
                                        🔄 승인 상태 재확인
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        style={{ width: '100%', padding: '10px', background: 'transparent', color: '#999', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        다른 정보로 다시 로그인
                                    </button>
                                </div>
                                <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(0,0,0,0.03)', borderRadius: '12px', fontSize: '11px', color: '#888', lineHeight: 1.5, textAlign: 'left' }}>
                                    💡 <b>안드로이드 카카오톡 사용자 필독</b><br />
                                    승인 후에도 이 화면이 보인다면, 우측 상단 <b>⋮</b> 버튼 → <b>다른 브라우저로 열기</b>를 선택하세요.
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* 공지사항 영역 */}
                                <div style={{ width: '100%', marginBottom: '6px' }}>
                                    <div
                                        onClick={() => setIsAnnouncementsExpanded(!isAnnouncementsExpanded)}
                                        style={{ background: 'linear-gradient(135deg, #2C3E50 0%, #3498DB 100%)', padding: '16px 20px', borderRadius: isAnnouncementsExpanded ? '20px 20px 0 0' : '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 8px 15px rgba(52, 152, 219, 0.2)', transition: 'all 0.3s ease' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '20px' }}>📢</span>
                                            <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.5px' }}>공지사항</span>
                                            {announcements.length > 0 && <span style={{ background: '#E74C3C', color: 'white', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>N</span>}
                                        </div>
                                        <span style={{ fontSize: '18px', transform: isAnnouncementsExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
                                    </div>

                                    {isAnnouncementsExpanded && (
                                        <div style={{ background: 'white', padding: '20px', borderRadius: '0 0 20px 20px', border: '1px solid #EEE', borderTop: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            {isAdmin && (
                                                <div style={{ background: '#F8F9FA', padding: '15px', borderRadius: '12px', border: '1px dashed #CCC', marginBottom: '10px' }}>
                                                    <input value={newAnnouncementTitle} onChange={e => setNewAnnouncementTitle(e.target.value)} placeholder="공지 제목" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #DDD', marginBottom: '8px', fontSize: '14px', outline: 'none' }} />
                                                    <textarea value={newAnnouncementContent} onChange={e => setNewAnnouncementContent(e.target.value)} placeholder="공지 내용" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #DDD', minHeight: '60px', fontSize: '13px', marginBottom: '8px', outline: 'none', resize: 'vertical' }} />
                                                    <button onClick={async () => {
                                                        if (!newAnnouncementTitle.trim() || !newAnnouncementContent.trim()) return;
                                                        try {
                                                            const r = await fetch('/api/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ church_id: churchId, title: newAnnouncementTitle, content: newAnnouncementContent, author_name: adminInfo?.name || '담임목사' }) });
                                                            if (r.ok) {
                                                                const newAnn = await r.json();
                                                                setAnnouncements([newAnn, ...announcements]);
                                                                setNewAnnouncementTitle('');
                                                                setNewAnnouncementContent('');
                                                                alert("공지가 등록되었고 전체 성도에게 푸시 알림이 발송되었습니다.");
                                                            }
                                                        } catch (e) { }
                                                    }} style={{ width: '100%', padding: '10px', background: '#2C3E50', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>새 공지 등록 (푸시알림 발송)</button>
                                                </div>
                                            )}

                                            {announcements.length === 0 ? (
                                                <div style={{ textAlign: 'center', color: '#999', fontSize: '13px', padding: '10px 0' }}>등록된 공지사항이 없습니다.</div>
                                            ) : (
                                                announcements.map(ann => (
                                                    <div key={ann.id} style={{ paddingBottom: '15px', borderBottom: '1px solid #F0F0F0' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                                            <div style={{ fontWeight: 800, fontSize: '15px', color: '#333' }}>{ann.title}</div>
                                                            {isAdmin && (
                                                                <button onClick={async () => {
                                                                    if (confirm('삭제하시겠습니까?')) {
                                                                        await fetch('/api/announcements', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ann.id }) });
                                                                        setAnnouncements(announcements.filter(a => a.id !== ann.id));
                                                                    }
                                                                }} style={{ background: 'none', border: 'none', color: '#999', fontSize: '12px', cursor: 'pointer', padding: 0 }}>삭제</button>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '14px', color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '8px' }}>{ann.content}</div>
                                                        <div style={{ fontSize: '11px', color: '#AAA', display: 'flex', gap: '8px' }}>
                                                            <span>{ann.author_name}</span>
                                                            <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: fontScale > 1.2 ? '1fr' : 'repeat(2, 1fr)',
                                    gap: '10px',
                                    width: '100%'
                                }}>
                                    <button onClick={() => setView("chat")} className="main-action-button" style={{
                                        padding: "16px 12px",
                                        background: "linear-gradient(145deg, #ffffff 0%, #f0f8f8 100%)", color: "#1A5D55",
                                        fontWeight: 800, fontSize: "15px", borderRadius: "18px",
                                        border: "1px solid #cbe4e1", cursor: "pointer",
                                        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.03)",
                                        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px',
                                        transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                        justifyContent: 'flex-start'
                                    }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                        <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #F0F0F0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden', flexShrink: 0 }}>
                                            <img src={SOMY_IMG} alt="소미" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <span style={{ wordBreak: 'keep-all', textAlign: 'left', lineHeight: 1.2 }}>AI 소미 대화</span>
                                    </button>

                                    <button onClick={() => {
                                        fetchQt();
                                        setQtStep("read");
                                        setView("qt");
                                    }} className="main-action-button" style={{
                                        padding: "16px 12px",
                                        background: "linear-gradient(145deg, #ffffff 0%, #fffbea 100%)", color: "#8E754C",
                                        fontWeight: 800, fontSize: "15px", borderRadius: "18px",
                                        border: "1px solid #f2e29e", cursor: "pointer",
                                        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.03)",
                                        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px',
                                        transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                        justifyContent: 'flex-start'
                                    }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                        <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: '1px solid #F0F0F0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexShrink: 0 }}>📖</div>
                                        <span style={{ wordBreak: 'keep-all', textAlign: 'left', lineHeight: 1.2 }}>오늘의 큐티</span>
                                    </button>

                                    <div style={{ position: 'relative' }}>
                                        <button onClick={async () => {
                                            setView("community");
                                            setHasNewCommunity(false);
                                            localStorage.setItem(`last_view_community_${churchId}`, Date.now().toString());
                                            try {
                                                const res = await fetch(`/api/community?church_id=${churchId}`);
                                                const data = await res.json();
                                                if (Array.isArray(data)) setCommunityPosts(data);
                                            } catch (e) { console.error("게시판 로드 실패:", e); }
                                        }} className="main-action-button" style={{
                                            width: "100%", padding: "16px 12px",
                                            background: "linear-gradient(145deg, #ffffff 0%, #fff0f5 100%)", color: "#9E2A5B",
                                            fontWeight: 800, fontSize: "15px", borderRadius: "18px",
                                            border: "1px solid #f2cddb", cursor: "pointer",
                                            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.03)",
                                            display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px',
                                            transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                            position: 'relative', justifyContent: 'flex-start'
                                        }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                            <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: '1px solid #F0F0F0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexShrink: 0 }}>💌</div>
                                            <span style={{ wordBreak: 'keep-all', textAlign: 'left', lineHeight: 1.2 }}>은혜나눔</span>
                                            {hasNewCommunity && <div style={{ background: '#FF3D00', color: 'white', fontSize: '10px', fontWeight: 900, padding: '1px 5px', borderRadius: '10px', border: '1px solid white', marginLeft: '-2px', zIndex: 1 }}>N</div>}
                                        </button>

                                    </div>

                                    <div style={{ position: 'relative' }}>
                                        <button onClick={async () => {
                                            setView("thanksgiving");
                                            setHasNewThanksgiving(false);
                                            localStorage.setItem(`last_view_thanks_${churchId}`, Date.now().toString());
                                            try {
                                                const res = await fetch(`/api/thanksgiving?church_id=${churchId}`);
                                                const data = await res.json();
                                                if (Array.isArray(data)) setThanksgivingDiaries(data);
                                            } catch (e) { console.error("감사일기 로드 실패:", e); }
                                        }} className="main-action-button" style={{
                                            width: "100%", padding: "16px 12px",
                                            background: "linear-gradient(145deg, #ffffff 0%, #fff6e5 100%)", color: "#E07A5F",
                                            fontWeight: 800, fontSize: "15px", borderRadius: "18px",
                                            border: "1px solid #fae1cd", cursor: "pointer",
                                            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.03)",
                                            display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px',
                                            transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                            position: 'relative', justifyContent: 'flex-start'
                                        }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                            <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: '1px solid #F0F0F0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexShrink: 0 }}>🌻</div>
                                            <span style={{ wordBreak: 'keep-all', textAlign: 'left', lineHeight: 1.2 }}>감사일기</span>
                                            {hasNewThanksgiving && <div style={{ background: '#FF3D00', color: 'white', fontSize: '10px', fontWeight: 900, padding: '1px 5px', borderRadius: '10px', border: '1px solid white', marginLeft: '-2px' }}>N</div>}
                                        </button>
                                    </div>
                                </div>


                                {/* 책 추천 & 담임목사 칼럼 (2열 레이아웃) */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '12px',
                                    width: '100%',
                                    marginTop: '8px',
                                    animation: 'fade-in 1s ease-out'
                                }}>
                                    {/* 이달의 책 추천 카드 */}
                                    <div onClick={() => setView('book')} className="sub-action-button" style={{
                                        background: 'linear-gradient(135deg, #FFF 0%, #FAFAFA 100%)',
                                        borderRadius: '24px',
                                        padding: '16px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '15px',
                                        cursor: 'pointer',
                                        boxShadow: '0 8px 25px rgba(0,0,0,0.04)',
                                        border: '1px solid #F0ECE4',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        flexDirection: 'column',
                                        textAlign: 'center',
                                        minHeight: '140px',
                                        justifyContent: 'center'
                                    }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.08)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.04)'; }}>
                                        <div style={{ width: '40px', height: '56px', background: '#F5F5F3', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', flexShrink: 0 }}>
                                            {churchSettings.today_book_image_url ? (
                                                <img src={churchSettings.today_book_image_url} alt="책" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📚</div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="label" style={{ fontSize: '13px', color: '#D4AF37', fontWeight: 800, marginBottom: '2px', wordBreak: 'keep-all' }}>이달의 추천도서</div>
                                            <div style={{ fontSize: '14px', fontWeight: 900, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', width: '100%', lineHeight: 1.2 }}>{churchSettings.today_book_title || '추천 도서'}</div>
                                        </div>
                                    </div>

                                    {/* 담임목사 칼럼 카드 */}
                                    <div onClick={() => setView('pastorColumn')} className="sub-action-button" style={{
                                        background: 'linear-gradient(135deg, #FFF 0%, #FDF8F0 100%)',
                                        borderRadius: '24px',
                                        padding: '16px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '15px',
                                        cursor: 'pointer',
                                        boxShadow: '0 8px 25px rgba(0,0,0,0.04)',
                                        border: '1px solid #F0ECE4',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        flexDirection: 'column',
                                        textAlign: 'center',
                                        position: 'relative',
                                        minHeight: '140px',
                                        justifyContent: 'center'
                                    }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.08)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.04)'; }}>
                                        <div style={{ width: '40px', height: '56px', background: '#FFFDF7', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: '1px solid #FAF0D7' }}>✍️</div>
                                        <div>
                                            <div className="label" style={{ fontSize: '13px', color: '#B8924A', fontWeight: 800, marginBottom: '2px', wordBreak: 'keep-all' }}>담임목사 칼럼</div>
                                            <div style={{ fontSize: '14px', fontWeight: 900, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', width: '100%', lineHeight: 1.2 }}>{churchSettings.pastor_column_title || '오늘의 칼럼'}</div>
                                        </div>
                                        {!churchSettings.pastor_column_content && (
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleGenerateColumn();
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    background: 'rgba(255,255,255,0.7)',
                                                    backdropFilter: 'blur(2px)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '24px',
                                                    zIndex: 10
                                                }}
                                            >
                                                <div style={{ background: '#333', color: 'white', padding: '6px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                                    {isGeneratingColumn ? '생성 중...' : '✨ AI 자동 생성'}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Character Section (오늘의 말씀)을 4개 액션버튼 바로 아래로 이동 */}
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center", flex: 1, justifyContent: 'center', width: "100%", marginTop: '10px', marginBottom: '10px' }}>
                                    <div style={{ background: "rgba(255, 255, 255, 0.9)", borderRadius: "24px", padding: "24px", width: "100%", maxWidth: "320px", boxShadow: "0 10px 30px rgba(0,0,0,0.06)", border: "1px solid #F0ECE4", animation: "fade-in 0.8s ease-out", display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', textAlign: 'left', backdropFilter: 'blur(10px)', userSelect: 'none' }}>
                                        {(() => {
                                            const graceVerse = getGraceVerse();
                                            return (
                                                <>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                                                        <div style={{ width: '32px', height: '32px', background: '#F5F2EA', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>📖</div>
                                                        <span style={{ fontSize: "15px", fontWeight: 800, color: "#9E7B31", letterSpacing: '-0.2px' }}>오늘의 말씀</span>
                                                    </div>
                                                    <div style={{ position: 'relative', padding: '0 4px' }}>
                                                        <p className="verse-text" style={{ position: 'relative', zIndex: 1, fontSize: "15px", color: "#444", lineHeight: 1.8, margin: "0 0 16px 0", fontWeight: 500, wordBreak: 'keep-all', textAlign: 'center' }}>"{graceVerse.verse}"</p>
                                                    </div>
                                                    <p style={{ fontSize: "13px", color: "#B8924A", fontWeight: 700, margin: 0, textAlign: 'right' }}>— {graceVerse.book} {graceVerse.ref} <span style={{ fontSize: '10px', color: '#CCC', fontWeight: 400 }}>(개역한글)</span></p>

                                                    <div style={{ width: '100%', height: '1px', background: 'repeating-linear-gradient(to right, #EEEEEE 0, #EEEEEE 4px, transparent 4px, transparent 8px)', margin: '20px 0' }} />

                                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                        <div style={{ fontSize: '13px', color: '#999', fontWeight: 700, letterSpacing: '0.5px' }}>💡 오늘의 한줄!</div>
                                                        {(() => {
                                                            const quotes = ["하나님은 우리가 감당할 수 없는 시련을 주시지는 않는다. - 고린도전서 10:13 강해 중", "기도는 하나님의 팔을 움직이는 가장 조용한 힘이다. - 찰스 스펄전", "하나님께서 나의 계획을 무너뜨리시는 것은, 나의 계획이 나를 무너뜨릴 수 있기 때문이다. - 코리 텐 붐", "우리가 하나님을 온전히 신뢰할 때, 하나님은 우리의 모든 상황을 그분의 목적을 위해 사용하신다. - A.W. 토저", "고난은 하나님의 변장된 축복이다. 그것은 우리를 하나님께로 더 가까이 이끈다. - C.S. 루이스", "우리가 하나님 외에 다른 곳에서 만족을 찾으려 할 때, 우리는 결코 만족을 얻을 수 없다. - 어거스틴", "성경은 단순히 읽기 위한 책이 아니라, 우리 삶이 읽혀지기 위한 거울이다. - D.L. 무디"];
                                                            const todayIndex = new Date().getDate() % quotes.length;
                                                            return (
                                                                <div className="quote-text" style={{ fontSize: '14.5px', color: '#2D2D2D', lineHeight: 1.7, wordBreak: 'keep-all', fontStyle: 'normal', fontWeight: 500, background: 'rgba(212, 175, 55, 0.04)', padding: '12px 16px', borderRadius: '12px', borderLeft: '4px solid #D4AF37', letterSpacing: '-0.3px' }}>
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

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: fontScale > 1.2 ? '1fr' : 'repeat(2, 1fr)',
                                    gap: '10px',
                                    width: '100%'
                                }}>
                                    <button onClick={() => {
                                        if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
                                            playerRef.current.pauseVideo();
                                            setPlayRequested(false);
                                        }
                                        setView('sermon');
                                        setHasNewSermon(false);
                                        localStorage.setItem(`last_view_sermon_${churchId}`, Date.now().toString());
                                    }} className="main-action-button" style={{
                                        padding: "16px 12px",
                                        background: "linear-gradient(145deg, #ffffff 0%, #fff4f2 100%)", color: "#BA2D0B",
                                        fontWeight: 800, fontSize: "15px", borderRadius: "18px",
                                        border: "1px solid #fcd3c8", cursor: "pointer",
                                        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.03)",
                                        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px',
                                        transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                        position: 'relative', justifyContent: 'flex-start'
                                    }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                        <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #F0F0F0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF0000"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
                                        </div>
                                        <span style={{ wordBreak: 'keep-all', textAlign: 'left', lineHeight: 1.2 }}>담임목사 설교</span>
                                        {hasNewSermon && <div style={{ background: '#FF3D00', color: 'white', fontSize: '10px', fontWeight: 900, padding: '1px 5px', borderRadius: '10px', border: '1px solid white', marginLeft: '-2px' }}>N</div>}
                                    </button>
                                    <div style={{ position: 'relative' }}>
                                        <button onClick={async () => {
                                            setView('counseling');
                                            const counselingNotis = notifications.filter(n => !n.is_read && (
                                                isMainAdmin ? (n.type === 'counseling_req' || n.type === 'counseling_user_reply')
                                                    : (n.type === 'counseling_reply')
                                            ));
                                            for (const n of counselingNotis) {
                                                fetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({ id: n.id }) });
                                            }
                                            if (counselingNotis.length > 0) {
                                                setNotifications(notifications.map(n =>
                                                    counselingNotis.some(cn => cn.id === n.id) ? { ...n, is_read: true } : n
                                                ));
                                            }

                                            try {
                                                const res = await fetch(`/api/counseling?church_id=${churchId}&user_id=${user?.id}&admin=${isMainAdmin}`);
                                                const data = await res.json();
                                                if (Array.isArray(data)) setCounselingRequests(data);
                                            } catch (e) { console.error("상담 로드 실패", e); }
                                        }} className="main-action-button" style={{
                                            width: "100%", padding: "16px 12px",
                                            background: "linear-gradient(145deg, #ffffff 0%, #f6f0ff 100%)", color: "#4A148C",
                                            fontWeight: 800, fontSize: "15px", borderRadius: "18px",
                                            border: "1px solid #e1bee7", cursor: "pointer",
                                            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.03)",
                                            display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px',
                                            transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                            position: 'relative', justifyContent: 'flex-start'
                                        }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                            <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: '1px solid #F0F0F0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexShrink: 0 }}>🙏</div>
                                            <span style={{ wordBreak: 'keep-all', textAlign: 'left', lineHeight: 1.2 }}>상담/기도 요청</span>
                                            {notifications.some(n => !n.is_read && (
                                                isMainAdmin ? (n.type === 'counseling_req' || n.type === 'counseling_user_reply')
                                                    : (n.type === 'counseling_reply')
                                            )) && (
                                                    <div style={{ background: '#FF3D00', color: 'white', fontSize: '10px', fontWeight: 900, padding: '1px 5px', borderRadius: '10px', border: '1px solid white', marginLeft: '-2px' }}>N</div>
                                                )}
                                        </button>
                                    </div>

                                    <button onClick={async () => {
                                        setView('stats');
                                        setStatsError(null);
                                        setStats(null);
                                        const controller = new AbortController();
                                        const timeoutId = setTimeout(() => controller.abort(), 8000);
                                        try {
                                            const r = await fetch(`/api/stats?church_id=${churchId || 'jesus-in'}&t=${Date.now()}`, { signal: controller.signal, cache: 'no-store' });
                                            clearTimeout(timeoutId);
                                            const data = await r.json();
                                            if (data) {
                                                setStats(data);
                                                if (data.error) setStatsError(data.error);
                                            }
                                        } catch (e: any) {
                                            setStatsError(e.name === 'AbortError' ? "시간 초과" : "연결 실패");
                                        }
                                    }} className="main-action-button" style={{
                                        padding: "16px 12px",
                                        background: "linear-gradient(145deg, #ffffff 0%, #faf6ec 100%)", color: "#8B6B38",
                                        fontWeight: 800, fontSize: "15px", borderRadius: "18px",
                                        border: "1px solid #e8dcc4", cursor: "pointer",
                                        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.03)",
                                        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px',
                                        transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                        justifyContent: 'flex-start'
                                    }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                        <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: '1px solid #F0F0F0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexShrink: 0 }}>📊</div>
                                        <span style={{ wordBreak: 'keep-all', textAlign: 'left', lineHeight: 1.2 }}>이달의 큐티왕</span>
                                    </button>

                                    <button onClick={() => {
                                        setView('history');
                                        fetchHistory();
                                    }} className="main-action-button" style={{
                                        padding: "16px 12px",
                                        background: "linear-gradient(145deg, #ffffff 0%, #f1f8f3 100%)", color: "#507558",
                                        fontWeight: 800, fontSize: "15px", borderRadius: "18px",
                                        border: "1px solid #cee8d8", cursor: "pointer",
                                        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.03)",
                                        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px',
                                        transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                        justifyContent: 'flex-start'
                                    }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                        <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: '1px solid #F0F0F0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexShrink: 0 }}>🕰️</div>
                                        <span style={{ wordBreak: 'keep-all', textAlign: 'left', lineHeight: 1.2 }}>나의 묵상 기록</span>
                                    </button>

                                    <button onClick={() => setView('ccm')} className="main-action-button" style={{
                                        padding: "16px 12px",
                                        background: "linear-gradient(145deg, #ffffff 0%, #f4f6fa 100%)", color: "#465293",
                                        fontWeight: 800, fontSize: "15px", borderRadius: "18px",
                                        border: "1px solid #cfd5f0", cursor: "pointer",
                                        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.03)",
                                        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px',
                                        transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                        justifyContent: 'flex-start'
                                    }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                        <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: '1px solid #F0F0F0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexShrink: 0 }}>🎧</div>
                                        <span style={{ wordBreak: 'keep-all', textAlign: 'left', lineHeight: 1.2 }}>CCM 듣기</span>
                                    </button>

                                    <button onClick={() => setView('memberSearch')} className="main-action-button" style={{
                                        padding: "16px 12px",
                                        background: "linear-gradient(145deg, #ffffff 0%, #f1f8f3 100%)", color: "#2E7D32",
                                        fontWeight: 800, fontSize: "15px", borderRadius: "18px",
                                        border: "1px solid #C8E6C9", cursor: "pointer",
                                        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.03)",
                                        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px',
                                        transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                        justifyContent: 'flex-start'
                                    }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                        <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: '1px solid #F0F0F0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexShrink: 0 }}>🔎</div>
                                        <span style={{ wordBreak: 'keep-all', textAlign: 'left', lineHeight: 1.2 }}>성도 주소록</span>
                                    </button>
                                </div>

                                <button onClick={() => setView('profile')} style={{
                                    width: '100%', padding: "10px",
                                    background: "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)",
                                    color: "#1976D2",
                                    fontWeight: 800, fontSize: "14px", borderRadius: "14px",
                                    border: "1px solid #90CAF9", cursor: "pointer",
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    boxShadow: '0 4px 10px rgba(25,118,210,0.08)',
                                    transition: 'all 0.2s'
                                }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                    👤 내 프로필 & 정보 수정
                                </button>
                            </>
                        )}
                    </div >

                    <div style={{ padding: '0 20px 40px 20px', width: '100%', maxWidth: '360px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                        <button onClick={() => setView('guide')} style={{
                            width: "100%", padding: "10px",
                            background: "linear-gradient(135deg, #F9F7F2 0%, #F4F0E6 100%)",
                            color: "#8B6B38",
                            fontWeight: 800, fontSize: "14px", borderRadius: "14px",
                            border: "1px solid #E8DCC4", cursor: "pointer",
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            boxShadow: '0 4px 10px rgba(139,107,56,0.08)',
                            transition: 'all 0.2s'
                        }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                            📖 소미 활용 가이드 보기
                        </button>

                        {isAdmin && (
                            <button onClick={() => setView('admin')} style={{
                                width: "100%", padding: "10px",
                                background: "#F5F5F5", color: "#757575",
                                fontWeight: 800, fontSize: "14px", borderRadius: "14px",
                                border: "1px solid #E0E0E0", cursor: "pointer",
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s'
                            }} onMouseOver={e => e.currentTarget.style.background = "#EEEEEE"} onMouseOut={e => e.currentTarget.style.background = "#F5F5F5"}>
                                ⚙️ 관리자 센터 들어가기
                            </button>
                        )}

                        {typeof window !== 'undefined' && !window.matchMedia('(display-mode: standalone)').matches && (
                            <button onClick={handleInstallClick} style={{
                                width: "100%", padding: "10px",
                                background: "linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)",
                                color: "#827717",
                                fontWeight: 800, fontSize: "14px", borderRadius: "14px",
                                border: "1px solid #FBC02D", cursor: "pointer",
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                boxShadow: '0 6px 15px rgba(251,192,45,0.12)',
                                transition: 'all 0.3s'
                            }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
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
                        // 1. 은혜나눔 게시글 저장 (is_qt: true 추가)
                        const res = await fetch('/api/community', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                user_id: user.id,
                                user_name: profileName || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "익명의 성도",
                                avatar_url: profileAvatar || user.user_metadata?.avatar_url || null, // ✅ profileAvatar 우선 순위
                                content: graceInput,
                                church_id: churchId || 'jesus-in',
                                is_private: isPrivatePost,
                                is_qt: true // ✅ 묵상 기록을 통한 게시글임을 표시
                            })
                        });

                        if (res.ok) {
                            const newPost = await res.json();
                            setCommunityPosts(prev => [newPost, ...prev]); // [안전] prev를 사용하여 최신 상태 유지
                            setGraceInput(""); // ✅ 등록 성공 시 입력창 비움
                            setIsPrivatePost(false);
                            alert("은혜가 나눔게시판에 등록되었습니다! ✨");

                            // 2. [핵심] 여기서 즉시 묵상 통계(큐티왕)도 기록! (나중에 '마칠게요' 안 눌러도 기록되게)
                            const recordQtStats = async () => {
                                try {
                                    // [방어] 현재 상태의 churchId가 비어있으면 localStorage나 기본값에서 가져옴
                                    const effectiveChurchId = churchId || (typeof window !== 'undefined' ? localStorage.getItem('church_id') : null) || 'jesus-in';

                                    console.log(`📊 Attempting to record QT stats for: ${effectiveChurchId}`);
                                    const statsPostRes = await fetch('/api/stats', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            user_id: user.id,
                                            user_name: profileName || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '성도',
                                            avatar_url: profileAvatar || user.user_metadata?.avatar_url || null,
                                            church_id: effectiveChurchId,
                                            answers: answers // 큐티 답변 데이터
                                        }),
                                    });

                                    if (statsPostRes.ok) {
                                        const resData = await statsPostRes.json();
                                        console.log("📊 QT completion recorded:", resData);
                                        const statsRes = await fetch(`/api/stats?church_id=${effectiveChurchId}&t=${Date.now()}`, { cache: 'no-store' });
                                        const statsData = await statsRes.json();
                                        if (statsData) {
                                            setStats(statsData);
                                        }
                                        setHistory([]);
                                    } else {
                                        const err = await statsPostRes.json();
                                        console.error("📊 QT stats record failed:", err);
                                    }
                                } catch (e) {
                                    console.error("통계 기록 중 오류:", e);
                                }
                            };

                            // 즉시 기록
                            await recordQtStats();
                        } else {
                            const errData = await res.json().catch(() => ({}));
                            console.error("게시판 등록 실패:", errData);
                            alert(`은혜나눔 등록에 실패했습니다: ${errData.error || '알 수 없는 오류'}\n(관리자에게 'community_posts 테이블에 is_qt 컬럼 추가'를 확인해 보세요)`);
                        }
                    } catch (e) {
                        console.error("저장 중 오류 발생:", e);
                        alert("네트워크 오류로 등록에 실패했습니다.");
                    }
                }

                setQtStep("pray");
            };

            return (
                <div style={{
                    minHeight: "100vh",
                    background: "white",
                    maxWidth: "600px",
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
                        {churchId && churchSettings.church_logo_url && (
                            <img src={churchSettings.church_logo_url} alt="로고" style={{ height: "24px", objectFit: 'contain' }} />
                        )}
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
                                            const trimmedLine = line.trim();
                                            // 1절, 2절 또는 8:1, 8:2 형식을 모두 추출하는 정규식
                                            const match = trimmedLine.match(/^(\d+[:.]\d+|\d+)[.\s\u00A0]*(.*)/);

                                            if (match) {
                                                const label = match[1];
                                                const content = match[2];
                                                return (
                                                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                        <span style={{ color: '#D4AF37', fontSize: '13px', fontWeight: 800, minWidth: '24px', textAlign: 'right', paddingTop: '4px', fontStyle: 'italic' }}>
                                                            {label}
                                                        </span>
                                                        <span
                                                            onClick={() => {
                                                                handlePassageAsk(`[${label}절] "${content}" 이 구절에 대해 깊이 있는 신학적 해설과 묵상 가이드를 알려줘.`);
                                                            }}
                                                            style={{ fontSize: '16px', lineHeight: 1.8, color: '#333', flex: 1, wordBreak: 'keep-all', fontWeight: 500, cursor: 'pointer' }}
                                                            title="AI 소미에게 물어보기"
                                                        >
                                                            {content}
                                                        </span>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <p
                                                    key={idx}
                                                    onClick={() => {
                                                        handlePassageAsk(`"${line}" 이 내용에 대해 깊이 있는 신학적 해설과 묵상 가이드를 알려줘.`);
                                                    }}
                                                    style={{ margin: 0, fontSize: '16px', lineHeight: 1.8, color: '#333', wordBreak: 'keep-all', fontWeight: 500, paddingLeft: '30px', cursor: 'pointer' }}
                                                    title="AI 소미에게 물어보기"
                                                >
                                                    {line}
                                                </p>
                                            );
                                        })}
                                        {!qtData.fullPassage && <p style={{ color: '#999', textAlign: 'center' }}>본문을 불러오는 중입니다...</p>}
                                    </div>

                                    {/* Passage Q&A Section moved here below Bible Text */}
                                    <div style={{ borderTop: '1px dashed #DDD', paddingTop: '20px', marginTop: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                            <span style={{ fontSize: '14px' }}>✨</span>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#B8924A' }}>소미에게 이 구절에 대해 물어보세요 (구절 터치도 가능!)</span>
                                        </div>
                                        <div ref={passageRef} style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {passageChat.length === 0 && <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', padding: '10px 0' }}>위 말씀을 읽으며 궁금한 점을 터치하거나 아래에 입력해보세요!</div>}
                                            {passageChat.map((chat, i) => (
                                                <div key={i} style={{ alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start', background: chat.role === 'user' ? '#EEE' : '#F5F2EA', padding: '8px 12px', borderRadius: '12px', fontSize: '13px', maxWidth: '85%', lineHeight: 1.5, color: '#444' }}>{chat.content}</div>
                                            ))}
                                            {isPassageLoading && <div style={{ alignSelf: 'flex-start', fontSize: '12px', color: '#B8924A', fontStyle: 'italic' }}>소미가 본문을 묵상 중...</div>}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input type="text" value={passageInput} onChange={(e) => setPassageInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePassageAsk()} placeholder="예: '푸른 풀밭'은 어떤 의미인가요?" style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '13px', outline: 'none' }} />
                                            <button onClick={() => handlePassageAsk()} disabled={isPassageLoading} style={{ padding: '0 15px', background: '#D4AF37', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: isPassageLoading ? 0.6 : 1 }}>묻기</button>
                                        </div>
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
                                    <div
                                        onClick={() => setIsPrivatePost(!isPrivatePost)}
                                        style={{
                                            marginTop: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            cursor: 'pointer',
                                            padding: '12px 16px',
                                            borderRadius: '16px',
                                            background: isPrivatePost ? '#F3E5F5' : '#F5F5F3',
                                            border: isPrivatePost ? '1px solid #7B1FA2' : '1px solid #EEE',
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        <div style={{ fontSize: '20px' }}>{isPrivatePost ? '🔒' : '🌐'}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: isPrivatePost ? '#7B1FA2' : '#333' }}>
                                                {isPrivatePost ? '나만 보기 (비공개)' : '성도들과 함께 나누기 (공개)'}
                                            </div>
                                            <div style={{ fontSize: '11px', color: isPrivatePost ? '#9575CD' : '#999', marginTop: '2px' }}>
                                                {isPrivatePost ? '이 내용은 본인과 교회 관리자만 확인할 수 있습니다.' : '작성하신 은혜를 모든 성도님이 함께 보고 은혜받을 수 있습니다.'}
                                            </div>
                                        </div>
                                        <div style={{ width: '40px', height: '22px', background: isPrivatePost ? '#7B1FA2' : '#CCC', borderRadius: '11px', position: 'relative', transition: 'all 0.3s' }}>
                                            <div style={{ position: 'absolute', top: '2px', left: isPrivatePost ? '20px' : '2px', width: '18px', height: '18px', background: 'white', borderRadius: '50%', transition: 'all 0.3s' }} />
                                        </div>
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
                                            const r = await fetch(`/api/stats?church_id=${churchId || 'jesus-in'}&t=${Date.now()}`, { signal: controller.signal, cache: 'no-store' });
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
                    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '600px', padding: '15px 20px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderTop: '1px solid #EEE', boxSizing: 'border-box' }}>
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

                                // 큐티 완료 기록 (중복 호출되어도 upsert 처리됨)
                                if (user) {
                                    try {
                                        const effectiveChurchId = churchId || (typeof window !== 'undefined' ? localStorage.getItem('church_id') : null) || 'jesus-in';
                                        console.log(`📊 Finishing QT: Recording stats for ${effectiveChurchId}`);

                                        const res = await fetch('/api/stats', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                user_id: user.id,
                                                user_name: profileName || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '성도',
                                                avatar_url: profileAvatar || user.user_metadata?.avatar_url || null,
                                                church_id: effectiveChurchId,
                                                answers: answers
                                            }),
                                        });

                                        if (res.ok) {
                                            const statsRes = await fetch(`/api/stats?church_id=${effectiveChurchId}&t=${Date.now()}`, { cache: 'no-store' });
                                            const statsData = await statsRes.json();
                                            if (statsData) {
                                                setStats(statsData);
                                            }
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
                    const youthData = qtForm.youthInterpretation ? {
                        interpretation: qtForm.youthInterpretation,
                        questions: [qtForm.youthQuestion1, qtForm.youthQuestion2, qtForm.youthQuestion3].filter(Boolean)
                    } : null;

                    const payload = {
                        ...qtForm,
                        passage: `${qtForm.passage}|||${qtForm.interpretation}${youthData ? `|||${JSON.stringify(youthData)}` : ''}`
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
                <div style={{ minHeight: "100vh", background: "white", maxWidth: "600px", margin: "0 auto", ...baseFont }}>
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
                                    const res = await fetch(`/api/qt?date=${qtForm.date}&force=true&church_id=${churchId}`, { cache: 'no-store' });
                                    const { qt } = await res.json();
                                    if (qt) {
                                        const { fullPassage, interpretation, youthData } = parsePassage(qt.passage);
                                        setQtForm({
                                            date: qt.date,
                                            reference: qt.reference,
                                            passage: fullPassage,
                                            interpretation: interpretation,
                                            question1: qt.question1 || '',
                                            question2: qt.question2 || '',
                                            question3: qt.question3 || '',
                                            prayer: qt.prayer || '',
                                            youthInterpretation: youthData?.interpretation || '',
                                            youthQuestion1: youthData?.questions?.[0] || '',
                                            youthQuestion2: youthData?.questions?.[1] || '',
                                            youthQuestion3: youthData?.questions?.[2] || '',
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

                        {/* [추가] 청소년 눈높이 큐티 관리 섹션 */}
                        <div style={{ marginTop: '20px', padding: '20px', background: '#F0F7FF', borderRadius: '15px', border: '1px solid #D1E3F8' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0D47A1' }}>👦 청년/청소년 눈높이 버전 (20세 이하)</div>
                                <button
                                    onClick={async () => {
                                        if (!qtForm.interpretation) { alert('먼저 일반 해설을 입력하거나 불러와주세요.'); return; }
                                        setAiLoading(true);
                                        try {
                                            const res = await fetch('/api/chat', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    church_id: churchId, // [추가]
                                                    messages: [{
                                                        role: 'user',
                                                        content: `당신은 다음 큐티 내용을 청춘(10~20대)의 언어로 다정하게 바꿔주는 목회자입니다.\n\n해설: ${qtForm.interpretation}\n질문: ${[qtForm.question1, qtForm.question2, qtForm.question3].join(', ')}\n\n반드시 JSON 형식으로 답하세요: {"interpretation": "...", "questions": ["...", "...", "..."]}`
                                                    }]
                                                })
                                            });
                                            const data = await res.json();
                                            const json = JSON.parse(data.content.match(/\{[\s\S]*\}/)![0]);
                                            setQtForm(p => ({
                                                ...p,
                                                youthInterpretation: json.interpretation,
                                                youthQuestion1: json.questions[0] || '',
                                                youthQuestion2: json.questions[1] || '',
                                                youthQuestion3: json.questions[2] || '',
                                            }));
                                        } catch (e) { alert('청년 버전 생성 실패'); }
                                        finally { setAiLoading(false); }
                                    }}
                                    disabled={aiLoading}
                                    style={{ padding: '6px 12px', background: '#0D47A1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    ✨ AI로 청년버전 미리 만들기
                                </button>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1565C0', display: 'block', marginBottom: '4px' }}>💡 청년층 맞춤 해설</label>
                                <textarea
                                    value={qtForm.youthInterpretation}
                                    onChange={e => setQtForm(p => ({ ...p, youthInterpretation: e.target.value }))}
                                    placeholder="공란으로 두면 AI가 실시간으로 변환하여 보여주며, 입력하면 이 내용이 우선 적용됩니다."
                                    style={{ ...inputStyle, height: '100px', background: 'white' }}
                                />
                            </div>

                            {(['youthQuestion1', 'youthQuestion2', 'youthQuestion3'] as const).map((key, idx) => (
                                <div key={key} style={{ marginBottom: '8px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#1565C0', display: 'block', marginBottom: '4px' }}>❓ 청년 맞춤 질문 {idx + 1}</label>
                                    <input type="text" value={qtForm[key]} onChange={e => setQtForm(p => ({ ...p, [key]: e.target.value }))} placeholder="질문을 입력하세요" style={{ ...inputStyle, background: 'white' }} />
                                </div>
                            ))}
                            <div style={{ fontSize: '10px', color: '#64B5F6', marginTop: '6px' }}>
                                * 내용을 입력하고 저장하면, 20세 이하 유저에게는 일반 버전 대신 이 내용이 관리자가 승인한 버전으로 표시됩니다.
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button onClick={() => setView('home')} style={{ flex: 1, padding: '14px', background: '#F5F5F5', color: '#666', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>취소</button>
                            <button onClick={handleQtSave} style={{ flex: 2, padding: '14px', background: '#333', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>💾 저장하기</button>
                        </div>

                        <div style={{ marginTop: '20px', borderTop: '1px dashed #DDD', paddingTop: '20px', paddingBottom: '40px' }}>
                            <button onClick={async () => {
                                if (window.confirm('🚨 정말로 모든 묵상 통계 데이터를 초기화하시겠습니까? 복구할 수 없습니다.')) {
                                    try {
                                        const res = await fetch(`/api/stats?church_id=${churchId}`, { method: 'DELETE' });
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
                    maxWidth: "600px",
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

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <button
                                    onClick={async () => {
                                        setStats(null);
                                        const controller = new AbortController();
                                        const timeoutId = setTimeout(() => controller.abort(), 8000);
                                        const effectiveChurchId = churchId || (typeof window !== 'undefined' ? localStorage.getItem('church_id') : null) || 'jesus-in';
                                        try {
                                            const r = await fetch(`/api/stats?church_id=${effectiveChurchId}&t=${Date.now()}`, { signal: controller.signal, cache: 'no-store' });
                                            clearTimeout(timeoutId);
                                            const data = await r.json();
                                            if (data) setStats(data);
                                        } catch (e) { setStatsError("새로고침 실패"); }
                                    }}
                                    style={{ flex: 1, padding: '14px', background: 'white', color: '#333', border: '1px solid #DDD', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    🔄 새로고침
                                </button>
                                <button onClick={() => setView('home')} style={{ flex: 2, padding: '14px', background: '#F5F5F5', color: '#666', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>홈으로 돌아가기</button>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        /* ══════════════════════════════
           COMMUNITY PAGE
        ══════════════════════════════ */
        if (view === "community") {
            const handleReaction = async (postId: string, type: 'community' | 'thanksgiving') => {
                if (!user) {
                    alert("로그인이 필요합니다.");
                    return;
                }
                try {
                    const res = await fetch('/api/community/reaction', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ post_id: postId, user_id: user.id, type })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        if (type === 'community') {
                            setCommunityPosts(prev => prev.map(post => post.id === postId ? { ...post, liker_ids: data.liker_ids } : post));
                        } else {
                            setThanksgivingDiaries(prev => prev.map(diary => diary.id === postId ? { ...diary, liker_ids: data.liker_ids } : diary));
                        }
                    } else {
                        if (data.error?.includes('column "liker_ids"') || data.details?.includes('column "liker_ids"')) {
                            alert("기능 활성화를 위해 DB 설정이 필요합니다. 관리자에게 'liker_ids 컬럼(TEXT[]) 추가'를 요청해 주세요.");
                        }
                    }
                } catch (e) {
                    console.error("좋아요 오류:", e);
                }
            };

            const handleAddComment = async (postId: any) => {
                const commentText = commentInputs[postId];
                const isPrivate = commentPrivateStates[postId] || false;
                if (!commentText?.trim()) return;
                if (!user) {
                    alert("로그인이 필요합니다.");
                    return;
                }
                if (submittingCommentId === postId) return;

                setSubmittingCommentId(postId);
                try {
                    const res = await fetch('/api/community/comments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            post_id: postId,
                            user_id: user.id,
                            user_name: profileName || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "익명의 성도",
                            content: commentText,
                            is_private: isPrivate
                        })
                    });
                    if (res.ok) {
                        const newComment = await res.json();
                        setCommunityPosts(prev => prev.map(post => {
                            if (post.id === postId) {
                                return {
                                    ...post,
                                    comments: [...(post.comments || []), newComment]
                                };
                            }
                            return post;
                        }));
                        setCommentInputs(prev => ({ ...prev, [postId]: "" }));
                        setCommentPrivateStates(prev => ({ ...prev, [postId]: false }));
                    } else {
                        const errData = await res.json().catch(() => ({}));
                        alert("댓글 등록에 실패했어요: " + (errData.error || "알 수 없는 오류"));
                    }
                } catch (e) {
                    console.error("댓글 달기 오류:", e);
                    alert("댓글을 등록하는 중 오류가 발생했습니다.");
                } finally {
                    setSubmittingCommentId(null);
                }
            };

            const handleUpdateComment = async (postId: any, commentId: any) => {
                if (!editCommentContent.trim()) return;
                try {
                    const res = await fetch('/api/community/comments', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: commentId,
                            content: editCommentContent,
                            is_private: isEditPrivate
                        })
                    });
                    if (res.ok) {
                        const updatedComment = await res.json();
                        setCommunityPosts(communityPosts.map(post => {
                            if (post.id === postId) {
                                return {
                                    ...post,
                                    comments: post.comments.map((c: any) => c.id === commentId ? updatedComment : c)
                                };
                            }
                            return post;
                        }));
                        setEditingCommentId(null);
                        setEditCommentContent("");
                    }
                } catch (e) { console.error("댓글 수정 오류:", e); }
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
                        body: JSON.stringify({ id: editingPostId, content: editContent, is_private: isEditPrivate })
                    });
                    if (res.ok) {
                        const updatedPost = await res.json();
                        setCommunityPosts(communityPosts.map(post =>
                            post.id === editingPostId ? { ...post, content: updatedPost.content, is_private: updatedPost.is_private } : post
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
                            user_name: profileName || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "익명의 성도",
                            avatar_url: profileAvatar || user.user_metadata?.avatar_url || null,
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
                    maxWidth: "600px",
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
                                        {profileAvatar ? <img src={profileAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🐑'}
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#555' }}>
                                        {profileName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || "성도님"}
                                    </span>
                                </div>
                                <textarea
                                    value={communityInput}
                                    onChange={(e) => setCommunityInput(e.target.value)}
                                    placeholder="성도들과 나누고 싶은 은혜를 적어보세요..."
                                    style={{ width: '100%', minHeight: '80px', border: '1px solid #F5F5F5', borderRadius: '12px', padding: '12px', boxSizing: 'border-box', outline: 'none', fontSize: '14px', background: '#FAFAFA', resize: 'none', fontFamily: 'inherit' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                    <div
                                        onClick={() => setIsPrivatePost(!isPrivatePost)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            color: isPrivatePost ? '#7B1FA2' : '#666',
                                            background: isPrivatePost ? '#F3E5F5' : '#F5F5F5',
                                            padding: '6px 14px',
                                            borderRadius: '25px',
                                            fontWeight: 700,
                                            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                            border: isPrivatePost ? '1.5px solid #7B1FA2' : '1.5px solid transparent',
                                            boxShadow: isPrivatePost ? '0 4px 10px rgba(123,31,162,0.15)' : 'none'
                                        }}
                                    >
                                        <span style={{ fontSize: '15px' }}>{isPrivatePost ? '🔒' : '🌐'}</span>
                                        <span>{isPrivatePost ? '나만 보기 (비공개)' : '전체 공개 (함께 나누기)'}</span>
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
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#333', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                                    {post.user_name}
                                                    {/* ✅ 묵상나눔 배지 */}
                                                    {post.is_qt && (
                                                        <span style={{ fontSize: '10px', background: '#E8F5E9', color: '#2E7D32', padding: '2px 7px', borderRadius: '8px', fontWeight: 700, border: '1px solid #C8E6C9' }}>
                                                            📖 묵상나눔
                                                        </span>
                                                    )}
                                                    {/* 비공개 배지 */}
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
                                                    <button onClick={() => handleDeletePost(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#999', fontWeight: 600 }}>삭제</button>
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
                                                    <button onClick={handleUpdatePost} style={{ padding: '8px 16px', background: '#333', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>저장</button>
                                                    <button onClick={() => setEditingPostId(null)} style={{ padding: '8px 16px', background: '#EEE', color: '#666', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>취소</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ margin: '0 0 15px 0' }}>
                                                <div style={{ fontSize: '15px', lineHeight: 1.7, color: '#444', wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: !expandedPosts[post.id] && (post.content.split('\n').length > 4 || post.content.length > 120) ? 4 : 'unset', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
                                                {(post.content.split('\n').length > 4 || post.content.length > 120) && (
                                                    <button onClick={() => setExpandedPosts({ ...expandedPosts, [post.id]: !expandedPosts[post.id] })} style={{ background: 'none', border: 'none', color: '#B8924A', fontSize: '13px', padding: '8px 0 0 0', cursor: 'pointer', fontWeight: 600 }}>
                                                        {expandedPosts[post.id] ? '접기 ▲' : '더보기 ▼'}
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Reactions & Comments Count row */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '12px', borderTop: '1px solid #F8F8F8', paddingTop: '12px' }}>
                                            <div
                                                onClick={() => handleReaction(post.id, 'community')}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    cursor: 'pointer',
                                                    padding: '6px 12px',
                                                    borderRadius: '20px',
                                                    background: post.liker_ids?.includes(user?.id) ? '#FFF0F0' : '#F8F8F8',
                                                    color: post.liker_ids?.includes(user?.id) ? '#E03131' : '#666',
                                                    fontSize: '13px',
                                                    fontWeight: 700,
                                                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                                    border: post.liker_ids?.includes(user?.id) ? '1px solid #FFC1C1' : '1px solid transparent'
                                                }}
                                            >
                                                <span style={{ fontSize: '16px', transform: post.liker_ids?.includes(user?.id) ? 'scale(1.2)' : 'none', transition: 'transform 0.2s' }}>
                                                    {post.liker_ids?.includes(user?.id) ? '❤️' : '🤍'}
                                                </span>
                                                <span>좋아요 {post.liker_ids?.length || 0}</span>
                                            </div>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <span>💬</span> 댓글 {post.comments?.length || 0}개
                                            </div>
                                        </div>

                                        {/* 좋아요 명단 표시 */}
                                        {post.liker_ids && post.liker_ids.length > 0 && (
                                            <div style={{ fontSize: '11px', color: '#999', marginBottom: '12px', padding: '0 4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span>❤️</span> {getLikerNames(post.liker_ids)}
                                            </div>
                                        )}

                                        {/* Comments Section */}
                                        <div style={{ borderTop: '1px solid #F5F5F5', paddingTop: '15px' }}>
                                            <div style={{ display: 'none' }}>댓글 {post.comments?.length || 0}개</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                                                {post.comments && Array.isArray(post.comments) && post.comments.map((comment: any) => {
                                                    const isCommentVisible = !comment.is_private || isAdmin || user?.id === comment.user_id || user?.id === post.user_id;
                                                    return (
                                                        <div key={comment.id} style={{ background: '#FAFAFA', padding: '10px 15px', borderRadius: '12px', fontSize: '13px', opacity: comment.is_private ? 0.9 : 1 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                <span style={{ fontWeight: 700, color: '#555', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    {comment.user_name || '성도'}
                                                                    {comment.is_private && <span style={{ fontSize: '10px', color: '#9E2A5B' }}>🔒</span>}
                                                                </span>
                                                                <span style={{ fontSize: '10px', color: '#AAA', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    {comment.created_at ? new Date(comment.created_at).toLocaleTimeString() : '방금 전'}
                                                                    {user?.id === comment.user_id && editingCommentId !== comment.id && (
                                                                        <button onClick={() => { setEditingCommentId(comment.id); setEditCommentContent(comment.content); setIsEditPrivate(!!comment.is_private); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#B8924A', padding: 0, fontWeight: 600 }}>수정</button>
                                                                    )}
                                                                    {(isAdmin || user?.id === comment.user_id || user?.id === post.user_id) && editingCommentId !== comment.id && (
                                                                        <button onClick={() => handleDeleteComment(post.id, comment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#999', padding: 0 }}>✕</button>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            {editingCommentId === comment.id ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                                                                    <textarea
                                                                        value={editCommentContent}
                                                                        onChange={(e) => { setEditCommentContent(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                                e.preventDefault();
                                                                                handleUpdateComment(post.id, comment.id);
                                                                            }
                                                                        }}
                                                                        autoFocus
                                                                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #DDD', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'none', height: '40px', minHeight: '40px', fontFamily: 'inherit' }}
                                                                    />
                                                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                        <button onClick={() => handleUpdateComment(post.id, comment.id)} style={{ background: '#333', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>저장</button>
                                                                        <button onClick={() => setEditingCommentId(null)} style={{ background: '#EEE', color: '#666', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>취소</button>
                                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginLeft: 'auto' }}>
                                                                            <input type="checkbox" checked={isEditPrivate} onChange={e => setIsEditPrivate(e.target.checked)} />
                                                                            <span style={{ fontSize: '11px', color: '#777' }}>비공개</span>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div style={{ color: isCommentVisible ? '#666' : '#AAA', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontStyle: isCommentVisible ? 'normal' : 'italic' }}>
                                                                    {isCommentVisible ? comment.content : '🔒 비공개 댓글입니다.'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {/* Comment Input */}
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                                <textarea
                                                    value={commentInputs[post.id] || ""}
                                                    onChange={(e) => {
                                                        setCommentInputs({ ...commentInputs, [post.id]: e.target.value });
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                    }}
                                                    onKeyDown={(e) => {
                                                        // Shift+Enter는 개행, Enter는 개행 (사용자 요청: 줄바꿈 허용)
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            // e.preventDefault(); // 기본 개행 동작 허용
                                                        }
                                                    }}
                                                    placeholder="따뜻한 격려의 댓글..."
                                                    disabled={submittingCommentId === post.id}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px 12px',
                                                        borderRadius: '12px',
                                                        border: '1px solid #EEE',
                                                        fontSize: '14px',
                                                        outline: 'none',
                                                        background: submittingCommentId === post.id ? '#FAFAFA' : 'white',
                                                        resize: 'none',
                                                        height: '40px',
                                                        minHeight: '40px',
                                                        maxHeight: '120px',
                                                        fontFamily: 'inherit',
                                                        lineHeight: '1.5'
                                                    }}
                                                />
                                                <button
                                                    onClick={() => setCommentPrivateStates(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                                                    style={{
                                                        background: commentPrivateStates[post.id] ? '#F3E5F5' : '#F5F5F5',
                                                        border: 'none',
                                                        borderRadius: '10px',
                                                        width: '40px',
                                                        height: '40px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        fontSize: '16px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title={commentPrivateStates[post.id] ? "비공개" : "공개"}
                                                >
                                                    {commentPrivateStates[post.id] ? '🔒' : '🔓'}
                                                </button>
                                                <button
                                                    onClick={() => handleAddComment(post.id)}
                                                    disabled={submittingCommentId === post.id}
                                                    style={{
                                                        background: '#333',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '10px',
                                                        padding: '0 12px',
                                                        height: '40px',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        cursor: submittingCommentId === post.id ? 'default' : 'pointer',
                                                        opacity: submittingCommentId === post.id ? 0.7 : 1
                                                    }}
                                                >
                                                    {submittingCommentId === post.id ? '...' : '등록'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    )}
                </div>
            );
        }

        /* ══════════════════════════════
           THANKSGIVING DIARY PAGE
        ══════════════════════════════ */
        if (view === "thanksgiving") {
            const handleReaction = async (postId: string, type: 'community' | 'thanksgiving') => {
                if (!user) {
                    alert("로그인이 필요합니다.");
                    return;
                }
                try {
                    const res = await fetch('/api/community/reaction', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ post_id: postId, user_id: user.id, type })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        if (type === 'community') {
                            setCommunityPosts(prev => prev.map(post => post.id === postId ? { ...post, liker_ids: data.liker_ids } : post));
                        } else {
                            setThanksgivingDiaries(prev => prev.map(diary => diary.id === postId ? { ...diary, liker_ids: data.liker_ids } : diary));
                        }
                    } else {
                        if (data.error?.includes('column "liker_ids"') || data.details?.includes('column "liker_ids"')) {
                            alert("기능 활성화를 위해 DB 설정이 필요합니다. 관리자에게 'liker_ids 컬럼(TEXT[]) 추가'를 요청해 주세요.");
                        }
                    }
                } catch (e) {
                    console.error("좋아요 오류:", e);
                }
            };

            const handleAddThanksgivingComment = async (diaryId: any) => {
                const commentText = commentInputs[diaryId];
                const isPrivate = commentPrivateStates[diaryId] || false;
                if (!commentText?.trim()) return;
                if (!user) {
                    alert("로그인이 필요합니다.");
                    return;
                }
                if (submittingCommentId === diaryId) return;
                setSubmittingCommentId(diaryId);
                try {
                    const res = await fetch('/api/thanksgiving/comments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            diary_id: diaryId,
                            user_id: user.id,
                            user_name: profileName || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "익명의 성도",
                            content: commentText,
                            is_private: isPrivate
                        })
                    });
                    if (res.ok) {
                        const newComment = await res.json();
                        setThanksgivingDiaries(prev => prev.map(diary => {
                            if (diary.id === diaryId) {
                                return { ...diary, comments: [...(diary.comments || []), newComment] };
                            }
                            return diary;
                        }));
                        setCommentInputs(prev => ({ ...prev, [diaryId]: "" }));
                        setCommentPrivateStates(prev => ({ ...prev, [diaryId]: false }));
                    } else {
                        const errData = await res.json().catch(() => ({}));
                        alert("댓글 등록에 실패했어요: " + (errData.error || "알 수 없는 오류"));
                    }
                } catch (e) {
                    console.error("댓글 달기 오류:", e);
                    alert("댓글을 등록하는 중 오류가 발생했습니다.");
                } finally {
                    setSubmittingCommentId(null);
                }
            };

            const handleUpdateThanksgivingComment = async (diaryId: any, commentId: any) => {
                const content = editCommentContent.trim();
                if (!content) return;
                try {
                    const res = await fetch('/api/thanksgiving/comments', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: commentId, content, is_private: isEditPrivate })
                    });
                    if (res.ok) {
                        const updatedComment = await res.json();
                        setThanksgivingDiaries(prev => prev.map(diary => {
                            if (diary.id === diaryId) {
                                return {
                                    ...diary,
                                    comments: (diary.comments || []).map((c: any) => c.id === commentId ? updatedComment : c)
                                };
                            }
                            return diary;
                        }));
                        setEditingCommentId(null);
                        setEditCommentContent("");
                    }
                } catch (e) { console.error("댓글 수정 오류:", e); }
            };

            const handleDeleteThanksgivingComment = async (diaryId: any, commentId: any) => {
                if (!confirm("이 댓글을 삭제하시겠습니까?")) return;
                try {
                    const res = await fetch('/api/thanksgiving/comments', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: commentId })
                    });
                    if (res.ok) {
                        setThanksgivingDiaries(prev => prev.map(diary => {
                            if (diary.id === diaryId) {
                                return { ...diary, comments: (diary.comments || []).filter((c: any) => c.id !== commentId) };
                            }
                            return diary;
                        }));
                    } else {
                        alert("댓글 삭제에 실패했습니다.");
                    }
                } catch (e) {
                    console.error("댓글 삭제 실패:", e);
                    alert("오류가 발생했습니다.");
                }
            };

            const handleDeleteThanksgiving = async (diaryId: any) => {
                if (!confirm("이 감사일기를 정말 삭제하시겠습니까?")) return;
                try {
                    const res = await fetch('/api/thanksgiving', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: diaryId })
                    });
                    if (res.ok) {
                        setThanksgivingDiaries(prev => prev.filter(diary => diary.id !== diaryId));
                    } else {
                        const errData = await res.json().catch(() => ({}));
                        alert(`삭제 실패: ${errData.error || '알 수 없는 오류'}`);
                    }
                } catch (e) {
                    console.error("삭제 중 오류:", e);
                    alert("삭제 중 네트워크 오류가 발생했습니다.");
                }
            };

            const handleUpdateThanksgiving = async () => {
                if (!editingPostId || !editContent.trim()) return;
                try {
                    const res = await fetch('/api/thanksgiving', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: editingPostId, content: editContent })
                    });
                    if (res.ok) {
                        const updatedDiary = await res.json();
                        setThanksgivingDiaries(prev => prev.map(diary =>
                            diary.id === editingPostId ? { ...diary, content: updatedDiary.content } : diary
                        ));
                        setEditingPostId(null);
                        setEditContent("");
                    }
                } catch (e) { console.error("수정 중 오류:", e); }
            };

            const handleThanksgivingPost = async () => {
                if (!thanksgivingInput.trim() || !user) return;
                try {
                    const res = await fetch('/api/thanksgiving', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: user.id,
                            user_name: profileName || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "익명의 성도",
                            avatar_url: profileAvatar || user.user_metadata?.avatar_url || null,
                            content: thanksgivingInput,
                            church_id: churchId,
                            is_private: isPrivateThanksgiving
                        })
                    });
                    if (res.ok) {
                        const newDiary = await res.json();
                        setThanksgivingDiaries(prev => [newDiary, ...prev]);
                        setThanksgivingInput("");
                        setIsPrivateThanksgiving(false);
                    }
                } catch (e) { console.error("감사일기 등록 실패:", e); }
            };

            return (
                <div style={{
                    minHeight: "100vh", background: "#FFFBF5", maxWidth: "600px", margin: "0 auto", ...baseFont, paddingTop: 'env(safe-area-inset-top)'
                }}>
                    {styles}
                    <div style={{
                        padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #FDF0E3",
                        position: 'sticky', top: 'env(safe-area-inset-top)', background: 'white', zIndex: 10
                    }}>
                        <button onClick={handleBack} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: '#333', padding: '8px' }}>←</button>
                        <div style={{ fontWeight: 800, color: "#333", fontSize: "15px", flex: 1 }}>감사일기 나눔</div>
                        {/* 감사일기 알림종: 홈 스크린과 스타일 통일 */}
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
                                <div style={{ position: 'absolute', top: '-1px', right: '-1px', background: '#FF3D00', color: 'white', fontSize: '9px', fontWeight: 900, minWidth: '15px', height: '15px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid white' }}>
                                    {notifications.filter(n => !n.is_read).length}
                                </div>
                            )}
                        </div>
                    </div>

                    {!churchSettings.community_visible && !isAdmin ? (
                        <div style={{ padding: '60px 40px', textAlign: 'center' }}>
                            <div style={{ fontSize: '50px', marginBottom: '20px' }}>🔒</div>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#333', marginBottom: '10px' }}>비공개 공간입니다</h3>
                            <button onClick={handleBack} style={{ marginTop: '24px', padding: '12px 24px', background: '#333', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>뒤로 가기</button>
                        </div>
                    ) : (
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ background: 'white', borderRadius: '20px', padding: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid #fae1cd' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FDF0E3', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                                        {user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🌻'}
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#555' }}>
                                        {profileName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || "성도님"}
                                    </span>
                                </div>
                                <textarea
                                    value={thanksgivingInput}
                                    onChange={(e) => setThanksgivingInput(e.target.value)}
                                    placeholder="오늘 하루, 어떤 감사의 제목이 있으셨나요?"
                                    style={{ width: '100%', minHeight: '80px', border: '1px solid #fae1cd', borderRadius: '12px', padding: '12px', boxSizing: 'border-box', outline: 'none', fontSize: '14px', background: '#FFFDFB', resize: 'none', fontFamily: 'inherit' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div
                                        onClick={() => setIsPrivateThanksgiving(!isPrivateThanksgiving)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: isPrivateThanksgiving ? '#E07A5F' : '#666', background: isPrivateThanksgiving ? '#FDF0E3' : '#F5F5F5', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, transition: 'all 0.2s' }}
                                    >
                                        <span>{isPrivateThanksgiving ? '🔒 나만 보기' : '🌐 함께 나누기'}</span>
                                    </div>
                                    <button
                                        onClick={handleThanksgivingPost}
                                        disabled={!thanksgivingInput.trim()}
                                        style={{
                                            padding: '8px 20px', background: thanksgivingInput.trim() ? '#E07A5F' : '#EEE', color: thanksgivingInput.trim() ? 'white' : '#AAA', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 800, cursor: thanksgivingInput.trim() ? 'pointer' : 'default', transition: 'all 0.3s'
                                        }}
                                    >
                                        감사 올리기
                                    </button>
                                </div>
                            </div>

                            {thanksgivingDiaries
                                .filter(diary => !diary.is_private || isAdmin || user?.id === diary.user_id)
                                .map(diary => (
                                    <div key={diary.id} style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', animation: 'fade-in 0.5s', border: '1px solid #FFF1E6' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FDF0E3', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                                                {diary.avatar_url ? <img src={diary.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🌻'}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {diary.user_name}
                                                    {diary.is_private && (
                                                        <span style={{ fontSize: '10px', background: '#FDF0E3', color: '#E07A5F', padding: '2px 7px', borderRadius: '8px', fontWeight: 700 }}>🔒 비공개</span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#999' }}>{new Date(diary.created_at || Date.now()).toLocaleString()}</div>
                                            </div>
                                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                                                {(user?.id === diary.user_id) && (
                                                    <button onClick={() => { setEditingPostId(diary.id); setEditContent(diary.content); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#E07A5F', fontWeight: 600 }}>수정</button>
                                                )}
                                                {(isAdmin || user?.id === diary.user_id) && (
                                                    <button onClick={() => handleDeleteThanksgiving(diary.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#999', fontWeight: 600 }}>삭제</button>
                                                )}
                                            </div>
                                        </div>

                                        {editingPostId === diary.id ? (
                                            <div style={{ marginBottom: '15px' }}>
                                                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} style={{ width: '100%', minHeight: '100px', border: '1px solid #fae1cd', borderRadius: '12px', padding: '12px', boxSizing: 'border-box', marginBottom: '8px', fontSize: '14px', fontFamily: 'inherit' }} />
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={handleUpdateThanksgiving} style={{ padding: '8px 16px', background: '#E07A5F', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>저장</button>
                                                    <button onClick={() => setEditingPostId(null)} style={{ padding: '8px 16px', background: '#FFF1E6', color: '#E07A5F', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>취소</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ margin: '0 0 15px 0' }}>
                                                <div style={{ fontSize: '15px', lineHeight: 1.7, color: '#444', wordBreak: 'break-word', whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: !expandedPosts[diary.id] && (diary.content.split('\n').length > 4 || diary.content.length > 120) ? 4 : 'unset', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {diary.content}
                                                </div>
                                                {(diary.content.split('\n').length > 4 || diary.content.length > 120) && (
                                                    <button onClick={() => setExpandedPosts(prev => ({ ...prev, [diary.id]: !prev[diary.id] }))} style={{ background: 'none', border: 'none', color: '#E07A5F', fontSize: '13px', padding: '8px 0 0 0', cursor: 'pointer', fontWeight: 600 }}>
                                                        {expandedPosts[diary.id] ? '접기 ▲' : '더보기 ▼'}
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Reactions & Comments Count row */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '12px', borderTop: '1px solid #FFF1E6', paddingTop: '12px' }}>
                                            <div
                                                onClick={() => handleReaction(diary.id, 'thanksgiving')}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    cursor: 'pointer',
                                                    padding: '6px 12px',
                                                    borderRadius: '20px',
                                                    background: diary.liker_ids?.includes(user?.id) ? '#FFF0F0' : '#FFFDFB',
                                                    color: diary.liker_ids?.includes(user?.id) ? '#E03131' : '#666',
                                                    fontSize: '13px',
                                                    fontWeight: 700,
                                                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                                    border: diary.liker_ids?.includes(user?.id) ? '1px solid #FFC1C1' : '1px solid #FAE1CD'
                                                }}
                                            >
                                                <span style={{ fontSize: '16px', transform: diary.liker_ids?.includes(user?.id) ? 'scale(1.2)' : 'none', transition: 'transform 0.2s' }}>
                                                    {diary.liker_ids?.includes(user?.id) ? '❤️' : '🤍'}
                                                </span>
                                                <span>좋아요 {diary.liker_ids?.length || 0}</span>
                                            </div>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#E07A5F', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <span>💬</span> 댓글 {diary.comments?.length || 0}개
                                            </div>
                                        </div>

                                        {/* 좋아요 명단 표시 */}
                                        {diary.liker_ids && diary.liker_ids.length > 0 && (
                                            <div style={{ fontSize: '11px', color: '#E07A5F', marginBottom: '12px', padding: '0 4px', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}>
                                                <span>❤️</span> {getLikerNames(diary.liker_ids)}
                                            </div>
                                        )}

                                        <div style={{ borderTop: '1px solid #FFF1E6', paddingTop: '15px' }}>
                                            <div style={{ display: 'none' }}>댓글 {diary.comments?.length || 0}개</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                                                {(diary.comments || []).map((comment: any) => {
                                                    const isCommentVisible = !comment.is_private || isAdmin || user?.id === comment.user_id || user?.id === diary.user_id;
                                                    return (
                                                        <div key={comment.id} style={{ background: '#FFFDFB', padding: '10px 15px', borderRadius: '12px', fontSize: '13px', border: '1px solid #fae1cd', opacity: comment.is_private ? 0.9 : 1 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                <span style={{ fontWeight: 700, color: '#555', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    {comment.user_name || '성도'}
                                                                    {comment.is_private && <span style={{ fontSize: '10px', color: '#E07A5F' }}>🔒</span>}
                                                                </span>
                                                                <span style={{ fontSize: '10px', color: '#AAA', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    {comment.created_at ? new Date(comment.created_at).toLocaleTimeString() : '방금 전'}
                                                                    {user?.id === comment.user_id && editingCommentId !== comment.id && (
                                                                        <button onClick={() => { setEditingCommentId(comment.id); setEditCommentContent(comment.content); setIsEditPrivate(!!comment.is_private); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#B8924A', padding: 0, fontWeight: 600 }}>수정</button>
                                                                    )}
                                                                    {(isAdmin || user?.id === comment.user_id || user?.id === diary.user_id) && editingCommentId !== comment.id && (
                                                                        <button onClick={() => handleDeleteThanksgivingComment(diary.id, comment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#999', padding: 0 }}>✕</button>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            {editingCommentId === comment.id ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                                                                    <textarea
                                                                        value={editCommentContent}
                                                                        onChange={(e) => { setEditCommentContent(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                                                        autoFocus
                                                                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #fae1cd', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'none', height: '40px', minHeight: '40px', fontFamily: 'inherit' }}
                                                                    />
                                                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                        <button onClick={() => handleUpdateThanksgivingComment(diary.id, comment.id)} style={{ background: '#E07A5F', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>저장</button>
                                                                        <button onClick={() => setEditingCommentId(null)} style={{ background: '#EEE', color: '#666', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>취소</button>
                                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginLeft: 'auto' }}>
                                                                            <input type="checkbox" checked={isEditPrivate} onChange={e => setIsEditPrivate(e.target.checked)} />
                                                                            <span style={{ fontSize: '11px', color: '#777' }}>비공개</span>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div style={{ color: isCommentVisible ? '#666' : '#AAA', fontStyle: isCommentVisible ? 'normal' : 'italic' }}>
                                                                    {isCommentVisible ? comment.content : '🔒 비공개 댓글입니다.'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                                <textarea
                                                    value={commentInputs[diary.id] || ""}
                                                    onChange={(e) => {
                                                        setCommentInputs(prev => ({ ...prev, [diary.id]: e.target.value }));
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleAddThanksgivingComment(diary.id);
                                                        }
                                                    }}
                                                    placeholder="공감의 댓글..."
                                                    style={{ flex: 1, padding: '10px 12px', borderRadius: '12px', border: '1px solid #fae1cd', fontSize: '14px', outline: 'none', resize: 'none', height: '40px', minHeight: '40px', maxHeight: '120px', fontFamily: 'inherit', lineHeight: '1.5' }}
                                                />
                                                <button
                                                    onClick={() => setCommentPrivateStates(prev => ({ ...prev, [diary.id]: !prev[diary.id] }))}
                                                    style={{ background: commentPrivateStates[diary.id] ? '#FDF0E3' : '#F5F5F5', border: 'none', borderRadius: '10px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', transition: 'all 0.2s' }}
                                                    title={commentPrivateStates[diary.id] ? "비공개" : "공개"}
                                                >
                                                    {commentPrivateStates[diary.id] ? '🔒' : '🔓'}
                                                </button>
                                                <button
                                                    disabled={submittingCommentId === diary.id}
                                                    onClick={() => handleAddThanksgivingComment(diary.id)}
                                                    style={{ background: submittingCommentId === diary.id ? '#CCC' : '#E07A5F', color: 'white', border: 'none', borderRadius: '10px', padding: '0 12px', height: '40px', fontSize: '12px', fontWeight: 700, cursor: submittingCommentId === diary.id ? 'default' : 'pointer' }}
                                                >
                                                    {submittingCommentId === diary.id ? '...' : '등록'}
                                                </button>
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
                    maxWidth: "600px",
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
                    maxWidth: "600px",
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
                    maxWidth: "600px",
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

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#F5F5F5', color: '#666', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>시스템 로그아웃</button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: '100%' }}>
                            <button onClick={() => { setAdminTab('settings'); setSettingsForm({ ...churchSettings }); setShowSettings(true); }} style={{ padding: '24px 8px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                <div style={{ width: '40px', height: '40px', background: '#FFF9C4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⛪</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#333', marginBottom: '2px', wordBreak: 'keep-all' }}>교회 설정</div>
                                    <div style={{ fontSize: '9px', color: '#999', wordBreak: 'keep-all' }}>로고/이름 관리</div>
                                </div>
                            </button>

                            <button onClick={async () => {
                                setAdminTab('members');
                                setShowSettings(true);
                                try {
                                    const r = await fetch(`/api/admin?action=list_members&church_id=${churchId}`);
                                    const data = await r.json();
                                    if (Array.isArray(data)) setMemberList(data);
                                } catch (e) { }
                            }} style={{ padding: '24px 8px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                <div style={{ width: '40px', height: '40px', background: '#E3F2FD', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👥</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#333', marginBottom: '2px', wordBreak: 'keep-all' }}>성도 관리</div>
                                    <div style={{ fontSize: '9px', color: '#999', wordBreak: 'keep-all' }}>명단/승인 관리</div>
                                </div>
                            </button>

                            <button onClick={async () => {
                                const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
                                setQtForm({
                                    date: today, reference: '', passage: '', interpretation: '',
                                    question1: '', question2: '', question3: '', prayer: '',
                                    youthInterpretation: '', youthQuestion1: '', youthQuestion2: '', youthQuestion3: ''
                                });
                                // 자동으로 오늘 데이터가 있는지 조회 시도
                                setAiLoading(true);
                                try {
                                    const res = await fetch(`/api/qt?date=${today}&church_id=${churchId}`, { cache: 'no-store' });
                                    const { qt } = await res.json();
                                    if (qt) {
                                        const { fullPassage, interpretation, youthData } = parsePassage(qt.passage);
                                        setQtForm({
                                            date: qt.date,
                                            reference: qt.reference,
                                            passage: fullPassage,
                                            interpretation: interpretation,
                                            question1: qt.question1 || '',
                                            question2: qt.question2 || '',
                                            question3: qt.question3 || '',
                                            prayer: qt.prayer || '',
                                            youthInterpretation: youthData?.interpretation || '',
                                            youthQuestion1: youthData?.questions?.[0] || '',
                                            youthQuestion2: youthData?.questions?.[1] || '',
                                            youthQuestion3: youthData?.questions?.[2] || '',
                                        });
                                    }
                                } catch (e) {
                                    console.error("오늘 큐티 로드 실패:", e);
                                } finally {
                                    setAiLoading(false);
                                    setView('qtManage');
                                }
                            }} style={{ padding: '24px 8px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                <div style={{ width: '40px', height: '40px', background: '#E1F5FE', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📖</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#333', marginBottom: '2px', wordBreak: 'keep-all' }}>말씀 관리</div>
                                    <div style={{ fontSize: '9px', color: '#999', wordBreak: 'keep-all' }}>큐티 등록/수정</div>
                                </div>
                            </button>

                            <button onClick={() => {
                                setSermonManageForm({
                                    script: '',
                                    summary: churchSettings.sermon_summary || '',
                                    q1: churchSettings.sermon_q1 || '',
                                    q2: churchSettings.sermon_q2 || '',
                                    q3: churchSettings.sermon_q3 || '',
                                    videoUrl: churchSettings.manual_sermon_url || '',
                                    inputType: churchSettings.manual_sermon_url ? 'video' : 'text'
                                });
                                setView('sermonManage');
                            }} style={{ padding: '24px 8px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                <div style={{ width: '40px', height: '40px', background: '#FCE4EC', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎙️</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#333', marginBottom: '2px', wordBreak: 'keep-all' }}>설교 요약</div>
                                    <div style={{ fontSize: '9px', color: '#999', wordBreak: 'keep-all' }}>AI 자동 생성</div>
                                </div>
                            </button>

                            <button onClick={async () => {
                                if (confirm('모든 성도님들께 오늘의 큐티 알림을 전송하시겠습니까?')) {
                                    try {
                                        const res = await fetch(`/api/push-send-daily?secret=somy-push-secret-123&church_id=${churchId}`);
                                        const data = await res.json();
                                        if (data.success) {
                                            if (data.sentCount === 0 && data.failedCount === 0 && (data.totalApprovedCount === 0 || data.totalApprovedCount === undefined)) {
                                                alert('알림을 보낼 성도님이 없습니다. 먼저 성도 관리에서 승인을 해주세요.');
                                            } else {
                                                let msg = `📢 알림 발송 완료!\n\n✅ 성공: ${data.sentCount}명\n❌ 실패: ${data.failedCount}명`;
                                                alert(msg);
                                            }
                                        } else {
                                            alert('⚠️ 발송 실패: ' + (data.error || '알 수 없는 오류'));
                                        }
                                    } catch (e) { alert('연결이 원활하지 않습니다.'); }
                                }
                            }} style={{ padding: '24px 8px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                <div style={{ width: '40px', height: '40px', background: '#E8F5E9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🔔</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#333', marginBottom: '2px', wordBreak: 'keep-all' }}>알림 발송</div>
                                    <div style={{ fontSize: '9px', color: '#999', wordBreak: 'keep-all' }}>푸시 알림 보내기</div>
                                </div>
                            </button>

                            <button onClick={async () => {
                                setAdminTab('stats');
                                setShowSettings(true);
                                setIsAdminsLoading(true);

                                // 1. 성도 분포 통계용 (성별, 연령대)
                                if (memberList.length === 0) {
                                    try {
                                        const r = await fetch(`/api/admin?action=list_members&church_id=${churchId}`);
                                        const data = await r.json();
                                        if (Array.isArray(data)) setMemberList(data);
                                    } catch (e) { }
                                }

                                // 2. 큐티 랭킹 통계용
                                try {
                                    setStatsError(null);
                                    const res = await fetch(`/api/stats?church_id=${churchId || 'jesus-in'}&t=${Date.now()}`);
                                    const data = await res.json();
                                    if (data) setStats(data);
                                } catch (e) {
                                    setStatsError("활동 통계 로딩 실패");
                                }

                                setIsAdminsLoading(false);
                            }} style={{ padding: '24px 8px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                <div style={{ width: '40px', height: '40px', background: '#FFF3E0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📊</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#333', marginBottom: '2px', wordBreak: 'keep-all' }}>성도 통계</div>
                                    <div style={{ fontSize: '9px', color: '#999', wordBreak: 'keep-all' }}>출석/완주 랭킹</div>
                                </div>
                            </button>

                            <button onClick={() => setView('adminGuide')} style={{ padding: '16px 8px', background: 'white', border: '1px solid #F0ECE4', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                <div style={{ width: '40px', height: '40px', background: '#F5F5F3', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📘</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#333', marginBottom: '2px', wordBreak: 'keep-all' }}>사용 가이드</div>
                                    <div style={{ fontSize: '9px', color: '#999', wordBreak: 'keep-all' }}>시스템 매뉴얼</div>
                                </div>
                            </button>

                            <button onClick={() => setView('brandGuide')} style={{ padding: '16px 8px', background: 'linear-gradient(135deg, #FFF9C4 0%, #FFF176 100%)', border: '1px solid #F0ECE4', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(212,175,55,0.15)' }}>
                                <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>✨</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#B8924A', marginBottom: '2px', wordBreak: 'keep-all' }}>브랜드 홍보</div>
                                    <div style={{ fontSize: '9px', color: '#B8924A', wordBreak: 'keep-all' }}>PDF 홍보 책자</div>
                                </div>
                            </button>

                            {isSuperAdmin && (
                                <button onClick={() => { setAdminTab('master'); fetchAllAdmins(); fetchChurchStats(); setShowSettings(true); }} style={{ padding: '16px 8px', background: '#FFFDE7', border: '1px solid #FFF176', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                    <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👑</div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#856404', marginBottom: '2px', wordBreak: 'keep-all' }}>마스터</div>
                                        <div style={{ fontSize: '9px', color: '#B8924A', wordBreak: 'keep-all' }}>시스템 관리</div>
                                    </div>
                                </button>
                            )}
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
            const getYoutubeEmbedUrl = (url: string, manualUrl?: string) => {
                const rawUrl = (manualUrl || url || "").trim();
                if (!rawUrl) return null;

                // 1. 채널 ID 추출 (UC... 형태) - URL 포함 여부와 상관없이 추출 시도
                const channelIdMatch = rawUrl.match(/(UC[a-zA-Z0-9_-]{20,})/);
                if (channelIdMatch) {
                    const channelId = channelIdMatch[1];
                    // [핵심 변경] UULV 접두사를 사용하여 '가장 최근 라이브/예배'를 1순위로 가져옴
                    // UU(업로드전체)나 UULF(최근업로드)보다 라이브 예배가 많은 교회에 훨씬 정확합니다.
                    const playlistId = 'UULV' + channelId.substring(2);
                    return `https://www.youtube.com/embed/videoseries?list=${playlistId}&rel=0`;
                }

                // 2. 비디오 ID 추출 (shorts, live 등 지원 강화)
                const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?/\s]{11})/;
                const match = rawUrl.match(regExp);
                const videoId = match ? match[1] : null;

                if (videoId) {
                    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
                }

                // 3. 이미 embed 형태인 경우
                if (rawUrl.includes('/embed/')) {
                    if (rawUrl.startsWith('//')) return 'https:' + rawUrl;
                    if (rawUrl.startsWith('http')) return rawUrl;
                }

                return null;
            };
            const embedUrl = getYoutubeEmbedUrl(churchSettings?.sermon_url || "", churchSettings?.manual_sermon_url);

            return (
                <div style={{
                    minHeight: "100vh",
                    background: "white",
                    maxWidth: "600px",
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

                                let user_name = profileName || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "익명의 성도";
                                let avatar_url = profileAvatar || user.user_metadata?.avatar_url || '';

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
                    church_id: churchId, // ✅ 교회 식별자 누락 방지
                    manual_sermon_url: sermonManageForm.videoUrl, // 수동 지정 주소로 저장
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
                    const errorResponse = await res.json().catch(() => ({}));
                    alert(`저장에 실패했습니다. 😅\n이유: ${errorResponse.error || '네트워크 또는 서버 응답에 문제가 있습니다.'}`);
                }
            };

            return (
                <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", background: "#FDFCFB", minHeight: "100vh", ...baseFont, paddingTop: 'env(safe-area-inset-top)' }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                        <button onClick={() => setView('admin')} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: '#333' }}>←</button>
                        <div style={{ fontWeight: 800, fontSize: "16px", color: '#333' }}>🎙️ 설교 자동 요약봇</div>
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
           COUNSELING VIEW
        ══════════════════════════════ */
        if (view === "counseling") {
            return (
                <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: "600px", margin: "0 auto", background: "#fdfdfd", position: "relative" }}>
                    <div style={{ padding: "20px", display: "flex", alignItems: "center", borderBottom: '1px solid #EEE' }}>
                        <button onClick={handleBack} style={{ background: "none", border: "none", fontSize: "24px", color: "#333", cursor: "pointer" }}>←</button>
                        <h2 style={{ flex: 1, textAlign: "center", fontSize: "18px", margin: 0, color: "#333", fontWeight: 800 }}>🙏 상담 및 기도 요청</h2>
                        <div style={{ width: "24px" }} />
                    </div>

                    <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                        {/* 작성 폼 (메인 관리자 아닐 때만 - 부관리자 포함) */}
                        {!isMainAdmin && (
                            <div style={{ marginBottom: '30px', background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #EEE', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                <h3 style={{ fontSize: '15px', marginTop: 0, color: '#333' }}>새 요청 작성하기 <span style={{ fontSize: '12px', color: '#999', fontWeight: 400 }}>(목사님만 볼 수 있습니다)</span></h3>
                                <textarea value={counselingInput} onChange={e => setCounselingInput(e.target.value)} placeholder="담임목사님께 나누고 싶은 고민이나 기도 제목을 적어주세요. 목사님께서 확인 후 직접 답변해주시며 실시간 알림이 발송됩니다." style={{ width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #DDD', minHeight: '120px', resize: 'vertical', fontSize: '14px', marginBottom: '10px', outline: 'none' }} />
                                <button
                                    disabled={isSubmittingCounseling}
                                    onClick={async () => {
                                        if (!counselingInput.trim() || isSubmittingCounseling) return;
                                        setIsSubmittingCounseling(true);
                                        try {
                                            const finalName = profileName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || "익명의 성도";
                                            const r = await fetch('/api/counseling', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user?.id, user_name: finalName, church_id: churchId, content: counselingInput }) });
                                            if (r.ok) {
                                                const newReq = await r.json();
                                                setCounselingRequests([newReq, ...counselingRequests]);
                                                setCounselingInput('');
                                                alert("요청이 담임목사님께 성공적으로 전송되었습니다.");
                                            }
                                        } catch (e) {
                                        } finally {
                                            setIsSubmittingCounseling(false);
                                        }
                                    }}
                                    style={{ width: '100%', padding: '14px', background: isSubmittingCounseling ? '#999' : '#333', color: 'white', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: isSubmittingCounseling ? 'default' : 'pointer' }}
                                >
                                    {isSubmittingCounseling ? '전송 중...' : '요청 보내기 🚀'}
                                </button>
                            </div>
                        )}

                        {/* 요청 목록 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {counselingRequests.map(req => (
                                <div key={req.id} style={{ background: 'white', padding: '15px', borderRadius: '15px', border: '1px solid #EEE', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#666' }}>
                                        <strong>{req.user_name} 성도</strong>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>{new Date(req.created_at).toLocaleDateString()}</span>
                                            {(isMainAdmin || user?.id === req.user_id) && (
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    {!isMainAdmin && user?.id === req.user_id && (
                                                        <button onClick={() => {
                                                            setEditingCounselingId(req.id);
                                                            setEditingCounselingField('content');
                                                            setEditCounselingContent(req.content);
                                                        }} style={{ background: 'none', border: 'none', color: '#B8924A', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>수정</button>
                                                    )}
                                                    <button onClick={async () => {
                                                        if (confirm('이 요청을 삭제하시겠습니까?')) {
                                                            try {
                                                                const r = await fetch('/api/counseling', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: req.id }) });
                                                                if (r.ok) setCounselingRequests(counselingRequests.filter(c => c.id !== req.id));
                                                            } catch (e) { }
                                                        }
                                                    }} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: 0, fontSize: '12px', fontWeight: 700 }}>삭제</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {editingCounselingId === req.id && editingCounselingField === 'content' ? (
                                        <div style={{ marginBottom: '15px' }}>
                                            <textarea
                                                value={editCounselingContent}
                                                onChange={e => setEditCounselingContent(e.target.value)}
                                                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '2px solid #B8924A', fontSize: '14px', minHeight: '100px', marginBottom: '8px', outline: 'none' }}
                                            />
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={async () => {
                                                    if (!editCounselingContent.trim()) return;
                                                    try {
                                                        const r = await fetch('/api/counseling', {
                                                            method: 'PATCH',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ id: req.id, content: editCounselingContent, overwrite: true })
                                                        });
                                                        if (r.ok) {
                                                            const updated = await r.json();
                                                            setCounselingRequests(counselingRequests.map(c => c.id === req.id ? updated : c));
                                                            setEditingCounselingId(null);
                                                            setEditingCounselingField(null);
                                                        }
                                                    } catch (e) { }
                                                }} style={{ flex: 1, padding: '8px', background: '#333', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>저장</button>
                                                <button onClick={() => { setEditingCounselingId(null); setEditingCounselingField(null); }} style={{ flex: 1, padding: '8px', background: '#EEE', color: '#666', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>취소</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '15px', color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '15px' }}>
                                            {req.content}
                                        </div>
                                    )}

                                    {/* 답변 영역 */}
                                    {req.reply ? (
                                        <div style={{ background: '#F5F5F5', padding: '15px', borderRadius: '10px', marginTop: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                                <div style={{ fontWeight: 800, fontSize: '13px', color: '#1A5D55' }}>↳ 담임목사님 답변</div>
                                                {isMainAdmin && (
                                                    <button onClick={() => {
                                                        setEditingCounselingId(req.id);
                                                        setEditingCounselingField('reply');
                                                        setEditCounselingContent(req.reply);
                                                    }} style={{ background: 'none', border: 'none', color: '#1A5D55', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>수정</button>
                                                )}
                                            </div>
                                            {editingCounselingId === req.id && editingCounselingField === 'reply' ? (
                                                <div>
                                                    <textarea
                                                        value={editCounselingContent}
                                                        onChange={e => setEditCounselingContent(e.target.value)}
                                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '2px solid #1A5D55', fontSize: '13px', minHeight: '80px', marginBottom: '5px', outline: 'none' }}
                                                    />
                                                    <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                                                        <button onClick={async () => {
                                                            try {
                                                                const r = await fetch('/api/counseling', {
                                                                    method: 'PATCH',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ id: req.id, reply: editCounselingContent, overwrite: true })
                                                                });
                                                                if (r.ok) {
                                                                    const updated = await r.json();
                                                                    setCounselingRequests(counselingRequests.map(c => c.id === req.id ? updated : c));
                                                                    setEditingCounselingId(null);
                                                                    setEditingCounselingField(null);
                                                                }
                                                            } catch (e) { }
                                                        }} style={{ flex: 1, padding: '5px', background: '#1A5D55', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>저장</button>
                                                        <button onClick={() => { setEditingCounselingId(null); setEditingCounselingField(null); }} style={{ flex: 1, padding: '5px', background: '#EEE', color: '#666', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>취소</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '14px', color: '#444', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{req.reply}</div>
                                            )}

                                            {/* 성도 추가 답글 표시 */}
                                            {req.user_reply && (
                                                <div style={{ background: 'white', padding: '12px', borderRadius: '8px', marginTop: '10px', border: '1px solid #EEE' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                        <div style={{ fontWeight: 800, fontSize: '12px', color: '#333' }}>💬 성도님 추가 답글</div>
                                                        {!isMainAdmin && user?.id === req.user_id && (
                                                            <button onClick={() => {
                                                                setEditingCounselingId(req.id);
                                                                setEditingCounselingField('user_reply');
                                                                setEditCounselingContent(req.user_reply);
                                                            }} style={{ background: 'none', border: 'none', color: '#B8924A', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>수정</button>
                                                        )}
                                                    </div>
                                                    {editingCounselingId === req.id && editingCounselingField === 'user_reply' ? (
                                                        <div>
                                                            <textarea
                                                                value={editCounselingContent}
                                                                onChange={e => setEditCounselingContent(e.target.value)}
                                                                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '2px solid #B8924A', fontSize: '13px', minHeight: '80px', marginBottom: '5px', outline: 'none' }}
                                                            />
                                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                                <button onClick={async () => {
                                                                    try {
                                                                        const r = await fetch('/api/counseling', {
                                                                            method: 'PATCH',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ id: req.id, user_reply: editCounselingContent, overwrite: true })
                                                                        });
                                                                        if (r.ok) {
                                                                            const updated = await r.json();
                                                                            setCounselingRequests(counselingRequests.map(c => c.id === req.id ? updated : c));
                                                                            setEditingCounselingId(null);
                                                                            setEditingCounselingField(null);
                                                                        }
                                                                    } catch (e) { }
                                                                }} style={{ flex: 1, padding: '5px', background: '#333', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>저장</button>
                                                                <button onClick={() => { setEditingCounselingId(null); setEditingCounselingField(null); }} style={{ flex: 1, padding: '5px', background: '#EEE', color: '#666', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>취소</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{req.user_reply}</div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 성도 추가 답글 입력창 (목사님 답변은 있는데 성도가 추가로 할 말이 있을 때) */}
                                            {!isMainAdmin && user?.id === req.user_id && (
                                                <div style={{ marginTop: '10px' }}>
                                                    <textarea
                                                        value={userCounselingReplyInput[req.id] || ''}
                                                        onChange={e => setUserCounselingReplyInput({ ...userCounselingReplyInput, [req.id]: e.target.value })}
                                                        placeholder="목사님 답변에 대한 답글을 남겨주세요."
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #DDD', minHeight: '60px', fontSize: '13px', marginBottom: '5px', outline: 'none' }}
                                                    />
                                                    <button
                                                        disabled={submittingUserReplyId === req.id}
                                                        onClick={async () => {
                                                            const content = userCounselingReplyInput[req.id];
                                                            if (!content?.trim() || submittingUserReplyId === req.id) return;
                                                            setSubmittingUserReplyId(req.id);
                                                            try {
                                                                const r = await fetch('/api/counseling', {
                                                                    method: 'PATCH',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        id: req.id,
                                                                        user_reply: content,
                                                                        user_name: profileName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '익명의 성도'
                                                                    })
                                                                });
                                                                if (r.ok) {
                                                                    const updated = await r.json();
                                                                    setCounselingRequests(counselingRequests.map(c => c.id === req.id ? updated : c));
                                                                    setUserCounselingReplyInput({ ...userCounselingReplyInput, [req.id]: '' });
                                                                    alert("답글이 목사님께 전달되었습니다.");
                                                                }
                                                            } catch (e) {
                                                            } finally {
                                                                setSubmittingUserReplyId(null);
                                                            }
                                                        }}
                                                        style={{ width: '100%', padding: '8px', background: submittingUserReplyId === req.id ? '#999' : '#333', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '12px', cursor: submittingUserReplyId === req.id ? 'default' : 'pointer' }}
                                                    >
                                                        {submittingUserReplyId === req.id ? '전송 중...' : '목사님께 답글 보내기'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : isMainAdmin ? (
                                        <div style={{ marginTop: '10px', background: '#FDFCFB', border: '1px solid #EEE', borderRadius: '10px', padding: '10px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#999', marginBottom: '8px' }}>답변을 등록하면 성도에게 푸시 알림이 즉시 전송됩니다.</div>
                                            <textarea value={counselingReplyInput[req.id] || ''} onChange={e => setCounselingReplyInput({ ...counselingReplyInput, [req.id]: e.target.value })} placeholder="답변을 작성해주세요." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #DDD', minHeight: '80px', fontSize: '13px', marginBottom: '8px', outline: 'none' }} />
                                            <button
                                                disabled={submittingReplyId === req.id}
                                                onClick={async () => {
                                                    const replyContent = counselingReplyInput[req.id];
                                                    if (!replyContent?.trim() || submittingReplyId === req.id) return;
                                                    setSubmittingReplyId(req.id);
                                                    try {
                                                        const r = await fetch('/api/counseling', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: req.id, reply: replyContent, admin_name: adminInfo?.name }) });
                                                        if (r.ok) {
                                                            const updated = await r.json();
                                                            setCounselingRequests(counselingRequests.map(c => c.id === req.id ? updated : c));
                                                            alert("답변이 전송되었습니다.");
                                                        }
                                                    } catch (e) {
                                                    } finally {
                                                        setSubmittingReplyId(null);
                                                    }
                                                }}
                                                style={{ width: '100%', padding: '10px', background: submittingReplyId === req.id ? '#999' : '#1A5D55', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: submittingReplyId === req.id ? 'default' : 'pointer' }}
                                            >
                                                {submittingReplyId === req.id ? '답변 전송 중...' : '답변 등록 완료 작성하기 (성도에게 알림 전송)'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '13px', color: '#999', marginTop: '10px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>⏳</span> 목사님께서 확인 후 답변을 주실 예정입니다...
                                        </div>
                                    )}
                                </div>
                            ))}
                            {counselingRequests.length === 0 && (
                                <div style={{ textAlign: 'center', color: '#999', padding: '30px 0', fontSize: '14px' }}>
                                    아직 접수된 요청이 없습니다.
                                </div>
                            )}
                        </div>
                    </div>
                </div >
            );
        }

        /* ══════════════════════════════
           CHAT VIEW
        ══════════════════════════════ */
        if (view === "chat") {
            return (
                <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: "600px", margin: "0 auto", background: "white", ...baseFont, position: 'relative' }}>
                    <div style={{ padding: "15px 20px", borderBottom: "1px solid #EEE", display: "flex", alignItems: "center", gap: "12px" }}>
                        <button onClick={handleBack} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>←</button>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', border: '1px solid #EEE' }}>
                            <img src={SOMY_IMG} alt="소미" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, color: "#333", fontSize: "14px" }}>소미 {churchSettings.church_name ? `@${churchSettings.church_name}` : ""}</div>
                            <div style={{ fontSize: "11px", color: "#999" }}>실시간 묵상 가이드</div>
                        </div>
                    </div>

                    <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px", background: "#FAFAFA", display: "flex", flexDirection: "column", gap: "15px" }}>
                        {messages.map((m, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: 'flex-start', gap: '8px' }}>
                                {m.role === "assistant" && (
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: '2px solid #D4AF37', flexShrink: 0, marginTop: '4px', background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                                        <img src={SOMY_IMG} alt="소미" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                )}
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

        if (view === "pastorColumn") {
            return (
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', ...baseFont, animation: 'fade-in 0.4s ease-out' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={handleBack} style={{ background: '#F5F5F5', border: 'none', width: '36px', height: '36px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px' }}>←</button>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>✍️ 담임목사 칼럼</h2>
                    </div>

                    <div style={{ background: 'white', borderRadius: '28px', padding: '28px', border: '1px solid #F0ECE4', boxShadow: '0 15px 35px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#333', marginBottom: '8px', wordBreak: 'keep-all' }}>{churchSettings.pastor_column_title || '오늘의 칼럼'}</h3>
                            <div style={{ width: '40px', height: '3px', background: '#D4AF37', margin: '12px auto', borderRadius: '2px' }}></div>
                        </div>

                        <div style={{ width: '100%', background: '#FDF8F0', padding: '24px', borderRadius: '20px', border: '1px solid #F0ECE4' }}>
                            <p style={{ margin: 0, fontSize: '15.5px', color: '#444', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'keep-all', fontWeight: 500 }}>
                                {churchSettings.pastor_column_content || '아직 등록된 칼럼이 없습니다.'}
                            </p>
                        </div>
                    </div>

                    <button onClick={handleBack} style={{ width: '100%', padding: '16px', background: '#333', color: 'white', border: 'none', borderRadius: '16px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginTop: '10px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>확인</button>
                </div>
            );
        }

        if (view === "guide") {
            return renderGuidePage();
        }

        if (view === "adminGuide") {
            return renderAdminGuide();
        }

        if (view === "brandGuide") {
            return renderBrandGuide();
        }

        if (view === "profile") {
            return <ProfileView user={user} supabase={supabase} setView={setView} baseFont={baseFont} allowMemberEdit={churchSettings?.allow_member_edit} setProfileAvatar={setProfileAvatar} isAdmin={isAdmin} churchId={churchId} />;
        }

        if (view === "memberSearch") {
            return <MemberSearchView churchId={churchId} setView={setView} baseFont={baseFont} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} user={user} allAdminList={allAdminList} onRefreshAdmins={fetchAllAdmins} isAdminsLoading={isAdminsLoading} />;
        }

        return null; // 모든 뷰에 해당하지 않을 때
    };

    // 알림 리스트 팝업
    const renderNotificationList = () => {
        if (!showNotiList) return null;

        const kstBase = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const todaySolarMMDD = kstBase.toISOString().slice(5, 10);
        const todayLunarMMDD = typeof getLunarTodayMMDD === 'function' ? getLunarTodayMMDD() : null;
        const birthdayMembers = memberList.filter(m => {
            if (!m?.birthdate) return false;
            const bd = String(m.birthdate).slice(5, 10);
            return m.is_birthdate_lunar ? (todayLunarMMDD && bd === todayLunarMMDD) : bd === todaySolarMMDD;
        });
        const virtualBirthNotis = birthdayMembers.map(m => ({
            id: `birth-${m.id}`, type: 'birthday', actor_name: m.full_name, avatar_url: m.avatar_url, created_at: new Date().toISOString(), is_read: false
        }));
        const filteredNotis = notifications.filter(n => {
            if (n.type === 'counseling_req' || n.type === 'counseling_user_reply') return isMainAdmin;
            return true;
        });
        const allNotis = [...virtualBirthNotis, ...[...filteredNotis].reverse()];

        return (
            <>
                <div onClick={() => setShowNotiList(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.1)', zIndex: 1999 }} />
                <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '340px', background: 'white', borderRadius: '24px', boxShadow: '0 15px 50px rgba(0,0,0,0.2)', zIndex: 2000, border: '2px solid #E6A4B4', overflow: 'hidden', animation: 'slide-up 0.3s ease-out' }}>
                    <div style={{ padding: '15px', borderBottom: '1px solid #F5F5F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FDFCFB' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#333' }}>🔔 새 소식</span>
                        <button onClick={() => setShowNotiList(false)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>닫기</button>
                    </div>
                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                        {allNotis.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#AAA', fontSize: '13px' }}>아직 도착한 소식이 없어요 🐑</div>
                        ) : (
                            allNotis.map(n => (
                                <div key={n.id} onClick={async () => {
                                    if (n.type === 'birthday') { setShowNotiList(false); return; }
                                    if (!n.is_read) {
                                        await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) });
                                        setNotifications(notifications.map(noti => noti.id === n.id ? { ...noti, is_read: true } : noti));
                                    }
                                    try {
                                        if (['comment', 'community_post', 'community_like'].includes(n.type)) {
                                            const res = await fetch(`/api/community?church_id=${churchId}`);
                                            const data = await res.json();
                                            if (Array.isArray(data)) setCommunityPosts(data); setView('community');
                                        } else if (n.type === 'qt') { setView('qt'); } else { setView('home'); }
                                    } catch (e) { }
                                    setShowNotiList(false);
                                }} style={{ padding: '15px', borderBottom: '1px solid #F9F9F9', cursor: 'pointer', background: n.is_read ? 'white' : '#FFF9F9', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: n.is_read ? 'transparent' : '#FF3D00', marginTop: '5px', flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '13px', color: '#333', lineHeight: 1.5 }}>
                                            {n.type === 'birthday' && <>🎂 오늘은 <strong>{n.actor_name}</strong> 성도님의 생일입니다! 🎉</>}
                                            {n.type === 'comment' && <><strong>{n.actor_name}</strong>님이 은혜나눔에 댓글을 남기셨습니다.</>}
                                            {n.type === 'community_post' && <>✨ <strong>{n.actor_name}</strong>님이 새로운 은혜를 나누셨습니다.</>}
                                            {n.type === 'counseling_req' && <>🙏 새로운 <strong>상담 및 기도 요청</strong>이 도착했습니다.</>}
                                            {n.type === 'counseling_user_reply' && <>💬 <strong>{n.actor_name}</strong> 성도님이 상담에 추가 답글을 남기셨습니다.</>}
                                            {n.type === 'counseling_reply' && <>🙏 <strong>목사님</strong>의 상담 답변이 도착했습니다. 확인해 보세요.</>}
                                            {(!['birthday', 'comment', 'community_post', 'counseling_req', 'counseling_user_reply', 'counseling_reply'].includes(n.type)) && <><strong>{n.actor_name}</strong>님이 새로운 소식을 보내셨습니다.</>}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {(virtualBirthNotis.length > 0 || notifications.length > 0) && (
                        <div style={{ padding: '10px 15px', textAlign: 'center', background: '#FDFCFB', borderTop: '1px solid #F0F0F0', display: 'flex', gap: '10px' }}>
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
            { title: "🔍 글씨 크기 조절 (Aa 버튼)", desc: "우측 상단의 'Aa' 버튼을 눌러보세요. 클릭할 때마다 글씨가 1.0배에서 최대 1.6배까지 커집니다. 특히 스마트폰에서 글씨를 1.2배 이상 키우면, 홈 화면 버튼들이 한 줄로 자동 정렬되어 눈이 침침하신 성도님들도 훨씬 편하게 읽으실 수 있습니다.", icon: "🔍" },
            { title: "📖 깊이 있는 5단계 큐티", desc: "읽기 → 해설 → 질문 → 나눔 → 기도 총 5단계를 거치며 본문을 깊게 묵상합니다. [나눔] 단계에서 작성한 글은 '은혜나눔' 게시판에 자동으로 공유되어 공동체의 기쁨이 됩니다.", icon: "✨" },
            { title: "🧠 본문 터치 지혜 (AI 해설)", desc: "큐티 중 어려운 단어나 구절이 있다면 해당 텍스트를 살짝 터치해 보세요. AI 소미가 문맥에 맞는 신학적 해설을 즉석에서 제공합니다.", icon: "💡" },
            { title: "👥 성도 주소록 및 명단 관리", desc: "우리 교회 성도들의 연락처를 한눈에 확인하세요. 관리자는 주소록에서 직접 성도 정보를 수정하거나, 관리자 명단 기준으로 동기화된 데이터를 바탕으로 명단에서 삭제할 수도 있어 항상 깨끗한 주소록 유지가 가능합니다.", icon: "👤" },
            { title: "⚖️ 관리자 기준의 데이터 동기화", desc: "성도 주소록과 관리자가 업로드한 명단은 실시간으로 연동됩니다. 데이터의 기준은 항상 '관리자 엑셀 명단'이 우선되므로, 행정적인 오류 없이 정확한 성도 관리가 이루어집니다.", icon: "⚖️" },
            { title: "👶 세대별 큐티 커스텀 (관리자)", desc: "청소년 및 0세 이하 영유아용 큐티의 질문과 해설을 관리자가 직접 수정할 수 있습니다. 각 세대의 눈높이에 맞는 맞춤형 질문으로 다음 세대 사역을 더욱 풍성하게 만들어보세요.", icon: "👶" },
            { title: "🌻 감사일기 & CCM 플레이어", desc: "하루 세 가지 감사를 기록하고, 배경음악으로 흐르는 찬양(CCM)과 함께 묵상에 잠겨보세요. 음악은 앱을 이용하는 동안 끊김 없이 유지됩니다.", icon: "🌻" },
            { title: "🌟 소미(SOMY) 브랜드 스토리", desc: "소미는 단순한 앱을 넘어 '내 손안의 영적 동반자'를 꿈꿉니다. 최첨단 AI 기술과 개혁주의 신학이 만나 성도의 일상을 은혜로 채웁니다. AI 기반 영적 가이드, 개혁주의 가치 계승, 그리고 행정의 압도적 간소화라는 3대 가치를 직접 확인해 보세요.", icon: "🌟" },
            { title: "📱 홈 화면에 설치하기 (강력추천)", desc: "브라우저 하단의 [공유] 메뉴 → [홈 화면에 추가] 또는 크롬의 [앱 설치]를 눌러보세요. 바탕화면에 아이콘이 생겨 카카오톡처럼 빠르고 간편하게 접속할 수 있습니다.", icon: "📱" },
        ];

        return (
            <div style={{ minHeight: "100vh", background: "#FDFCFB", maxWidth: "600px", margin: "0 auto", padding: "30px 24px", ...baseFont }}>
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
                    <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>소미 200% 활용 꿀팁! ✨</div>
                    <div style={{ fontSize: '13px', lineHeight: 1.6, opacity: 0.9 }}>
                        소미와 함께라면 큐티가 더 즐거워집니다.<br />
                        새로 업데이트된 기능들을 확인하고 활기찬 신앙 생활을 시작하세요.
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

                <div style={{ marginTop: '40px', textAlign: 'center', padding: '30px 20px', background: '#F9F7F2', borderRadius: '24px', border: '1px solid #F0ECE4' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#B8924A', marginBottom: '10px' }}>더 자세한 브랜드 이야기가 궁금하신가요? 📖</div>
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px', lineHeight: 1.5 }}>소미가 추구하는 비전과 성도/목회자를 위한<br />특별한 혜택들을 한눈에 확인하실 수 있습니다.</p>
                    <button onClick={() => setView('brandGuide')} style={{ padding: '14px 24px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8924A 100%)', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 5px 15px rgba(184,146,74,0.3)' }}>브랜드 홍보 가이드 전체보기 ✨</button>
                </div>

                <div style={{ marginTop: '40px', textAlign: 'center', padding: '30px 0', borderTop: '1px solid #EEE' }}>
                    <button onClick={() => setView('home')} style={{ padding: '14px 40px', background: '#333', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}>홈으로 돌아가기</button>
                    <div style={{ marginTop: '40px', paddingBottom: '20px' }}>
                        <p style={{ fontSize: '11px', color: '#BBB', margin: 0, fontWeight: 500 }}>© 2024 SOMY. All rights reserved.</p>
                        <p style={{ fontSize: '12px', color: '#999', marginTop: '5px', fontWeight: 600 }}>by pastor Baek dong hie</p>
                    </div>
                </div>
            </div>
        );
    };

    // 관리자 활용 가이드 (PDF화 가능)
    const renderAdminGuide = () => {
        return (
            <div id="printable-area" style={{ minHeight: "100vh", background: "white", maxWidth: "800px", margin: "0 auto", padding: "40px 30px", ...baseFont, color: '#333' }}>
                <style>{`
                    @media print {
                        #no-print { display: none !important; }
                        #printable-area { padding: 0 !important; width: 100% !important; max-width: 100% !important; }
                        .guide-box { border: 1px solid #EEE !important; break-inside: avoid; }
                    }
                `}</style>

                <div id="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <button onClick={() => setView('admin')} style={{ background: "white", border: "1px solid #EEE", borderRadius: '12px', padding: '8px 16px', fontSize: "14px", cursor: "pointer", fontWeight: 700 }}>← 뒤로</button>
                    <button onClick={() => window.print()} style={{ background: "#D4AF37", color: 'white', border: "none", borderRadius: '12px', padding: '10px 20px', fontSize: "14px", cursor: "pointer", fontWeight: 700, boxShadow: '0 4px 12px rgba(212,175,55,0.3)' }}>PDF로 저장 / 인쇄하기 📄</button>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                    <div style={{ fontSize: '12px', color: '#B8924A', fontWeight: 800, letterSpacing: '2px', marginBottom: '10px' }}>ADMINISTRATION STRATEGY</div>
                    <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#222', margin: 0 }}>소미(SOMY) 사역 활용 가이드</h1>
                    <div style={{ width: '40px', height: '4px', background: '#D4AF37', margin: '20px auto' }}></div>
                    <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.6 }}>이 문서는 관리자가 성도들의 풍성한 공동체 생활을 위해<br />시스템을 초기화하고 효율적으로 운영하는 방안을 담고 있습니다.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    {/* 섹션 1: 기초 설정 */}
                    <div className="guide-box" style={{ background: '#F9F9F9', padding: '25px', borderRadius: '20px', border: '1px solid #F0F0F0' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#B8924A', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '22px' }}>🏗️</span> 1단계: 사역의 기초 세우기 (초기 설정)
                        </h3>
                        <ul style={{ fontSize: '14px', color: '#555', lineHeight: 1.8, paddingLeft: '20px' }}>
                            <li><strong>교회 정체성 등록:</strong> [환경 설정]에서 교회 로고와 홈페이지 주소를 정확히 입력하세요. 이것이 앱 전체의 배너와 알람 로고가 됩니다.</li>
                            <li><strong>요금제 확인:</strong> 무료 버전은 주 1회 AI 큐티 기능이 제한될 수 있습니다. 필요에 따라 상위 플랜을 검토하세요.</li>
                            <li><strong>성도 초대:</strong> 초대 URL을 교회 단톡방에 공유하세요. 성도가 가입하면 '승인 대기' 상태가 되며, 관리자가 확인 후 승인해야 합니다.</li>
                        </ul>
                    </div>

                    {/* 섹션 2: 데일리 사역 */}
                    <div className="guide-box" style={{ background: '#F9F9F9', padding: '25px', borderRadius: '20px', border: '1px solid #F0F0F0' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#3498DB', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '22px' }}>📖</span> 2단계: 매일의 양식 공급 (운영 루틴)
                        </h3>
                        <ul style={{ fontSize: '14px', color: '#555', lineHeight: 1.8, paddingLeft: '20px' }}>
                            <li><strong>큐티 등록 최적화:</strong> 전날 저녁 또는 당일 아침 8시 이전에 큐티를 등록하세요. 'AI 자동 생성' 기능을 활용하면 핵심 메시지를 요약하는 시간을 크게 단축할 수 있습니다.</li>
                            <li><strong>설교 요약:</strong> 매주 수요일, 주일 설교 원고를 [설교 및 나눔질문 생성] 메뉴에 붙여넣으세요. 생성된 질문은 성도들의 소그룹(구역) 나눔 자료로 훌륭하게 활용됩니다.</li>
                            <li><strong>공지사항 활용:</strong> 교회 광고는 단순한 전달보다 '따뜻한 사랑의 메시지'와 함께 공지하세요. 등록 즉시 전체 성도에게 푸시가 전송됩니다.</li>
                        </ul>
                    </div>

                    {/* 섹션 3: 커뮤니티 활성화 */}
                    <div className="guide-box" style={{ background: '#F9F9F9', padding: '25px', borderRadius: '20px', border: '1px solid #F0F0F0' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#E67E22', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '22px' }}>🔥</span> 3단계: 공동체 활성화 (사역 꿀팁)
                        </h3>
                        <ul style={{ fontSize: '14px', color: '#555', lineHeight: 1.8, paddingLeft: '20px' }}>
                            <li><strong>마중물 전략:</strong> 담임목사님이나 교역자들이 먼저 은혜나눔 게시판에 한 줄 평을 남겨주세요. 지도자의 참여는 성도들이 글을 쓰기 시작하는 최고의 마중물이 됩니다.</li>
                            <li><strong>상담/기도 요청 대응:</strong> 성도들의 요청이 도착하면 최대한 빠르게(24시간 내) 따뜻한 답변을 남겨주세요. 앱의 신뢰도와 사역적 친밀감이 비약적으로 상승합니다.</li>
                            <li><strong>큐티왕 시상:</strong> [이달의 큐티왕] 통계를 바탕으로 매달 성적표를 매기는 대신, 꾸준히 참여하는 성도님들을 주일 예배 때 가볍게 독려하고 시상해 보세요.</li>
                        </ul>
                    </div>

                    {/* 섹션 4: 관리자 핵심 기능 및 꿀팁 */}
                    <div className="guide-box" style={{ background: '#FFF8F8', padding: '25px', borderRadius: '20px', border: '1px solid #FFEBEB' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#D32F2F', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '22px' }}>🛠️</span> 관리자 핵심 기능 & 스마트 꿀팁
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #FEE2E2' }}>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#333', marginBottom: '8px' }}>👤 성도 관리 및 소통</div>
                                <ul style={{ fontSize: '13px', color: '#555', lineHeight: 1.7, margin: 0, paddingLeft: '20px' }}>
                                    <li><strong>개별/단체 문자 발송:</strong> [성도 주소록]에서 특정 성도나 그룹을 선택해 바로 문자를 보낼 수 있습니다. (심방 및 공지용)</li>
                                    <li><strong>개인정보 공개 설정:</strong> 성도 개개인의 전화번호, 주소 등 민감한 정보의 공개/비공개 여부를 관리자가 직접 제어하여 유연하게 운영할 수 있습니다.</li>
                                    <li><strong>간편한 성도 등록:</strong> 한두 명은 개별 등록하고, 다수의 성도는 [성도 대량 등록] 메뉴에서 엑셀 양식을 다운받아 업로드하면 한 번에 반영됩니다.</li>
                                </ul>
                            </div>
                            <div style={{ background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #FEE2E2' }}>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#333', marginBottom: '8px' }}>💡 운영 노하우 꿀팁</div>
                                <ul style={{ fontSize: '13px', color: '#555', lineHeight: 1.7, margin: 0, paddingLeft: '20px' }}>
                                    <li><strong>푸시 알림 시간대:</strong> 성도들이 출근하거나 활동을 시작하는 오전 7시~8시 사이에 푸시 알림을 보내는 것이 참여율이 가장 높습니다.</li>
                                    <li><strong>데이터 백업:</strong> 주기적으로 성도 명부나 큐티 통계를 엑셀로 내려받아 교회 내부 PC에도 보관하는 습관을 들이세요.</li>
                                    <li><strong>AI 상담 모니터링:</strong> 소미가 성도들과 나누는 대화의 흐름을 주기적으로 체크해 보세요(사생활 제외). 성도들이 현재 어떤 고민을 주로 하는지 사역 방향을 잡는 데 도움을 줍니다.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '50px', paddingTop: '30px', borderTop: '2px dashed #EEE', textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', color: '#AAA', fontStyle: 'italic' }}>"소미는 기술이 아니라, 성도들의 영성을 돕는 사랑의 통로입니다."</p>
                    <div style={{ fontSize: '12px', color: '#CCC', marginTop: '10px' }}>문의: pastorbaek@kakao.com | SOMY 사역지원팀</div>
                </div>
            </div>
        );
    };

    // 소미 브랜드 홍보 가이드 (PDF화 가능)
    const renderBrandGuide = () => {
        return (
            <div id="brand-printable-area" style={{ minHeight: "100vh", background: "#FDFCFB", maxWidth: "900px", margin: "0 auto", padding: "60px 40px", ...baseFont, color: '#333' }}>
                <style>{`
                    @media print {
                        #no-print-brand { display: none !important; }
                        #brand-printable-area { padding: 0 !important; width: 100% !important; max-width: 100% !important; background: white !important; }
                        .brand-section { break-inside: avoid; margin-bottom: 40px !important; }
                        .glass-card { border: 1px solid #EEE !important; background: white !important; box-shadow: none !important; }
                    }
                    .glass-card {
                        background: rgba(255, 255, 255, 0.7);
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(212, 175, 55, 0.2);
                        border-radius: 28px;
                        padding: 30px;
                        box-shadow: 0 15px 35px rgba(0,0,0,0.03);
                        transition: transform 0.3s ease;
                    }
                    .glass-card:hover { transform: translateY(-5px); }
                    .accent-text { color: #D4AF37; font-weight: 900; }
                    
                    @media (max-width: 768px) {
                        #brand-printable-area { padding: 40px 20px !important; }
                        .brand-hero-title { fontSize: 32px !important; }
                        .core-values-grid { grid-template-columns: 1fr !important; }
                        .benefits-grid { grid-template-columns: 1fr !important; gap: 30px !important; }
                        .preview-flex { flex-direction: column !important; align-items: center !important; }
                    }
                `}</style>

                {/* 상단 컨트롤 */}
                <div id="no-print-brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => setView(isAdmin ? 'admin' : 'guide')} style={{ background: "white", border: "1px solid #EEE", borderRadius: '14px', padding: '10px 20px', fontSize: "14px", cursor: "pointer", fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>←</span> {isAdmin ? '관리자 센터로' : '가이드로 돌아가기'}
                    </button>
                    <button onClick={() => window.print()} style={{ background: "linear-gradient(135deg, #D4AF37 0%, #B8924A 100%)", color: 'white', border: "none", borderRadius: '14px', padding: '12px 24px', fontSize: "15px", cursor: "pointer", fontWeight: 700, boxShadow: '0 8px 20px rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📄</span> 홍보 PDF 저장/인쇄
                    </button>
                </div>

                {/* Hero Section */}
                <div className="brand-section" style={{ textAlign: 'center', marginBottom: '80px' }}>
                    <div style={{ display: 'inline-block', width: '100px', height: '100px', background: 'white', borderRadius: '50%', padding: '6px', marginBottom: '24px', boxShadow: '0 15px 40px rgba(212,175,55,0.2)', border: '4px solid #FDFCFB' }}>
                        <img src={SOMY_IMG} alt="소미" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: '50%' }} />
                    </div>
                    <h4 style={{ fontSize: '14px', color: '#B8924A', fontWeight: 900, letterSpacing: '4px', marginBottom: '16px', textTransform: 'uppercase' }}>Next-Gen Spiritual Companion</h4>
                    <h1 className="brand-hero-title" style={{ fontSize: '42px', fontWeight: 900, color: '#222', margin: '0 0 20px 0', lineHeight: 1.2, wordBreak: 'keep-all' }}>
                        내 손안의 영적 동반자, <span className="accent-text">소미(SOMY)</span>
                    </h1>
                    <p style={{ fontSize: '18px', color: '#666', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto', wordBreak: 'keep-all' }}>
                        단순한 큐티 앱을 넘어, 최첨단 <span className="accent-text">AI 기술</span>과 <span className="accent-text">개혁주의 신학</span>이 만나 성도의 일상을 은혜로 채우는 스마트 사역 솔루션입니다.
                    </p>
                </div>

                {/* Core Values */}
                <div className="brand-section core-values-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '80px' }}>
                    <div className="glass-card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '20px' }}>✨</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '12px' }}>AI 기반 영적 가이드</h3>
                        <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.6, margin: 0 }}>성경의 깊은 맥락을 AI가 분석하여 개개인의 상황에 맞는 통찰을 제공합니다.</p>
                    </div>
                    <div className="glass-card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '20px' }}>📖</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '12px' }}>개혁주의 가치 계승</h3>
                        <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.6, margin: 0 }}>검증된 신학적 토대 위에서 흔들리지 않는 말씀의 진수를 성도들에게 전달합니다.</p>
                    </div>
                    <div className="glass-card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '20px' }}>⚙️</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '12px' }}>행정의 압도적 간소화</h3>
                        <p style={{ fontSize: '14px', color: '#777', lineHeight: 1.6, margin: 0 }}>번거로운 교적 관리와 공지 전달을 자동화하여 사역의 본질에 집중하게 합니다.</p>
                    </div>
                </div>

                {/* Detail Benefits */}
                <div className="brand-section" style={{ marginBottom: '80px' }}>
                    <div className="benefits-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                        <div>
                            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#333', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ background: '#333', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>👤</span>
                                성도를 위한 <span className="accent-text">축복</span>
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ fontSize: '20px' }}>✅</div>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px' }}>나만을 위한 AI 대화형 상담</div>
                                        <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.5, margin: 0 }}>말씀에 근거한 소미의 답변은 성도의 고민을 신앙적으로 해석하도록 돕습니다.</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ fontSize: '20px' }}>✅</div>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px' }}>매일의 영적 성과 추적</div>
                                        <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.5, margin: 0 }}>큐티왕 통계와 감사일기 기록을 통해 스스로의 영적 성장을 가시적으로 확인합니다.</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ fontSize: '20px' }}>✅</div>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px' }}>풍성한 공동체 나눔</div>
                                        <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.5, margin: 0 }}>묵상 글이 자동으로 게시판에 공유되어 성도 간의 깊은 영적 교류가 일어납니다.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#333', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ background: '#D4AF37', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⛪</span>
                                목회자를 위한 <span className="accent-text">은혜</span>
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ fontSize: '20px' }}>✅</div>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px' }}>AI 설교 보조 및 큐티 생성</div>
                                        <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.5, margin: 0 }}>설교 본문만 넣으면 성도들의 눈높이에 맞는 큐티와 나눔 질문이 자동 생성됩니다.</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ fontSize: '20px' }}>✅</div>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px' }}>실시간 영적 상태 모니터링</div>
                                        <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.5, margin: 0 }}>성도들의 은혜 나눔 내용을 통해 교회의 전반적인 영적 분위기를 파악하고 심방에 활용합니다.</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ fontSize: '20px' }}>✅</div>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px' }}>스마트 비대면 행정</div>
                                        <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.5, margin: 0 }}>주소록 관리, 공지 푸시 알림, 상담 예약을 하나의 앱으로 완벽하게 제어합니다.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Interface Preview (CSS Simulated) */}
                <div className="brand-section" style={{ marginBottom: '100px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 900, textAlign: 'center', marginBottom: '40px' }}>미리 만나는 소미 에코시스템</h2>
                    <div className="preview-flex" style={{ display: 'flex', gap: '30px', justifyContent: 'center' }}>
                        {/* 홈 화면 모형 */}
                        <div style={{ width: '240px', height: '440px', background: 'linear-gradient(180deg, #FFF8F0 0%, #FEF0D8 100%)', border: '8px solid #333', borderRadius: '36px', overflow: 'hidden', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
                            {/* 상단바 */}
                            <div style={{ padding: '30px 15px 5px', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', border: '1px solid #D4AF37', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    <img src={SOMY_IMG} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                </div>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', border: '1px solid #EEE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#666', fontWeight: 800 }}>Aa</div>
                            </div>

                            <div style={{ padding: '0 12px' }}>
                                {/* 공지사항 모형 */}
                                <div style={{ background: 'linear-gradient(135deg, #2C3E50 0%, #3498DB 100%)', height: '32px', borderRadius: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center', padding: '0 10px', boxShadow: '0 4px 10px rgba(52, 152, 219, 0.2)' }}>
                                    <span style={{ fontSize: '12px', marginRight: '6px' }}>📢</span>
                                    <div style={{ width: '60%', height: '4px', background: 'white', opacity: 0.5, borderRadius: '2px' }} />
                                </div>

                                {/* 메인 2x2 그리드 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #F0F8F8', padding: '8px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                                        <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: '1px solid #EEE', overflow: 'hidden', flexShrink: 0 }}>
                                            <img src={SOMY_IMG} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                        </div>
                                        <div style={{ fontSize: '8px', fontWeight: 900, color: '#1A5D55', transform: 'scale(0.85)', transformOrigin: 'left' }}>AI소미 대화</div>
                                    </div>
                                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #FFFBEA', padding: '8px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                                        <div style={{ fontSize: '12px', flexShrink: 0 }}>📖</div>
                                        <div style={{ fontSize: '8px', fontWeight: 900, color: '#8E754C', transform: 'scale(0.85)', transformOrigin: 'left' }}>오늘의 큐티</div>
                                    </div>
                                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #FFF0F5', padding: '8px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                                        <div style={{ fontSize: '12px', flexShrink: 0 }}>💌</div>
                                        <div style={{ fontSize: '8px', fontWeight: 900, color: '#9E2A5B', transform: 'scale(0.85)', transformOrigin: 'left' }}>은혜나눔</div>
                                    </div>
                                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #FFF6E5', padding: '8px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                                        <div style={{ fontSize: '12px', flexShrink: 0 }}>🌻</div>
                                        <div style={{ fontSize: '8px', fontWeight: 900, color: '#E07A5F', transform: 'scale(0.85)', transformOrigin: 'left' }}>감사일기</div>
                                    </div>
                                </div>

                                {/* 하단 카드 2열 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                                    <div style={{ height: '70px', background: 'white', borderRadius: '16px', border: '1px solid #F0ECE4', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                        <div style={{ width: '20px', height: '28px', background: '#F5F5F3', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                                            <div style={{ width: '100%', height: '100%', background: '#EEE', opacity: 0.5 }} />
                                        </div>
                                        <div style={{ fontSize: '7px', fontWeight: 800, color: '#D4AF37', textAlign: 'center' }}>이달의 도서</div>
                                    </div>
                                    <div style={{ height: '70px', background: 'white', borderRadius: '16px', border: '1px solid #F0ECE4', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                        <div style={{ fontSize: '16px' }}>⛪</div>
                                        <div style={{ fontSize: '7px', fontWeight: 800, color: '#333', textAlign: 'center' }}>목사님 칼럼</div>
                                    </div>
                                </div>

                                {/* 배너 모형 */}
                                <div style={{ marginTop: '10px', height: '40px', background: 'rgba(255,255,255,0.6)', borderRadius: '14px', border: '1px dotted #D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#D4AF37', fontWeight: 700 }}>
                                    AD BANNER PREVIEW
                                </div>
                            </div>
                            <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', width: '35px', height: '3px', background: '#333', borderRadius: '1.5px' }} />
                        </div>
                        {/* 큐티 화면 모형 */}
                        <div style={{ width: '240px', height: '440px', background: 'white', border: '8px solid #333', borderRadius: '36px', overflow: 'hidden', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
                            <div style={{ padding: '20px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 900, marginBottom: '10px' }}>📖 오늘의 말씀</div>
                                <div style={{ height: '2px', background: '#D4AF37', width: '30px', marginBottom: '15px' }} />
                                <div style={{ fontSize: '10px', lineHeight: 1.6, color: '#666' }}>
                                    하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니...<br />
                                    [AI 해석: 이 구절은 개혁주의 신학의 핵심인...]
                                </div>
                                <div style={{ marginTop: '30px', background: '#F9F9F9', padding: '10px', borderRadius: '8px', fontSize: '10px' }}>
                                    🙋 성도님, 오늘 말씀에서 어떤 은혜를 느끼셨나요?
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Closing */}
                <div style={{ textAlign: 'center', padding: '60px 0', borderTop: '1px solid #EEE' }}>
                    <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '15px' }}>사역의 새로운 기준, 지금 소미와 시작하세요.</h2>
                    <p style={{ fontSize: '15px', color: '#888', marginBottom: '40px' }}>SOMY는 교회의 거룩한 질서를 기술로 완성합니다.</p>
                    <div style={{ padding: '24px', background: '#F8F9FA', borderRadius: '20px', display: 'inline-block', textAlign: 'left', border: '1px solid #EEE' }}>
                        <p style={{ fontSize: '13px', color: '#666', margin: 0, lineHeight: 1.8 }}>
                            <strong>💡 참고사항</strong><br />
                            • 본 앱은 교회 관리자의 승인이 필요한 폐쇄형 서비스입니다.<br />
                            • <span style={{ color: '#D32F2F', fontWeight: 700 }}>추후 AI 실시간 상담 및 고도화 기능들은 유료 서비스로 전환될 수 있습니다.</span><br />
                            • 개혁주의 신학 자문: SOMY 신학 연구팀
                        </p>
                    </div>
                </div>

                <div style={{ marginTop: '60px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#BBB', fontWeight: 500 }}>© 2024 SOMY INTERACTIVE. FOR THE GLORY OF GOD.</div>
                </div>
            </div>
        );
    };

    // [성도 관련 컴포넌트는 파일 하단 독립 컴포넌트 구역으로 이동되었습니다]

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
        if (!selectedMemberForEdit || !memberEditForm) return null;
        const m = selectedMemberForEdit;
        const isDirty = initialMemberEditForm ? JSON.stringify(initialMemberEditForm) !== JSON.stringify(memberEditForm) : false;

        return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(5px)' }}>
                <div style={{ background: 'white', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', animation: 'modal-up 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>📝 성도 정보 상세 수정</h3>
                        <button onClick={() => { setSelectedMemberForEdit(null); setMemberEditForm(null); }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
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
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 2 }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>성함</label>
                                <input value={memberEditForm.full_name} onChange={e => setMemberEditForm({ ...memberEditForm, full_name: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>성별</label>
                                <select value={memberEditForm.gender || ''} onChange={e => setMemberEditForm({ ...memberEditForm, gender: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none', background: 'white' }}>
                                    <option value="">선택</option>
                                    <option value="남">남</option>
                                    <option value="여">여</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>직분</label>
                                <input value={memberEditForm.church_rank} onChange={e => setMemberEditForm({ ...memberEditForm, church_rank: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                            </div>
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>전화번호</label>
                                <label style={{ fontSize: '10px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <input type="checkbox" checked={memberEditForm.is_phone_public} onChange={e => setMemberEditForm({ ...memberEditForm, is_phone_public: e.target.checked })} /> 공개
                                </label>
                            </div>
                            <input value={memberEditForm.phone} onChange={e => setMemberEditForm({ ...memberEditForm, phone: e.target.value })} placeholder="010-0000-0000" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>생년월일</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <label style={{ fontSize: '10px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <input type="checkbox" checked={memberEditForm.is_birthdate_lunar} onChange={e => setMemberEditForm({ ...memberEditForm, is_birthdate_lunar: e.target.checked })} /> 음력
                                    </label>
                                    <label style={{ fontSize: '10px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <input type="checkbox" checked={memberEditForm.is_birthdate_public} onChange={e => setMemberEditForm({ ...memberEditForm, is_birthdate_public: e.target.checked })} /> 공개
                                    </label>
                                </div>
                            </div>
                            <input type="date" value={memberEditForm.birthdate} onChange={e => setMemberEditForm({ ...memberEditForm, birthdate: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>주소</label>
                                <label style={{ fontSize: '10px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <input type="checkbox" checked={memberEditForm.is_address_public} onChange={e => setMemberEditForm({ ...memberEditForm, is_address_public: e.target.checked })} /> 공개
                                </label>
                            </div>
                            <input value={memberEditForm.address} onChange={e => setMemberEditForm({ ...memberEditForm, address: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>교회 등록일</label>
                            <input type="date" value={memberEditForm.created_at ? new Date(memberEditForm.created_at).toISOString().split('T')[0] : ''} onChange={e => setMemberEditForm({ ...memberEditForm, created_at: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                        <button onClick={() => { setSelectedMemberForEdit(null); setMemberEditForm(null); }} style={{ flex: 1, padding: '14px', background: '#F5F5F5', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', color: '#666' }}>취소</button>
                        <button
                            onClick={async () => {
                                try {
                                    const updateData = {
                                        church_id: churchId,
                                        ...memberEditForm
                                    };
                                    const res = await fetch('/api/admin', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action: 'update_member', user_id: m.id, update_data: updateData, requester_id: user?.id, requester_email: user?.email })
                                    });
                                    if (res.ok) {
                                        setMemberList((prev: any[]) => prev.map((item: any) => item.id === m.id ? { ...item, ...updateData } : item));
                                        setSelectedMemberForEdit(null);
                                        setMemberEditForm(null);
                                        alert('정보가 성공적으로 수정되었습니다! ✨');
                                    } else {
                                        const errData = await res.json();
                                        alert(`수정 중 오류가 발생했습니다: ${errData.error || '알 수 없는 오류'}`);
                                    }
                                } catch (err: any) {
                                    alert(`서버 통신 중 오류가 발생했습니다: ${err.message}`);
                                }
                            }}
                            disabled={!isDirty}
                            style={{ flex: 2, padding: '14px', background: isDirty ? '#333' : '#CCC', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: isDirty ? 'pointer' : 'default', transition: 'all 0.3s' }}>
                            {isDirty ? '수정 완료' : '변경사항 없음'}
                        </button>
                    </div>
                </div>
            </div >
        );
    };

    const renderAddMemberModal = () => {
        if (!showAddMemberModal) return null;
        return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(5px)' }}>
                <div style={{ background: 'white', borderRadius: '24px', padding: '30px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', animation: 'modal-up 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>👤 성도 개별 추가</h3>
                        <button onClick={() => setShowAddMemberModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 2 }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>성함 *</label>
                                <input id="add-name" placeholder="이름을 입력하세요" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>성별</label>
                                <select id="add-gender" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none', background: 'white' }}>
                                    <option value="">선택</option>
                                    <option value="남">남</option>
                                    <option value="여">여</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>직분</label>
                                <input id="add-rank" placeholder="예: 성도, 집사" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>전화번호</label>
                            <input id="add-phone" placeholder="010-0000-0000" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>생년월일</label>
                                <input id="add-birth" type="date" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                    <input type="checkbox" id="add-lunar" /> 음력
                                </label>
                                <label style={{ fontSize: '10px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                    <input type="checkbox" id="add-birth-pub" defaultChecked /> 공개
                                </label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>주소</label>
                                <input id="add-addr" placeholder="주소를 입력하세요" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                            </div>
                            <label style={{ fontSize: '10px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginTop: '16px' }}>
                                <input type="checkbox" id="add-addr-pub" /> 공개
                            </label>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <label style={{ fontSize: '10px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input type="checkbox" id="add-phone-pub" defaultChecked /> 전화번호 공개
                            </label>
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '4px' }}>등록일</label>
                            <input id="add-registered-at" type="date" defaultValue={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                        <button onClick={() => setShowAddMemberModal(false)} style={{ flex: 1, padding: '14px', background: '#F5F5F5', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', color: '#666' }}>취소</button>
                        <button
                            onClick={async () => {
                                const name = (document.getElementById('add-name') as any)?.value || '';
                                const phone = (document.getElementById('add-phone') as any)?.value || '';
                                if (!name) return alert('이름은 필수 항목입니다.');

                                const cleanPhone = phone.replace(/[^0-9]/g, '');
                                const email = cleanPhone ? `${cleanPhone}@church.local` : `${name}_${Math.random().toString(36).substring(2, 7)}@noemail.local`;

                                const memberData = {
                                    full_name: name,
                                    email: email,
                                    church_rank: (document.getElementById('add-rank') as any)?.value || '',
                                    gender: (document.getElementById('add-gender') as any)?.value || '',
                                    phone: phone,
                                    birthdate: (document.getElementById('add-birth') as any)?.value || null,
                                    address: (document.getElementById('add-addr') as any)?.value || '',
                                    is_birthdate_lunar: (document.getElementById('add-lunar') as HTMLInputElement)?.checked || false,
                                    is_birthdate_public: (document.getElementById('add-birth-pub') as HTMLInputElement)?.checked || false,
                                    is_phone_public: (document.getElementById('add-phone-pub') as HTMLInputElement)?.checked || false,
                                    is_address_public: (document.getElementById('add-addr-pub') as HTMLInputElement)?.checked || false,
                                    church_id: churchId,
                                    created_at: (document.getElementById('add-registered-at') as any)?.value || new Date().toISOString(),
                                    is_approved: true
                                };

                                const res = await fetch('/api/admin', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'add_member', member_data: memberData, requester_id: user?.id, requester_email: user?.email })
                                });
                                if (res.ok) {
                                    const r = await fetch(`/api/admin?action=list_members&church_id=${churchId}`);
                                    const data = await r.json();
                                    if (Array.isArray(data)) setMemberList(data);
                                    setShowAddMemberModal(false);
                                    alert('새 성도가 성공적으로 등록되었습니다!');
                                } else {
                                    const err = await res.json();
                                    alert('등록 실패: ' + (err.error || '알 수 없는 오류'));
                                }
                            }}
                            style={{ flex: 2, padding: '14px', background: '#333', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>
                            등록하기
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderMergeModal = () => {
        if (!showMergeModal || !mergeTarget) return null;

        // 통합 대상이 될 수 있는 목록 (나 자신을 제외한 모든 성도 + 검색어 필터)
        const filteredMembers = memberList.filter(m =>
            m.id !== mergeTarget.id &&
            (m.full_name?.includes(mergeSearchKeyword) || m.email?.includes(mergeSearchKeyword))
        );

        return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 4500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(5px)' }}>
                <div style={{ background: 'white', borderRadius: '24px', padding: '30px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>🔗 성도 데이터 통합</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#888' }}>관리자 등록 정보를 실제 가입 계정으로 옮깁니다.</p>
                        </div>
                        <button onClick={() => { setShowMergeModal(false); setMergeTarget(null); setMergeSearchKeyword(''); }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
                    </div>

                    <div style={{ background: '#F9F7F2', padding: '15px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #E4DCCF' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#B8924A', marginBottom: '10px' }}>원본 데이터 (등록된 정보)</div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{mergeTarget.full_name} ({formatPhone(mergeTarget.phone) || '번호없음'})</div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>이 성도님의 직분, 사진, 주소 정보를 선택한 계정으로 합칩니다.</div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '8px' }}>합칠 대상(실제 가입 유저) 검색:</div>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="이름 또는 이메일 검색..."
                                value={mergeSearchKeyword}
                                onChange={(e) => setMergeSearchKeyword(e.target.value)}
                                style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '13px', outline: 'none', background: '#F9F9F9' }}
                            />
                            {mergeSearchKeyword && (
                                <button
                                    onClick={() => setMergeSearchKeyword('')}
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#999', cursor: 'pointer', fontSize: '12px' }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px', padding: '2px' }}>
                        {filteredMembers.length === 0 ? <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>{mergeSearchKeyword ? '검색 결과가 없습니다.' : '통합 가능한 실제 가입자가 없습니다.'}</div> :
                            filteredMembers.map(m => (
                                <div
                                    key={m.id}
                                    onClick={() => setMergeDestinationId(m.id)}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '14px',
                                        border: `2px solid ${mergeDestinationId === m.id ? '#D4AF37' : '#F0F0F0'}`,
                                        background: mergeDestinationId === m.id ? '#FFFDE7' : 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#F5F5F3', overflow: 'hidden', border: '2px solid white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                        <img src={m.avatar_url || 'https://via.placeholder.com/36'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#333' }}>{m.full_name}</div>
                                        <div style={{ fontSize: '11px', color: '#999' }}>{m.email}</div>
                                    </div>
                                    {mergeDestinationId === m.id && <span style={{ color: '#D4AF37', fontSize: '16px' }}>✅</span>}
                                </div>
                            ))
                        }
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => { setShowMergeModal(false); setMergeTarget(null); setMergeSearchKeyword(''); }} style={{ flex: 1, padding: '14px', background: '#F5F5F5', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', color: '#666' }}>취소</button>
                        <button
                            disabled={!mergeDestinationId}
                            onClick={async () => {
                                if (!window.confirm(`${mergeTarget.full_name} 성도님의 정보를 선택한 계정으로 통합하시겠습니까?\n통합 후 삭제 데이터는 복구할 수 없습니다.`)) return;

                                try {
                                    const updateData = {
                                        full_name: mergeTarget.full_name,
                                        church_id: churchId,
                                        church_rank: mergeTarget.church_rank || '',
                                        phone: mergeTarget.phone || '',
                                        birthdate: mergeTarget.birthdate || '',
                                        gender: mergeTarget.gender || '',
                                        member_no: mergeTarget.member_no || '',
                                        address: mergeTarget.address || '',
                                        avatar_url: mergeTarget.avatar_url || '',
                                        is_approved: true
                                    };

                                    const res = await fetch('/api/admin', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            action: 'update_member',
                                            user_id: mergeDestinationId,
                                            update_data: updateData,
                                            requester_id: user?.id,
                                            requester_email: user?.email
                                        })
                                    });

                                    if (res.ok) {
                                        // 2. 통합된 원본 데이터(관리자 등록본) 삭제
                                        const delRes = await fetch('/api/admin', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                action: 'bulk_delete_members',
                                                ids: [mergeTarget.id],
                                                church_id: churchId,
                                                requester_id: user?.id,
                                                requester_email: user?.email
                                            })
                                        });

                                        if (delRes.ok) {
                                            alert('통합 완료되었습니다! ✨');
                                            const r = await fetch(`/api/admin?action=list_members&church_id=${churchId}`);
                                            const data = await r.json();
                                            if (Array.isArray(data)) setMemberList(data);
                                            setShowMergeModal(false);
                                            setMergeTarget(null);
                                            setMergeDestinationId('');
                                            setMergeSearchKeyword('');
                                        } else {
                                            const errData = await delRes.json();
                                            alert('데이터 통합(삭제)중 오류: ' + (errData.error || '알 수 없는 오류'));
                                        }
                                    } else {
                                        const errData = await res.json();
                                        alert('데이터 통합(수정)중 오류: ' + (errData.error || '알 수 없는 오류'));
                                    }
                                } catch (e) {
                                    alert('오류가 발생했습니다.');
                                }
                            }}
                            style={{ flex: 2, padding: '14px', background: !mergeDestinationId ? '#CCC' : '#333', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: !mergeDestinationId ? 'default' : 'pointer' }}
                        >
                            통합하기
                        </button>
                    </div>
                </div>
            </div>
        );
    };



    const handleExcelExport = () => {
        if (!memberList || memberList.length === 0) {
            alert('다운로드할 성도 데이터가 없습니다.');
            return;
        }

        const dataToExport = memberList.map(m => ({
            '교인사진': m.avatar_url || '',
            '성명': m.full_name || '',
            '생년월일': m.birthdate || '',
            '성별': m.gender || '',
            '직분': m.church_rank || '',
            '휴대폰': m.phone || '',
            '주소': m.address || '',
            '이메일': m.email || '',
            '등록일': m.created_at ? new Date(m.created_at).toISOString().split('T')[0] : '',
            '승인상태': m.is_approved ? '승인됨' : '미승인'
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "성도명단");

        // 날짜 포함 파일명 생성
        const fileName = `${CHURCH_NAME}_성도명단_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };


    // 소미 시그니처 레트로 플레이어 (저작권 걱정 없는 독자적 디자인)
    const renderMiniPlayer = () => {
        if (!todayCcm || view === 'ccm' || (!user && churchId !== 'demo')) return null;

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
                        left: '-10px',
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
        <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
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

            {showEventPopup && isApproved && churchSettings.event_poster_url && churchSettings.event_poster_visible && (
                <EventPosterPopup
                    imageUrl={`${churchSettings.event_poster_url}${churchSettings.event_poster_url.includes('?') ? '&' : '?'}t=${Date.now()}`}
                    onClose={() => setShowEventPopup(false)}
                />
            )}

            {/* 전역으로 분리한 설정 모달 */}
            {
                showSettings && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
                        <div style={{
                            background: 'white',
                            borderRadius: '24px',
                            width: '100%',
                            maxWidth: '420px',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
                            position: 'relative',
                            animation: 'modal-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}>
                            {/* 고정되는 헤더 영역 */}
                            <div style={{ padding: '28px 28px 15px 28px', flexShrink: 0, borderBottom: '1px solid #F0F0F0', zIndex: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>⚙️ {adminTab === 'settings' ? '교회 설정' : adminTab === 'members' ? '성도 관리' : adminTab === 'stats' ? '활동 통계' : adminTab === 'admins' ? '권한 관리' : adminTab === 'reset' ? '데이터 초기화' : '슈퍼 관리'}</h2>
                                    <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
                                </div>

                                {/* 설정 탭 메뉴 */}
                                <div style={{ display: 'flex', gap: '5px', background: '#F5F5F5', padding: '4px', borderRadius: '10px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                    <button onClick={() => setAdminTab('settings')} style={{ flex: '0 0 auto', padding: '8px 12px', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 600, background: adminTab === 'settings' ? 'white' : 'transparent', boxShadow: adminTab === 'settings' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', color: adminTab === 'settings' ? '#333' : '#777', whiteSpace: 'nowrap' }}>🎨 설정</button>
                                    <button onClick={async () => {
                                        setAdminTab('members');
                                        try {
                                            const r = await fetch(`/api/admin?action=list_members&church_id=${churchId}`);
                                            const data = await r.json();
                                            if (Array.isArray(data)) setMemberList(data);
                                            fetchAllAdmins(); // 명단에서도 관리자 여부 표시를 위해 로드
                                        } catch (e) { }
                                    }} style={{ flex: '0 0 auto', padding: '8px 12px', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 600, background: adminTab === 'members' ? 'white' : 'transparent', boxShadow: adminTab === 'members' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', color: adminTab === 'members' ? '#333' : '#777', whiteSpace: 'nowrap' }}>👥 성도</button>
                                    <button onClick={async () => {
                                        setAdminTab('stats');
                                        setIsAdminsLoading(true);
                                        try {
                                            const res = await fetch(`/api/stats?church_id=${churchId || 'jesus-in'}&t=${Date.now()}`);
                                            const data = await res.json();
                                            if (data) setStats(data);
                                        } catch (e) { }
                                        setIsAdminsLoading(false);
                                    }} style={{ flex: '0 0 auto', padding: '8px 12px', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 600, background: adminTab === 'stats' ? 'white' : 'transparent', boxShadow: adminTab === 'stats' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', color: adminTab === 'stats' ? '#333' : '#777', whiteSpace: 'nowrap' }}>📊 통계</button>
                                    {isMainAdmin && (
                                        <button onClick={() => { setAdminTab('admins'); fetchAllAdmins(); }} style={{ flex: '0 0 auto', padding: '8px 12px', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 600, background: adminTab === 'admins' ? 'white' : 'transparent', boxShadow: adminTab === 'admins' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', color: adminTab === 'admins' ? '#333' : '#777', whiteSpace: 'nowrap' }}>🔐 권한</button>
                                    )}
                                    {isMainAdmin && (
                                        <button onClick={() => setAdminTab('reset')} style={{ flex: '0 0 auto', padding: '8px 12px', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 600, background: adminTab === 'reset' ? 'white' : 'transparent', boxShadow: adminTab === 'reset' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', color: adminTab === 'reset' ? '#333' : '#777', whiteSpace: 'nowrap' }}>🗑️ 초기화</button>
                                    )}
                                    {isSuperAdmin && (
                                        <button onClick={() => { setAdminTab('master'); fetchAllAdmins(); fetchChurchStats(); }} style={{ flex: '0 0 auto', padding: '8px 12px', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 600, background: adminTab === 'master' ? 'white' : 'transparent', boxShadow: adminTab === 'master' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', color: adminTab === 'master' ? '#333' : '#777', whiteSpace: 'nowrap' }}>👑 마스터</button>
                                    )}
                                </div>
                            </div>

                            {/* 스크롤되는 콘텐츠 영역 */}
                            <div style={{ padding: '20px 28px 28px 28px', overflowY: 'auto', flex: 1 }}>
                                {adminInfo?.mismatch && !isSuperAdmin && (
                                    <div style={{ marginBottom: '20px', padding: '15px', background: '#FFF3E0', borderRadius: '15px', border: '1px solid #FFE082', fontSize: '12px', color: '#856404', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ wordBreak: 'keep-all', lineHeight: 1.5 }}>
                                            💡 현재 <b>{churchSettings.church_name}</b> 정보를 보고 계십니다.<br />
                                            관리자님의 공식 소속은 <b>{adminInfo.church_id}</b>입니다.
                                        </div>
                                        <button
                                            onClick={() => window.location.href = `/?church_id=${adminInfo.church_id}`}
                                            style={{ padding: '8px 12px', background: '#B8924A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                        >
                                            내 교회로 이동
                                        </button>
                                    </div>
                                )}

                                {adminTab === 'settings' ? (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A' }}>교회 이름</label>
                                                <input type="text" value={settingsForm.church_name} onChange={e => setSettingsForm({ ...settingsForm, church_name: e.target.value })} placeholder="앱 메인에 표시될 교회 이름 (예: 샘플교회)" style={{ padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A' }}>앱 부제목 (슬로건)</label>
                                                <input type="text" value={settingsForm.app_subtitle} onChange={e => setSettingsForm({ ...settingsForm, app_subtitle: e.target.value })} placeholder="예: 말씀과 기도로 거룩해지는 공동체" style={{ padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>유튜브 채널 ID (자동 업데이트용)</span>
                                                    <span style={{ fontSize: '10px', color: '#999', fontWeight: 400 }}>예: UC4UTt4...</span>
                                                </label>
                                                <input type="text" value={settingsForm.sermon_url} onChange={e => setSettingsForm({ ...settingsForm, sermon_url: e.target.value })} placeholder="유튜브 채널 ID 입력" style={{ padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', background: '#FFFDE7', borderRadius: '12px', border: '1px solid #FFF59D' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#856404' }}>이번 주 설교 영상 주소 (수동 지정)</label>
                                                <input type="text" value={settingsForm.manual_sermon_url || ''} onChange={e => setSettingsForm({ ...settingsForm, manual_sermon_url: e.target.value })} placeholder="특정 영상 주소 (입력 시 채널 ID보다 우선 표시)" style={{ padding: '12px', borderRadius: '10px', border: '1px solid #FFE082', fontSize: '14px', outline: 'none', background: 'white' }} />
                                                <div style={{ fontSize: '10px', color: '#B8924A' }}>※ '설교 요약/질문 관리'에서 생성 시 자동으로 업데이트됩니다.</div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A' }}>로고 이미지</label>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <input type="text" value={settingsForm.church_logo_url} onChange={e => setSettingsForm({ ...settingsForm, church_logo_url: e.target.value })} placeholder="로고 URL 또는 직접 업로드" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                                                    <input type="file" id="logo-upload" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        setIsLogoUploading(true);
                                                        const formData = new FormData();
                                                        formData.append('file', file);
                                                        formData.append('church_id', churchId);
                                                        try {
                                                            const res = await fetch('/api/admin/upload-logo', { method: 'POST', body: formData });
                                                            const data = await res.json();
                                                            if (data.url) {
                                                                setSettingsForm({ ...settingsForm, church_logo_url: data.url });
                                                                alert('로고가 업로드 되었습니다!');
                                                            } else {
                                                                alert('업로드 실패: ' + data.error);
                                                            }
                                                        } catch (err) {
                                                            alert('업로드 중 오류가 발생했습니다.');
                                                        } finally {
                                                            setIsLogoUploading(false);
                                                        }
                                                    }} />
                                                    <button
                                                        onClick={() => document.getElementById('logo-upload')?.click()}
                                                        disabled={isLogoUploading}
                                                        style={{ padding: '12px 14px', background: '#F5F5F3', color: '#555', border: '1px solid #DDD', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                    >
                                                        {isLogoUploading ? '...' : '📁 파일 선택'}
                                                    </button>
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>권장: 가로형 투명 PNG (배경이 있는 경우 로고만 있는 이미지)</div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#B8924A' }}>교회 홈페이지/배경 URL</label>
                                                <input type="text" value={settingsForm.church_url} onChange={e => setSettingsForm({ ...settingsForm, church_url: e.target.value })} placeholder="교회 링크 주소 (선택사항)" style={{ padding: '12px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '14px', outline: 'none' }} />
                                            </div>
                                            {/* ✅ 배경음악(CCM) 관리 섹션 추가 */}
                                            <div style={{ marginTop: '10px', padding: '15px', background: '#F5F5F3', borderRadius: '15px', border: '1px solid #EEE' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#333', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    🎵 배경음악(CCM) 플레이리스트 관리
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                                    <input type="text" value={newCcmTitle} onChange={e => setNewCcmTitle(e.target.value)} placeholder="찬양 제목 (예: 은혜로운 찬양)" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '13px' }} />
                                                    <input type="text" value={newCcmArtist} onChange={e => setNewCcmArtist(e.target.value)} placeholder="가수/아티스트 (예: 어노인팅)" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '13px' }} />
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <input type="text" value={newCcmUrl} onChange={e => setNewCcmUrl(e.target.value)} placeholder="유튜브 주소 (https://...)" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '13px' }} />
                                                        <button
                                                            onClick={() => {
                                                                if (!newCcmTitle || !newCcmUrl) { alert('제목과 유튜브 주소를 입력해 주세요!'); return; }
                                                                let vid = '';
                                                                if (newCcmUrl.includes('v=')) vid = newCcmUrl.split('v=')[1].split('&')[0];
                                                                else if (newCcmUrl.includes('youtu.be/')) vid = newCcmUrl.split('youtu.be/')[1].split('?')[0];
                                                                else vid = newCcmUrl;

                                                                const newList = [...(settingsForm.custom_ccm_list || []), { title: newCcmTitle, artist: newCcmArtist || '추천 찬양', youtubeId: vid }];
                                                                setSettingsForm({ ...settingsForm, custom_ccm_list: newList });
                                                                setNewCcmTitle(""); setNewCcmArtist(""); setNewCcmUrl("");
                                                            }}
                                                            style={{ padding: '0 15px', background: '#333', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                                                        >추가</button>
                                                    </div>
                                                </div>

                                                {settingsForm.custom_ccm_list && settingsForm.custom_ccm_list.length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                                                        {settingsForm.custom_ccm_list.map((ccm: any, idx: number) => (
                                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '8px 10px', borderRadius: '8px', border: '1px solid #EEE' }}>
                                                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ccm.title}</div>
                                                                    <div style={{ fontSize: '11px', color: '#999' }}>{ccm.artist} • {ccm.youtubeId}</div>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        const newList = settingsForm.custom_ccm_list.filter((_: any, i: number) => i !== idx);
                                                                        setSettingsForm({ ...settingsForm, custom_ccm_list: newList });
                                                                    }}
                                                                    style={{ background: 'none', border: 'none', color: '#FF5252', cursor: 'pointer', fontSize: '16px', padding: '0 5px' }}
                                                                >×</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={{ textAlign: 'center', fontSize: '11px', color: '#999', padding: '10px' }}>등록된 배경음악이 없습니다. (기본 목록이 재생됩니다)</div>
                                                )}
                                            </div>

                                            {/* ✅ 행사 포스터 팝업 관리 섹션 추가 */}
                                            <div style={{ marginTop: '10px', padding: '15px', background: '#F0F7FF', borderRadius: '15px', border: '1px solid #E0EFFF' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#333', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🖼️ 행사 포스터 팝업 관리</div>
                                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '6px' }}>
                                                        <input type="checkbox" checked={settingsForm.event_poster_visible} onChange={e => setSettingsForm({ ...settingsForm, event_poster_visible: e.target.checked })} />
                                                        <span style={{ fontSize: '11px', fontWeight: 700, color: settingsForm.event_poster_visible ? '#007AFF' : '#999' }}>{settingsForm.event_poster_visible ? '활성' : '비활성'}</span>
                                                    </label>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ flex: 1, fontSize: '12px', color: '#666' }}>📢 팝업용 포스터 이미지</div>
                                                        <input type="file" id="poster-img-upload" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            setIsPosterUploading(true);
                                                            try {
                                                                const formData = new FormData();
                                                                formData.append('file', file);
                                                                formData.append('church_id', churchId);
                                                                const res = await fetch('/api/admin/upload-logo', { method: 'POST', body: formData });
                                                                const data = await res.json();
                                                                if (data.url) {
                                                                    setSettingsForm((prev: any) => ({ ...prev, event_poster_url: data.url }));
                                                                }
                                                            } catch (e) { alert('이미지 업로드 실패'); }
                                                            finally { setIsPosterUploading(false); }
                                                        }} />
                                                        <button
                                                            onClick={() => document.getElementById('poster-img-upload')?.click()}
                                                            disabled={isPosterUploading}
                                                            style={{ padding: '6px 12px', background: '#FFF', border: '1px solid #DDD', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>
                                                            {isPosterUploading ? '업로드 중...' : '이미지 선택'}
                                                        </button>
                                                    </div>
                                                    {settingsForm.event_poster_url && (
                                                        <div style={{ padding: '8px', background: 'white', borderRadius: '8px', border: '1px solid #EEE', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <img src={settingsForm.event_poster_url} alt="포스터 미리보기" style={{ width: '60px', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontSize: '11px', color: '#007AFF', fontWeight: 700 }}>포스터가 등록되었습니다.</div>
                                                                <div style={{ fontSize: '10px', color: '#999' }}>상단 스위치를 켜면 성도들에게 팝업이 노출됩니다.</div>
                                                            </div>
                                                            <button onClick={() => setSettingsForm({ ...settingsForm, event_poster_url: '' })} style={{ background: 'none', border: 'none', color: '#FF5252', fontSize: '16px', cursor: 'pointer' }}>✕</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* ✅ 이달의 책 관리 섹션 추가 */}
                                            <div style={{ marginTop: '10px', padding: '15px', background: '#F5F5F3', borderRadius: '15px', border: '1px solid #EEE' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#333', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    📚 이달의 책 추천 관리
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <input type="text" value={settingsForm.today_book_title || ''} onChange={e => setSettingsForm({ ...settingsForm, today_book_title: e.target.value })} placeholder="추천 도서 제목" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '13px' }} />
                                                        <button
                                                            disabled={isBookAiLoading}
                                                            onClick={async () => {
                                                                if (!settingsForm.today_book_title) return alert('책 제목을 입력해 주세요!');
                                                                setIsBookAiLoading(true);
                                                                try {
                                                                    const res = await fetch('/api/book-generate', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ title: settingsForm.today_book_title })
                                                                    });
                                                                    const data = await res.json();
                                                                    if (data.description) {
                                                                        setSettingsForm({ ...settingsForm, today_book_description: data.description });
                                                                    }
                                                                } catch (e) { alert('AI 생성 중 오류가 발생했습니다.'); }
                                                                finally { setIsBookAiLoading(false); }
                                                            }}
                                                            style={{ padding: '0 12px', background: '#333', color: 'white', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                                                            {isBookAiLoading ? '생성 중...' : 'AI 자동생성'}
                                                        </button>
                                                    </div>
                                                    <textarea value={settingsForm.today_book_description || ''} onChange={e => setSettingsForm({ ...settingsForm, today_book_description: e.target.value })} placeholder="책 소개 또는 추천사 (직접 입력도 가능)" style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '13px', resize: 'none' }} />
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ flex: 1, fontSize: '12px', color: '#666' }}>📖 책 이미지 (표지)</div>
                                                        <input type="file" id="book-img-upload" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            console.log("[Book Upload] File selected:", file.name);
                                                            setIsBookUploading(true);
                                                            try {
                                                                const formData = new FormData();
                                                                formData.append('file', file);
                                                                // churchId가 '예수인교회'와 같은 한글일 경우를 대비해 인코딩하거나 기본값 처리
                                                                const safeChurchId = churchId ? encodeURIComponent(churchId) : 'jesus-in';
                                                                formData.append('church_id', churchId);

                                                                const res = await fetch('/api/admin/upload-logo', { method: 'POST', body: formData });
                                                                const data = await res.json();
                                                                console.log("[Book Upload] Response data:", data);

                                                                if (data.url) {
                                                                    setSettingsForm((prev: any) => ({ ...prev, today_book_image_url: data.url }));
                                                                    console.log("[Book Upload] Success! URL set:", data.url);
                                                                } else if (data.error) {
                                                                    console.error("[Book Upload] API Error:", data.error);
                                                                    alert('업로드 실패: ' + data.error);
                                                                }
                                                            } catch (e) {
                                                                console.error("[Book Upload] Fetch Error:", e);
                                                                alert('이미지 업로드 중 네트워크 오류가 발생했습니다.');
                                                            } finally {
                                                                setIsBookUploading(false);
                                                            }
                                                        }} />
                                                        <button
                                                            onClick={() => document.getElementById('book-img-upload')?.click()}
                                                            disabled={isBookUploading}
                                                            style={{ padding: '6px 12px', background: '#FFF', border: '1px solid #DDD', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>
                                                            {isBookUploading ? '업로드 중...' : '이미지 선택'}
                                                        </button>
                                                    </div>
                                                    {settingsForm.today_book_image_url && (
                                                        <div style={{ padding: '8px', background: 'white', borderRadius: '8px', border: '1px solid #EEE', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <img src={settingsForm.today_book_image_url} alt="표지 미리보기" style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                                                            <span style={{ fontSize: '11px', color: '#999' }}>이미지가 선택되었습니다.</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* ✅ 담임목사 칼럼 관리 섹션 추가 */}
                                                <div style={{ marginTop: '10px', padding: '15px', background: '#FDF8F0', borderRadius: '15px', border: '1px solid #FAF0D7' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#333', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>✍️ 담임목사 칼럼 관리</div>
                                                        <button
                                                            disabled={isGeneratingColumn}
                                                            onClick={(e) => { e.preventDefault(); handleGenerateColumn(); }}
                                                            style={{ padding: '4px 10px', background: '#333', color: 'white', border: 'none', borderRadius: '8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                                                            {isGeneratingColumn ? '생성 중...' : '✨ AI 생성'}
                                                        </button>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <input type="text" value={settingsForm.pastor_column_title || ''} onChange={e => setSettingsForm({ ...settingsForm, pastor_column_title: e.target.value })} placeholder="칼럼 제목" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '13px' }} />
                                                        <textarea value={settingsForm.pastor_column_content || ''} onChange={e => setSettingsForm({ ...settingsForm, pastor_column_content: e.target.value })} placeholder="칼럼 내용 (직접 입력 또는 AI 생성)" style={{ width: '100%', minHeight: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '13px', resize: 'none', lineHeight: 1.6 }} />
                                                    </div>
                                                </div>
                                            </div>
                                            {settingsForm.church_logo_url && (
                                                <div style={{ marginTop: '10px', padding: '15px', background: '#F5F5F5', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#888' }}>적용 미리보기</div>
                                                    <img alt="로고 미리보기" src={settingsForm.church_logo_url} onError={(e) => e.currentTarget.style.display = 'none'} onLoad={(e) => e.currentTarget.style.display = 'block'} style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '12px', background: 'white', padding: '5px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} />
                                                    <div style={{ fontSize: '14px', fontWeight: 800 }}>{settingsForm.church_name || '교회 이름'}</div>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                            <button onClick={() => setShowSettings(false)} style={{ flex: 1, padding: '12px', background: '#F5F5F5', color: '#666', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>취소</button>
                                            <button onClick={handleSaveSettings} disabled={settingsSaving} style={{ flex: 2, padding: '12px', background: '#D4AF37', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', opacity: settingsSaving ? 0.7 : 1 }}>
                                                {settingsSaving ? '저장 중...' : '💾 저장하기'}
                                            </button>
                                        </div>
                                    </>
                                ) : adminTab === 'members' ? (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            {/* ✅ 성도 개별 정보 수정 허용 설정 (여기서 멤버탭으로 이동) */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', background: '#F9F7F2', borderRadius: '15px', border: '1px solid #F0ECE4', marginBottom: '5px' }}>
                                                <div>
                                                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#333' }}>👤 성도 개별 정보수정 허용</div>
                                                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>성도들이 자신의 연락처/주소를 직접 수정할 수 있게 합니다.</div>
                                                </div>
                                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={settingsForm.allow_member_edit} onChange={async (e) => {
                                                        const newVal = e.target.checked;
                                                        const updatedForm = { ...settingsForm, allow_member_edit: newVal };
                                                        setSettingsForm(updatedForm);

                                                        // ✅ 체크 즉시 서버에 자동 저장 시도
                                                        try {
                                                            const res = await fetch('/api/settings', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify(updatedForm),
                                                            });
                                                            const data = await res.json();
                                                            if (data.success) {
                                                                setChurchSettings(updatedForm); // 앱 전역 상태 동기화
                                                                console.log("성도 정보 수정 권한 설정 자동 저장 완료");
                                                            }
                                                        } catch (err) {
                                                            console.error("자동 저장 실패:", err);
                                                        }
                                                    }} style={{ width: '20px', height: '20px', accentColor: '#D4AF37' }} />
                                                </label>
                                            </div>

                                            {/* 엑셀 업로드 영역 */}
                                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#333', marginBottom: '8px' }}>📤 명단 대용량 업로드 (엑셀)</div>
                                            <div style={{ background: '#F9F7F2', padding: '18px', borderRadius: '15px', border: '1px dashed #D4AF37', position: 'relative', marginBottom: '20px' }}>
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
                                                                        setIsMemberUploading(true);
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
                                                                                const r = await fetch(`/api/admin?action=list_members&church_id=${churchId}`);
                                                                                const data = await r.json();
                                                                                if (Array.isArray(data)) setMemberList(data);
                                                                            } else {
                                                                                const errorMsg = result.errors ? `\n\n[심층진단]:\n${result.errors.join('\n')}` : `\n(DB에 해당 데이터 칸이 없을 수 있습니다.)`;
                                                                                alert(`업데이트 실패: ${result.count || 0}명 성공${errorMsg}`);
                                                                            }
                                                                        } catch (e) {
                                                                            alert('파일 처리 중 오류가 발생했습니다.');
                                                                        } finally {
                                                                            setIsMemberUploading(false);
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
                                                    성명 | 휴대폰 | 생년월일 | 성별 | 교회직분 | 등록일 | 주소<br />
                                                    <span style={{ color: '#999' }}>(※ 엑셀 내부 사진 삽입은 지원되지 않습니다. 사진은 개별 수정으로 등록해 주세요.)</span>
                                                </div>
                                            </div>

                                            {/* 성도 관리 컨트롤러 */}
                                            <div style={{ background: 'white', padding: '20px', borderRadius: '24px', border: '1px solid #EEE', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                                                {/* 1. 타이틀 */}
                                                <div style={{ paddingBottom: '8px', borderBottom: '2px solid #F8F9FA' }}>
                                                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#222', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        👤 성도 명단 관리
                                                        <span style={{ fontSize: '13px', color: '#666', background: '#F5F5F5', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>{memberList.length}명</span>
                                                    </div>
                                                </div>

                                                {/* 2. 메인 관리 섹션 (파스텔톤 테마) */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {/* Row 1: 주요 액션 (Pastel Blue) */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                                        <button onClick={() => setShowAddMemberModal(true)} style={{ height: '44px', background: '#E3F2FD', color: '#1565C0', border: '1px solid #BBDEFB', borderRadius: '12px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                            <span>+</span> 개별 추가
                                                        </button>
                                                        <button onClick={handleExcelExport} style={{ height: '44px', background: '#E3F2FD', color: '#1565C0', border: '1px solid #BBDEFB', borderRadius: '12px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                            📥 엑셀 받기
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                const r = await fetch(`/api/admin?action=list_members&church_id=${churchId}`);
                                                                if (r.ok) setMemberList(await r.json());
                                                            }}
                                                            style={{ height: '44px', background: '#E3F2FD', color: '#1565C0', border: '1px solid #BBDEFB', borderRadius: '12px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                                        >
                                                            🔄 새로고침
                                                        </button>
                                                    </div>

                                                    {/* Row 2: 통계 현황 (Pastel Green) */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                                        {[
                                                            { label: '전체', value: memberList.length },
                                                            { label: '승인', value: memberList.filter(m => m.is_approved).length },
                                                            { label: '대기', value: memberList.filter(m => !m.is_approved).length }
                                                        ].map((item, idx) => (
                                                            <div key={idx} style={{ height: '44px', background: '#F1F8E9', padding: '0 10px', borderRadius: '12px', border: '1px solid #DCEDC8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                                <span style={{ fontSize: '13px', color: '#558B2F', fontWeight: 700 }}>{item.label}</span>
                                                                <span style={{ fontSize: '18px', fontWeight: 900, color: '#33691E' }}>{item.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Row 3: 하단 특수 액션 (Pastel Rose) - 메인 관리자 전용 */}
                                                    {isMainAdmin && (
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                            <button
                                                                onClick={async () => {
                                                                    if (window.confirm('정말 모든 성도 데이터를 삭제하시겠습니까?')) {
                                                                        const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear_all_members', church_id: churchId, requester_id: user?.id }) });
                                                                        if (res.ok) { setMemberList([]); alert('삭제 완료'); }
                                                                    }
                                                                }}
                                                                style={{ height: '46px', background: '#FCE4EC', color: '#C2185B', border: '1px solid #F8BBD0', borderRadius: '12px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
                                                            >🗑️ 데이터 전체 삭제</button>

                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (window.confirm('입력된 모든 성도를 승인 완료 상태로 만들까요?')) {
                                                                            try {
                                                                                const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bulk_approve_unverified', church_id: churchId, requester_id: user?.id }) });
                                                                                if (res.ok) {
                                                                                    const info = await res.json();
                                                                                    alert(`${info.count}명의 성도가 승인되었습니다! 🎉`);
                                                                                    const r = await fetch(`/api/admin?action=list_members&church_id=${churchId}`);
                                                                                    if (r.ok) setMemberList(await r.json());
                                                                                }
                                                                            } catch (e) { alert('승인 도중 오류가 발생했습니다.'); }
                                                                        }
                                                                    }}
                                                                    style={{ height: '54px', background: '#E8F5E9', color: '#2E7D32', border: '1px solid #C8E6C9', borderRadius: '12px', fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', lineHeight: '1.1' }}
                                                                >
                                                                    <span>✅ 일괄</span>
                                                                    <span>승인</span>
                                                                </button>

                                                                <button
                                                                    onClick={async () => {
                                                                        if (window.confirm("'성도', '사용자' 처럼 이름이 없는 유령 계정들만 골라 삭제할까요?")) {
                                                                            try {
                                                                                const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_junk_members', church_id: churchId, requester_id: user?.id }) });
                                                                                if (res.ok) {
                                                                                    const info = await res.json();
                                                                                    alert(`${info.count}개의 유령 계정이 정리되었습니다. 🧹`);
                                                                                    const r = await fetch(`/api/admin?action=list_members&church_id=${churchId}`);
                                                                                    if (r.ok) setMemberList(await r.json());
                                                                                }
                                                                            } catch (e) { alert('정리 도중 오류가 발생했습니다.'); }
                                                                        }
                                                                    }}
                                                                    style={{ height: '54px', background: '#FFF5F5', color: '#E03131', border: '1px solid #FFE3E3', borderRadius: '12px', fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', lineHeight: '1.1' }}
                                                                >
                                                                    <span>🧹 유령</span>
                                                                    <span>삭제</span>
                                                                </button>

                                                                <button
                                                                    onClick={async () => {
                                                                        if (window.confirm('모든 미인증 성도를 임시 대기 상태로 되돌릴까요?')) {
                                                                            try {
                                                                                const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset_unverified_status', church_id: churchId, requester_id: user?.id }) });
                                                                                if (res.ok) {
                                                                                    const info = await res.json();
                                                                                    alert(`${info.count}명이 대기 상태로 변경되었습니다.`);
                                                                                    const r = await fetch(`/api/admin?action=list_members&church_id=${churchId}`);
                                                                                    if (r.ok) setMemberList(await r.json());
                                                                                }
                                                                            } catch (e) { alert('초기화 도중 오류가 발생했습니다.'); }
                                                                        }
                                                                    }}
                                                                    style={{ height: '54px', background: '#F5F5F3', color: '#666', border: '1px solid #E0E0E0', borderRadius: '12px', fontSize: '11px', fontWeight: 900, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', lineHeight: '1.1' }}
                                                                >
                                                                    <span>⚠️ 상태</span>
                                                                    <span>초기화</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F5F5F3', padding: '6px 12px', borderRadius: '10px' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#666' }}>🔄 정렬 방식:</div>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        {[
                                                            { id: 'name', label: '성명순' },
                                                            { id: 'email', label: '이메일순' },
                                                            { id: 'rank', label: '직분순' }
                                                        ].map(opt => (
                                                            <button
                                                                key={opt.id}
                                                                onClick={() => setMemberSortBy(opt.id as any)}
                                                                style={{
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid',
                                                                    borderColor: memberSortBy === opt.id ? '#333' : '#DDD',
                                                                    background: memberSortBy === opt.id ? '#333' : 'white',
                                                                    color: memberSortBy === opt.id ? 'white' : '#666',
                                                                    fontSize: '10px',
                                                                    fontWeight: 700,
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                                    {/* 성도 검색 바 */}
                                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '8px 12px', borderRadius: '10px', border: '1px solid #EEE' }}>
                                                        <span style={{ fontSize: '16px' }}>🔍</span>
                                                        <input
                                                            type="text"
                                                            placeholder="이름, 번호, 직분 검색"
                                                            value={adminMemberSearchTerm}
                                                            onChange={(e) => setAdminMemberSearchTerm(e.target.value)}
                                                            style={{ border: 'none', outline: 'none', fontSize: '13px', flex: 1, width: '100%' }}
                                                        />
                                                        {adminMemberSearchTerm && (
                                                            <button onClick={() => setAdminMemberSearchTerm('')} style={{ background: 'none', border: 'none', color: '#AAA', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                                                        )}
                                                    </div>

                                                    {/* 중복된 성도만 보기 필터 */}
                                                    <button
                                                        onClick={() => setShowOnlyDuplicates(!showOnlyDuplicates)}
                                                        style={{
                                                            padding: '8px 12px',
                                                            borderRadius: '10px',
                                                            border: '1px solid',
                                                            borderColor: showOnlyDuplicates ? '#D4AF37' : '#EEE',
                                                            background: showOnlyDuplicates ? '#FFFDE7' : 'white',
                                                            color: showOnlyDuplicates ? '#856404' : '#666',
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            whiteSpace: 'nowrap',
                                                            flexShrink: 0
                                                        }}
                                                    >
                                                        {showOnlyDuplicates ? '👀 전체' : '🔗 중복 찾기'}
                                                    </button>
                                                </div>

                                                {/* 오늘의 생일 알림 */}
                                                {(() => {
                                                    const kstBase = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
                                                    const todaySolarMMDD = kstBase.toISOString().slice(5, 10);
                                                    const todayLunarMMDD = getLunarTodayMMDD();
                                                    const birthdayMembers = memberList.filter(m => {
                                                        if (!m?.birthdate) return false;
                                                        const bd = String(m.birthdate).slice(5, 10);
                                                        return m.is_birthdate_lunar ? (todayLunarMMDD && bd === todayLunarMMDD) : bd === todaySolarMMDD;
                                                    });
                                                    if (birthdayMembers.length > 0) {
                                                        return (
                                                            <div style={{ background: 'linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)', padding: '16px', borderRadius: '15px', border: '1px solid #FFF176', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <div style={{ fontSize: '24px' }}>🎉</div>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#856404' }}>오늘 생일인 성도님이 계세요!</div>
                                                                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{birthdayMembers.map(m => m.full_name).join(', ')}님</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}

                                                {/* ✅ 전체 선택 / 해제 컨트롤 */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', padding: '0 4px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '6px 12px', background: '#FDFCFB', border: '1px solid #F0ECE4', borderRadius: '10px' }} onClick={() => {
                                                        const filteredList = memberList.filter(m => adminMemberSearchTerm ? m.full_name?.includes(adminMemberSearchTerm) || m.phone?.includes(adminMemberSearchTerm) || m.church_rank?.includes(adminMemberSearchTerm) : true);
                                                        if (selectedMemberIds.length === filteredList.length && filteredList.length > 0) {
                                                            setSelectedMemberIds([]);
                                                        } else {
                                                            setSelectedMemberIds(filteredList.map(m => m.id));
                                                        }
                                                    }}>
                                                        <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: '2px solid #D4AF37', background: selectedMemberIds.length > 0 && selectedMemberIds.length === memberList.filter(m => adminMemberSearchTerm ? m.full_name?.includes(adminMemberSearchTerm) || m.phone?.includes(adminMemberSearchTerm) || m.church_rank?.includes(adminMemberSearchTerm) : true).length ? '#D4AF37' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                                            {selectedMemberIds.length > 0 && selectedMemberIds.length === memberList.filter(m => adminMemberSearchTerm ? m.full_name?.includes(adminMemberSearchTerm) || m.phone?.includes(adminMemberSearchTerm) || m.church_rank?.includes(adminMemberSearchTerm) : true).length && <span style={{ color: 'white', fontSize: '11px' }}>✓</span>}
                                                        </div>
                                                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#333' }}>전체 {memberList.filter(m => adminMemberSearchTerm ? m.full_name?.includes(adminMemberSearchTerm) || m.phone?.includes(adminMemberSearchTerm) || m.church_rank?.includes(adminMemberSearchTerm) : true).length}명</span>
                                                    </div>
                                                    {selectedMemberIds.length > 0 && (
                                                        <div style={{ fontSize: '12px', color: '#D4AF37', fontWeight: 800, background: '#FFFDF0', padding: '4px 10px', borderRadius: '8px' }}>
                                                            {selectedMemberIds.length}명 선택됨
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 단체 액션 도구 모음 */}
                                                {memberList.filter(m => adminMemberSearchTerm ? m.full_name?.includes(adminMemberSearchTerm) || m.phone?.includes(adminMemberSearchTerm) || m.church_rank?.includes(adminMemberSearchTerm) : true).length > 0 && (
                                                    <div style={{ padding: '0 4px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        {/* 1층: 소통 및 복사 */}
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button onClick={() => {
                                                                const targetPhones = memberList
                                                                    .filter(m => selectedMemberIds.includes(m.id))
                                                                    .filter(m => m.phone)
                                                                    .map(m => m.phone.replace(/[^0-9]/g, ''));
                                                                if (targetPhones.length === 0) { alert('선택된 성도 중 전화번호가 등록된 분이 없습니다.'); return; }
                                                                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                                                                const uniquePhones = targetPhones
                                                                    .map(p => p.trim())
                                                                    .filter((v, i, a) => v.length > 0 && a.indexOf(v) === i);
                                                                if (isIOS) {
                                                                    alert('⚠️ 아이폰(iOS) 단체문자 제한 안내\n\n아이폰은 보안 정책상 브라우저에서의 단체 문자 자동 전송을 지원하지 않습니다.\n\n대신 옆의 [📋 번호복사] 버튼을 눌러 번호를 복사하신 후, 메시지 앱의 "받는 사람" 칸에 "붙여넣기" 하여 전송해 주세요.\n\n(참고: 안드로이드는 자동 전송이 정상 지원됩니다.)');
                                                                    return;
                                                                }

                                                                // 안드로이드용: 세미콜론(;)이 가장 안정적입니다.
                                                                const smsUrl = `sms:${uniquePhones.join(';')}`;
                                                                const link = document.createElement('a');
                                                                link.href = smsUrl;
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                document.body.removeChild(link);
                                                            }} style={{ flex: 1.5, height: '48px', background: selectedMemberIds.length > 0 ? '#2E7D32' : '#F0F0F0', color: selectedMemberIds.length > 0 ? 'white' : '#999', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 900, cursor: selectedMemberIds.length > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: selectedMemberIds.length > 0 ? '0 6px 15px rgba(46,125,50,0.2)' : 'none', transition: 'all 0.3s' }}>
                                                                💬 단체 문자발송 ({memberList.filter(m => selectedMemberIds.includes(m.id)).filter(m => m.phone).length}명)
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const targetPhones = memberList
                                                                        .filter(m => selectedMemberIds.includes(m.id))
                                                                        .filter(m => m.phone)
                                                                        .map(m => m.phone.replace(/[^0-9]/g, ''));
                                                                    if (targetPhones.length === 0) { alert('선택된 성도 중 전화번호가 등록된 분이 없습니다.'); return; }
                                                                    const uniquePhones = targetPhones.filter((v, i, a) => v.length > 0 && a.indexOf(v) === i);
                                                                    // [최적화] 가장 표준적인 콤마+공백 조합으로 복사합니다.
                                                                    const textToCopy = uniquePhones.join(', ');
                                                                    navigator.clipboard.writeText(textToCopy);
                                                                    alert('번호가 복사되었습니다! ✨\n\n메시지 앱의 수신인 칸에 "붙여넣기" 한 뒤 전송해 주세요.');
                                                                }}
                                                                style={{
                                                                    flex: 1, height: '48px', background: '#FFFFFF', color: '#555', border: '1px solid #E5E5E5', borderRadius: '14px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                                                                }}
                                                            >
                                                                📋 번호복사
                                                            </button>
                                                        </div>

                                                        {/* 2층: 상태 관리 (승인/해제/삭제) */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                                            <button
                                                                onClick={async () => {
                                                                    if (selectedMemberIds.length === 0) { alert('승인할 성도를 먼저 선택해주세요.'); return; }
                                                                    const pendingIds = memberList.filter(m => selectedMemberIds.includes(m.id) && !m.is_approved).map(m => m.id);
                                                                    if (pendingIds.length === 0) { alert('선택한 성도 중 승인 대기자가 없습니다.'); return; }
                                                                    if (window.confirm(`선택한 ${pendingIds.length}명의 성도를 일괄 승인하시겠습니까?`)) {
                                                                        try {
                                                                            const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bulk_approve_users', ids: pendingIds, approve: true, church_id: churchId, requester_id: user?.id, requester_email: user?.email }) });
                                                                            if (res.ok) {
                                                                                alert('선택한 성도가 모두 승인되었습니다! 🎉');
                                                                                setSelectedMemberIds([]);
                                                                                const r = await fetch(`/api/admin?action=list_members&church_id=${churchId}`);
                                                                                if (r.ok) setMemberList(await r.json());
                                                                            }
                                                                        } catch (e) { alert('승인 중 오류 발생'); }
                                                                    }
                                                                }}
                                                                style={{ height: '44px', background: '#E8F5E9', color: '#2E7D32', border: '1px solid #C8E6C9', borderRadius: '12px', fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                                            >
                                                                ✅ 승인
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (selectedMemberIds.length === 0) { alert('해제할 성도를 먼저 선택해주세요.'); return; }
                                                                    const approvedIds = memberList.filter(m => selectedMemberIds.includes(m.id) && m.is_approved).map(m => m.id);
                                                                    if (approvedIds.length === 0) { alert('선택한 성도 중 이미 승인된 분이 없습니다.'); return; }
                                                                    if (window.confirm(`선택한 ${approvedIds.length}명의 승인을 취소하시겠습니까?`)) {
                                                                        try {
                                                                            const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bulk_approve_users', ids: approvedIds, approve: false, church_id: churchId, requester_id: user?.id, requester_email: user?.email }) });
                                                                            if (res.ok) {
                                                                                alert('승인이 취소되었습니다.');
                                                                                setSelectedMemberIds([]);
                                                                                const r = await fetch(`/api/admin?action=list_members&church_id=${churchId}`);
                                                                                if (r.ok) setMemberList(await r.json());
                                                                            }
                                                                        } catch (e) { alert('처리 중 오류 발생'); }
                                                                    }
                                                                }}
                                                                style={{ height: '44px', background: '#FFF3E0', color: '#E65100', border: '1px solid #FFE0B2', borderRadius: '12px', fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                                            >
                                                                🔓 해제
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (selectedMemberIds.length === 0) { alert('삭제할 성도를 먼저 선택해주세요.'); return; }
                                                                    if (window.confirm(`선택한 ${selectedMemberIds.length}명을 삭제하시겠습니까?`)) {
                                                                        try {
                                                                            const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bulk_delete_members', ids: selectedMemberIds, church_id: churchId, requester_id: user?.id, requester_email: user?.email }) });
                                                                            if (res.ok) {
                                                                                alert('삭제되었습니다.');
                                                                                setSelectedMemberIds([]);
                                                                                const r = await fetch(`/api/admin?action=list_members&church_id=${churchId}`);
                                                                                if (r.ok) setMemberList(await r.json());
                                                                            }
                                                                        } catch (e) { alert('삭제 중 오류 발생'); }
                                                                    }
                                                                }}
                                                                style={{ height: '44px', background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', borderRadius: '12px', fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                                            >
                                                                🗑️ 삭제
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {memberList.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>등록된 성도가 없습니다.</div> :
                                                    [...memberList]
                                                        .filter(m => adminMemberSearchTerm ? m.full_name?.includes(adminMemberSearchTerm) || m.phone?.includes(adminMemberSearchTerm) || m.church_rank?.includes(adminMemberSearchTerm) : true)
                                                        .filter(m => {
                                                            if (!showOnlyDuplicates) return true;
                                                            const cleanMName = (m.full_name || '').trim().replace(/\s/g, '').toLowerCase();
                                                            const cleanMPhone = (m.phone || '').replace(/[^0-9]/g, '');

                                                            return memberList.some(other => {
                                                                if (other.id === m.id) return false;
                                                                const cleanOtherName = (other.full_name || '').trim().replace(/\s/g, '').toLowerCase();
                                                                const cleanOtherPhone = (other.phone || '').replace(/[^0-9]/g, '');

                                                                // 이름이 같거나 (단, 이름이 너무 짧거나 '.'인 경우는 제외)
                                                                const nameMatch = cleanMName.length >= 2 && cleanMName !== '.' && cleanMName === cleanOtherName;
                                                                // 전화번호가 같거나
                                                                const phoneMatch = cleanMPhone.length >= 8 && cleanMPhone === cleanOtherPhone;

                                                                return nameMatch || phoneMatch;
                                                            });
                                                        })
                                                        .sort((a, b) => {
                                                            if (memberSortBy === 'name') return (a.full_name || '').localeCompare(b.full_name || '');
                                                            if (memberSortBy === 'email') return (a.email || '').localeCompare(b.email || '');
                                                            if (memberSortBy === 'rank') return (a.church_rank || '').localeCompare(b.church_rank || '');
                                                            // 기본적으로 최신 등록순 (created_at DESC)으로 정렬하여 목록이 바뀌어 보이는 현상 방지
                                                            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                                            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                                            return dateB - dateA;
                                                        })
                                                        .map(member => {
                                                            const isDuplicate = memberList.some(m => m.id !== member.id && (m.full_name || '').trim().replace(/\s/g, '').toLowerCase() === (member.full_name || '').trim().replace(/\s/g, '').toLowerCase());
                                                            const isAdmin = allAdminList.some(a => member.email && a.email?.toLowerCase().trim() === member.email?.toLowerCase().trim());
                                                            const genericNames = ['성도', '이름 없음', '이름미입력', '사용자', '큐티', 'somy', '.', ''];
                                                            const isNameGeneric = !member.full_name || genericNames.includes(member.full_name.trim());
                                                            const displayName = !isNameGeneric ? member.full_name : (member.email ? member.email.split('@')[0] : '성도');

                                                            return (
                                                                <div key={member.id} style={{
                                                                    background: '#FFFFFF',
                                                                    padding: '20px',
                                                                    borderRadius: '24px',
                                                                    border: selectedMemberIds.includes(member.id) ? '2.5px solid #D4AF37' : '1px solid #F0F0F0',
                                                                    marginBottom: '16px',
                                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                                                                    transition: 'all 0.3s ease',
                                                                    position: 'relative',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '16px'
                                                                }}>
                                                                    {/* [상단 섹션] 체크박스 + 프로필 + 이름 */}
                                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                                        <div
                                                                            onClick={() => {
                                                                                if (selectedMemberIds.includes(member.id)) {
                                                                                    setSelectedMemberIds(prev => prev.filter(id => id !== member.id));
                                                                                } else {
                                                                                    setSelectedMemberIds(prev => [...prev, member.id]);
                                                                                }
                                                                            }}
                                                                            style={{
                                                                                width: '24px', height: '24px', borderRadius: '8px', border: '2.5px solid #D4AF37',
                                                                                background: selectedMemberIds.includes(member.id) ? '#D4AF37' : 'white',
                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
                                                                            }}
                                                                        >
                                                                            {selectedMemberIds.includes(member.id) && <span style={{ color: 'white', fontSize: '14px', fontWeight: 900 }}>✓</span>}
                                                                        </div>

                                                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                                                            <div style={{ width: 54, height: 54, borderRadius: '18px', overflow: 'hidden', background: '#F8F9FA', border: '1px solid #EEE' }}>
                                                                                <img alt="" src={member.avatar_url || 'https://via.placeholder.com/62'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                            </div>
                                                                            {isAdmin && <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#333', color: 'white', fontSize: '8px', padding: '2px 5px', borderRadius: '6px', fontWeight: 900, border: '1px solid white' }}>ADMIN</div>}
                                                                        </div>

                                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                                <span style={{ fontSize: '17px', fontWeight: 900, color: '#1A1A1A' }}>{displayName}</span>
                                                                                {member.church_rank && <span style={{ fontSize: '9px', background: '#FFF9E6', color: '#B08C3E', padding: '2px 6px', borderRadius: '5px', fontWeight: 800 }}>{member.church_rank}</span>}
                                                                            </div>
                                                                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                                                <span style={{
                                                                                    background: member.gender === '남' ? '#E7F5FF' : member.gender === '여' ? '#FFF0F6' : '#F1F3F5',
                                                                                    color: member.gender === '남' ? '#1971C2' : member.gender === '여' ? '#D6336C' : '#888',
                                                                                    padding: '1px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '9px'
                                                                                }}>{member.gender || '미설정'}</span>
                                                                                {!member.is_approved && <span style={{ fontSize: '9px', background: '#FFF5F5', color: '#E03131', padding: '1px 6px', borderRadius: '6px', fontWeight: 800 }}>대기</span>}
                                                                                {member.is_new_login && <span style={{ fontSize: '9px', background: '#E3F2FD', color: '#1971C2', padding: '1px 6px', borderRadius: '6px', fontWeight: 800, border: '1px solid #BBDEFB' }}>신규기기</span>}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* [중간 섹션] 연락처 및 정보 그리드 (모바일 최적화 2열) */}
                                                                    <div style={{
                                                                        display: 'grid',
                                                                        gridTemplateColumns: '1.2fr 1fr',
                                                                        gap: '10px',
                                                                        padding: '12px 16px',
                                                                        background: '#F9F9F9',
                                                                        borderRadius: '16px',
                                                                        fontSize: '12.5px'
                                                                    }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <span style={{ opacity: 0.6 }}>📞</span>
                                                                            <span style={{ fontWeight: 700, color: '#333' }}>{formatPhone(member.phone) || '-'}</span>
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <span style={{ opacity: 0.6 }}>🎂</span>
                                                                            <span style={{ fontWeight: 600, color: '#555' }}>{member.birthdate || '-'}</span>
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <span style={{ opacity: 0.6 }}>📅</span>
                                                                            <span style={{ fontWeight: 600, color: '#666' }}>{member.created_at ? (String(member.created_at).split(/[T\s]/)[0]) : '-'}</span>
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                                            <span style={{ opacity: 0.6 }}>🏠</span>
                                                                            <span style={{ color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.address || '-'}</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* [하단 섹션] 액션 버튼 */}
                                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                        {!member.is_approved && (
                                                                            <button
                                                                                onClick={async () => {
                                                                                    if (window.confirm(`${member.full_name} 성도를 승인하시겠습니까?`)) {
                                                                                        const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve_user', user_id: member.id, is_approved: true, church_id: churchId, requester_id: user?.id, requester_email: user?.email }) });
                                                                                        if (res.ok) {
                                                                                            setMemberList(prev => prev.map(m => m.id === member.id ? { ...m, is_approved: true } : m));
                                                                                            alert(`${member.full_name} 성도가 승인되었습니다. 🎉`);
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                style={{ flex: 1.5, background: '#D4AF37', color: 'white', border: 'none', padding: '10px', borderRadius: '12px', fontSize: '11px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 8px rgba(212,175,55,0.2)' }}
                                                                            >
                                                                                승인 확정
                                                                            </button>
                                                                        )}
                                                                        {member.is_new_login && (
                                                                            <button
                                                                                onClick={async () => {
                                                                                    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear_new_login', user_id: member.id, requester_id: user?.id }) });
                                                                                    if (res.ok) {
                                                                                        setMemberList(prev => prev.map(m => m.id === member.id ? { ...m, is_new_login: false } : m));
                                                                                    }
                                                                                }}
                                                                                style={{ flex: 1, background: '#E3F2FD', color: '#1971C2', border: '1px solid #BBDEFB', padding: '10px', borderRadius: '12px', fontSize: '11px', fontWeight: 900, cursor: 'pointer' }}
                                                                            >
                                                                                기기 확인
                                                                            </button>
                                                                        )}
                                                                        <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                                                                            <button onClick={() => {
                                                                                setSelectedMemberForEdit(member);
                                                                                const form = {
                                                                                    full_name: member.full_name || '', church_rank: member.church_rank || '', phone: member.phone || '', birthdate: member.birthdate || '', gender: member.gender || '', member_no: member.member_no || '', address: member.address || '', is_phone_public: member.is_phone_public || false, is_birthdate_public: member.is_birthdate_public || false, is_birthdate_lunar: member.is_birthdate_lunar || false, is_address_public: member.is_address_public || false, created_at: member.created_at || ''
                                                                                };
                                                                                setMemberEditForm(form);
                                                                                setInitialMemberEditForm(form);
                                                                            }} style={{ flex: 1, background: '#FFFFFF', border: '1px solid #E0E0E0', color: '#444', padding: '10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>상세 수정</button>
                                                                            {isMainAdmin && (
                                                                                <button onClick={() => {
                                                                                    setAdminTab('admins');
                                                                                    setTimeout(() => {
                                                                                        const nameEl = document.getElementById('add-admin-name') as HTMLInputElement;
                                                                                        const phoneEl = document.getElementById('add-admin-phone') as HTMLInputElement;
                                                                                        const birthEl = document.getElementById('add-admin-birthdate') as HTMLInputElement;
                                                                                        const roleEl = document.getElementById('add-admin-role') as HTMLSelectElement;

                                                                                        if (nameEl) nameEl.value = member.full_name || '';
                                                                                        if (phoneEl) phoneEl.value = (member.phone || '').replace(/[^0-9]/g, '');
                                                                                        if (birthEl) birthEl.value = member.birthdate || '';
                                                                                        if (roleEl) roleEl.value = 'sub_admin';

                                                                                        document.getElementById('admins-section-title')?.scrollIntoView({ behavior: 'smooth' });
                                                                                    }, 400);
                                                                                }} style={{ flex: 1, background: '#F5F5F3', border: '1px solid #E0E0E0', color: '#555', padding: '10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>권한 부여</button>
                                                                            )}
                                                                        </div>
                                                                        <button
                                                                            onClick={() => { setMergeTarget(member); setMergeSearchKeyword(member.full_name || ''); setShowMergeModal(true); }}
                                                                            style={{
                                                                                flex: 1, background: isDuplicate ? '#FFF9EB' : '#FFFFFF', border: isDuplicate ? '1.5px solid #D4AF37' : '1px solid #E0E0E0', padding: '10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', color: '#444'
                                                                            }}
                                                                        >
                                                                            통합
                                                                        </button>
                                                                        <button
                                                                            onClick={async () => {
                                                                                if (window.confirm(`${member.full_name} 성도를 삭제하시겠습니까?`)) {
                                                                                    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_member', user_id: member.id, church_id: churchId, requester_id: user?.id, requester_email: user?.email }) });
                                                                                    if (res.ok) setMemberList(prev => prev.filter(m => m.id !== member.id));
                                                                                }
                                                                            }}
                                                                            style={{ background: '#FFF5F5', border: '1px solid #FFE3E3', padding: '10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', color: '#E03131' }}
                                                                        >
                                                                            삭제
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                }

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#FAFAFA', borderRadius: '15px', border: '1px solid #F0F0F0', marginTop: '16px' }}>
                                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#444', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '16px' }}>🛡️</span> 일괄 프라이버시 설정
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        {['phone', 'birthdate', 'address'].map(type => {
                                                            const fieldKey = `is_${type}_public`;
                                                            // 모두 공개인 상태인지 확인 (최소 한명 이상 있고 모두 true)
                                                            const isAllPublic = memberList.length > 0 && memberList.every(m => m[fieldKey] === true);
                                                            // 모두 비공개인 상태인지 확인 (최소 한명 이상 있고 모두 false)
                                                            const isAllPrivate = memberList.length > 0 && memberList.every(m => m[fieldKey] === false);

                                                            return (
                                                                <div key={type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '10px 14px', borderRadius: '12px', border: '1px solid #EEE' }}>
                                                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#666', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        {type === 'phone' ? '📞 휴대폰' : type === 'birthdate' ? '🎂 생년월일' : '🏠 주소'}
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                                        <button
                                                                            disabled={isBulkProcessing}
                                                                            onClick={async () => {
                                                                                if (window.confirm(`모든 성도의 ${type === 'phone' ? '전화번호' : type === 'birthdate' ? '생일' : '주소'}를 '공개'로 전환하시겠습니까?`)) {
                                                                                    setIsBulkProcessing(true);
                                                                                    const res = await fetch('/api/admin', {
                                                                                        method: 'POST',
                                                                                        headers: { 'Content-Type': 'application/json' },
                                                                                        body: JSON.stringify({ action: 'bulk_update_privacy', field: `is_${type}_public`, value: true, church_id: churchId })
                                                                                    });
                                                                                    if (res.ok) {
                                                                                        setMemberList(prev => prev.map(m => ({ ...m, [`is_${type}_public`]: true })));
                                                                                        alert('모두 공개로 변경되었습니다.');
                                                                                    }
                                                                                    setIsBulkProcessing(false);
                                                                                }
                                                                            }}
                                                                            style={{
                                                                                padding: '6px 12px',
                                                                                background: isAllPublic ? '#D4AF37' : '#FFFDE7',
                                                                                border: isAllPublic ? '1px solid #D4AF37' : '1px solid #FFD54F',
                                                                                color: isAllPublic ? 'white' : '#856404',
                                                                                borderRadius: '8px',
                                                                                fontSize: '11px',
                                                                                fontWeight: 800,
                                                                                cursor: 'pointer',
                                                                                transition: 'all 0.2s',
                                                                                boxShadow: isAllPublic ? '0 2px 8px rgba(212,175,55,0.3)' : 'none'
                                                                            }}
                                                                        >
                                                                            전체 공개
                                                                        </button>
                                                                        <button
                                                                            disabled={isBulkProcessing}
                                                                            onClick={async () => {
                                                                                if (window.confirm(`모든 성도의 ${type === 'phone' ? '전화번호' : type === 'birthdate' ? '생일' : '주소'}를 '비공개'로 전환하시겠습니까?`)) {
                                                                                    setIsBulkProcessing(true);
                                                                                    const res = await fetch('/api/admin', {
                                                                                        method: 'POST',
                                                                                        headers: { 'Content-Type': 'application/json' },
                                                                                        body: JSON.stringify({ action: 'bulk_update_privacy', field: `is_${type}_public`, value: false, church_id: churchId })
                                                                                    });
                                                                                    if (res.ok) {
                                                                                        setMemberList(prev => prev.map(m => ({ ...m, [`is_${type}_public`]: false })));
                                                                                        alert('모두 비공개로 변경되었습니다.');
                                                                                    }
                                                                                    setIsBulkProcessing(false);
                                                                                }
                                                                            }}
                                                                            style={{
                                                                                padding: '6px 12px',
                                                                                background: isAllPrivate ? '#666' : '#F5F5F5',
                                                                                border: isAllPrivate ? '1px solid #666' : '1px solid #DDD',
                                                                                color: isAllPrivate ? 'white' : '#999',
                                                                                borderRadius: '8px',
                                                                                fontSize: '11px',
                                                                                fontWeight: 800,
                                                                                cursor: 'pointer',
                                                                                transition: 'all 0.2s',
                                                                                boxShadow: isAllPrivate ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                                                                            }}
                                                                        >
                                                                            🔒 비공개
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : adminTab === 'reset' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div style={{ padding: '20px', background: '#FFF5F5', borderRadius: '20px', border: '1px solid #FFC9C9' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                                <div style={{ fontSize: '24px' }}>⚠️</div>
                                                <div>
                                                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#C62828' }}>주의하세요!</div>
                                                    <div style={{ fontSize: '12px', color: '#666' }}>초기화된 데이터는 복구할 수 없습니다.</div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {/* 감사일기 리셋 */}
                                                <div style={{ background: 'white', padding: '16px', borderRadius: '15px', border: '1px solid #FFC9C9' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#333' }}>📔 감사일기 초기화</div>
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm('모든 감사일기 기록과 댓글을 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.')) {
                                                                    const res = await fetch('/api/admin', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ action: 'reset_thanksgiving', church_id: churchId })
                                                                    });
                                                                    if (res.ok) alert('감사일기가 초기화되었습니다.');
                                                                }
                                                            }}
                                                            style={{ padding: '6px 12px', background: '#FFEEF0', color: '#E53935', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                                        >리셋 실행</button>
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#999' }}>성도들이 작성한 모든 감사일기 및 댓글 데이터를 삭제합니다.</div>
                                                </div>

                                                {/* 은혜나눔 리셋 */}
                                                <div style={{ background: 'white', padding: '16px', borderRadius: '15px', border: '1px solid #FFC9C9' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#333' }}>💬 은혜나눔(게시판) 초기화</div>
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm('모든 은혜나눔 게시글과 댓글을 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.')) {
                                                                    const res = await fetch('/api/admin', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ action: 'reset_community', church_id: churchId })
                                                                    });
                                                                    if (res.ok) alert('은혜나눔 게시판이 초기화되었습니다.');
                                                                }
                                                            }}
                                                            style={{ padding: '6px 12px', background: '#FFEEF0', color: '#E53935', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                                        >리셋 실행</button>
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#999' }}>게시판에 등록된 모든 글과 댓글을 영구 삭제합니다.</div>
                                                </div>

                                                {/* 큐티왕 리셋 */}
                                                <div style={{ background: 'white', padding: '16px', borderRadius: '15px', border: '1px solid #FFC9C9' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#333' }}>👑 이달의 큐티왕(통계) 초기화</div>
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm('성도들의 큐티 참여(완주) 데이터를 모두 초기화하시겠습니까?\n새로운 달이 시작될 때 사용하세요.')) {
                                                                    const res = await fetch('/api/admin', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ action: 'reset_qt_stats', church_id: churchId })
                                                                    });
                                                                    if (res.ok) alert('큐티 참여 데이터가 초기화되었습니다.');
                                                                }
                                                            }}
                                                            style={{ padding: '6px 12px', background: '#FFEEF0', color: '#E53935', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                                        >리셋 실행</button>
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#999' }}>성도들의 큐티 완료 기록(통계)을 모두 삭제합니다.</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : adminTab === 'stats' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', paddingBottom: '40px' }}>
                                        {/* (1) 성도 분포 통계 - StatsView 컴포넌트 활용 */}
                                        <div style={{ background: 'white', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #EEE' }}>
                                            <div style={{ fontSize: '15px', fontWeight: 900, color: '#333', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '20px' }}>📊</span> 성도 구성 통계
                                            </div>
                                            <StatsView memberList={memberList} />
                                        </div>

                                        {/* (2) 큐티 활동 & 완주 랭킹 */}
                                        <div style={{ background: 'white', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #EEE' }}>
                                            <div style={{ fontSize: '15px', fontWeight: 900, color: '#333', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '20px' }}>🏆</span> 이번 달 묵상 참여 현황
                                            </div>

                                            {statsError ? (
                                                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#E53935', fontSize: '14px' }}>
                                                    ⚠️ {statsError}
                                                </div>
                                            ) : !stats ? (
                                                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                                                    데이터를 불러오는 중입니다...
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                    <div style={{ display: 'flex', gap: '12px' }}>
                                                        <div style={{ flex: 1, background: 'linear-gradient(135deg, #D4AF37, #B8924A)', borderRadius: '16px', padding: '15px', color: 'white', textAlign: 'center' }}>
                                                            <div style={{ fontSize: '22px', fontWeight: 800 }}>{stats.today.count}</div>
                                                            <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '4px' }}>오늘 참여</div>
                                                        </div>
                                                        <div style={{ flex: 1, background: '#333', borderRadius: '16px', padding: '15px', color: 'white', textAlign: 'center' }}>
                                                            <div style={{ fontSize: '22px', fontWeight: 800 }}>{stats.totalCompletions}</div>
                                                            <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '4px' }}>누적 묵상합계</div>
                                                        </div>
                                                    </div>

                                                    <div style={{ marginTop: '10px' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#666', marginBottom: '12px' }}>✨ 이달의 묵상 상위 성도 (TOP 10)</div>
                                                        {stats.ranking.length === 0 ? (
                                                            <div style={{ fontSize: '13px', color: '#999', textAlign: 'center', padding: '20px 0' }}>아직 이번 달 기록이 없습니다.</div>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                {stats.ranking.map((r, i) => (
                                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: i < 3 ? '#FFFDF0' : '#FAFAFA', borderRadius: '12px', border: '1px solid', borderColor: i < 3 ? '#FFE082' : '#F0F0F0' }}>
                                                                        <div style={{ width: '24px', textAlign: 'center', fontWeight: 900, fontSize: i < 3 ? '18px' : '14px', color: i === 0 ? '#D4AF37' : '#999' }}>
                                                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                                                        </div>
                                                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#EEE', overflow: 'hidden' }}>
                                                                            {r.avatar ? <img src={r.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🐑</div>}
                                                                        </div>
                                                                        <div style={{ flex: 1, fontSize: '14px', fontWeight: 700, color: '#333' }}>{r.name}</div>
                                                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#D4AF37' }}>{r.count}회</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : adminTab === 'admins' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div style={{ fontSize: '13px', color: '#666', background: '#F5F5F3', padding: '14px', borderRadius: '12px', lineHeight: 1.5 }}>
                                            🔐 <strong>권한 및 관리자 설정</strong><br />
                                            교회 운영을 도울 부관리자를 지정하거나 관리합니다.
                                        </div>

                                        {/* 관리자 목록 섹션 */}
                                        <div style={{ background: 'white', padding: '16px', borderRadius: '15px', border: '1px solid #c8e6c9' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#2e7d32', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>⛪ {churchSettings.church_name} 관리자 권한 목록</span>
                                                <button onClick={fetchAllAdmins} style={{ background: '#F5F5F5', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}>새로고침</button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {allAdminList
                                                    .filter(a => isSuperAdmin ? true : (!a.church_id || a.church_id.toLowerCase() === churchId.toLowerCase()))
                                                    .length > 0 ? (
                                                    allAdminList
                                                        .filter(a => isSuperAdmin ? true : (!a.church_id || a.church_id.toLowerCase() === churchId.toLowerCase()))
                                                        .map((admin: any) => (
                                                            <div key={admin.email} style={{ display: 'flex', flexDirection: 'column', background: 'white', padding: '12px', borderRadius: '15px', border: '1px solid #F0F0F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0, flex: 1 }}>
                                                                        <div style={{ width: '32px', height: '32px', background: '#F5F5F5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', overflow: 'hidden', flexShrink: 0 }}>
                                                                            {admin.avatar_url ? <img src={admin.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                                                                        </div>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                                                                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#333', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                {admin.name || (admin.role === 'super_admin' ? '운영자(슈퍼)' : admin.role === 'sub_admin' ? '부관리자' : '관리자')}
                                                                                <span style={{ fontSize: '10px', background: admin.role === 'super_admin' ? '#E3F2FD' : admin.role === 'church_admin' ? '#E8F5E9' : '#F5F5F3', color: admin.role === 'super_admin' ? '#1565C0' : admin.role === 'church_admin' ? '#2E7D32' : '#888', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                                                                    {admin.role === 'super_admin' ? '슈퍼' : admin.role === 'church_admin' ? '관리자' : '부관리자'}
                                                                                </span>
                                                                            </div>
                                                                            <div style={{ fontSize: '11px', color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin.email?.includes('@') ? admin.email : 'ID: ' + (admin.email || admin.id)} | 📍 {admin.church_id || '전체'}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                                        {admin.email !== user?.email && (
                                                                            <button onClick={() => handleDeleteAdmin(admin.email)} style={{ background: '#FFF5F5', color: '#C62828', border: '1px solid #FFE3E3', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>삭제</button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                ) : (
                                                    <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', padding: '10px' }}>검색 결과가 없습니다.</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 신규 관리자 추가 섹션 */}
                                        <div id="admins-section-title" style={{ background: '#edf7ed', padding: '16px', borderRadius: '15px', border: '1px solid #c8e6c9' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#2e7d32', marginBottom: '12px' }}>➕ 신규 관리자 권한 부여</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>성도 명단과 정확히 일치하는 정보를 입력하세요.</div>
                                                <input id="add-admin-name" placeholder="성도 이름" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '12px', outline: 'none', background: 'white' }} />
                                                <input id="add-admin-phone" placeholder="전화번호 (예: 01012345678)" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '12px', outline: 'none', background: 'white' }} />
                                                <input id="add-admin-birthdate" placeholder="생년월일 (예: 1990-01-01)" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '12px', outline: 'none', background: 'white' }} />
                                                {isSuperAdmin && (
                                                    <input id="add-admin-church" placeholder="소속 교회 ID (예: jesus-in)" defaultValue={churchId} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '12px', outline: 'none', background: 'white' }} />
                                                )}
                                                <input id="add-admin-pin" placeholder="보안 PIN (4~6자리)" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '12px', outline: 'none', background: 'white' }} />
                                                <select id="add-admin-role" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '12px', outline: 'none', background: 'white', appearance: 'none', cursor: 'pointer' }}>
                                                    <option value="sub_admin">부관리자 (상담내역 열람 불가)</option>
                                                    <option value="church_admin">관리자 (모든 메뉴 가능)</option>
                                                    {isSuperAdmin && <option value="super_admin">슈퍼 관리자 (통합 관리자)</option>}
                                                </select>
                                                <button onClick={async () => {
                                                    const nameEl = document.getElementById('add-admin-name') as HTMLInputElement;
                                                    const phoneEl = document.getElementById('add-admin-phone') as HTMLInputElement;
                                                    const birthEl = document.getElementById('add-admin-birthdate') as HTMLInputElement;
                                                    const cidEl = document.getElementById('add-admin-church') as HTMLInputElement;
                                                    const roleEl = document.getElementById('add-admin-role') as HTMLSelectElement;

                                                    const name = nameEl?.value;
                                                    const phone = phoneEl?.value;
                                                    const birthdate = birthEl?.value;
                                                    const cid = cidEl?.value || churchId;
                                                    const role = roleEl?.value;
                                                    const pin = (document.getElementById('add-admin-pin') as HTMLInputElement)?.value;

                                                    if (!name || !phone || !birthdate || !cid) { alert('모든 정보를 입력해주세요.'); return; }

                                                    try {
                                                        const res = await fetch('/api/admin', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ action: 'add_admin', name, phone, birthdate, church_id: cid, role, pin, requester_id: user?.id, requester_email: user?.email })
                                                        });
                                                        if (res.ok) {
                                                            alert('성공적으로 관리자 권한을 부여했습니다!');
                                                            if (nameEl) nameEl.value = '';
                                                            if (phoneEl) phoneEl.value = '';
                                                            if (birthEl) birthEl.value = '';
                                                            fetchAllAdmins();
                                                        } else {
                                                            const info = await res.json();
                                                            alert('에러: ' + (info.error || '알 수 없는 오류'));
                                                        }
                                                    } catch (err) {
                                                        alert('서버 통신 중 오류가 발생했습니다.');
                                                    }
                                                }} style={{ padding: '12px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}>
                                                    관리자로 등록하기 ✅
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : adminTab === 'master' ? (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            <div style={{ fontSize: '13px', color: '#666', background: '#F5F5F3', padding: '14px', borderRadius: '12px', lineHeight: 1.5 }}>
                                                🛡️ <strong>슈퍼 관리자 전용 (마스터 모드)</strong><br />
                                                전체 교회의 현황을 파악하고 관리합니다.
                                            </div>

                                            {/* 교회별 등록 인원 통계 */}
                                            <div style={{ background: '#FFF9C4', padding: '18px', borderRadius: '18px', border: '1px solid #FFF176' }}>
                                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#333', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>⛪ 정식 등록 교회 ({churchStats?.registered?.length || 0})</span>
                                                    <button onClick={async () => {
                                                        const r = await fetch('/api/admin?action=get_church_stats');
                                                        const data = await r.json();
                                                        if (data.registered) {
                                                            setChurchStats(data);
                                                        } else {
                                                            alert('통계 로드 실패: ' + (data.error || '알 수 없는 오류'));
                                                        }
                                                    }} style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}>새로고침</button>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {churchStats?.registered?.length > 0 ? (
                                                        churchStats.registered.map((ch: any) => (
                                                            <div key={ch.church_id} style={{ background: 'rgba(255,255,255,0.7)', padding: '12px', borderRadius: '15px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                                                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.church_name || ch.church_id}</span>
                                                                        <span style={{ fontSize: '10px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>ID: {ch.church_id} | {ch.plan?.split('|')[0] || 'free'}</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#D4AF37', whiteSpace: 'nowrap' }}>{ch.count}명</span>
                                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                                            <a href={ch.church_id === 'somy-main' ? '/' : `/?church_id=${ch.church_id}`} target="_blank" title="새 탭에서 보기" style={{ padding: '6px 10px', background: '#E3F2FD', color: '#1565C0', textDecoration: 'none', borderRadius: '8px', fontSize: '10px', fontWeight: 800, display: 'inline-block' }}>조회</a>
                                                                            <button onClick={() => {
                                                                                if (confirm(`${ch.church_id} 교회를 현재 화면에서 관리하시겠습니까?`)) {
                                                                                    window.location.href = ch.church_id === 'somy-main' ? '/' : `/?church_id=${ch.church_id}`;
                                                                                }
                                                                            }} style={{ padding: '6px 10px', background: '#E8F5E9', color: '#2E7D32', border: 'none', borderRadius: '8px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>관리</button>
                                                                            {ch.church_id !== 'jesus-in' && (
                                                                                <button onClick={() => handleDeleteChurch(ch.church_id)} style={{ padding: '6px 10px', background: '#FEE', color: '#C62828', border: 'none', borderRadius: '8px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>삭제</button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', padding: '10px' }}>'새로고침'을 눌러 통계를 확인하세요.</div>
                                                    )}
                                                </div>

                                                {/* 미등록/체험판 데이터 섹션 */}
                                                {churchStats?.orphans?.length > 0 && (
                                                    <div style={{ marginTop: '20px', borderTop: '1px dashed #DDD', paddingTop: '15px' }}>
                                                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#777', marginBottom: '10px' }}>⚠️ 미등록/체험판 데이터 ({churchStats.orphans.length})</div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            {churchStats.orphans.map((o: any) => (
                                                                <div key={o.church_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.03)', padding: '10px 14px', borderRadius: '12px' }}>
                                                                    <div style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>📍 {o.church_id} <span style={{ opacity: 0.6, fontSize: '10px' }}>({o.count}명)</span></div>
                                                                    <button onClick={() => handleDeleteChurch(o.church_id)} style={{ padding: '4px 8px', background: 'white', color: '#FF5252', border: '1px solid #FFCDD2', borderRadius: '6px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>기록삭제</button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 타교회 권한 위임 (타교회용) */}
                                            <div style={{ background: 'white', padding: '16px', borderRadius: '15px', border: '1px solid #EEE' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#333', marginBottom: '12px' }}>👑 [타 교회] 신규 생성 및 관리자 지정</div>
                                                <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px', lineHeight: 1.5 }}>
                                                    - 특정 앱 사용자의 계정과 연동할 교회를 새로 생성합니다.<br />
                                                    - 입력하신 정보를 가진 사용자가 해당 교회의 '최고 관리자'가 됩니다.
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <input id="new-admin-name" placeholder="성도 이름" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '12px', outline: 'none', background: '#FAFAFA' }} />
                                                    <input id="new-admin-phone" placeholder="전화번호" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '12px', outline: 'none', background: '#FAFAFA' }} />
                                                    <input id="new-admin-birthdate" placeholder="생년월일" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '12px', outline: 'none', background: '#FAFAFA' }} />
                                                    <input id="new-admin-church" placeholder="새로 생성할 교회 영문 ID (예: my-church)" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '12px', outline: 'none', background: '#FAFAFA' }} />
                                                    <input id="new-admin-pin" placeholder="보안 PIN (4~6자리)" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '12px', outline: 'none', background: '#FAFAFA' }} />
                                                    <button onClick={async () => {
                                                        const nameEl = document.getElementById('new-admin-name') as HTMLInputElement;
                                                        const phoneEl = document.getElementById('new-admin-phone') as HTMLInputElement;
                                                        const birthEl = document.getElementById('new-admin-birthdate') as HTMLInputElement;
                                                        const cidEl = document.getElementById('new-admin-church') as HTMLInputElement;

                                                        const name = nameEl?.value;
                                                        const phone = phoneEl?.value;
                                                        const birthdate = birthEl?.value;
                                                        const cid = cidEl?.value?.trim();

                                                        if (!name || !phone || !birthdate || !cid) {
                                                            alert('모든 정보를 입력해주세요.');
                                                            return;
                                                        }

                                                        try {
                                                            const res = await fetch('/api/admin', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    action: 'create_church_admin',
                                                                    name, phone, birthdate,
                                                                    target_church_id: cid,
                                                                    pin: (document.getElementById('new-admin-pin') as HTMLInputElement)?.value,
                                                                    requester_id: user.id,
                                                                    requester_email: user.email
                                                                })
                                                            });
                                                            const info = await res.json();
                                                            if (res.ok) {
                                                                const shareUrl = `${window.location.origin}/${cid}`;
                                                                const message = `[SOMY] ${name}님, 교회의 관리자로 지정되셨습니다!\n\n아래 전용 주소로 접속하여 로그인하시면 관리자 기능을 사용하실 수 있습니다.\n\n📍 교회 전용 주소: ${shareUrl}`;

                                                                // 결과를 화면에 표시하기 위해 커스텀 알림 처리
                                                                if (confirm(`✅ 성공적으로 생성되었습니다!\n\n아래 완성된 링크 정보를 클립보드에 복사하시겠습니까?\n\n${shareUrl}`)) {
                                                                    navigator.clipboard.writeText(message);
                                                                    alert('복사되었습니다! 카톡 등으로 전달해 주세요.');
                                                                }

                                                                if (nameEl) nameEl.value = '';
                                                                if (phoneEl) phoneEl.value = '';
                                                                if (birthEl) birthEl.value = '';
                                                                if (cidEl) cidEl.value = '';
                                                                fetchAllAdmins();
                                                            } else {
                                                                alert('에러: ' + info.error);
                                                            }
                                                        } catch (err) {
                                                            alert('서버 통신 중 오류가 발생했습니다.');
                                                        }
                                                    }} style={{ padding: '12px', background: '#333', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}>
                                                        교회 생성 및 관리자 지정 🚀
                                                    </button>
                                                </div>
                                            </div>

                                            {/* 신규 교회 안내 가이드 */}
                                            <div style={{ background: 'white', padding: '16px', borderRadius: '15px', border: '1px solid #EEE' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#333', marginBottom: '12px' }}>💡 신규 교회 등록 시 안내문</div>
                                                <div style={{ fontSize: '11px', color: '#666', lineHeight: 1.6, background: '#F5F5F5', padding: '12px', borderRadius: '8px' }}>
                                                    새로운 교회 관리자에게 다음 사항을 안내해 주세요:<br /><br />
                                                    1. 앱에 로그인한 상태라면 <strong>[마이페이지] {'>'} [로그아웃]</strong> 후 다시 로그인 하세요.<br />
                                                    2. 재로그인 하면 우측 상단에 <strong>[톱니바퀴⚙️] 관리자 버튼</strong>이 생성됩니다.<br />
                                                    3. 관리자 화면의 <strong>[🎨 설정] 탭</strong>에서 교회 이름, 앱 부제목, 로고 URL을 먼저 변경해 주세요.<br />
                                                    4. 설정 변경 후 앱을 완전히 종료했다가 다시 실행하면, <strong>모든 교인들의 앱 로고와 이름이 즉시 해당 교회 것으로 커스텀(화이트라벨링)</strong> 됩니다!
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : null}
                            </div>

                            {/* 하단 고정 닫기 버튼 */}
                            <div style={{ padding: '0 28px 28px 28px', flexShrink: 0 }}>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        background: '#F5F5F3',
                                        color: '#555',
                                        border: '1px solid #E5E5E5',
                                        borderRadius: '16px',
                                        fontSize: '15px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    ✕ 닫기
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            {renderMemberEditModal()}
            {renderAddMemberModal()}
            {renderMergeModal()}
            {renderNotificationList()}
            {
                (user || churchId === 'demo') && (
                    <>
                        {view !== 'sermon' && view !== 'chat' && (showIpod ? renderMiniPlayer() : (
                            <div
                                onClick={() => {
                                    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
                                    setShowIpod(true);
                                }}
                                style={{
                                    position: 'fixed',
                                    bottom: '25px',
                                    left: '25px',
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
                )
            }
            {renderInstallGuide()}
            {/* ✅ 맨 위로 가기 버튼 (전체 앱 범용) */}
            {
                showScrollTop && (
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        style={{
                            position: 'fixed',
                            bottom: '100px',
                            right: '25px',
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            background: 'white',
                            color: '#B8924A',
                            border: '1px solid #F0ECE4',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            fontWeight: 900,
                            zIndex: 9999,
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            animation: 'fade-in-up 0.4s ease-out'
                        }}
                    >
                        ↑
                        <style>{`
                            @keyframes fade-in-up {
                                from { opacity: 0; transform: translateY(20px); }
                                to { opacity: 1; transform: translateY(0); }
                            }
                        `}</style>
                    </button>
                )
            }
        </div >
    );
}

// === 독립 컴포넌트 구역 (App 외부에 정의하여 불필요한 리마운트 방지) ===

// 내 프로필 화면 컴포넌트
function ProfileView({ user, supabase, setView, baseFont, allowMemberEdit, setProfileAvatar, isAdmin, churchId }: any) {
    const [isLoading, setIsLoading] = useState(true);
    const initialDefault = {
        full_name: user?.user_metadata?.full_name || '',
        phone: '',
        birthdate: '',
        address: '',
        avatar_url: '',
        is_phone_public: false,
        is_birthdate_public: false,
        is_birthdate_lunar: false,
        is_address_public: false,
        created_at: ''
    };

    const [profileForm, setProfileForm] = useState(initialDefault);
    const [initialProfile, setInitialProfile] = useState(initialDefault as any);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // 변경사항 체크: 초기값과 현재 폼이 하나라도 다르면 true
    const isDirty = initialProfile ? JSON.stringify(initialProfile) !== JSON.stringify(profileForm) : false;

    useEffect(() => {
        const loadProfile = async () => {
            if (!user?.id) {
                setIsLoading(false);
                return;
            }
            try {
                // 0. 메타데이터 기초 정보 추출
                const metaNameFull = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.nickname || user.user_metadata?.preferred_username;
                const rawMetaPhone = user.user_metadata?.phone_number || user.user_metadata?.mobile || '';
                let cleanMetaPhone = rawMetaPhone.replace(/[^0-9]/g, '');
                if (cleanMetaPhone.startsWith('8210')) cleanMetaPhone = '0' + cleanMetaPhone.substring(2);
                else if (cleanMetaPhone.startsWith('82')) cleanMetaPhone = '0' + cleanMetaPhone.substring(2);

                const MASTER_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "pastorbaek@kakao.com").toLowerCase().split(',').map(e => e.trim());
                const isMaster = metaNameFull === '백동희' || metaNameFull === '동희' || (user.email && MASTER_EMAILS.includes(user.email.toLowerCase().trim()));
                const isAnon = !user.email || user.email.includes('anonymous.local') || user.is_anonymous;

                // 1. 서버 측 동기화 API 호출 (Sync)
                let syncResult: any = null;
                if (!(isAnon && !metaNameFull && !cleanMetaPhone && !isMaster)) {
                    try {
                        const syncRes = await fetch('/api/auth/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                user_id: user.id,
                                email: user.email,
                                name: metaNameFull,
                                avatar_url: user.user_metadata?.avatar_url,
                                phone: cleanMetaPhone,
                                church_id: churchId
                            })
                        });
                        if (syncRes.ok) syncResult = await syncRes.json();
                    } catch (e) { console.error("[Sync Error]", e); }
                }

                // 2. 최신 프로필 정보 조회 (Profile API)
                let dbData: any = null;
                try {
                    const profileRes = await fetch(`/api/profile?user_id=${user.id}`);
                    if (profileRes.ok) dbData = await profileRes.json();
                } catch (e) { console.error("[Profile Fetch Error]", e); }

                // 3. 데이터 병합 (Priority: Sync Result > DB Data > Metadata)
                // Sync 결과가 최신 상태를 반영하므로 우선순위를 높게 잡되, DB 데이터와 보완함
                const finalName = dbData?.full_name || syncResult?.full_name || syncResult?.name || metaNameFull || '';
                const finalPhone = dbData?.phone || syncResult?.phone || cleanMetaPhone || '';
                const finalBirth = dbData?.birthdate || syncResult?.birthdate || '';
                const finalAddress = dbData?.address || syncResult?.address || '';
                const finalCreated = dbData?.created_at || syncResult?.created_at || '';

                const loadedProfile = {
                    full_name: finalName,
                    phone: finalPhone,
                    birthdate: finalBirth,
                    address: finalAddress,
                    avatar_url: dbData?.avatar_url || syncResult?.avatar_url || user?.user_metadata?.avatar_url || '',
                    is_phone_public: dbData?.is_phone_public ?? syncResult?.is_phone_public ?? false,
                    is_birthdate_public: dbData?.is_birthdate_public ?? syncResult?.is_birthdate_public ?? false,
                    is_birthdate_lunar: dbData?.is_birthdate_lunar ?? syncResult?.is_birthdate_lunar ?? false,
                    is_address_public: dbData?.is_address_public ?? syncResult?.is_address_public ?? false,
                    created_at: finalCreated
                };

                setProfileForm(loadedProfile);
                setInitialProfile(JSON.parse(JSON.stringify(loadedProfile)));
            } catch (e) {
                console.error("프로필 로딩 통합 에러:", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadProfile();
    }, [user, churchId]);

    const handleSubmit = async () => {
        if (!user?.id) return;
        setIsSavingProfile(true);
        try {
            const res = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    profileData: profileForm
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '저장 중 오류가 발생했습니다.');

            if (data.merged) {
                alert('기존에 등록된 성도 정보와 성공적으로 연결되었습니다! ✨');
            } else {
                alert('프로필 정보가 저장되었습니다! ✨');
            }
            setInitialProfile(JSON.parse(JSON.stringify(profileForm)));
            if (profileForm.avatar_url) setProfileAvatar(profileForm.avatar_url);
        } catch (e) {
            alert('저장 실패: ' + (e as Error).message);
        } finally {
            setIsSavingProfile(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', background: '#FDFCFB', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', ...baseFont }}>
                <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '24px' }}>
                    <div style={{ position: 'absolute', inset: 0, border: '4px solid #F0ECE4', borderRadius: '50%' }} />
                    <div style={{ position: 'absolute', inset: 0, border: '4px solid transparent', borderTopColor: '#D4AF37', borderRadius: '50%', animation: 'spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite' }} />
                    <div style={{ position: 'absolute', inset: '15px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                        <span style={{ fontSize: '24px' }}>👤</span>
                    </div>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#333', margin: '0 0 8px 0' }}>회원 정보 확인 중</h3>
                <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>성도님의 소중한 정보를 불러오고 있습니다...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const isAnon = !user?.email || user?.email.includes('anonymous.local') || user?.is_anonymous;
    const isProfileEmpty = !profileForm.full_name || !profileForm.phone;

    return (
        <div style={{ minHeight: "100vh", background: "#FDFCFB", maxWidth: "600px", margin: "0 auto", padding: "30px 24px", ...baseFont, paddingTop: 'env(safe-area-inset-top)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                <button onClick={() => setView('home')} style={{ background: "white", border: "1px solid #EEE", borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: "16px", cursor: "pointer", boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>←</button>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#333', margin: 0 }}>내 프로필 관리</h2>
            </div>

            {/* 💡 안내 메시지 섹션 (정보가 없거나 익명일 경우 노출) */}
            {(isAnon || isProfileEmpty) && (
                <div style={{ background: 'linear-gradient(135deg, #FFF9F9 0%, #FFF0F0 100%)', padding: '20px', borderRadius: '24px', border: '1px solid #FFE3E3', marginBottom: '24px', display: 'flex', gap: '15px', alignItems: 'center', boxShadow: '0 4px 15px rgba(211,47,47,0.05)' }}>
                    <div style={{ fontSize: '28px' }}>📢</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#D32F2F', marginBottom: '4px' }}>성도 정보 연결 안내</div>
                        <p style={{ fontSize: '12.5px', color: '#666', margin: 0, lineHeight: 1.5, wordBreak: 'keep-all' }}>
                            성함과 연락처를 입력하시면 교회에 등록된 정보와 <strong>자동으로 연결</strong>됩니다. 연결 후에는 상담 및 게시글 정보가 안전하게 보관됩니다.
                        </p>
                    </div>
                </div>
            )}

            <div style={{ background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '24px', border: '1px solid #F0ECE4' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#F5F5F3', border: '1px solid #EEE', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            {profileForm.avatar_url ? (
                                <img src={profileForm.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Profile" />
                            ) : (
                                <span style={{ fontSize: '30px', color: '#999' }}>👤</span>
                            )}
                            <input type="file" accept="image/jpeg, image/png, image/jpg" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                    const img = new Image();
                                    img.onload = () => {
                                        const canvas = document.createElement('canvas');
                                        const MAX_SIZE = 400;
                                        let width = img.width;
                                        let height = img.height;
                                        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
                                        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
                                        canvas.width = width;
                                        canvas.height = height;
                                        const ctx = canvas.getContext('2d');
                                        ctx?.drawImage(img, 0, 0, width, height);
                                        const base64Str = canvas.toDataURL('image/jpeg', 0.8);
                                        setProfileForm(prev => ({ ...prev, avatar_url: base64Str }));
                                    };
                                    img.src = ev.target?.result as string;
                                };
                                reader.readAsDataURL(file);
                            }} />
                        </div>
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>사진 클릭 시 변경 (JPG/PNG)</div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '0' }}>👤 성함</label>
                            {!(allowMemberEdit || isAdmin) && <span style={{ fontSize: '11px', color: '#AAA', fontWeight: 500 }}>수정 불가</span>}
                        </div>
                        <input type="text" value={profileForm.full_name} onChange={e => (allowMemberEdit || isAdmin) && setProfileForm({ ...profileForm, full_name: e.target.value })} readOnly={!(allowMemberEdit || isAdmin)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: (allowMemberEdit || isAdmin) ? '1px solid #D4AF37' : '1px solid #EEE', outline: 'none', background: (allowMemberEdit || isAdmin) ? 'white' : '#F9F9F9', color: (allowMemberEdit || isAdmin) ? '#333' : '#999', cursor: (allowMemberEdit || isAdmin) ? 'text' : 'not-allowed' }} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '0' }}>📞 전화번호</label>
                            {!(allowMemberEdit || isAdmin) && <span style={{ fontSize: '11px', color: '#AAA', fontWeight: 500 }}>수정 불가</span>}
                        </div>
                        <input type="tel" value={profileForm.phone} onChange={e => (allowMemberEdit || isAdmin) && setProfileForm({ ...profileForm, phone: e.target.value })} readOnly={!(allowMemberEdit || isAdmin)} placeholder="010-0000-0000" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: (allowMemberEdit || isAdmin) ? '1px solid #D4AF37' : '1px solid #EEE', outline: 'none', background: (allowMemberEdit || isAdmin) ? 'white' : '#F9F9F9', color: (allowMemberEdit || isAdmin) ? '#333' : '#999', cursor: (allowMemberEdit || isAdmin) ? 'text' : 'not-allowed' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                            <input type="checkbox" id="phone_pub" checked={profileForm.is_phone_public} onChange={e => setProfileForm({ ...profileForm, is_phone_public: e.target.checked })} />
                            <label htmlFor="phone_pub" style={{ fontSize: '12px', color: '#888' }}>다른 성도님들께 전화번호를 공개합니다.</label>
                        </div>
                    </div>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '0' }}>🎂 생년월일</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <label style={{ fontSize: '11px', color: '#555', display: 'flex', alignItems: 'center', gap: '4px', cursor: allowMemberEdit ? 'pointer' : 'default' }}>
                                    <input type="radio" checked={!profileForm.is_birthdate_lunar} onChange={() => (allowMemberEdit || isAdmin) && setProfileForm({ ...profileForm, is_birthdate_lunar: false })} disabled={!(allowMemberEdit || isAdmin)} /> 양력
                                </label>
                                <label style={{ fontSize: '11px', color: '#555', display: 'flex', alignItems: 'center', gap: '4px', cursor: allowMemberEdit ? 'pointer' : 'default' }}>
                                    <input type="radio" checked={profileForm.is_birthdate_lunar} onChange={() => (allowMemberEdit || isAdmin) && setProfileForm({ ...profileForm, is_birthdate_lunar: true })} disabled={!(allowMemberEdit || isAdmin)} /> 음력
                                </label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#E07A5F', fontWeight: 600 }}>{allowMemberEdit ? '정확한 생일을 선택해주세요' : '관리자께 날짜/음력 여부 수정을 요청해주세요'}</span>
                        </div>
                        <input type="date" value={profileForm.birthdate} onChange={e => (allowMemberEdit || isAdmin) && setProfileForm({ ...profileForm, birthdate: e.target.value })} readOnly={!(allowMemberEdit || isAdmin)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: (allowMemberEdit || isAdmin) ? '1px solid #D4AF37' : '1px solid #EEE', outline: 'none', background: (allowMemberEdit || isAdmin) ? 'white' : '#F9F9F9', color: (allowMemberEdit || isAdmin) ? '#333' : '#999', cursor: (allowMemberEdit || isAdmin) ? 'text' : 'not-allowed' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                            <input type="checkbox" id="birth_pub" checked={profileForm.is_birthdate_public} onChange={e => setProfileForm({ ...profileForm, is_birthdate_public: e.target.checked })} />
                            <label htmlFor="birth_pub" style={{ fontSize: '12px', color: '#888' }}>다른 성도님들께 생일을 공개합니다.</label>
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '8px' }}>📅 교회 등록일</label>
                        <div style={{ padding: '12px', borderRadius: '12px', background: '#F9F9F9', border: '1px solid #EEE', fontSize: '14px', color: '#666' }}>
                            {profileForm.created_at ? new Date(profileForm.created_at).toLocaleDateString() : '정보 없음'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#AAA', marginTop: '4px' }}>등록일 수정을 원하시면 관리자에게 문의해주세요.</div>
                    </div>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#B8924A', display: 'block', marginBottom: '0' }}>🏠 주소</label>
                            {!(allowMemberEdit || isAdmin) && <span style={{ fontSize: '11px', color: '#AAA', fontWeight: 500 }}>수정 불가</span>}
                        </div>
                        <input type="text" value={profileForm.address} onChange={e => (allowMemberEdit || isAdmin) && setProfileForm({ ...profileForm, address: e.target.value })} readOnly={!(allowMemberEdit || isAdmin)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: (allowMemberEdit || isAdmin) ? '1px solid #D4AF37' : '1px solid #EEE', outline: 'none', background: (allowMemberEdit || isAdmin) ? 'white' : '#F9F9F9', color: (allowMemberEdit || isAdmin) ? '#333' : '#999', cursor: (allowMemberEdit || isAdmin) ? 'text' : 'not-allowed' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                            <input type="checkbox" id="address_pub" checked={profileForm.is_address_public} onChange={e => setProfileForm({ ...profileForm, is_address_public: e.target.checked })} />
                            <label htmlFor="address_pub" style={{ fontSize: '12px', color: '#888' }}>다른 성도님들께 주소를 공개합니다.</label>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={isSavingProfile || !isDirty}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: isDirty ? '#333' : '#CCC',
                        color: 'white',
                        border: 'none',
                        borderRadius: '15px',
                        fontWeight: 700,
                        cursor: isDirty ? 'pointer' : 'default',
                        marginTop: '30px',
                        transition: 'all 0.3s'
                    }}
                >
                    {isSavingProfile ? '저장 중...' : isDirty ? '💾 정보 수정하기' : '변경사항 없음'}
                </button>
            </div>
        </div>
    );
}

// 성도 검색/주소록 컴포넌트
function MemberSearchView({ churchId, setView, baseFont, isAdmin, isSuperAdmin, user, allAdminList, onRefreshAdmins, isAdminsLoading }: any) {
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState([] as any[]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null as any);
    const [selectedIds, setSelectedIds] = useState([] as string[]);
    const [adminFilter, setAdminFilter] = useState<"all" | "admin" | "user">("all");

    useEffect(() => {
        console.log(`[MemberSearchView] Render - churchId: ${churchId}, isAdmin: ${isAdmin}, isSuperAdmin: ${isSuperAdmin}`);
    }, [churchId, isAdmin, isSuperAdmin]);

    // 수정 모드 상태
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchInitial = async () => {
        setIsSearching(true);
        const isAdminQuery = isAdmin || isSuperAdmin;
        const apiUrl = `/api/members?church_id=${churchId}${isAdminQuery ? '&admin=true' : ''}`;
        console.log(`[MemberSearch] Loading members from: ${apiUrl} (isAdmin: ${isAdmin}, isSuperAdmin: ${isSuperAdmin})`);
        try {
            const res = await fetch(apiUrl, { cache: 'no-store' });
            const data = await res.json();
            if (Array.isArray(data)) {
                setResults(data);
                console.log(`[MemberSearch] Loaded ${data.length} members. First member email: ${data[0]?.email}`);
            }
        } catch (e) { console.error("멤버 로딩 실패:", e); }
        finally { setIsSearching(false); }
    };

    useEffect(() => {
        fetchInitial();
        if (isSuperAdmin && onRefreshAdmins && (!allAdminList || allAdminList.length === 0)) {
            onRefreshAdmins();
        }
        if (allAdminList && allAdminList.length > 0) {
            console.log("MemberSearchView - allAdminList sample:", allAdminList[0]);
        }
    }, [churchId, isAdmin, isSuperAdmin, allAdminList]);

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            fetchInitial();
            return;
        }
        setIsSearching(true);
        const isAdminQuery = isAdmin || isSuperAdmin;
        const apiUrl = `/api/members?church_id=${churchId}&query=${encodeURIComponent(searchTerm)}${isAdminQuery ? '&admin=true' : ''}`;
        console.log(`[MemberSearch] Searching members from: ${apiUrl}`);
        try {
            const res = await fetch(apiUrl, { cache: 'no-store' });
            const data = await res.json();
            if (Array.isArray(data)) {
                setResults(data);
            }
        } catch (e) { console.error("검색 실패:", e); }
        finally { setIsSearching(false); }
    };

    const handleClearSearch = () => {
        setSearchTerm("");
        fetchInitial();
    };



    const filteredResults = results.map(m => {
        const mEmail = (m.email || "").toLowerCase().trim();
        const isAdminFound = (allAdminList || []).some((a: any) => {
            const aEmail = (a.email || "").toLowerCase().trim();
            if (mEmail && aEmail && mEmail === aEmail) {
                console.log(`[AdminMatch] YES: ${m.full_name} (${mEmail})`);
                return true;
            }
            return false;
        });
        return {
            ...m,
            is_system_admin: isAdminFound
        };
    });

    console.log(`[MemberSearch] Filtered results count: ${filteredResults.length}, Admin count: ${filteredResults.filter(m => m.is_system_admin).length}`);

    const finalResults = filteredResults.filter(m => {
        if (adminFilter === "all") return true;
        if (adminFilter === "admin") return m.is_system_admin;
        if (adminFilter === "user") return !m.is_system_admin;
        return true;
    });

    return (
        <div style={{ minHeight: "100vh", background: "#FDFCFB", maxWidth: "600px", margin: "0 auto", padding: "20px", ...baseFont }}>
            {/* 상단 헤더 */}
            <div style={{ position: 'sticky', top: 0, background: '#FDFCFB', zIndex: 100, padding: '10px 0 15px 0', borderBottom: '1px solid #F0F0F0', margin: '0 -20px 24px -20px', paddingLeft: '20px', paddingRight: '20px', paddingTop: 'env(safe-area-inset-top)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '16px' }}>
                    <button onClick={() => setView('home')} style={{ background: "white", border: "1px solid #EEE", borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: "16px", cursor: "pointer", boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>←</button>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#333', margin: 0 }}>교회 성도 검색</h2>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => {
                                setSearchTerm(e.target.value);
                                if (!e.target.value) fetchInitial();
                            }}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            placeholder="성함을 입력하세요 (예: 홍길동)"
                            style={{ width: '100%', padding: '12px 40px 12px 16px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '14px', outline: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}
                        />
                        {searchTerm && (
                            <button
                                onClick={handleClearSearch}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: '#F5F5F5', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', color: '#999', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <button onClick={handleSearch} style={{ padding: '0 18px', height: '44px', background: '#333', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>검색</button>
                    {results.length < (isAdmin ? 5 : 2) && searchTerm && (
                        <button onClick={handleClearSearch} style={{ padding: '0 18px', height: '44px', background: '#F5F5F3', color: '#666', border: '1px solid #EEE', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '13px' }}>전체보기</button>
                    )}
                </div>

                {isSuperAdmin && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                            { id: 'all', label: '전체' },
                            { id: 'admin', label: '👑 관리자만' },
                            { id: 'user', label: '👤 일반 성도만' }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setAdminFilter(opt.id as any)}
                                style={{
                                    padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                    background: adminFilter === opt.id ? '#333' : '#F5F5F3',
                                    color: adminFilter === opt.id ? 'white' : '#666',
                                    border: 'none', transition: 'all 0.2s'
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '10px' }}>
                {/* 단체 문자 발송 섹션 (전체 성도 공개) */}
                {finalResults.length > 0 && (
                    <div style={{ marginBottom: '16px', background: 'white', padding: '16px', borderRadius: '20px', border: '1px solid #F0F0F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                        {/* 💡 기기별 안내 문구 추가 */}
                        <div style={{
                            background: '#F8F9FA',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            color: '#666',
                            lineHeight: 1.5,
                            marginBottom: '15px',
                            border: '1px solid #EEE',
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'flex-start'
                        }}>
                            <span style={{ fontSize: '14px' }}>ℹ️</span>
                            <div>
                                <strong>안드로이드:</strong> '발송' 버튼 클릭 시 바로 단체 문자창이 열립니다.<br />
                                <strong>아이폰:</strong> 시스템 제한으로 인해 <strong>[복사]</strong> 후 메시지 앱에 붙여넣어 주세요.
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                onClick={() => {
                                    if (selectedIds.length === finalResults.length) {
                                        setSelectedIds([]);
                                    } else {
                                        setSelectedIds(finalResults.map(m => m.id));
                                    }
                                }}
                            >
                                <div style={{
                                    width: '20px', height: '20px', borderRadius: '6px', border: '2px solid #333',
                                    background: selectedIds.length > 0 && selectedIds.length === finalResults.length ? '#333' : 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                }}>
                                    {selectedIds.length > 0 && selectedIds.length === finalResults.length && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#333' }}>
                                    전체 선택 ({finalResults.length}명)
                                </span>
                            </div>
                            {selectedIds.length > 0 && (
                                <span style={{ fontSize: '13px', color: '#666', fontWeight: 700 }}>
                                    {selectedIds.length}명 선택됨
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => {
                                    const targetMembers = selectedIds.length > 0 ? finalResults.filter(m => selectedIds.includes(m.id)) : finalResults;
                                    const phones = targetMembers.filter(m => m.phone).map(m => m.phone.replace(/[^0-9]/g, ''));
                                    if (phones.length === 0) {
                                        alert('선택된 성도 중 전화번호가 등록된 분이 없습니다.');
                                        return;
                                    }

                                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                                    const uniquePhones = phones.map(p => p.trim()).filter((v, i, a) => v.length > 0 && a.indexOf(v) === i);

                                    if (uniquePhones.length > 20) {
                                        if (!confirm(`현재 ${uniquePhones.length}명이 선택되었습니다. 통신사 제한으로 인해 문자가 일부만 전송될 수 있습니다. 계속할까요?`)) return;
                                    }

                                    if (isIOS) {
                                        alert('⚠️ 아이폰 안내\n\n아이폰은 브라우저에서 단체 문자를 생성하는 기능을 제한하고 있습니다.\n\n우측의 [복사] 아이콘을 눌러 번호를 복사한 뒤, 메시지 앱 수신인 칸에 붙여넣어 주세요.');
                                        return;
                                    }

                                    // 안드로이드용
                                    const smsUrl = `sms:${uniquePhones.join(';')}`;
                                    const link = document.createElement('a');
                                    link.href = smsUrl;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }}
                                style={{
                                    flex: 4, padding: '14px', background: selectedIds.length > 0 ? '#333' : '#F5F5F3',
                                    color: selectedIds.length > 0 ? 'white' : '#999', border: 'none', borderRadius: '12px',
                                    fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', gap: '8px', transition: 'all 0.3s'
                                }}
                            >
                                💬 {selectedIds.length > 0 ? `발송 (${selectedIds.length}명)` : '단체 문자'}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const targetMembers = selectedIds.length > 0 ? finalResults.filter(m => selectedIds.includes(m.id)) : finalResults;
                                    const phones = targetMembers.filter(m => m.phone).map(m => m.phone.replace(/[^0-9]/g, ''));
                                    if (phones.length === 0) return;
                                    const uniquePhones = phones.filter((v, i, a) => v.length > 0 && a.indexOf(v) === i);

                                    // [아이폰/맥북 붙여넣기 최종 최적화] 01012345678, 01056781234 형식이 수신인 대량 인식이 가장 잘 됩니다.
                                    const textToCopy = uniquePhones.join(', ');

                                    const textArea = document.createElement("textarea");
                                    textArea.value = textToCopy;
                                    textArea.style.position = "fixed";
                                    textArea.style.left = "-9999px";
                                    textArea.style.top = "0";
                                    document.body.appendChild(textArea);
                                    textArea.focus();
                                    textArea.select();

                                    let successful = false;
                                    try { successful = document.execCommand('copy'); } catch (err) { successful = false; }
                                    document.body.removeChild(textArea);

                                    if (successful) {
                                        alert('번호가 복사되었습니다! ✨\n\n메시지 앱 수신인 칸에 붙여넣어 주세요.');
                                    } else {
                                        navigator.clipboard.writeText(textToCopy).then(() => {
                                            alert('번호가 복사되었습니다! ✨');
                                        }).catch(() => {
                                            alert('복사에 실패했습니다.');
                                        });
                                    }
                                }}
                                style={{
                                    flex: 1, padding: '14px', background: '#F5F5F3', color: '#555', border: '1px solid #E5E5E5',
                                    borderRadius: '12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                📋 복사
                            </button>
                        </div>
                    </div>
                )}

                {/* 오늘의 생일 알림 */}
                {(() => {
                    const kstBase = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
                    const todaySolarMMDD = kstBase.toISOString().slice(5, 10);
                    const todayLunarMMDD = getLunarTodayMMDD();
                    const birthdayMembers = (finalResults || []).filter(m => {
                        if (!m?.birthdate) return false;
                        const bd = String(m.birthdate).slice(5, 10);
                        return m.is_birthdate_lunar ? (todayLunarMMDD && bd === todayLunarMMDD) : bd === todaySolarMMDD;
                    });
                    if (birthdayMembers.length > 0) {
                        return (
                            <div style={{ background: 'linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)', padding: '16px', borderRadius: '20px', marginBottom: '16px', border: '1px solid #FFF176', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 15px rgba(255,235,59,0.2)' }}>
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

                {/* 성도 목록 리스트 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                    {isSearching ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>성도 정보를 불러오는 중...</div>
                    ) : finalResults.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>결과가 없습니다.</div>
                    ) : (
                        finalResults.map(member => (
                            <div
                                key={member.id}
                                onClick={() => setSelectedMember(member)}
                                style={{
                                    background: 'white', padding: '16px', borderRadius: '20px',
                                    border: selectedIds.includes(member.id) ? '2px solid #333' : '1px solid #F0ECE4',
                                    display: 'flex', gap: '14px', alignItems: 'flex-start',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer',
                                    transition: 'all 0.2s', position: 'relative'
                                }}
                            >
                                {member.is_system_admin && (
                                    <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '10px', background: '#333', color: 'white', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>👑 관리자</div>
                                )}
                                {true && (
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedIds(prev => prev.includes(member.id) ? prev.filter(id => id !== member.id) : [...prev, member.id]);
                                        }}
                                        style={{
                                            width: '22px', height: '22px', borderRadius: '7px', border: '2px solid #333',
                                            background: selectedIds.includes(member.id) ? '#333' : 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', flexShrink: 0, marginTop: '11px'
                                        }}
                                    >
                                        {selectedIds.includes(member.id) && <span style={{ color: 'white', fontSize: '14px' }}>✓</span>}
                                    </div>
                                )}
                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F5F2EA', overflow: 'hidden', flexShrink: 0 }}>
                                    <img alt="" src={member.avatar_url || 'https://via.placeholder.com/44'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#333' }}>{member.full_name}</span>
                                        {member.church_rank && <span style={{ fontSize: '11px', background: '#F5F2EA', color: '#B8924A', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>{member.church_rank}</span>}
                                        {member.gender && <span style={{ fontSize: '11px', background: '#F5F5F5', color: '#666', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>{member.gender}</span>}
                                        {member.member_no && <span style={{ fontSize: '11px', background: '#E3F2FD', color: '#1565C0', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>{member.member_no}</span>}
                                    </div>
                                    <div style={{ fontSize: '12px', color: member.phone ? '#555' : '#BBB' }}>
                                        📞 {formatPhone(member.phone) || (member.is_phone_public ? '미등록' : '비공개')}
                                    </div>
                                </div>

                                {member.phone && (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); window.location.href = `sms:${member.phone.replace(/[^0-9]/g, '')}`; }} style={{ background: '#E3F2FD', border: 'none', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}>💬</button>
                                        <button onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${member.phone}`; }} style={{ background: '#E8F5E9', border: 'none', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}>📞</button>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* 상세 정보 모달 */}
                {selectedMember && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'end', justifyContent: 'center' }} onClick={() => { if (!isEditing) setSelectedMember(null); }}>
                        <div style={{ background: 'white', width: '100%', maxWidth: '600px', borderRadius: '32px 32px 0 0', padding: '30px 24px 40px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setSelectedMember(null); setIsEditing(false); }} style={{ position: 'absolute', top: '20px', right: '20px', background: '#F5F5F3', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '18px' }}>×</button>

                            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#F5F2EA', margin: '0 auto 12px', overflow: 'hidden', border: '1px solid #F0ECE4' }}>
                                    <img alt="" src={selectedMember.avatar_url || 'https://via.placeholder.com/100'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                {!isEditing && (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#333', margin: '0 0 6px' }}>{selectedMember.full_name}</h3>
                                            {selectedMember.is_system_admin && <span style={{ background: '#333', color: 'white', fontSize: '10px', padding: '2px 8px', borderRadius: '6px', fontWeight: 900, marginBottom: '6px' }}>ADMIN</span>}
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                            {selectedMember.church_rank && <span style={{ fontSize: '13px', background: '#F5F2EA', color: '#B8924A', padding: '3px 10px', borderRadius: '8px', fontWeight: 700 }}>{selectedMember.church_rank}</span>}
                                            {selectedMember.member_no && <span style={{ fontSize: '13px', background: '#E3F2FD', color: '#1565C0', padding: '3px 10px', borderRadius: '8px', fontWeight: 700 }}>교적 {selectedMember.member_no}</span>}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* [추가] 로딩 중에는 권한 버튼 숨기기 */}
                            {isSuperAdmin && selectedMember.email && isAdminsLoading && !isEditing && (
                                <div style={{ textAlign: 'center', margin: '20px 0', color: '#999', fontSize: '12px' }}>관리자 정보를 확인 중입니다...</div>
                            )}

                            {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#B8924A', display: 'block', marginBottom: '4px' }}>성함</label>
                                        <input type="text" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #DDD', outline: 'none' }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#B8924A', display: 'block', marginBottom: '4px' }}>직분</label>
                                            <input type="text" value={editForm.church_rank} onChange={e => setEditForm({ ...editForm, church_rank: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #DDD', outline: 'none' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#B8924A', display: 'block', marginBottom: '4px' }}>교적번호</label>
                                            <input type="text" value={editForm.member_no} onChange={e => setEditForm({ ...editForm, member_no: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #DDD', outline: 'none' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#B8924A', display: 'block', marginBottom: '4px' }}>연락처</label>
                                        <input type="tel" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #DDD', outline: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#B8924A', display: 'block', marginBottom: '4px' }}>생년월일 (YYYY-MM-DD)</label>
                                        <input type="text" value={editForm.birthdate} onChange={e => setEditForm({ ...editForm, birthdate: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #DDD', outline: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#B8924A', display: 'block', marginBottom: '4px' }}>주소</label>
                                        <input type="text" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #DDD', outline: 'none' }} />
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                        <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '14px', background: '#EEE', color: '#666', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>취소</button>
                                        <button
                                            onClick={async () => {
                                                setIsSaving(true);
                                                try {
                                                    const res = await fetch('/api/admin', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ action: 'update_member', user_id: selectedMember.id, update_data: editForm, requester_id: user?.id, requester_email: user?.email })
                                                    });
                                                    if (res.ok) {
                                                        alert('성도 정보가 수정되었습니다.');
                                                        // 로컬 상태 업데이트
                                                        const updated = { ...selectedMember, ...editForm };
                                                        setSelectedMember(updated);
                                                        setResults(results.map(m => m.id === selectedMember.id ? updated : m));
                                                        setIsEditing(false);
                                                    } else {
                                                        const errData = await res.json();
                                                        alert(`수정 실패: ${errData.error || '알 수 없는 오류'}`);
                                                    }
                                                } catch (e: any) { alert(`수정 중 오류가 발생했습니다: ${e.message}`); }
                                                finally { setIsSaving(false); }
                                            }}
                                            disabled={isSaving}
                                            style={{ flex: 2, padding: '14px', background: '#333', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            {isSaving ? '저장 중...' : '확인 (수정 완료)'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ background: '#FDFCFB', padding: '20px', borderRadius: '24px', border: '1px solid #F0ECE4' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontSize: '12px', color: '#B8924A', fontWeight: 700 }}>휴대폰 번호</div>
                                                    <div style={{ fontSize: '16px', fontWeight: 600 }}>{formatPhone(selectedMember.phone) || '미등록'}</div>
                                                    <div style={{ fontSize: '11px', color: '#AAA', marginTop: '2px' }}>{selectedMember.email || '이메일 정보 없음'}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    {selectedMember.phone && <a href={`tel:${selectedMember.phone}`} style={{ textDecoration: 'none', background: '#333', color: 'white', padding: '10px 16px', borderRadius: '14px', fontSize: '13px', fontWeight: 700 }}>📞 전화</a>}
                                                    {selectedMember.phone && <a href={`sms:${selectedMember.phone}`} style={{ textDecoration: 'none', background: '#F5F5F3', color: '#555', padding: '10px 16px', borderRadius: '14px', fontSize: '13px', fontWeight: 700 }}>💬 문자</a>}
                                                </div>
                                            </div>
                                            <div style={{ borderTop: '1px solid #F0ECE4', paddingTop: '15px' }}>
                                                <div style={{ fontSize: '12px', color: '#B8924A', fontWeight: 700 }}>생년월일</div>
                                                <div style={{ fontSize: '16px', fontWeight: 600 }}>{selectedMember.birthdate || '미등록'}</div>
                                            </div>
                                            <div style={{ borderTop: '1px solid #F0ECE4', paddingTop: '15px' }}>
                                                <div style={{ fontSize: '12px', color: '#B8924A', fontWeight: 700 }}>주소</div>
                                                <div style={{ fontSize: '16px', fontWeight: 600 }}>{selectedMember.address || '미등록'}</div>
                                            </div>
                                        </div>
                                    </div>



                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '24px' }}>
                                        {isAdmin && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setEditForm({
                                                            full_name: selectedMember.full_name || '',
                                                            church_rank: selectedMember.church_rank || '',
                                                            member_no: selectedMember.member_no || '',
                                                            phone: selectedMember.phone || '',
                                                            birthdate: selectedMember.birthdate || '',
                                                            address: selectedMember.address || ''
                                                        });
                                                        setIsEditing(true);
                                                    }}
                                                    style={{ flex: 1, minWidth: '120px', padding: '16px', background: '#D4AF37', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    ✏️ 정보 수정
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`[주의] ${selectedMember.full_name} 성도님을 정말 삭제하시겠습니까?`)) {
                                                            setIsSaving(true);
                                                            try {
                                                                const res = await fetch('/api/admin', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ action: 'delete_member', user_id: selectedMember.id })
                                                                });
                                                                if (res.ok) {
                                                                    alert('삭제되었습니다.');
                                                                    setResults(results.filter(m => m.id !== selectedMember.id));
                                                                    setSelectedMember(null);
                                                                }
                                                            } catch (e) { alert('삭제 중 오류 발생'); }
                                                            finally { setIsSaving(false); }
                                                        }
                                                    }}
                                                    style={{ padding: '16px', background: '#FFE5E5', color: '#D32F2F', border: 'none', borderRadius: '16px', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    🗑️ 삭제
                                                </button>
                                            </>
                                        )}
                                        <button onClick={() => setSelectedMember(null)} style={{ flex: 1, minWidth: '80px', padding: '16px', background: '#F5F5F3', color: '#666', border: 'none', borderRadius: '16px', fontWeight: 700, cursor: 'pointer' }}>닫기</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
