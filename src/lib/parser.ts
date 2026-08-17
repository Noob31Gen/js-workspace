import * as acorn from 'acorn';
import { parse as babelParse } from '@babel/parser';

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
  warnings?: string[]; // Static sandbox notices (e.g. Socket simulated mode notice)
}

interface ASTComment {
  type: 'Block' | 'Line' | 'CommentBlock' | 'CommentLine';
  value: string;
  start?: number;
  end?: number;
}

const ACRONYMS = new Set([
  'DNS', 'TLS', 'SSL', 'IP', 'ID', 'URL', 'URI', 'API', 'TCP', 'UDP',
  'CIDR', 'HTTP', 'HTTPS', 'JSON', 'CSV', 'HTML', 'XML', 'CVE', 'TTL', 'MAC', 'SSH', 'FTP', 'WASM'
]);

const CALLBACK_PARAM_NAMES = new Set([
  'err', 'error', 'req', 'res', 'resolve', 'reject', 'done', 'next', 'event', 'e', 'item', 'idx', 'i', 'v', 'val', 'elem', 'entry'
]);

const CONTROL_KEYWORDS = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'with', 'return', 'typeof', 'delete', 'void', 'new', 'import', 'export'
]);

/**
 * Formats camelCase or snake_case strings into clean human-readable labels preserving acronyms.
 */
