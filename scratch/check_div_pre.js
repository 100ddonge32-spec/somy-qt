
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let divBalance = 0;
let inString = null;

for (let i = 0; i < 2612; i++) {
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
                const restOfLine = line.substring(j);
                const closeIndex = restOfLine.indexOf('>');
                if (closeIndex !== -1 && restOfLine.substring(0, closeIndex).endsWith('/')) {
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
console.log(`Div balance before renderContent: ${divBalance}`);
