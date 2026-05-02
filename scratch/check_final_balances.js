
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let braceBalance = 0;
let parenBalance = 0;
let inString = null;

for (let i = 0; i < 9784; i++) {
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
            } else if (char === '(') {
                parenBalance++;
            } else if (char === ')') {
                parenBalance--;
            }
        }
    }
}
console.log(`Paren balance at 9784: ${parenBalance}`);
console.log(`Brace balance at 9784: ${braceBalance}`);
