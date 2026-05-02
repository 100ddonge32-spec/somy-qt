
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let braceBalance = 0;
let parenBalance = 0;
let inString = null;

for (let i = 8795; i < 9702; i++) {
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
                if (braceBalance < 0) { console.log(`Extra brace at line ${i+1}`); braceBalance = 0; }
            } else if (char === '(') {
                parenBalance++;
            } else if (char === ')') {
                parenBalance--;
                if (parenBalance < 0) { console.log(`Extra paren at line ${i+1}`); parenBalance = 0; }
            }
        }
    }
}
