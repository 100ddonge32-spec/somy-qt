
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let balance = 0;
const tagRegex = /<div|<\/div/g;

lines.forEach((line, index) => {
    let match;
    while ((match = tagRegex.exec(line)) !== null) {
        if (match[0] === '<div') {
            const restOfLine = line.substring(match.index);
            const closeIndex = restOfLine.indexOf('>');
            if (closeIndex !== -1 && restOfLine.substring(0, closeIndex).endsWith('/')) {
                // Self-closing
            } else {
                balance++;
            }
        } else {
            balance--;
            if (balance < 0) {
                console.log(`Extra closing div at line ${index + 1}: balance ${balance}`);
                balance = 0; // Reset
            }
        }
    }
    if (index + 1 === 7586) console.log(`Div balance at 7586: ${balance}`);
    if (index + 1 === 8794) console.log(`Div balance at 8794: ${balance}`);
    if (index + 1 === 9703) console.log(`Div balance at 9703: ${balance}`);
    if (index + 1 === 10542) console.log(`Div balance at 10542: ${balance}`);
    if (index + 1 === 11578) console.log(`Div balance at 11578: ${balance}`);
});

console.log(`Final div balance: ${balance}`);
