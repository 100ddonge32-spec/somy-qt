// [Build Trigger] VAPID Key synchronization v2
import webpush from 'web-push';

// [VAPID 고정] Vercel 환경변수 오타 방지를 위해 정식 키를 직접 고정합니다. 목사님 403 오류 해결용.
const publicKey = 'BN25jHrUt2ht282iRLuIgiR3vaVhmZHjNwVxMTGULUI5LRUMMo-jtkrOXD5wew6FkxE5OUJIa4nRgrrD1KdzOQ0';
const privateKey = 'Wi4NvZq2A_x7jiEFBzeAVccfkfzubWsHvKayZZ3MGMg';

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
