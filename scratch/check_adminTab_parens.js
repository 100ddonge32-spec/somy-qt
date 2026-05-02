
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let parenBalance = 0;
let inString = null;

for (let i = 8873; i <= 9671; i++) {
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
            } else if (char === '(') {
                parenBalance++;
            } else if (char === ')') {
                parenBalance--;
                if (parenBalance < 0) {
                    console.log(`Paren balance became negative at line ${i+1}: ${line}`);
                    parenBalance = 0;
                }
            }
        }
    }
}
console.log(`Final paren balance from 8874 to 9672: ${parenBalance}`);
