
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let divBalance = 0;
const tagRegex = /<div|<\/div/g;

for (let i = 214; i < 356; i++) {
    const line = lines[i];
    let match;
    while ((match = tagRegex.exec(line)) !== null) {
        if (match[0] === '<div') {
            const restOfLine = line.substring(match.index);
            const closeIndex = restOfLine.indexOf('>');
            if (closeIndex !== -1 && restOfLine.substring(0, closeIndex).endsWith('/')) {
                // Self-closing
            } else {
                divBalance++;
            }
        } else {
            divBalance--;
        }
    }
    console.log(`${i + 1}: [${divBalance}] ${line}`);
}
