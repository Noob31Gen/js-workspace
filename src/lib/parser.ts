export interface OptionDescriptor {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'text' | 'json' | 'color' | 'range';
  default: unknown;
  options?: string[]; // For select dropdowns
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  source?: 'jsdoc' | 'autodetected';
}

export interface ParsedScriptMeta {
  name: string;
  description: string;
  author?: string;
  version?: string;
  category?: string;
  options: OptionDescriptor[];
}

/**
 * Strips single-line and multi-line comments from code strings.
 */
function stripComments(codeStr: string): string {
  if (!codeStr) return '';
  return codeStr
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\r\n]*/g, '');
}

/**
 * Splits parameter strings respecting nested braces, brackets, parentheses, quotes, and regex literals.
 */
function splitParameters(paramStr: string): string[] {
  const cleanStr = stripComments(paramStr);
  const params: string[] = [];
  let current = '';
  let depthBrace = 0;
  let depthBracket = 0;
  let depthParen = 0;
  let inString: string | null = null;

  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];
    if (inString) {
      if (char === inString && cleanStr[i - 1] !== '\\') {
        inString = null;
      }
      current += char;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      current += char;
      continue;
    }

    // Skip regex literal: e.g. /(?:[0-9]{1,3}\.){3}[0-9]{1,3}/g
    if (char === '/' && (current.trim().endsWith('=') || current.trim().endsWith(',') || current.trim().endsWith('(') || current.trim().endsWith(':') || current.trim() === '')) {
      current += char;
      i++;
      while (i < cleanStr.length) {
        current += cleanStr[i];
        if (cleanStr[i] === '/' && cleanStr[i - 1] !== '\\') {
          while (i + 1 < cleanStr.length && /[a-z]/i.test(cleanStr[i + 1])) {
            i++;
            current += cleanStr[i];
          }
          break;
        }
        i++;
      }
      continue;
    }

    if (char === '{') depthBrace++;
    else if (char === '}') depthBrace--;
    else if (char === '[') depthBracket++;
    else if (char === ']') depthBracket--;
    else if (char === '(') depthParen++;
    else if (char === ')') depthParen--;

    if (char === ',' && depthBrace === 0 && depthBracket === 0 && depthParen === 0) {
      if (current.trim()) params.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) params.push(current.trim());
  return params;
}

/**
 * Formats a default JSON string cleanly.
 */
function tryFormatJsonString(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    try {
      const fixed = str.replace(/([a-zA-Z0-9_$]+)\s*:/g, '"$1":').replace(/'/g, '"');
      return JSON.stringify(JSON.parse(fixed), null, 2);
    } catch {
      return str;
    }
  }
}

/**
 * Formats camelCase strings into human-readable labels preserving acronyms (SSL, IP, URL, DNS, TLS, TCP, CIDR, etc.)
 */
function formatCamelLabel(key: string): string {
  if (!key) return '';
  const withSpaces = key
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])([0-9]+)/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();

  // Normalize common developer & network acronyms
  const ACRONYMS = new Set([
    'DNS', 'TLS', 'SSL', 'IP', 'ID', 'URL', 'URI', 'API', 'TCP', 'UDP',
    'CIDR', 'HTTP', 'HTTPS', 'JSON', 'CSV', 'HTML', 'XML', 'CVE', 'TTL', 'MAC', 'SSH', 'FTP'
  ]);

  const words = withSpaces.split(/\s+/).map(word => {
    const upper = word.toUpperCase();
    if (ACRONYMS.has(upper)) {
      return upper;
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  return words.join(' ');
}

const CALLBACK_PARAM_NAMES = new Set(['err', 'error', 'req', 'res', 'resolve', 'reject', 'done', 'next', 'event', 'e', 'item', 'idx', 'i', 'v', 'val', 'elem', 'entry']);
const CONTROL_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'with', 'return', 'typeof', 'delete', 'void', 'new', 'import', 'export']);

/**
 * Checks if a parameter name should be heuristically inferred as boolean.
 */
function isBooleanParamName(name: string): boolean {
  if (!name) return false;
  // Disallow false positives like user, username, userid, use_case, width, etc.
  if (/^(?:user|username|userid|use_case|withdraw|within|without|width)/i.test(name)) {
    return false;
  }
  return /^(?:is[A-Z0-9_]|has[A-Z0-9_]|should[A-Z0-9_]|can[A-Z0-9_]|enable[A-Z0-9_]?|disable[A-Z0-9_]?|show[A-Z0-9_]?|hide[A-Z0-9_]?|dry[A-Z0-9_]?|verify[A-Z0-9_]?|use[A-Z0-9_]|with[A-Z0-9_]|no[A-Z0-9_]|promiscuous|verbose|force|silent|quiet|debug|recursive|raw)/i.test(name);
}

/**
 * Finds the index of the matching closing bracket or brace.
 */
