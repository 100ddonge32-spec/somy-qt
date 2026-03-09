// [Build Trigger] VAPID Key synchronization v2
import webpush from 'web-push';

const publicKey = 'BE2FplgPf9AbVOwlpoOgFrSPjAMRfuJcxMIQBn3Hm_HoY5oLzRk13Hq99oVt7dG5FgQd3Z5W1Xoe_6-KaeuK558';
const privateKey = '794ULAs705fT41boCcyNWYSlvACNRUVTnYXlnWcmKyk';

function initWebPush() {
    try {
        console.log('[WebPush] Initializing VAPID (Fixed Pair)...');
        webpush.setVapidDetails(
            'mailto:admin@somy-qt.vercel.app',
            publicKey,
            privateKey
        );
        return true;
    } catch (error) {
        console.error('[WebPush] Initialization Error:', error);
        return false;
    }
}

// 모듈 로드 시 즉시 초기화 실행
initWebPush();

export default webpush;
