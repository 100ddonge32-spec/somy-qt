
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let braceBalance = 0;
const braceRegex = /{|}/g;
let lastBalance1 = 0;

for (let i = 355; i < 8733; i++) {
    const line = lines[i];
    let match;
    while ((match = braceRegex.exec(line)) !== null) {
        if (match[0] === '{') braceBalance++;
        else braceBalance--;
    }
    if (braceBalance === 1) {
         lastBalance1 = i + 1;
    }
}
console.log(`Last line with balance 1: ${lastBalance1}`);
