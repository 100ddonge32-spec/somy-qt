/**
 * 오늘의 CCM 목록 및 로직
 */

export interface CcmVideo {
    title: string;
    artist: string;
    youtubeId: string;
}

export const CCM_LIST: CcmVideo[] = [
    { title: "은혜", artist: "손경민", youtubeId: "dpLtoX9uGvU" },
    { title: "꽃들도", artist: "마커스워십", youtubeId: "vB-SAnfWf2Y" },
    { title: "나는 믿네", artist: "어노인팅", youtubeId: "vBf4pE_W6Qo" },
    { title: "길을 만드시는 주", artist: "레위지파", youtubeId: "nrWxqWf62eM" },
    { title: "주 품에", artist: "어노인팅", youtubeId: "MclIn_v_oRE" },
    { title: "소원", artist: "한웅재", youtubeId: "r7WlG7p7W4Y" },
    { title: "하나님의 세계", artist: "홍이삭", youtubeId: "0B6Jp_r-oHw" },
    { title: "시간을 뚫고", artist: "WELOVE", youtubeId: "mNnBQu_5WQU" },
    { title: "요게벳의 노래", artist: "염평안", youtubeId: "6p6u8f3X3mI" },
    { title: "시편 139편", artist: "제이어스", youtubeId: "XQxK8oGz6zM" },
    { title: "광야를 지나며", artist: "히즈윌", youtubeId: "i7GOCn91Wq8" },
    { title: "주의 친절한 팔에 안기세", artist: "어노인팅", youtubeId: "uCidGleW2Vw" },
    { title: "원하고 바라고 기도합니다", artist: "민호기", youtubeId: "O9549fJm0E4" },
    { title: "그가 다스리는 그의 나라에서", artist: "마커스워십", youtubeId: "kLidV9E9M5w" },
    { title: "내 모습 이대로", artist: "제이어스", youtubeId: "rA4Y6XidM-s" },
    { title: "주께 가오니", artist: "어노인팅", youtubeId: "Y_zpx9mN6L8" },
    { title: "나 무엇과도 주님을", artist: "어노인팅", youtubeId: "uAByM86O9j4" },
    { title: "예수 사랑하심은", artist: "예수전도단", youtubeId: "2hM-oQpP2iE" },
    { title: "송축해 내 영혼", artist: "맷 레드먼", youtubeId: "XtwIT8vjV68" },
    { title: "공감하시네", artist: "WELOVE", youtubeId: "pXq7G_P67m8" }
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
