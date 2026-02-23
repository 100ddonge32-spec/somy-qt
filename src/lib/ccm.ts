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
    {
        title: "잔잔한 피아노 찬양 모음",
        artist: "오늘의 은혜 CCM",
        youtubeId: "IA2pklNBJNM",
        playlistId: "PLmq1G_u7navHEgAsM6jycEQ33zdIhZbcP"
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
