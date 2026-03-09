// [Build Trigger] VAPID Key synchronization v2
import webpush from 'web-push';

// [VAPID 고정] Vercel 환경변수 오타 방지를 위해 정식 키를 직접 고정합니다. 목사님 403 오류 해결용.
const publicKey = 'BLlCJTG1YSphGl3g5yBvK7vfsiuaox9zxj0urmvTa02LZQ3x_AoEWJRl8tEcouvVVOm3nq_qepmLA8dFpAFDH6o';
const privateKey = 'LXNMKdBeaEo6Vw_HKC8SoJ7D37ewn3h62-jO6OG1XvI';

if (typeof window === 'undefined') {
    try {
        console.log('[WebPush] Server-side VAPID init with fixed keys (verified pair)...');
        webpush.setVapidDetails(
            'mailto:admin@somy-qt.vercel.app',
            publicKey,
            privateKey
        );
    } catch (error) {
        console.error('[WebPush] Failed to set VAPID details:', error);
    }
}

export default webpush;
