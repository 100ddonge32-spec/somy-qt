
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let divBalance = 0;
let inString = null;

for (let i = 9511; i < 9672; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (inString) {
            if (char === inString) {
                if (line[j-1] !== '\\') inString = null;
            }
        } else {
            if (char === '"' || char === "'" || char === '`') {
                inString = char;
            } else if (line.substring(j).startsWith('<div')) {
                let k = j;
                let isSelf = false;
                let tI = i;
                let tL = line;
                while (tI < lines.length) {
                    const cIdx = tL.indexOf('>', k);
                    if (cIdx !== -1) {
                        if (tL[cIdx-1] === '/') isSelf = true;
                        break;
                    }
                    tI++;
                    tL = lines[tI] || '';
                    k = 0;
                }
                if (!isSelf) divBalance++;
                j += 3;
            } else if (line.substring(j).startsWith('</div')) {
                divBalance--;
                j += 4;
            }
        }
    }
}
console.log(`Master Tab Div Balance: ${divBalance}`);
