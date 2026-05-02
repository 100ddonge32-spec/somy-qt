
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let braceBalance = 0;
let divBalance = 0;
const braceRegex = /{|}/g;
const tagRegex = /<div|<\/div/g;

lines.forEach((line, index) => {
    let match;
    while ((match = braceRegex.exec(line)) !== null) {
        if (match[0] === '{') braceBalance++;
        else braceBalance--;
    }
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
    if ((index + 1) % 1000 === 0) {
        console.log(`Line ${index + 1}: Brace ${braceBalance}, Div ${divBalance}`);
    }
});
console.log(`Final: Brace ${braceBalance}, Div ${divBalance}`);
