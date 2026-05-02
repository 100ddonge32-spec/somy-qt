
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let braceBalance = 0;
let inString = null;

for (let i = 9707; i < 9784; i++) {
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
                if (braceBalance === 0) {
                    console.log(`Brace closed at line ${i+1}: ${line.trim()}`);
                }
            }
        }
    }
}
