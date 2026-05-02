
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let balance = 0;
const braceRegex = /{|}/g;

lines.forEach((line, index) => {
    let match;
    while ((match = braceRegex.exec(line)) !== null) {
        if (match[0] === '{') {
            balance++;
        } else {
            balance--;
        }
    }
    if (index + 1 === 7585) console.log(`Balance at 7585: ${balance}`);
    if (index + 1 === 7586) console.log(`Balance at 7586: ${balance}`);
    if (index + 1 === 7587) console.log(`Balance at 7587: ${balance}`);
});

console.log(`Final balance: ${balance}`);
