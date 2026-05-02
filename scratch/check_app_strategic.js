
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let braceBalance = 0;
const braceRegex = /{|}/g;

for (let i = 0; i < 9790; i++) {
    const line = lines[i];
    let match;
    while ((match = braceRegex.exec(line)) !== null) {
        if (match[0] === '{') braceBalance++;
        else braceBalance--;
    }
    if (i + 1 === 1843 || i + 1 === 1930 || i + 1 === 2612 || i + 1 === 2613 || i + 1 === 7586 || i + 1 === 7587 || i + 1 === 8604 || i + 1 === 8605 || i + 1 === 8728 || i + 1 === 8729 || i + 1 === 8733 || i + 1 === 8795 || i + 1 === 8796 || i + 1 === 9703 || i + 1 === 9788) {
        console.log(`${i + 1}: [${braceBalance}] ${line.trim()}`);
    }
}
