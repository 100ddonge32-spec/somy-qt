
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
    if (braceBalance > 1) {
        // Log the first time it hits 2 and stays high
        // This is hard, I'll just log all transitions to 1
    }
    if (line.trim().endsWith('};') && braceBalance !== 1) {
         console.log(`Potential mismatch at line ${i + 1}: [${braceBalance}] ${line.trim()}`);
    }
}
