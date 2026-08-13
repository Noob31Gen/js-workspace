const fs = require('fs');
const path = require('path');

// We can compile buildWorkerDependencyLoader or extract the string from dependency-resolver.ts
const depContent = fs.readFileSync('d:/Programs/code-stuff/js-workspace/src/lib/dependency-resolver.ts', 'utf-8');

// Find the template string inside buildWorkerDependencyLoader
const startIdx = depContent.indexOf('export function buildWorkerDependencyLoader');
const templateStart = depContent.indexOf('return `', startIdx);
const templateEnd = depContent.lastIndexOf('`;');

const templateStr = depContent.slice(templateStart + 8, templateEnd);

const lines = templateStr.split('\n');
console.log("Total lines in worker template:", lines.length);

lines.forEach((l, idx) => {
  if (idx >= 85 && idx <= 105) {
    console.log(`Line ${idx + 1}: ${l}`);
  }
});
