
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let braceBalance = 0;
const braceRegex = /{|}/g;

for (let i = 356; i < 8733; i++) {
    const line = lines[i];
    let match;
    while ((match = braceRegex.exec(line)) !== null) {
        if (match[0] === '{') braceBalance++;
        else braceBalance--;
    }
    if (line.trim().endsWith('};') || line.trim() === '}' || line.trim() === '});') {
        if (braceBalance !== 0) {
            console.log(`${i + 1}: [${braceBalance}] ${line.trim()}`);
        }
    }
}
