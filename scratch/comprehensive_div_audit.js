
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let stack = [];
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
            } else if (line.substring(j).startsWith('<div')) {
                // Find closing >
                let k = j + 1;
                let found = false;
                let isSelf = false;
                let b = 0;
                let s = null;
                let curI = i;
                let curL = line;
                let idx = k;
                while (curI < lines.length) {
                    while (idx < curL.length) {
                        const c = curL[idx];
                        if (s) { if (c === s && curL[idx-1] !== '\\') s = null; }
                        else if (c === '"' || c === "'" || c === '`') s = c;
                        else if (c === '{') b++;
                        else if (c === '}') b--;
                        else if (c === '>' && b === 0) {
                            if (curL[idx-1] === '/') isSelf = true;
                            found = true;
                            break;
                        }
                        idx++;
                    }
                    if (found) break;
                    curI++;
                    curL = lines[curI] || '';
                    idx = 0;
                }
                if (!isSelf) {
                    stack.push({ line: i + 1, type: 'div' });
                }
                j = idx;
            } else if (line.substring(j).startsWith('</div')) {
                if (stack.length > 0) {
                    stack.pop();
                } else {
                    console.log(`EXTRA CLOSING DIV at line ${i+1}`);
                }
                j += 4;
            }
        }
    }
}
console.log(`Unclosed tags: ${stack.length}`);
stack.forEach(s => console.log(`Unclosed ${s.type} from line ${s.line}`));
