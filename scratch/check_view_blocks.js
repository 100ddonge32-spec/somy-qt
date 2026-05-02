
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 2613; i < 7586; i++) {
    const line = lines[i];
    if (line.includes('if (view ===')) {
        let divBalance = 0;
        let inString = null;
        let startLine = i + 1;
        let j = i;
        let braceBalance = 0;
        while (j < 7586) {
            const l = lines[j];
            for (let k = 0; k < l.length; k++) {
                const char = l[k];
                if (inString) {
                    if (char === inString) {
                        if (l[k-1] !== '\\') inString = null;
                    }
                } else {
                    if (char === '"' || char === "'" || char === '`') {
                        inString = char;
                    } else if (char === '{') {
                        braceBalance++;
                    } else if (char === '}') {
                        braceBalance--;
                    } else if (l.substring(k).startsWith('<div')) {
                        let m = k;
                        let isSelfClosing = false;
                        let tempJ = j;
                        let tempLine = l;
                        while (tempJ < lines.length) {
                            const closeIndex = tempLine.indexOf('>', m);
                            if (closeIndex !== -1) {
                                if (tempLine[closeIndex - 1] === '/') isSelfClosing = true;
                                break;
                            }
                            tempJ++;
                            tempLine = lines[tempJ] || '';
                            m = 0;
                        }
                        if (!isSelfClosing) divBalance++;
                        k += 3;
                    } else if (l.substring(k).startsWith('</div')) {
                        divBalance--;
                        k += 4;
                    }
                }
            }
            if (braceBalance === 0 && j > i) break;
            j++;
        }
        if (divBalance !== 0) {
            console.log(`Block starting at line ${startLine} (${line.trim()}) has div balance ${divBalance}`);
        }
    }
}
