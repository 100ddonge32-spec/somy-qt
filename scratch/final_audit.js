
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let braceBalance = 0;
let divBalance = 0;
let inString = null;

for (let i = 0; i < lines.length; i++) {
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
            } else if (char === '{') {
                braceBalance++;
            } else if (char === '}') {
                braceBalance--;
            } else if (line.substring(j).startsWith('<div')) {
                let k = j;
                let isSelfClosing = false;
                let tempI = i;
                let tempLine = line;
                while (tempI < lines.length) {
                    const closeIndex = tempLine.indexOf('>', k);
                    if (closeIndex !== -1) {
                        if (tempLine[closeIndex - 1] === '/') isSelfClosing = true;
                        break;
                    }
                    tempI++;
                    tempLine = lines[tempI] || '';
                    k = 0;
                }
                if (!isSelfClosing) divBalance++;
                j += 3;
            } else if (line.substring(j).startsWith('</div')) {
                divBalance--;
                j += 4;
            }
        }
    }
}
console.log(`Global Brace Balance: ${braceBalance}`);
console.log(`Global Div Balance: ${divBalance}`);
