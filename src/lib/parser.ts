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
  source?: 'jsdoc' | 'autodetected' | 'env' | 'config';
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

interface ExtractedDefault {
  val: unknown;
  type: OptionDescriptor['type'];
  isRuntimeExpr?: boolean;
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
 * Infers semantic UI control types based on property naming conventions and default values.
 */
function inferSemanticType(key: string, defaultVal: unknown, currentType: OptionDescriptor['type']): OptionDescriptor['type'] {
  if (currentType === 'select' || currentType === 'boolean' || currentType === 'range') return currentType;

  const strDefault = String(defaultVal ?? '');
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(strDefault) || /^(?:themeColor|color|bgColor|backgroundColor|textColor|fillColor|strokeColor)$/i.test(key)) {
    return 'color';
  }

  if (/^(?:payload|body|template|query|sql|script|markdown|html|notes|rawCode|prompt|systemPrompt)$/i.test(key)) {
    return 'text';
  }

  return currentType;
}

/**
 * Converts an AST node value to a clean JSON/string/primitive default representation.
 * Distinguishes genuine configurable data from runtime-evaluated expressions.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDefaultValue(node: any, code: string): ExtractedDefault {
  if (!node) return { val: '', type: 'string' };

  // 1. Literal Primitives
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

  // 2. Pure Static Template Literals (without dynamic interpolations)
  if (node.type === 'TemplateLiteral') {
    if (!node.expressions || node.expressions.length === 0) {
      const rawText = node.quasis?.map((q: { value: { raw: string } }) => q.value?.raw || '').join('') || '';
      return { val: rawText, type: 'string' };
    }
    // Dynamic interpolated template literal (e.g. `Hello ${user}`) -> runtime expression
    return { val: null, type: 'string', isRuntimeExpr: true };
  }

  // 3. Unary Expressions (-1, +5, !0)
  if (node.type === 'UnaryExpression') {
    if (node.operator === '-' && node.argument) {
      const inner = extractDefaultValue(node.argument, code);
      if (typeof inner.val === 'number') return { val: -inner.val, type: 'number' };
      if (typeof inner.val === 'string' && inner.val && !inner.isRuntimeExpr) return { val: `-${inner.val}`, type: inner.type };
    }
    if (node.operator === '+' && node.argument) {
      return extractDefaultValue(node.argument, code);
    }
    if (node.operator === '!' && node.argument) {
      const inner = extractDefaultValue(node.argument, code);
      if (!inner.isRuntimeExpr) return { val: !inner.val, type: 'boolean' };
    }
    return { val: null, type: 'string', isRuntimeExpr: true };
  }

  // 4. Arrays
  if (node.type === 'ArrayExpression') {
    try {
      const raw = code.slice(node.start, node.end);
      return { val: raw, type: 'json' };
    } catch {
      return { val: '[]', type: 'json' };
    }
  }

  // 5. Objects
  if (node.type === 'ObjectExpression') {
    try {
      const raw = code.slice(node.start, node.end);
      return { val: raw, type: 'json' };
    } catch {
      return { val: '{}', type: 'json' };
    }
  }

  // 6. Runtime-evaluated Expressions (NewExpression, TaggedTemplate, CallExpression, Closures, Binary Math, Identifiers)
  // These should NOT be presented as user-editable form parameters.
  return { val: null, type: 'string', isRuntimeExpr: true };
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
    const extracted = extractDefaultValue(right, code);

    // If the default value is a dynamic runtime expression, skip generating a form input
    if (extracted.isRuntimeExpr) {
      return;
    }

    const defaultVal = extracted.val;
    const inferredType = extracted.type;

    if (left.type === 'Identifier') {
      const key = left.name;
      if (CALLBACK_PARAM_NAMES.has(key) || jsdocKeys.has(key) || resultOptions.some(o => o.key === key)) return;

      // Check for TypeScript union literals (e.g. format: 'json' | 'csv' | 'xml' = 'json')
      if (left.typeAnnotation && left.typeAnnotation.typeAnnotation) {
        const tsNode = left.typeAnnotation.typeAnnotation;
        if (tsNode.type === 'TSUnionType' && tsNode.types) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const unionValues = tsNode.types.map((t: any) => {
            if (t.type === 'TSLiteralType' && t.literal) {
              return String(t.literal.value !== undefined ? t.literal.value : t.literal.raw?.replace(/^['"]|['"]$/g, ''));
            }
            return null;
          }).filter(Boolean);

          if (unionValues.length > 0) {
            resultOptions.push({
              key,
              label: formatCamelLabel(key),
              type: 'select',
              options: unionValues,
              default: defaultVal || unionValues[0],
              source: 'autodetected'
            });
            return;
          }
        }
      }

      let type = inferredType;
      if (type === 'string' && isBooleanParamName(key)) type = 'boolean';
      type = inferSemanticType(key, defaultVal, type);

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

    // Check for TypeScript type annotations / union literals
    let type: OptionDescriptor['type'] = 'string';
    let options: string[] | undefined = undefined;

    if (paramNode.typeAnnotation && paramNode.typeAnnotation.typeAnnotation) {
      const tsType = paramNode.typeAnnotation.typeAnnotation.type;
      if (tsType === 'TSNumberKeyword') {
        type = 'number';
      } else if (tsType === 'TSBooleanKeyword') {
        type = 'boolean';
      } else if (tsType === 'TSArrayType' || tsType === 'TSTypeLiteral') {
        type = 'json';
      } else if (tsType === 'TSUnionType' && paramNode.typeAnnotation.typeAnnotation.types) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unionVals = paramNode.typeAnnotation.typeAnnotation.types.map((t: any) => {
          if (t.type === 'TSLiteralType' && t.literal) {
            return String(t.literal.value !== undefined ? t.literal.value : t.literal.raw?.replace(/^['"]|['"]$/g, ''));
          }
          return null;
        }).filter(Boolean);

        if (unionVals.length > 0) {
          type = 'select';
          options = unionVals;
        }
      }
    } else if (isBooleanParamName(key)) {
      type = 'boolean';
    } else if (/(?:id|port|timeout|count|limit|retries|delay|size|length|index|idx)$/i.test(key)) {
      type = 'number';
    }

    type = inferSemanticType(key, '', type);

    resultOptions.push({
      key,
      label: formatCamelLabel(key),
      type,
      options,
      default: type === 'boolean' ? false : type === 'number' ? 0 : (options ? options[0] : ''),
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

          const extracted = extractDefaultValue(propValue.right, code);
          if (extracted.isRuntimeExpr) {
            return;
          }

          const defaultVal = extracted.val;
          const inferredType = extracted.type;
          const type = inferSemanticType(key, defaultVal, inferredType);

          resultOptions.push({
            key,
            label: formatCamelLabel(key),
            type,
            default: defaultVal,
            source: 'autodetected'
          });
        } else if (propValue.type === 'Identifier') {
          const key = propKey || propValue.name;
          if (CALLBACK_PARAM_NAMES.has(key) || jsdocKeys.has(key) || resultOptions.some(o => o.key === key)) return;

          let type: OptionDescriptor['type'] = isBooleanParamName(key) ? 'boolean' : 'string';
          type = inferSemanticType(key, '', type);
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

      // Parse @param tags with union types, min/max, color, range
      const paramMatch = line.match(/^@param\s+(?:\{([^}]+)\}\s+)?(?:\[([a-zA-Z0-9_$.]+)(?:=([^\]]+))?\]|([a-zA-Z0-9_$.]+))(?:\s*-\s*|\s+)?([\s\S]*)$/i);
      if (paramMatch) {
        const rawType = (paramMatch[1] || 'string').trim();
        const paramName = (paramMatch[2] || paramMatch[4] || '').trim();
        const explicitDefault = paramMatch[3] !== undefined ? paramMatch[3].trim() : undefined;
        const description = (paramMatch[5] || '').trim();

        if (paramName && !CALLBACK_PARAM_NAMES.has(paramName)) {
          let type: OptionDescriptor['type'] = 'string';
          let defaultValue: unknown = explicitDefault || '';
          let selectOptions: string[] | undefined = undefined;

          // Union type in JSDoc: @param {'fast'|'thorough'} mode or @param {("json"|"csv")} format
          if (rawType.includes('|')) {
            type = 'select';
            selectOptions = rawType
              .replace(/^[({]+|[})]+$/g, '')
              .split('|')
              .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
              .filter(Boolean);
            defaultValue = explicitDefault !== undefined ? explicitDefault.replace(/^['"]|['"]$/g, '') : (selectOptions[0] || '');
          } else {
            const lowerType = rawType.toLowerCase();
            if (lowerType.includes('number') || lowerType.includes('int') || lowerType.includes('float')) {
              type = 'number';
              defaultValue = explicitDefault !== undefined ? Number(explicitDefault) : 0;
            } else if (lowerType.includes('bool')) {
              type = 'boolean';
              defaultValue = explicitDefault !== undefined ? explicitDefault === 'true' : false;
            } else if (lowerType.includes('select')) {
              type = 'select';
            } else if (lowerType.includes('json') || lowerType.includes('object') || lowerType.includes('array')) {
              type = 'json';
            } else if (lowerType.includes('color')) {
              type = 'color';
            } else if (lowerType.includes('range')) {
              type = 'range';
            }
          }

          type = inferSemanticType(paramName, defaultValue, type);

          result.options.push({
            key: paramName,
            label: formatCamelLabel(paramName),
            type,
            options: selectOptions,
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

  // 3. process.env AST Auto-Detection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function scanForProcessEnv(node: any) {
    if (!node) return;
    if (node.type === 'MemberExpression') {
      const obj = node.object;
      if (obj && obj.type === 'MemberExpression' && obj.object?.name === 'process' && obj.property?.name === 'env') {
        const envKey = node.property?.name || node.property?.value;
        if (typeof envKey === 'string' && envKey && !jsdocKeys.has(envKey) && !result.options.some(o => o.key === envKey)) {
          let envType: OptionDescriptor['type'] = 'string';
          let envDefault: unknown = '';
          if (isBooleanParamName(envKey) || /^(?:DEBUG|VERBOSE|FORCE|PROD|PRODUCTION)$/i.test(envKey)) {
            envType = 'boolean';
            envDefault = false;
          } else if (/^(?:PORT|TIMEOUT|RETRIES|LIMIT|MAX|MIN|DELAY|SIZE|INTERVAL)$/i.test(envKey)) {
            envType = 'number';
            envDefault = 0;
          }

          result.options.push({
            key: envKey,
            label: formatCamelLabel(envKey),
            type: envType,
            default: envDefault,
            source: 'env'
          });
        }
      }
    }
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'range') continue;
      const child = node[k];
      if (Array.isArray(child)) {
        child.forEach(scanForProcessEnv);
      } else if (child && typeof child === 'object') {
        scanForProcessEnv(child);
      }
    }
  }

  // 4. Traverse Top-Level AST Nodes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statements.forEach((stmt: any) => {
    scanForSockets(stmt);
    scanForProcessEnv(stmt);

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

    // B. Top-Level Variable Arrow Functions / Config Objects
    if (decl.type === 'VariableDeclaration' && decl.declarations) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      decl.declarations.forEach((varDecl: any) => {
        const varId = varDecl.id;
        const init = varDecl.init;

        if (init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') && init.params) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          init.params.forEach((param: any) => {
            extractParamNodes(param, code, jsdocKeys, result.options);
          });
        }

        // Destructured Options in Code Body: const { file, timeout = 5000 } = options;
        if (varId?.type === 'ObjectPattern' && init?.type === 'Identifier') {
          const srcName = init.name;
          if (/^(?:options|opts|args|argv|params|config|input)$/i.test(srcName)) {
            extractParamNodes(varId, code, jsdocKeys, result.options);
          }
        }

        // Top-Level Config Objects: const config = { endpoint: '...', retries: 3 }
        if (varId?.type === 'Identifier' && /^(?:config|settings|options|defaults|CONFIG|SETTINGS|DEFAULTS|OPTIONS)$/i.test(varId.name) && init?.type === 'ObjectExpression') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          init.properties.forEach((prop: any) => {
            if (prop.type === 'Property' || prop.type === 'ObjectProperty') {
              const propKey = prop.key?.name || prop.key?.value || '';
              if (propKey && !jsdocKeys.has(propKey) && !result.options.some(o => o.key === propKey)) {
                const extracted = extractDefaultValue(prop.value, code);
                if (!extracted.isRuntimeExpr) {
                  result.options.push({
                    key: propKey,
                    label: formatCamelLabel(propKey),
                    type: inferSemanticType(propKey, extracted.val, extracted.type),
                    default: extracted.val,
                    source: 'config'
                  });
                }
              }
            }
          });
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

  // 5. CLI Argument Flag Auto-Detection (process.argv, args.includes, commander, parseArgs, yargs)
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

  // Yargs option detection: yargs.option('timeout', { type: 'number', default: 5000 })
  const yargsRegex = /yargs(?:\.[a-zA-Z0-9_$]+)*\.option\(\s*['"]([a-zA-Z0-9-_]+)['"]\s*,\s*\{([^}]+)\}\s*\)/g;
  let yargsMatch;
  while ((yargsMatch = yargsRegex.exec(code)) !== null) {
    const key = yargsMatch[1];
    const body = yargsMatch[2];
    let type: OptionDescriptor['type'] = 'string';
    let defaultValue: unknown = '';
    const typeMatch = body.match(/type\s*:\s*['"]([a-zA-Z]+)['"]/i);
    if (typeMatch) {
      if (typeMatch[1] === 'number') type = 'number';
      else if (typeMatch[1] === 'boolean') type = 'boolean';
    }
    const defMatch = body.match(/default\s*:\s*([^,}\n]+)/i);
    if (defMatch) {
      const raw = defMatch[1].trim().replace(/^['"]|['"]$/g, '');
      if (type === 'number') defaultValue = Number(raw);
      else if (type === 'boolean') defaultValue = raw === 'true';
      else defaultValue = raw;
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

  // 6. Add Static Socket Security Notice if sockets detected
  if (hasSocketCall && (!result.warnings || !result.warnings.length)) {
    result.warnings = [
      "⚠️ Direct raw TCP/UDP socket connections (via 'net' or 'tls') are restricted by browser security policies and will run in simulated mode. For network traffic, use fetch(), WebSocket, or HTTPS."
    ];
  }

  return result;
}