function findMatchingClosingIndex(str: string, startIndex: number, openChar: string, closeChar: string): number {
  let depth = 0;
  let inString: string | null = null;
  for (let i = startIndex; i < str.length; i++) {
    const c = str[i];
    if (inString) {
      if (c === inString && str[i - 1] !== '\\') inString = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inString = c;
      continue;
    }
    if (c === openChar) depth++;
    else if (c === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Recursively extracts parameter descriptors handling objects, arrays, defaults, aliases, and rest parameters.
 */
function extractParamDescriptors(rawParam: string, jsdocKeys: Set<string>, resultOptions: OptionDescriptor[]) {
  const trimmed = stripComments(rawParam).trim();
  if (!trimmed) return;

  // 1. Check if Anonymous Object Destructuring: { ... } = default or { ... }
  if (trimmed.startsWith('{')) {
    const closeIdx = findMatchingClosingIndex(trimmed, 0, '{', '}');
    if (closeIdx !== -1) {
      const inner = trimmed.slice(1, closeIdx);
      const innerParams = splitParameters(inner);
      for (const innerP of innerParams) {
        extractParamDescriptors(innerP, jsdocKeys, resultOptions);
      }
      return;
    }
  }

  // 2. Check if Anonymous Array Destructuring: [ ... ] = default or [ ... ]
  if (trimmed.startsWith('[')) {
    const closeIdx = findMatchingClosingIndex(trimmed, 0, '[', ']');
    if (closeIdx !== -1) {
      const inner = trimmed.slice(1, closeIdx);
      const innerParams = splitParameters(inner);
      for (const innerP of innerParams) {
        extractParamDescriptors(innerP, jsdocKeys, resultOptions);
      }
      return;
    }
  }

  // 3. Check if Colon Property Destructuring: propName: { ... } or propName: [ ... ] or propName: aliasName = default
  const colonIdx = trimmed.indexOf(':');
  const eqIdx = trimmed.indexOf('=');

  // Ensure colon comes before '=' and before any '{' or '['
  if (colonIdx !== -1 && (eqIdx === -1 || colonIdx < eqIdx)) {
    const propNameRaw = trimmed.slice(0, colonIdx).trim();
    const afterColon = trimmed.slice(colonIdx + 1).trim();

    if (afterColon.startsWith('{')) {
      const closeIdx = findMatchingClosingIndex(afterColon, 0, '{', '}');
      if (closeIdx !== -1) {
        const inner = afterColon.slice(1, closeIdx);
        const innerParams = splitParameters(inner);
        for (const innerP of innerParams) {
          extractParamDescriptors(innerP, jsdocKeys, resultOptions);
        }
        return;
      }
    } else if (afterColon.startsWith('[')) {
      const closeIdx = findMatchingClosingIndex(afterColon, 0, '[', ']');
      if (closeIdx !== -1) {
        const inner = afterColon.slice(1, closeIdx);
        const innerParams = splitParameters(inner);
        for (const innerP of innerParams) {
          extractParamDescriptors(innerP, jsdocKeys, resultOptions);
        }
        return;
      }
    } else {
      // Aliased scalar property: timeout: msTimeout = 5000 or timeout: msTimeout
      const afterColonEqIdx = afterColon.indexOf('=');
      const aliasNameRaw = afterColonEqIdx !== -1 ? afterColon.slice(0, afterColonEqIdx).trim() : afterColon.trim();
      const defaultValRaw = afterColonEqIdx !== -1 ? afterColon.slice(afterColonEqIdx + 1).trim() : undefined;

      const propKey = propNameRaw.replace(/^[^a-zA-Z0-9_$]+/, '').trim();
      const aliasName = aliasNameRaw.replace(/^[^a-zA-Z0-9_$]+/, '').trim();

      const paramKey = propKey || aliasName;
      if (paramKey && !jsdocKeys.has(paramKey) && !CALLBACK_PARAM_NAMES.has(paramKey)) {
        let inferredType: OptionDescriptor['type'] = 'string';
        let inferredDefault: unknown = '';

        if (defaultValRaw) {
          if (defaultValRaw === 'true' || defaultValRaw === 'false') {
            inferredType = 'boolean';
            inferredDefault = defaultValRaw === 'true';
          } else if (!isNaN(Number(defaultValRaw))) {
            inferredType = 'number';
            inferredDefault = Number(defaultValRaw);
          } else if (defaultValRaw.startsWith('{') || defaultValRaw.startsWith('[')) {
            inferredType = 'json';
            inferredDefault = tryFormatJsonString(defaultValRaw);
          } else {
            inferredDefault = defaultValRaw.replace(/^["']|["']$/g, '');
          }
        } else {
          if (isBooleanParamName(paramKey)) {
            inferredType = 'boolean';
            inferredDefault = false;
          } else if (/(count|num|number|size|delay|ms|retries|limit|offset|timeout|index|port|id)$/i.test(paramKey)) {
            inferredType = 'number';
            inferredDefault = 0;
          } else if (/ip|host|url|domain|path|file|name|user|email|address|route|job|command|cidr|protocol/i.test(paramKey)) {
            inferredType = 'string';
            inferredDefault = '';
          }
        }

        const formattedLabel = formatCamelLabel(propKey);

        resultOptions.push({
          key: propKey,
          label: formattedLabel,
          type: inferredType,
          default: inferredDefault,
          source: 'autodetected',
          description: `Auto-detected from aliased property (${propKey} -> ${aliasName})`
        });
        jsdocKeys.add(propKey);
        if (aliasName) jsdocKeys.add(aliasName);
        return;
      }
    }
  }

  // 4. Check if Rest parameter: ...tags
  let isRest = false;
  let cleanParam = trimmed;
  if (cleanParam.startsWith('...')) {
    isRest = true;
    cleanParam = cleanParam.slice(3).trim();
  }

  // 5. Split parameter name and default value: key = defaultVal at depth 0
  let paramKeyRaw = cleanParam;
  let defaultValRaw: string | undefined = undefined;

  let depthBrace = 0;
  let depthBracket = 0;
  let inString: string | null = null;
  let splitIndex = -1;

  for (let i = 0; i < cleanParam.length; i++) {
    const c = cleanParam[i];
    if (inString) {
      if (c === inString && cleanParam[i - 1] !== '\\') inString = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inString = c;
      continue;
    }
    if (c === '{') depthBrace++;
    else if (c === '}') depthBrace--;
    else if (c === '[') depthBracket++;
    else if (c === ']') depthBracket--;
    else if (c === '=' && depthBrace === 0 && depthBracket === 0) {
      splitIndex = i;
      break;
    }
  }

  if (splitIndex !== -1) {
    paramKeyRaw = cleanParam.slice(0, splitIndex).trim();
    defaultValRaw = cleanParam.slice(splitIndex + 1).trim();
  }

  const paramKey = paramKeyRaw.replace(/^[^a-zA-Z0-9_$]+/, '').trim();
  if (!paramKey || jsdocKeys.has(paramKey) || CALLBACK_PARAM_NAMES.has(paramKey)) return;

  let inferredType: OptionDescriptor['type'] = 'string';
  let inferredDefault: unknown = '';

  if (isRest) {
    inferredType = 'text';
    inferredDefault = defaultValRaw ? defaultValRaw.replace(/^["']|["']$/g, '') : '';
  } else if (defaultValRaw) {
    if (defaultValRaw === 'true' || defaultValRaw === 'false') {
      inferredType = 'boolean';
      inferredDefault = defaultValRaw === 'true';
    } else if (/^-?\d+n$/.test(defaultValRaw)) {
      inferredType = 'number';
      inferredDefault = defaultValRaw;
    } else if (/^0x[0-9a-fA-F]+$/i.test(defaultValRaw) || /^0b[01]+$/i.test(defaultValRaw) || /^0o[0-7]+$/i.test(defaultValRaw)) {
      inferredType = 'number';
      inferredDefault = Number(defaultValRaw);
    } else if (!isNaN(Number(defaultValRaw))) {
      inferredType = 'number';
      inferredDefault = Number(defaultValRaw);
    } else if (defaultValRaw.startsWith('{') || defaultValRaw.startsWith('[')) {
      inferredType = 'json';
      inferredDefault = tryFormatJsonString(defaultValRaw);
    } else {
      inferredDefault = defaultValRaw.replace(/^["']|["']$/g, '');
    }
  } else {
    // Heuristic inferences for positional params without defaults
    if (isBooleanParamName(paramKey)) {
      inferredType = 'boolean';
      inferredDefault = false;
    } else if (/(count|num|number|size|delay|ms|retries|limit|offset|timeout|index|port|id)$/i.test(paramKey)) {
      inferredType = 'number';
      inferredDefault = 0;
    } else if (/ip|host|url|domain|path|file|name|user|email|address|route|job|command|cidr|protocol/i.test(paramKey)) {
      inferredType = 'string';
      inferredDefault = '';
    }
  }

  const formattedLabel = formatCamelLabel(paramKey);

  resultOptions.push({
    key: paramKey,
    label: formattedLabel,
    type: inferredType,
    default: inferredDefault,
    source: 'autodetected',
    description: isRest
      ? `Auto-detected rest parameter (...${paramKey})`
      : 'Auto-detected from function signature'
  });
  jsdocKeys.add(paramKey);
}

/**
 * Parses script source code for JSDoc annotations and code-level logic (destructuring, property access, function signatures).
 */
export function parseScriptOptions(code: string): ParsedScriptMeta {
  const result: ParsedScriptMeta = {
    name: 'Untitled Script',
    description: 'Custom browser script sandbox execution',
    category: 'General',
    options: []
  };

  if (!code) return result;

  // 1. Extract JSDoc metadata tags
  const nameMatch = code.match(/@name\s+(.+)/i);
  if (nameMatch) result.name = nameMatch[1].trim();

  const descMatch = code.match(/@description\s+(.+)/i);
  if (descMatch) result.description = descMatch[1].trim();

  const authorMatch = code.match(/@author\s+(.+)/i);
  if (authorMatch) result.author = authorMatch[1].trim();

  const versionMatch = code.match(/@version\s+(.+)/i);
  if (versionMatch) result.version = versionMatch[1].trim();

  const categoryMatch = code.match(/@category\s+(.+)/i);
  if (categoryMatch) result.category = categoryMatch[1].trim();

  const jsdocKeys = new Set<string>();

  // 2. Extract @param JSDoc annotations safely line-by-line (only when starting a JSDoc line)
  const jsdocLineRegex = /^\s*\*?\s*@param\s+[^\r\n]+/gim;
  const jsdocLines = code.match(jsdocLineRegex) || [];
  for (const rawLine of jsdocLines) {
    const cleanLine = rawLine.replace(/^\s*\*?\s*/, '').trim();
    const parsed = parseParamLine(cleanLine);
    if (parsed && !jsdocKeys.has(parsed.key)) {
      jsdocKeys.add(parsed.key);
      result.options.push(parsed);
    }
  }

/**
 * Computes brace depth at a given index in code, ignoring strings and comments.
 */
function getBraceDepthAt(codeStr: string, index: number): number {
  let depth = 0;
  let inString: string | null = null;
  for (let i = 0; i < index; i++) {
    const c = codeStr[i];
    if (inString) {
      if (c === inString && codeStr[i - 1] !== '\\') inString = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inString = c;
      continue;
    }
    if (c === '/' && codeStr[i + 1] === '/') {
      while (i < index && codeStr[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && codeStr[i + 1] === '*') {
      i += 2;
      while (i < index && !(codeStr[i] === '*' && codeStr[i + 1] === '/')) i++;
      i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
  }
  return depth;
}

/**
 * Finds matching closing parenthesis index respecting nested parentheses, braces, quotes, and regex literals.
 */
function findMatchingClosingParen(str: string, openIndex: number): number {
  let depth = 0;
  let inString: string | null = null;

  for (let i = openIndex; i < str.length; i++) {
    const c = str[i];

    if (inString) {
      if (c === inString && str[i - 1] !== '\\') {
        inString = null;
      }
      continue;
    }

    if (c === '/' && str[i + 1] === '/') {
      while (i < str.length && str[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && str[i + 1] === '*') {
      i += 2;
      while (i < str.length && !(str[i] === '*' && str[i + 1] === '/')) i++;
      i++;
      continue;
    }

    // Skip regex literal
    if (c === '/' && (i === openIndex || /[=(:,\[{]/.test(str.slice(openIndex, i).trim().slice(-1)))) {
      i++;
      while (i < str.length) {
        if (str[i] === '/' && str[i - 1] !== '\\') {
          while (i + 1 < str.length && /[a-z]/i.test(str[i + 1])) i++;
          break;
        }
        i++;
      }
      continue;
    }

    if (c === '"' || c === "'" || c === '`') {
      inString = c;
      continue;
    }

    if (c === '(') {
      depth++;
    } else if (c === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

  // 3. Extract Function, Method, and Class Constructor Parameters
  // A. Functions & Arrow Functions: e.g. function name(...), const name = (...) =>
  const funcStartRegex = /(?:(?:export\s+)?(?:async\s+)?function(?:\s*\*|\s+([a-zA-Z0-9_$]+))?|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:function(?:\s+([a-zA-Z0-9_$]+))?)?|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?)\s*\(/gi;
  let funcMatch;

  while ((funcMatch = funcStartRegex.exec(code)) !== null) {
    if (getBraceDepthAt(code, funcMatch.index) > 0) continue;

    const openParenIdx = funcStartRegex.lastIndex - 1;
    const closeParenIdx = findMatchingClosingParen(code, openParenIdx);
    if (closeParenIdx === -1) continue;

    const rawParamList = code.slice(openParenIdx + 1, closeParenIdx);
    if (!rawParamList || !rawParamList.trim()) continue;

    const rawParams = splitParameters(rawParamList.trim());
    for (const rawParam of rawParams) {
      extractParamDescriptors(rawParam, jsdocKeys, result.options);
    }
  }

  // B. Class Constructors & Methods: e.g. constructor(...) {, scanRange(...) {
  const classMethodRegex = /^\s*(?:(?:async|get|set|static)\s+)?(?:constructor|([a-zA-Z0-9_$]+))\s*\(/gim;
  let methodMatch;

  while ((methodMatch = classMethodRegex.exec(code)) !== null) {
    const methodName = (methodMatch[1] || '').trim();
    if (methodName && CONTROL_KEYWORDS.has(methodName)) continue;

    const openParenIdx = classMethodRegex.lastIndex - 1;
    const closeParenIdx = findMatchingClosingParen(code, openParenIdx);
    if (closeParenIdx === -1) continue;

    const rawParamList = code.slice(openParenIdx + 1, closeParenIdx);
    if (!rawParamList || !rawParamList.trim()) continue;

    const rawParams = splitParameters(rawParamList.trim());
    for (const rawParam of rawParams) {
      extractParamDescriptors(rawParam, jsdocKeys, result.options);
    }
  }

  // 4. Extract Destructured Variables in Code Body: e.g. const { file, dryRun, retries = 2 } = options;
  const destructuredVarRegex = /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*(?:options|opts|args|argv|params|config|input)\b/gi;
  let destMatch;

  while ((destMatch = destructuredVarRegex.exec(code)) !== null) {
    if (destMatch[1]) {
      const rawVars = splitParameters(destMatch[1]);
      for (const rawVar of rawVars) {
        extractParamDescriptors(rawVar, jsdocKeys, result.options);
      }
    }
  }

  // Blacklist standard JavaScript Array/Object/String prototype properties
  const JS_BUILTIN_PROPERTIES = new Set([
    'slice', 'length', 'includes', 'indexOf', 'lastIndexOf', 'forEach', 'map',
    'filter', 'reduce', 'reduceRight', 'find', 'findIndex', 'findLast', 'findLastIndex',
    'push', 'pop', 'shift', 'unshift', 'join', 'concat', 'toString', 'toLocaleString',
    'split', 'trim', 'trimStart', 'trimEnd', 'substring', 'substr', 'match', 'matchAll',
    'replace', 'replaceAll', 'at', 'charAt', 'charCodeAt', 'codePointAt',
    'values', 'keys', 'entries', 'hasOwnProperty', 'constructor', 'prototype',
    'name', 'caller', 'callee', 'arguments', 'apply', 'call', 'bind', 'flat', 'flatMap',
    'sort', 'reverse', 'fill', 'copyWithin', 'some', 'every', 'exit'
  ]);

  // 5. Extract Direct Property Usage in Code Body: e.g. options.file, options.dryRun, options['batch-size']
  const propAccessRegex = /(?:options|opts|args|argv|params|config|input)\.([a-zA-Z0-9_$]+)|(?:options|opts|args|argv|params|config|input)\[['"]([a-zA-Z0-9_$-]+)['"]\]/gi;
  let propMatch;

  while ((propMatch = propAccessRegex.exec(code)) !== null) {
    const rawProp = propMatch[1] || propMatch[2];
    if (!rawProp || JS_BUILTIN_PROPERTIES.has(rawProp)) continue;

    const camelKey = rawProp.replace(/-([a-z])/g, (_, g) => g.toUpperCase());

    if (!jsdocKeys.has(camelKey) && !jsdocKeys.has(rawProp)) {
      let inferredType: OptionDescriptor['type'] = 'string';
      let inferredDefault: unknown = '';

      if (isBooleanParamName(camelKey)) {
        inferredType = 'boolean';
        inferredDefault = false;
      } else if (/(count|num|number|size|delay|ms|retries|limit|offset|timeout|index|port|id)$/i.test(camelKey)) {
        inferredType = 'number';
        inferredDefault = 0;
      }

      const formattedLabel = formatCamelLabel(camelKey);

      result.options.push({
        key: camelKey,
        label: formattedLabel,
        type: inferredType,
        default: inferredDefault,
        source: 'autodetected',
        description: 'Auto-detected from code property usage'
      });
      jsdocKeys.add(camelKey);
      jsdocKeys.add(rawProp);
    }
  }

  // 6. Extract Positional CLI Arguments: e.g. const num1 = Number(args[0]), const target = process.argv[2] || 'val'
  const processArgvIndexRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(Number\()?\s*(?:process\.argv|args|argv)\[\s*(\d+)\s*\]\s*\)?(?:\s*\|\|\s*([^;\n]+))?/gi;
  let argvIndexMatch;

  while ((argvIndexMatch = processArgvIndexRegex.exec(code)) !== null) {
    const key = argvIndexMatch[1].trim();
    const isNumberWrapper = Boolean(argvIndexMatch[2]);
    const index = argvIndexMatch[3];
    const defaultValRaw = argvIndexMatch[4] ? argvIndexMatch[4].trim() : undefined;

    if (key && !jsdocKeys.has(key)) {
      let inferredType: OptionDescriptor['type'] = isNumberWrapper ? 'number' : 'string';
      let inferredDefault: unknown = isNumberWrapper ? 0 : '';

      if (defaultValRaw) {
        if (defaultValRaw === 'true' || defaultValRaw === 'false') {
          inferredType = 'boolean';
          inferredDefault = defaultValRaw === 'true';
        } else if (!isNaN(Number(defaultValRaw))) {
          inferredType = 'number';
          inferredDefault = Number(defaultValRaw);
        } else {
          inferredDefault = defaultValRaw.replace(/^["']|["']$/g, '');
        }
      } else if (/(num|count|number|amount|sum|total|price|age|year|month|day|id|index|limit|offset)$/i.test(key)) {
        inferredType = 'number';
        inferredDefault = 0;
      }

      const formattedLabel = formatCamelLabel(key);

      result.options.push({
        key,
        label: formattedLabel,
        type: inferredType,
        default: inferredDefault,
        source: 'autodetected',
        description: `Auto-detected CLI argument from positional index [${index}]`
      });
      jsdocKeys.add(key);
    }
  }

  // 7. Extract CLI Array Checks & Flags: e.g. args.includes('--verbose'), extraFlags.includes('--force'), argv.indexOf('-d') !== -1
  const arrayFlagRegex = /(?:(?:process\.argv|argv|args|extraFlags|flags|cmdArgs|options|opts)\s*\.\s*(?:includes|indexOf)\(\s*['"]--?([a-zA-Z0-9_$-]+)['"]\)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:process\.argv|argv|args|extraFlags|flags)\s*\.\s*includes\(\s*['"]--?([a-zA-Z0-9_$-]+)['"]\))/gi;
  let arrayFlagMatch;

  while ((arrayFlagMatch = arrayFlagRegex.exec(code)) !== null) {
    const flagName = arrayFlagMatch[1] || arrayFlagMatch[3];
    const varName = arrayFlagMatch[2];
    if (!flagName) continue;

    const camelKey = flagName.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
    const key = varName || camelKey;

    if (key && !jsdocKeys.has(key) && !jsdocKeys.has(camelKey) && !jsdocKeys.has(flagName)) {
      const formattedLabel = formatCamelLabel(key);

      result.options.push({
        key: camelKey,
        label: `${formattedLabel} (--${flagName})`,
        type: 'boolean',
        default: false,
        source: 'autodetected',
        description: `Auto-detected CLI boolean flag (--${flagName})`
      });
      jsdocKeys.add(key);
      jsdocKeys.add(camelKey);
      jsdocKeys.add(flagName);
    }
  }

  // 8. Extract Commander.js CLI Options: e.g. program.option('-v, --verbose', 'enable verbose output', false), .option('--port <number>', 'port', 8080)
  const commanderOptionRegex = /\.(?:option|requiredOption)\(\s*['"](?:-[a-zA-Z0-9],\s*)?--([a-zA-Z0-9_$-]+)(?:\s*(<[^>]+>|\[[^\]]+\]))?['"](?:\s*,\s*['"]([^'"]+)['"])?(?:\s*,\s*([^,\)]+))?/gi;
  let cmdMatch;

  while ((cmdMatch = commanderOptionRegex.exec(code)) !== null) {
    const flagName = cmdMatch[1]?.trim();
    if (!flagName) continue;

    const valuePlaceholder = cmdMatch[2]?.trim();
    const description = cmdMatch[3]?.trim();
    const defaultRaw = cmdMatch[4]?.trim();

    const camelKey = flagName.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
    if (!jsdocKeys.has(camelKey) && !jsdocKeys.has(flagName)) {
      let inferredType: OptionDescriptor['type'] = 'boolean';
      let inferredDefault: unknown = false;

      if (valuePlaceholder) {
        inferredType = 'string';
        inferredDefault = '';

        if (defaultRaw) {
          if (!isNaN(Number(defaultRaw))) {
            inferredType = 'number';
            inferredDefault = Number(defaultRaw);
          } else if (defaultRaw === 'true' || defaultRaw === 'false') {
            inferredType = 'boolean';
            inferredDefault = defaultRaw === 'true';
          } else {
            inferredDefault = defaultRaw.replace(/^["']|["']$/g, '');
          }
        } else if (/num|port|timeout|delay|limit|size|count|retries|index/i.test(flagName)) {
          inferredType = 'number';
          inferredDefault = 0;
        }
      } else if (defaultRaw) {
        inferredDefault = defaultRaw === 'true';
      }

      const formattedLabel = description || formatCamelLabel(camelKey);

      result.options.push({
        key: camelKey,
        label: `${formattedLabel} (--${flagName})`,
        type: inferredType,
        default: inferredDefault,
        source: 'autodetected',
        description: description || `Commander option --${flagName}`
      });
      jsdocKeys.add(camelKey);
      jsdocKeys.add(flagName);
    }
  }

  // 9. Extract util.parseArgs & Minimist Options: e.g. parseArgs({ options: { verbose: { type: 'boolean' } } })
  const parseArgsRegex = /parseArgs\(\s*\{([\s\S]*?)\}\s*\)/gi;
  let parseArgsMatch;

  while ((parseArgsMatch = parseArgsRegex.exec(code)) !== null) {
    const parseArgsBody = parseArgsMatch[1];
    const optionBlockMatch = parseArgsBody.match(/options\s*:\s*\{([\s\S]*)/i);
    if (!optionBlockMatch) continue;

    const optionsContent = optionBlockMatch[1];
    const optionEntryRegex = /([a-zA-Z0-9_$-]+)\s*:\s*\{([^}]+)\}/gi;
    let entryMatch;

    while ((entryMatch = optionEntryRegex.exec(optionsContent)) !== null) {
      const flagName = entryMatch[1].trim();
      const configStr = entryMatch[2];
      const camelKey = flagName.replace(/-([a-z])/g, (_, g) => g.toUpperCase());

      if (!jsdocKeys.has(camelKey) && !jsdocKeys.has(flagName)) {
        const isString = /type\s*:\s*['"]string['"]/i.test(configStr);
        const defaultMatch = configStr.match(/default\s*:\s*([^,\n}]+)/i);
        const defaultRaw = defaultMatch ? defaultMatch[1].trim() : undefined;

        let inferredType: OptionDescriptor['type'] = isString ? 'string' : 'boolean';
        let inferredDefault: unknown = isString ? '' : false;

        if (defaultRaw) {
          if (defaultRaw === 'true' || defaultRaw === 'false') {
            inferredType = 'boolean';
            inferredDefault = defaultRaw === 'true';
          } else if (!isNaN(Number(defaultRaw))) {
            inferredType = 'number';
            inferredDefault = Number(defaultRaw);
          } else {
            inferredDefault = defaultRaw.replace(/^["']|["']$/g, '');
          }
        }

        const formattedLabel = formatCamelLabel(camelKey);

        result.options.push({
          key: camelKey,
          label: `${formattedLabel} (--${flagName})`,
          type: inferredType,
          default: inferredDefault,
          source: 'autodetected',
          description: `Auto-detected from util.parseArgs (--${flagName})`
        });
        jsdocKeys.add(camelKey);
        jsdocKeys.add(flagName);
      }
    }
  }

  // 10. Extract Literal CLI Flag Strings (e.g. "--verbose", "--force", "--dry-run" in invocations or arrays)
  const literalFlagRegex = /(?:^|[^a-zA-Z0-9_$-])['"]--([a-zA-Z][a-zA-Z0-9_$-]{1,30})['"]/g;
  let litMatch;

  // Filter out common non-CLI CSS variables or HTML/SVG attributes
  const CSS_OR_NON_CLI_FLAGS = new Set([
    'font', 'color', 'background', 'foreground', 'border', 'input', 'ring', 'radius',
    'sidebar', 'primary', 'secondary', 'muted', 'accent', 'destructive', 'card', 'popover',
    'tw', 'esm', 'cjs', 'webkit', 'moz', 'ms', 'o'
  ]);

  while ((litMatch = literalFlagRegex.exec(code)) !== null) {
    const flagName = litMatch[1].trim();
    if (!flagName || CSS_OR_NON_CLI_FLAGS.has(flagName.toLowerCase())) continue;

    // Check if it's a CSS variable prefix (e.g. --font-sans, --color-primary)
    const basePrefix = flagName.split('-')[0].toLowerCase();
    if (CSS_OR_NON_CLI_FLAGS.has(basePrefix)) continue;

    const camelKey = flagName.replace(/-([a-z])/g, (_, g) => g.toUpperCase());

    if (!jsdocKeys.has(camelKey) && !jsdocKeys.has(flagName)) {
      const formattedLabel = formatCamelLabel(camelKey);

      result.options.push({
        key: camelKey,
        label: `${formattedLabel} (--${flagName})`,
        type: 'boolean',
        default: false,
        source: 'autodetected',
        description: `Auto-detected CLI flag (--${flagName})`
      });
      jsdocKeys.add(camelKey);
      jsdocKeys.add(flagName);
    }
  }

  // 11. Extract CLI process.env Variables: e.g. const apiKey = process.env.API_KEY || 'default'
  const processEnvRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*process\.env\.([a-zA-Z0-9_$]+)(?:\s*\|\|\s*([^;\n]+))?/gi;
  let envMatch;

  while ((envMatch = processEnvRegex.exec(code)) !== null) {
    const key = envMatch[1].trim();
    const envVarName = envMatch[2].trim();
    const defaultValRaw = envMatch[3] ? envMatch[3].trim() : undefined;

    if (key && !jsdocKeys.has(key)) {
      let inferredType: OptionDescriptor['type'] = 'string';
      let inferredDefault: unknown = '';

      if (defaultValRaw) {
        if (defaultValRaw === 'true' || defaultValRaw === 'false') {
          inferredType = 'boolean';
          inferredDefault = defaultValRaw === 'true';
        } else if (!isNaN(Number(defaultValRaw))) {
          inferredType = 'number';
          inferredDefault = Number(defaultValRaw);
        } else {
          inferredDefault = defaultValRaw.replace(/^["']|["']$/g, '');
        }
      }

      const formattedLabel = formatCamelLabel(key);

      result.options.push({
        key,
        label: formattedLabel,
        type: inferredType,
        default: inferredDefault,
        source: 'autodetected',
        description: `Auto-detected from process.env.${envVarName}`
      });
      jsdocKeys.add(key);
    }
  }

  return result;
}

/**
 * Cleanly parses a single @param JSDoc annotation line.
 */
function parseParamLine(line: string): OptionDescriptor | null {
  const paramBody = line.replace(/^@param\s+/i, '').trim();
  if (!paramBody) return null;

  let rawType = 'string';
  let rest = paramBody;

  // Extract type in curly braces {type}
  const typeMatch = rest.match(/^\{([^}]+)\}\s*(.*)/);
  if (typeMatch) {
    rawType = typeMatch[1].trim().toLowerCase();
    rest = typeMatch[2].trim();
  }

  if (!rest) return null;

  let key = '';
  let bracketDefault: string | undefined = undefined;

  // Check if key is in brackets [key=default] or [key]
  const bracketMatch = rest.match(/^\[([a-zA-Z0-9_$]+)(?:=([^\]]+))?\]\s*(.*)/);
  if (bracketMatch) {
    key = bracketMatch[1].trim();
    bracketDefault = bracketMatch[2] ? bracketMatch[2].trim().replace(/^["']|["']$/g, '') : undefined;
    rest = bracketMatch[3].trim();
  } else {
    // Standard key
    const keyMatch = rest.match(/^([a-zA-Z0-9_$]+)\s*(.*)/);
    if (keyMatch) {
      key = keyMatch[1].trim();
      rest = keyMatch[2].trim();
    }
  }

  if (!key) return null;

  // Extract explicit default from description if present
  let explicitDefault: string | undefined = bracketDefault;

  // Check for JSON object/array default value first: - default: {"key":"val"} or (default: [1,2])
  const defaultJsonMatch = rest.match(/(?:-\s*default:|\(default:)\s*(\{[\s\S]*\}|\[[\s\S]*\])/i);
  if (defaultJsonMatch) {
    explicitDefault = defaultJsonMatch[1].trim();
    rest = rest.replace(/(?:-\s*default:|\(default:)\s*(\{[\s\S]*\}|\[[\s\S]*\])/gi, '').trim();
  } else {
    const defaultDashMatch = rest.match(/(?:-\s*default:|\(default:)\s*["']?([^"')]+)["']?\)?/i);
    if (defaultDashMatch) {
      explicitDefault = defaultDashMatch[1].trim();
      rest = rest.replace(/(?:-\s*default:|\(default:)\s*["']?([^"')]+)["']?\)?/gi, '').trim();
    }
  }

  // Clean trailing JSDoc artifacts from description (e.g. */ or trailing * or subsequent @tags)
  let label = rest
    .replace(/\*\/.*$/, '') // Strip */
    .replace(/\s*\*.*$/, '') // Strip *
    .replace(/@.*$/, '') // Strip any subsequent @tag
    .trim();

  // If label is empty, format camelCase key into title words
  if (!label) {
    label = formatCamelLabel(key);
  }

  let type: OptionDescriptor['type'] = 'string';
  let optionsList: string[] | undefined = undefined;
  let minVal: number | undefined;
  let maxVal: number | undefined;
  let stepVal: number | undefined;

  if (rawType.startsWith('select:')) {
    type = 'select';
    optionsList = rawType.replace('select:', '').split('|').map(s => s.trim());
  } else if (rawType.startsWith('range:')) {
    type = 'range';
    const parts = rawType.replace('range:', '').split(':').map(Number);
    minVal = parts[0] ?? 0;
    maxVal = parts[1] ?? 100;
    stepVal = parts[2] ?? 1;
  } else if (['number', 'int', 'float'].includes(rawType)) {
    type = 'number';
  } else if (['boolean', 'bool'].includes(rawType)) {
    type = 'boolean';
  } else if (rawType === 'text') {
    type = 'text';
  } else if (rawType === 'json') {
    type = 'json';
  } else if (rawType === 'color') {
    type = 'color';
  }

  let defaultValue: unknown;
  if (type === 'number' || type === 'range') {
    defaultValue = explicitDefault !== undefined ? Number(explicitDefault) : (minVal ?? 0);
  } else if (type === 'boolean') {
    defaultValue = explicitDefault === 'true';
  } else if (type === 'select') {
    defaultValue = explicitDefault || (optionsList && optionsList[0]) || '';
  } else if (type === 'json') {
    defaultValue = explicitDefault ? explicitDefault : '{}';
  } else {
    defaultValue = explicitDefault !== undefined ? explicitDefault : '';
  }

  return {
    key,
    label,
    type,
    default: defaultValue,
    options: optionsList,
    min: minVal,
    max: maxVal,
    step: stepVal,
    source: 'jsdoc'
  };
}
