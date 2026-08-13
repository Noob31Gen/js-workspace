const BS = String.fromCharCode(92);
function ws() { return BS + 's'; }
function star() { return BS + '*'; }
function lbrace() { return BS + '{'; }
function rbrace() { return BS + '}'; }
function quoteClass() { return "['" + '"' + "]"; }
function notQuoteClass() { return "[^'" + '"' + "]+"; }

function workerRegexReplace(pattern, replacement, flags = 'g') {
  return '.replace(new RegExp(' + JSON.stringify(pattern) + ', ' + JSON.stringify(flags) + '), ' + JSON.stringify(replacement) + ')';
}

const W = ws();
const Q = quoteClass();
const NQ = notQuoteClass();

const pattern = 'import' + W + '+([a-zA-Z0-9_$]+)' + W + '+from' + W + '+' + Q + '(' + NQ + ')' + Q;
const replacement = 'const $1 = (require("$2").default || require("$2"));';

const codeLine = workerRegexReplace(pattern, replacement);
console.log('Evaluated code line in worker:');
console.log(codeLine);

// Test eval-ing codeLine to verify it forms a valid JS expression
const sampleCode = "import fs from 'fs';";
const testFunc = new Function('scriptCode', 'return scriptCode' + codeLine + ';');
console.log('Sample input:', sampleCode);
console.log('Transformed:', testFunc(sampleCode));
