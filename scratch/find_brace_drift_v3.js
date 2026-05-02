
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
    if (braceBalance !== 1 && i > 356) {
        // If it's 1 most of the time but becomes something else
        // We log whenever it STAYS something else
        let k = i + 1;
        let b = braceBalance;
        let s = null;
        let returns = false;
        while (k < i + 100 && k < 2613) {
            const l = lines[k];
            for (let m = 0; m < l.length; m++) {
                const c = l[m];
                if (s) { if (c === s && l[m-1] !== '\\') s = null; }
                else if (c === '"' || c === "'" || c === '`') s = c;
                else if (c === '{') b++;
                else if (c === '}') b--;
            }
            if (b === 1) { returns = true; break; }
            k++;
        }
        if (!returns && braceBalance !== 1) {
            console.log(`Brace drift at line ${i+1}: ${braceBalance}`);
            break;
        }
    }
}
