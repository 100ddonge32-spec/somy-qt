const wp = require('web-push');
const keys = wp.generateVAPIDKeys();
console.log('--- VAPID KEYS ---');
console.log('PUBLIC_KEY: ' + keys.publicKey);
console.log('PRIVATE_KEY: ' + keys.privateKey);
console.log('------------------');
