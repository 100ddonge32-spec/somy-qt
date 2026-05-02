
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
                // Find the matching > for this <div
                let k = j + 4;
                let depth = 1;
                let foundClosing = false;
                let tagContent = "<div";
                let tempI = i;
                let tempLine = line;
                let searchIdx = k;
                
                while (tempI < lines.length) {
                    const closeIdx = tempLine.indexOf('>', searchIdx);
                    if (closeIdx !== -1) {
                        tagContent += tempLine.substring(searchIdx, closeIdx + 1);
                        // Check if it's self-closing
                        if (tempLine[closeIdx - 1] === '/') {
                            // Verify it's not part of an arrow function or string
                            // For simplicity, we check if there's an even number of braces/quotes before it
                            foundClosing = true;
                            // Reset j to the end of this tag
                            if (tempI === i) j = closeIdx;
                            break;
                        } else {
                            // Not self-closing
                            foundClosing = true;
                            divStack.push({ line: i + 1, content: tagContent.substring(0, 40) });
                            if (tempI === i) j = closeIdx;
                            break;
                        }
                    }
                    tagContent += tempLine.substring(searchIdx);
                    tempI++;
                    tempLine = lines[tempI] || '';
                    searchIdx = 0;
                }
                if (foundClosing) continue;
            } else if (line.substring(j).startsWith('</div')) {
                divStack.pop();
                j += 4;
            }
        }
    }
}
console.log(`Unclosed divs: ${divStack.length}`);
divStack.forEach(d => console.log(`Line ${d.line}: ${d.content}`));
