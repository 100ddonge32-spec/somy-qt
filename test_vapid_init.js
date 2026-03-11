const webpush = require('web-push');

const publicKey = 'BCb9VfYqqCOBO2MhVKC65TP2eAQw_bJoFRl4JgqU64ze2AImucB1H6GV1m78F7BuxPaGGRvETl1ACMdkVwTxIKQ';
const privateKey = 'bh-AhDK0mUyEyR-kQUiLrfdJYIp2SFDLAJUAjrUIS2Q';

try {
    webpush.setVapidDetails(
        'mailto:admin@somy-qt.vercel.app',
        publicKey,
        privateKey
    );
    console.log('VAPID Initialization SUCCESS');
} catch (e) {
    console.error('VAPID Initialization FAILED:', e.message);
}
