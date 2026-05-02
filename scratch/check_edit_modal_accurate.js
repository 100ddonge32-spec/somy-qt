
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let divBalance = 0;
let inString = null;

for (let i = 8147; i < 8295; i++) {
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
                let tempJ = j + 1;
                let foundClosing = false;
                let isSelfClosing = false;
                let braceDepth = 0;
                let stringChar = null;
                let curI = i;
                let curLine = line;
                let searchIdx = tempJ;
                while (curI < lines.length) {
                    while (searchIdx < curLine.length) {
                        const c = curLine[searchIdx];
                        if (stringChar) {
                            if (c === stringChar && curLine[searchIdx-1] !== '\\') stringChar = null;
                        } else if (c === '"' || c === "'" || c === '`') {
                            stringChar = c;
                        } else if (c === '{') {
                            braceDepth++;
                        } else if (c === '}') {
                            braceDepth--;
                        } else if (c === '>' && braceDepth === 0) {
                            if (curLine[searchIdx-1] === '/') isSelfClosing = true;
                            foundClosing = true;
                            break;
                        }
                        searchIdx++;
                    }
                    if (foundClosing) break;
                    curI++;
                    curLine = lines[curI] || '';
                    searchIdx = 0;
                }
                if (!isSelfClosing) divBalance++;
                j = searchIdx;
            } else if (line.substring(j).startsWith('</div')) {
                divBalance--;
                j += 4;
            }
        }
    }
}
console.log(`MemberEditModal Div Balance: ${divBalance}`);
