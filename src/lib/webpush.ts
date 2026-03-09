// [Build Trigger] VAPID Key synchronization v2
import webpush from 'web-push';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BGAg9ENzg-N1bQery6o2tP81mCNE_RARV_fPj9kwxNo9-OOc1B7nm0aW3QhDcnLZQOU6TciWQez_XdBCf5hfCFw';
const privateKey = process.env.VAPID_PRIVATE_KEY || 'H5QHbNcikhFs6Fm9fc-9Y-hZVXRHAtkAIt1XFljdvBY';

if (typeof window === 'undefined') {
    if (publicKey && privateKey) {
        try {
            webpush.setVapidDetails(
                'mailto:pastorbaek@kakao.com',
                publicKey,
                privateKey
            );
        } catch (error) {
            console.error('[WebPush] Failed to set VAPID details:', error);
        }
    } else {
        console.warn('[WebPush] VAPID keys missing. Notifications may fail.');
    }
}

export default webpush;
