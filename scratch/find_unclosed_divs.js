
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let divStack = [];
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
                let k = j;
                let isSelfClosing = false;
                let tempI = i;
                let tempLine = line;
                let tagContent = "";
                while (tempI < lines.length) {
                    const closeIndex = tempLine.indexOf('>', k);
                    if (closeIndex !== -1) {
                        tagContent += tempLine.substring(k, closeIndex + 1);
                        if (tempLine[closeIndex - 1] === '/') isSelfClosing = true;
                        // Better self-closing check: check for /> ignoring spaces
                        if (tempLine.substring(0, closeIndex + 1).match(/\/\s*>$/)) isSelfClosing = true;
                        break;
                    }
                    tagContent += tempLine.substring(k) + "\n";
                    tempI++;
                    tempLine = lines[tempI] || '';
                    k = 0;
                }
                if (!isSelfClosing) {
                    divStack.push({ line: i + 1, content: tagContent.substring(0, 50).replace(/\n/g, ' ') });
                }
                j += 3;
            } else if (line.substring(j).startsWith('</div')) {
                divStack.pop();
                j += 4;
            }
        }
    }
}
console.log(`Unclosed divs: ${divStack.length}`);
divStack.forEach(d => console.log(`Line ${d.line}: ${d.content}`));
