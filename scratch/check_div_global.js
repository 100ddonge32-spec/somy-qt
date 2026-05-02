
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

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
            } else if (line.substring(j).startsWith('<div')) {
                // Check for self-closing
                const restOfLine = line.substring(j);
                const closeIndex = restOfLine.indexOf('>');
                if (closeIndex !== -1 && restOfLine.substring(0, closeIndex).endsWith('/')) {
                    // Self-closing
                } else {
                    divBalance++;
                }
                j += 3;
            } else if (line.substring(j).startsWith('</div')) {
                divBalance--;
                j += 4;
            }
        }
    }
}
console.log(`Global div balance: ${divBalance}`);
