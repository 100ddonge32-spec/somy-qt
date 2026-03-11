// [Build Trigger] VAPID Key synchronization v2
import webpush from 'web-push';

const publicKey = 'BCb9VfYqqCOBO2MhVKC65TP2eAQw_bJoFRl4JgqU64ze2AImucB1H6GV1m78F7BuxPaGGRvETl1ACMdkVwTxIKQ';
const privateKey = 'bh-AhDK0mUyEyR-kQUiLrfdJYIp2SFDLAJUAjrUIS2Q';

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
