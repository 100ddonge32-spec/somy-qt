/**
 * 오늘의 CCM 목록 및 로직
 */

export interface CcmVideo {
    title: string;
    artist: string;
    youtubeId: string;
}

export const CCM_LIST: CcmVideo[] = [
    { title: "피아노 찬양 연주 1", artist: "추천 BGM", youtubeId: "0wcxl81QclQ" },
    { title: "잔잔한 묵상 찬양 2", artist: "추천 BGM", youtubeId: "IA2pklNBJNM" },
    { title: "은혜로운 기도 음악 3", artist: "추천 BGM", youtubeId: "f742p7mQ0Ic" },
    { title: "평안한 피아노 모음 4", artist: "추천 BGM", youtubeId: "i9HNOJmCVi8" }
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
