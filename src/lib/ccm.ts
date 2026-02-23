/**
 * 오늘의 CCM 목록 및 로직
 */

export interface CcmVideo {
    title: string;
    artist: string;
    youtubeId: string;
    playlistId?: string;
}

export const CCM_LIST: CcmVideo[] = [
    // 밤의 별TV 영상은 유튜브 정책(퍼가기 클릭 금지)으로 앱 내 재생이 불가하여 임시로 다른 영상으로 교체했습니다.
    // 대표님, 앱에서 재생 가능한 '다른' 저작권 프리 찬양 영상 주시면 바로 반영하겠습니다!
    {
        title: "은혜로운 피아노 찬양 (앱 내 재생 호환)",
        artist: "소미 추천 BGM",
        youtubeId: "W3a4gV9R_r4"
    }
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
