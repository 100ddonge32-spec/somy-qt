
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let braceBalance = 0;
let inString = null;

for (let i = 0; i < 2613; i++) {
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
            }
        }
    }
    if (braceBalance === 2 && i > 356) {
        // Find if it returns to 1
        let returns = false;
        let k = i + 1;
        let tempBalance = braceBalance;
        while (k < 2613) {
            const l = lines[k];
            // simplified balance check
            if (l.includes('}')) tempBalance--;
            if (l.includes('{')) tempBalance++;
            if (tempBalance === 1) { returns = true; break; }
            k++;
        }
        if (!returns) {
            console.log(`Drift to 2 at line ${i+1}: ${line.trim()}`);
            break;
        }
    }
}
