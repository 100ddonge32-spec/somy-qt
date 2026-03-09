// [Build Trigger] VAPID Key synchronization v2
import webpush from 'web-push';

// [VAPID 고정] Vercel 환경변수 오타 방지를 위해 정식 키를 직접 고정합니다. 목사님 403 오류 해결용.
const publicKey = 'BGAg9ENzg-N1bQery6o2tP81mCNE_RARV_fPj9kwxNo9-OOc1B7nm0aW3QhDcnLZQOU6TciWQez_XdBCf5hfCFw';
const privateKey = 'H5QHbNcikhFs6Fm9fc-9Y-hZVXRHAtkAIt1XFljdvBY';

if (typeof window === 'undefined') {
    try {
        console.log('[WebPush] Server-side VAPID init with fixed keys...');
        webpush.setVapidDetails(
            'mailto:pastorbaek@kakao.com',
            publicKey,
            privateKey
        );
    } catch (error) {
        console.error('[WebPush] Failed to set VAPID details:', error);
    }
}

export default webpush;