export function formatCamelLabel(key: string): string {
  if (!key) return '';
  const withSpaces = key
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])([0-9]+)/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();

  const words = withSpaces.split(/\s+/).map(word => {
    const upper = word.toUpperCase();
    if (ACRONYMS.has(upper)) {
      return upper;
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  return words.join(' ');
}

/**
 * Checks if a parameter name should be heuristically inferred as boolean.
 */
function isBooleanParamName(name: string): boolean {
  if (!name) return false;
  if (/^(?:user|username|userid|use_case|withdraw|within|without|width)/i.test(name)) {
    return false;
  }
  return /^(?:is[A-Z0-9_]|has[A-Z0-9_]|should[A-Z0-9_]|can[A-Z0-9_]|enable[A-Z0-9_]?|disable[A-Z0-9_]?|show[A-Z0-9_]?|hide[A-Z0-9_]?|dry[A-Z0-9_]?|verify[A-Z0-9_]?|use[A-Z0-9_]|with[A-Z0-9_]|no[A-Z0-9_]|promiscuous|verbose|force|silent|quiet|debug|recursive|raw)/i.test(name);
}

/**
 * Converts an AST node value to a clean JSON/string/primitive default representation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDefaultValue(node: any, code: string): { val: unknown; type: OptionDescriptor['type'] } {
  if (!node) return { val: '', type: 'string' };

  if (node.type === 'Literal' || node.type === 'StringLiteral' || node.type === 'NumericLiteral' || node.type === 'BooleanLiteral' || node.type === 'BigIntLiteral' || node.type === 'RegExpLiteral') {
    if (typeof node.value === 'number') {
      return { val: node.value, type: 'number' };
    }
    if (typeof node.value === 'boolean') {
      return { val: node.value, type: 'boolean' };
    }
    if (node.bigint !== undefined || typeof node.value === 'bigint') {
      return { val: node.raw || `${node.value}n`, type: 'text' };
    }
    if (node.regex || node.type === 'RegExpLiteral') {
      return { val: node.raw || `/${node.pattern}/${node.flags}`, type: 'string' };
    }
    return { val: node.value, type: 'string' };
  }

  if (node.type === 'UnaryExpression') {
    if (node.operator === '-' && node.argument) {
      const inner = extractDefaultValue(node.argument, code);
      if (typeof inner.val === 'number') return { val: -inner.val, type: 'number' };
      if (typeof inner.val === 'string') return { val: `-${inner.val}`, type: inner.type };
    }
    if (node.operator === '+' && node.argument) {
      return extractDefaultValue(node.argument, code);
    }
    if (node.operator === '!' && node.argument) {
      const inner = extractDefaultValue(node.argument, code);
      return { val: !inner.val, type: 'boolean' };
    }
  }

  if (node.type === 'ArrayExpression') {
    try {
      const raw = code.slice(node.start, node.end);
      return { val: raw, type: 'json' };
    } catch {
      return { val: '[]', type: 'json' };
    }
  }

  if (node.type === 'ObjectExpression') {
    try {
      const raw = code.slice(node.start, node.end);
      return { val: raw, type: 'json' };
    } catch {
      return { val: '{}', type: 'json' };
    }
  }

  // Complex expressions: IIFE, Arrow Function, Class, NewExpression, BinaryExpression, TaggedTemplate
  const rawExpr = code.slice(node.start, node.end).trim();
  return { val: rawExpr, type: 'text' };
}

/**
 * Extracts options from parameter nodes recursively (Identifiers, AssignmentPatterns, ObjectPatterns, ArrayPatterns, RestElements).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractParamNodes(paramNode: any, code: string, jsdocKeys: Set<string>, resultOptions: OptionDescriptor[]) {
  if (!paramNode) return;

  // 1. AssignmentPattern: param = default
  if (paramNode.type === 'AssignmentPattern') {
    const left = paramNode.left;
    const right = paramNode.right;
    const { val: defaultVal, type: inferredType } = extractDefaultValue(right, code);

    if (left.type === 'Identifier') {
      const key = left.name;
      if (CALLBACK_PARAM_NAMES.has(key) || jsdocKeys.has(key) || resultOptions.some(o => o.key === key)) return;

      let type = inferredType;
      if (type === 'string' && isBooleanParamName(key)) type = 'boolean';

      resultOptions.push({
        key,
        label: formatCamelLabel(key),
        type,
        default: defaultVal,
        source: 'autodetected'
      });
      return;
    }

    if (left.type === 'ObjectPattern' || left.type === 'ArrayPattern') {
      extractParamNodes(left, code, jsdocKeys, resultOptions);
      return;
    }
  }

  // 2. Simple Identifier: function(targetIp)
  if (paramNode.type === 'Identifier') {
    const key = paramNode.name;
    if (CALLBACK_PARAM_NAMES.has(key) || jsdocKeys.has(key) || resultOptions.some(o => o.key === key)) return;

    // Check for TypeScript type annotation if present (from Babel fallback)
    let type: OptionDescriptor['type'] = 'string';
    if (paramNode.typeAnnotation && paramNode.typeAnnotation.typeAnnotation) {
      const tsType = paramNode.typeAnnotation.typeAnnotation.type;
      if (tsType === 'TSNumberKeyword') type = 'number';
      else if (tsType === 'TSBooleanKeyword') type = 'boolean';
      else if (tsType === 'TSArrayType' || tsType === 'TSTypeLiteral') type = 'json';
    } else if (isBooleanParamName(key)) {
      type = 'boolean';
    } else if (/(?:id|port|timeout|count|limit|retries|delay|size|length|index|idx)$/i.test(key)) {
      type = 'number';
    }

    resultOptions.push({
      key,
      label: formatCamelLabel(key),
      type,
      default: type === 'boolean' ? false : type === 'number' ? 0 : '',
      source: 'autodetected'
    });
    return;
  }

  // 3. ObjectPattern: function({ host, port = 8080, timeout: msTimeout = 5000, credentials: { user, pass } = {} })
  if (paramNode.type === 'ObjectPattern') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paramNode.properties.forEach((prop: any) => {
      if (prop.type === 'RestElement') {
        extractParamNodes(prop, code, jsdocKeys, resultOptions);
        return;
      }
      if (prop.type === 'Property' || prop.type === 'ObjectProperty') {
        const propKey = prop.key?.name || prop.key?.value || '';
        const propValue = prop.value;

        if (propValue.type === 'AssignmentPattern') {
          const innerLeft = propValue.left;
          if (innerLeft.type === 'ObjectPattern' || innerLeft.type === 'ArrayPattern') {
            extractParamNodes(innerLeft, code, jsdocKeys, resultOptions);
            return;
          }
          const key = propKey || (innerLeft.type === 'Identifier' ? innerLeft.name : '');
          if (CALLBACK_PARAM_NAMES.has(key) || jsdocKeys.has(key) || resultOptions.some(o => o.key === key)) return;

          const { val: defaultVal, type: inferredType } = extractDefaultValue(propValue.right, code);
          resultOptions.push({
            key,
            label: formatCamelLabel(key),
            type: inferredType,
            default: defaultVal,
            source: 'autodetected'
          });
        } else if (propValue.type === 'Identifier') {
          const key = propKey || propValue.name;
          if (CALLBACK_PARAM_NAMES.has(key) || jsdocKeys.has(key) || resultOptions.some(o => o.key === key)) return;

          const type: OptionDescriptor['type'] = isBooleanParamName(key) ? 'boolean' : 'string';
          resultOptions.push({
            key,
            label: formatCamelLabel(key),
            type,
            default: type === 'boolean' ? false : '',
            source: 'autodetected'
          });
        } else if (propValue.type === 'ObjectPattern' || propValue.type === 'ArrayPattern') {
          extractParamNodes(propValue, code, jsdocKeys, resultOptions);
        }
      }
    });
    return;
  }

  // 4. ArrayPattern: function([primaryDns, secondaryDns = "1.1.1.1", ...fallbackDns])
  if (paramNode.type === 'ArrayPattern') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paramNode.elements.forEach((elem: any) => {
      if (elem) extractParamNodes(elem, code, jsdocKeys, resultOptions);
    });
    return;
  }

  // 5. RestElement: ...fallbackDns
  if (paramNode.type === 'RestElement') {
    const arg = paramNode.argument;
    if (arg && arg.type === 'Identifier') {
      const key = arg.name;
      if (CALLBACK_PARAM_NAMES.has(key) || jsdocKeys.has(key) || resultOptions.some(o => o.key === key)) return;
      resultOptions.push({
        key,
        label: formatCamelLabel(key),
        type: 'text',
        default: '',
        source: 'autodetected'
      });
    }
  }
}

/**
 * Parses script options and metadata using a Tiered AST Parser:
 * Tier 1: Acorn (Primary ES2024 fast parser)
 * Tier 2: @babel/parser (Fallback for TypeScript type annotations, JSX, and error recovery)
 */
export function parseScriptOptions(code: string): ParsedScriptMeta {
  const result: ParsedScriptMeta = {
    name: '',
    description: '',
    options: [],
    warnings: []
  };

  if (!code || !code.trim()) return result;

  const comments: ASTComment[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ast: any = null;

  // Tier 1: Acorn Parser
  try {
    ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
      ranges: true,
      onComment: (_isBlock, text, start, end) => {
        comments.push({ type: _isBlock ? 'Block' : 'Line', value: text, start, end });
      }
    });
  } catch {
    try {
      // Retry Acorn with script mode & allow return outside function (CommonJS)
      ast = acorn.parse(code, {
        ecmaVersion: 'latest',
        sourceType: 'script',
        allowReturnOutsideFunction: true,
        locations: true,
        ranges: true,
        onComment: (_isBlock, text, start, end) => {
          comments.push({ type: _isBlock ? 'Block' : 'Line', value: text, start, end });
        }
      });
    } catch {
      // Tier 2: Babel Parser Fallback (handles TypeScript annotations, JSX, error recovery)
      try {
        ast = babelParse(code, {
          sourceType: 'unambiguous',
          plugins: ['typescript', 'jsx'],
          errorRecovery: true
        });
        if (ast.comments) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ast.comments.forEach((c: any) => comments.push({ type: c.type, value: c.value, start: c.start, end: c.end }));
        }
      } catch (babelErr) {
        console.warn('AST parse error:', (babelErr as Error).message);
      }
    }
  }

  // 1. Process JSDoc Comments
  const jsdocKeys = new Set<string>();
  for (const comment of comments) {
    const text = comment.value;
    if (!text.startsWith('*')) continue;

    const lines = text.split('\n');
    let isHeaderDoc = false;

    for (const rawLine of lines) {
      const line = rawLine.replace(/^\s*\*\s?/, '').trim();

      const nameMatch = line.match(/^@name\s+(.+)$/i);
      if (nameMatch) { result.name = nameMatch[1].trim(); isHeaderDoc = true; }

      const descMatch = line.match(/^@description\s+(.+)$/i);
      if (descMatch) { result.description = descMatch[1].trim(); isHeaderDoc = true; }

      const authorMatch = line.match(/^@author\s+(.+)$/i);
      if (authorMatch) { result.author = authorMatch[1].trim(); isHeaderDoc = true; }

      const versionMatch = line.match(/^@version\s+(.+)$/i);
      if (versionMatch) { result.version = versionMatch[1].trim(); isHeaderDoc = true; }

      const catMatch = line.match(/^@category\s+(.+)$/i);
      if (catMatch) { result.category = catMatch[1].trim(); isHeaderDoc = true; }

      // Parse @param tags
      const paramMatch = line.match(/^@param\s+(?:\{([^}]+)\}\s+)?(?:\[([a-zA-Z0-9_$.]+)(?:=([^\]]+))?\]|([a-zA-Z0-9_$.]+))(?:\s*-\s*|\s+)?([\s\S]*)$/i);
      if (paramMatch) {
        const rawType = (paramMatch[1] || 'string').toLowerCase().trim();
        const paramName = (paramMatch[2] || paramMatch[4] || '').trim();
        const explicitDefault = paramMatch[3] !== undefined ? paramMatch[3].trim() : undefined;
        const description = (paramMatch[5] || '').trim();

        if (paramName && !CALLBACK_PARAM_NAMES.has(paramName)) {
          let type: OptionDescriptor['type'] = 'string';
          let defaultValue: unknown = explicitDefault || '';

          if (rawType.includes('number') || rawType.includes('int') || rawType.includes('float')) {
            type = 'number';
            defaultValue = explicitDefault !== undefined ? Number(explicitDefault) : 0;
          } else if (rawType.includes('bool')) {
            type = 'boolean';
            defaultValue = explicitDefault !== undefined ? explicitDefault === 'true' : false;
          } else if (rawType.includes('select') || rawType.includes('|')) {
            type = 'select';
          } else if (rawType.includes('json') || rawType.includes('object') || rawType.includes('array')) {
            type = 'json';
          }

          result.options.push({
            key: paramName,
            label: formatCamelLabel(paramName),
            type,
            default: defaultValue,
            description,
            source: 'jsdoc'
          });
          jsdocKeys.add(paramName);
        }
      }
    }

    if (!result.description && isHeaderDoc) {
      const cleaned = lines.map(l => l.replace(/^\s*\*\s?/, '').trim()).filter(l => l && !l.startsWith('@')).join(' ');
      if (cleaned) result.description = cleaned;
    }
  }

  const statements = ast?.program?.body || ast?.body;
  if (!statements || !Array.isArray(statements)) return result;

  // 2. Static Security Linter: Detect raw TCP/UDP sockets
  let hasSocketCall = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function scanForSockets(node: any) {
    if (!node || hasSocketCall) return;
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      if (callee && (callee.name === 'require' || (callee.type === 'Identifier' && callee.name === 'require')) && node.arguments?.[0]) {
        const mod = String(node.arguments[0].value || '');
        if (mod === 'net' || mod === 'tls' || mod === 'dgram') hasSocketCall = true;
      }
      if (callee && callee.type === 'MemberExpression') {
        const objName = callee.object?.name;
        const propName = callee.property?.name;
        if ((objName === 'net' || objName === 'tls' || objName === 'dgram') && (propName === 'connect' || propName === 'createConnection' || propName === 'createSocket')) {
          hasSocketCall = true;
        }
      }
    }
    if (node.type === 'ImportDeclaration') {
      const src = String(node.source?.value || '');
      if (src === 'net' || src === 'tls' || src === 'dgram') hasSocketCall = true;
    }

    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'range' || hasSocketCall) continue;
      const child = node[k];
      if (Array.isArray(child)) {
        child.forEach(scanForSockets);
      } else if (child && typeof child === 'object') {
        scanForSockets(child);
      }
    }
  }

  // 3. Traverse Top-Level AST Nodes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statements.forEach((stmt: any) => {
    scanForSockets(stmt);

    // Unpack Export declarations
    let decl = stmt;
    if (stmt.type === 'ExportNamedDeclaration' && stmt.declaration) {
      decl = stmt.declaration;
    } else if (stmt.type === 'ExportDefaultDeclaration' && stmt.declaration) {
      decl = stmt.declaration;
    }

    // A. Top-Level Function Declarations
    if (decl.type === 'FunctionDeclaration' && decl.params) {
      const fnName = decl.id?.name;
      if (fnName && CONTROL_KEYWORDS.has(fnName)) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      decl.params.forEach((param: any) => {
        extractParamNodes(param, code, jsdocKeys, result.options);
      });
    }

    // B. Top-Level Variable Arrow Functions / Function Expressions
    if (decl.type === 'VariableDeclaration' && decl.declarations) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      decl.declarations.forEach((varDecl: any) => {
        const init = varDecl.init;
        if (init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') && init.params) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          init.params.forEach((param: any) => {
            extractParamNodes(param, code, jsdocKeys, result.options);
          });
        }

        // Destructured Options in Code Body: const { file, timeout = 5000 } = options;
        if (varDecl.id?.type === 'ObjectPattern' && init?.type === 'Identifier') {
          const srcName = init.name;
          if (/^(?:options|opts|args|argv|params|config|input)$/i.test(srcName)) {
            extractParamNodes(varDecl.id, code, jsdocKeys, result.options);
          }
        }
      });
    }

    // C. Top-Level Class Constructors
    if (decl.type === 'ClassDeclaration' && decl.body?.body) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      decl.body.body.forEach((member: any) => {
        if (member.type === 'MethodDefinition' && (member.kind === 'constructor' || member.kind === 'method') && member.value?.params) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          member.value.params.forEach((param: any) => {
            extractParamNodes(param, code, jsdocKeys, result.options);
          });
        }
      });
    }
  });

  // 4. CLI Argument Flag Auto-Detection (e.g. process.argv.includes('--verbose'), args.includes('--verbose'), commander, parseArgs)
  const cliFlagRegex = /(?:process\.argv(?:\.slice\([0-9]+\))?|[a-zA-Z0-9_$]+)\.includes\(\s*['"](--[a-zA-Z0-9-_]+|-([a-zA-Z0-9]))['"]\s*\)/g;
  let flagMatch;
  while ((flagMatch = cliFlagRegex.exec(code)) !== null) {
    const rawFlag = flagMatch[1] || flagMatch[2];
    const key = rawFlag.replace(/^--?/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (key && !jsdocKeys.has(key) && !result.options.some(o => o.key === key)) {
      result.options.push({
        key,
        label: formatCamelLabel(key),
        type: 'boolean',
        default: false,
        source: 'autodetected'
      });
    }
  }

  // Commander.js option detection: program.option('-p, --port <number>', 'server port', 8080)
  const commanderRegex = /(?:program|app)\.option\(\s*['"][^'"]*--([a-zA-Z0-9-_]+)[^'"]*['"]\s*,\s*['"][^'"]*['"](?:\s*,\s*([^)]+))?\)/g;
  let cmdMatch;
  while ((cmdMatch = commanderRegex.exec(code)) !== null) {
    const rawKey = cmdMatch[1];
    const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const rawDefault = (cmdMatch[2] || '').trim();
    let type: OptionDescriptor['type'] = 'string';
    let defaultValue: unknown = rawDefault;

    if (/^-?\d+(?:\.\d+)?$/.test(rawDefault)) {
      type = 'number';
      defaultValue = Number(rawDefault);
    } else if (rawDefault === 'true' || rawDefault === 'false') {
      type = 'boolean';
      defaultValue = rawDefault === 'true';
    } else if (!rawDefault) {
      type = 'boolean';
      defaultValue = false;
    }

    if (key && !jsdocKeys.has(key) && !result.options.some(o => o.key === key)) {
      result.options.push({
        key,
        label: formatCamelLabel(key),
        type,
        default: defaultValue,
        source: 'autodetected'
      });
    }
  }

  // parseArgs options detection: parseArgs({ options: { dryRun: { type: 'boolean', default: false } } })
  const parseArgsOptRegex = /([a-zA-Z0-9_$]+)\s*:\s*\{\s*type\s*:\s*['"]([a-zA-Z]+)['"](?:\s*,\s*default\s*:\s*([^}]+))?/g;
  let paMatch;
  while ((paMatch = parseArgsOptRegex.exec(code)) !== null) {
    const key = paMatch[1];
    const paType = paMatch[2];
    const rawDefault = (paMatch[3] || '').trim();
    let type: OptionDescriptor['type'] = 'string';
    let defaultValue: unknown = rawDefault || '';

    if (paType === 'boolean') {
      type = 'boolean';
      defaultValue = rawDefault === 'true';
    } else if (paType === 'string') {
      type = 'string';
      defaultValue = rawDefault.replace(/^['"]|['"]$/g, '');
    }

    if (key && key !== 'options' && key !== 'values' && !jsdocKeys.has(key) && !result.options.some(o => o.key === key)) {
      result.options.push({
        key,
        label: formatCamelLabel(key),
        type,
        default: defaultValue,
        source: 'autodetected'
      });
    }
  }

  // 5. Add Static Socket Security Notice if sockets detected
  if (hasSocketCall && (!result.warnings || !result.warnings.length)) {
    result.warnings = [
      "⚠️ Direct raw TCP/UDP socket connections (via 'net' or 'tls') are restricted by browser security policies and will run in simulated mode. For network traffic, use fetch(), WebSocket, or HTTPS."
    ];
  }

  return result;
}
