/**
 * 오늘의 CCM 목록 및 로직
 */

export interface CcmVideo {
    title: string;
    artist: string;
    youtubeId: string;
}

export const CCM_LIST: CcmVideo[] = [
    { title: "하나님의 은혜 (1시간 피아노)", artist: "크리스찬 BGM", youtubeId: "_P-sN1pY9h8" },
    { title: "입례 Welove (1시간 피아노)", artist: "크리스찬 BGM", youtubeId: "0wQ7-Y5aYw0" },
    { title: "밤이나 낮이나 (1시간 묵상 BGM)", artist: "크리스찬 BGM", youtubeId: "W3a4gV9R_r4" },
    { title: "사명 & 은혜 (피아노 연주 모음)", artist: "오베델 뮤직", youtubeId: "1rY9aB8_k_I" },
    { title: "그가 오신 이유 (마커스워십 피아노)", artist: "크리스찬 BGM", youtubeId: "r_8aYh6hQvU" },
    { title: "은혜, 오직 은혜로 (1시간 연주)", artist: "크리스찬 BGM", youtubeId: "Hn60Hn6Yf0I" }, // 예시 ID
    { title: "내 영혼이 은총 입어 (찬송가 피아노)", artist: "크리스찬 BGM", youtubeId: "qZ19aV9Z_zU" }, // 예시 ID
    { title: "예수 사랑하심은 (감성 피아노)", artist: "크리스찬 BGM", youtubeId: "Kq28bB0K_0A" }, // 예시 ID
    { title: "공감하시네 (1시간 깊은 묵상)", artist: "크리스찬 BGM", youtubeId: "P_p9aQ8H_xU" }, // 예시 ID
    { title: "깊은 기도 피아노 찬양 1시간", artist: "오베델 뮤직", youtubeId: "Z_c0Zc0X_qE" }  // 예시 ID
];

/**
 * 오늘 날짜에 맞는 CCM 비디오를 반환합니다.
 */
export function getTodayCcm(): CcmVideo {
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // KST
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (24 * 60 * 60 * 1000));
    const index = dayOfYear % CCM_LIST.length;
    return CCM_LIST[index];
}
