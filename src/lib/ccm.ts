/**
 * 오늘의 CCM 목록 및 로직
 */

export interface CcmVideo {
    title: string;
    artist: string;
    youtubeId: string;
}

export const CCM_LIST: CcmVideo[] = [
    { title: "은혜로운 피아노 묵상", artist: "Worship Piano", youtubeId: "8Z5EQB6k0eU" },
    { title: "조용한 아침의 묵상", artist: "Peaceful Strings", youtubeId: "c_sC_I0H0wA" },
    { title: "평안을 주는 찬양 연주", artist: "Soothing Worship", youtubeId: "y1K_p1uI4pQ" },
    { title: "마음을 위로하는 피아노", artist: "DappyTKeys", youtubeId: "WlM2R_tVItg" },
    { title: "깊은 기도와 묵상", artist: "Instrumental", youtubeId: "1zyT1H5TJUg" },
    { title: "치유와 회복의 시간", artist: "Healing Piano", youtubeId: "h3A0gB_0p7M" },
    { title: "아침을 여는 찬양", artist: "Morning Worship", youtubeId: "nrWxqWf62eM" },
    { title: "주님과 함께하는 쉼", artist: "Relaxing BGM", youtubeId: "lTRiuFIWV54" },
    { title: "잔잔한 은혜의 선율", artist: "Graceful Piano", youtubeId: "WJToJq6L8OQ" },
    { title: "주의 품에 안기어", artist: "Warm Worship", youtubeId: "7T_1j-V4I3E" },
    { title: "영혼을 울리는 피아노", artist: "Soulful Piano", youtubeId: "JbTo23kLkiQ" },
    { title: "고요한 묵상의 밤", artist: "Night Prayer", youtubeId: "-FlxM_0S2lA" },
    { title: "은은한 기타와 건반", artist: "Acoustic Worship", youtubeId: "R7jO1BGEJqE" },
    { title: "시편의 고백 연주", artist: "Psalms Piano", youtubeId: "bAobC2EOfxY" },
    { title: "천국의 평안", artist: "Heavenly Peace", youtubeId: "9i4Bq_PjQpY" },
    { title: "새 힘을 얻는 시간", artist: "Renewal Worship", youtubeId: "_M-A5gD-06c" },
    { title: "오직 주님만 바라보며", artist: "Focus on Him", youtubeId: "LtbXzN4g_0I" },
    { title: "성령의 단비", artist: "Holy Spirit Piano", youtubeId: "jW8x-9I_oK8" },
    { title: "주를 향한 사랑 (Lo-Fi)", artist: "Lofi Worship", youtubeId: "jfKfPfyJRdk" },
    { title: "내 영혼이 은총 입어", artist: "Classic Hymn Piano", youtubeId: "5qap5aO4i9A" }
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
