// [Build Trigger] VAPID Key synchronization v2
import webpush from 'web-push';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BCpTn0SHIYSZzjST5xxL1Cv9svmlp3f9Xmvt9FSALBvo4QwLQCBlo_mu4ThoMHgINRmAk4c9sxwVwI2QtDyHr1I';
const privateKey = process.env.VAPID_PRIVATE_KEY || 'LAAS6aJenIKYBShIGZsWVKhXNOMKwkuXvpf2NLCGZAI';

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
