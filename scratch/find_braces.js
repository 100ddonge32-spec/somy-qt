
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');

let stack = [];
const braceRegex = /{|}/g;

lines.forEach((line, index) => {
    let match;
    while ((match = braceRegex.exec(line)) !== null) {
        if (match[0] === '{') {
            stack.push({ line: index + 1, type: '{' });
        } else {
            if (stack.length === 0) {
                console.log(`Extra closing brace at line ${index + 1}`);
            } else {
                stack.pop();
            }
        }
    }
});

console.log(`Total unclosed braces: ${stack.length}`);
stack.forEach(s => console.log(`Unclosed brace at line ${s.line}`));
