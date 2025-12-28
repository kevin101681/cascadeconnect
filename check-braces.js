const fs = require('fs');
const content = fs.readFileSync('App.tsx', 'utf8');
const lines = content.split('\n');

let depth = 0;
let minDepth = 0;
let minLine = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/\{/g) || []).length;
  const closes = (line.match(/\}/g) || []).length;
  depth += opens - closes;
  
  if (depth < minDepth) {
    minDepth = depth;
    minLine = i + 1;
  }
  
  // Print lines where depth goes negative (more closes than opens so far)
  if (i > 140 && i < 3953 && depth < 0) {
    console.log(`Line ${i+1}: depth=${depth} - '${line.substring(0, 80)}'`);
  }
}

console.log(`\nFinal depth: ${depth}`);
console.log(`Min depth: ${minDepth} at line ${minLine}`);

