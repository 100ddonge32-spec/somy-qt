
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let braceBalance = 0;
const braceRegex = /{|}/g;

for (let i = 355; i < 8733; i++) {
    const line = lines[i];
    let match;
    while ((match = braceRegex.exec(line)) !== null) {
        if (match[0] === '{') braceBalance++;
        else braceBalance--;
    }
    if (braceBalance === 1) {
         // console.log(`Balance 1 at line ${i + 1}: ${line.trim()}`);
    } else if (i > 8000) {
        // Log all lines at the end to see the final balance transition
        console.log(`${i + 1}: [${braceBalance}] ${line.trim()}`);
    }
}
