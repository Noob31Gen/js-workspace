export interface OptionDescriptor {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'text' | 'json' | 'color' | 'range';
  default: any;
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

  // 3. Extract Destructured Function Parameters: e.g. function main({ file, dryRun = false })
  const funcSigRegex = /(?:(?:export\s+)?(?:async\s+)?function\s*(?:[a-zA-Z0-9_$]+)?|(?:const|let|var)\s+[a-zA-Z0-9_$]+\s*=\s*(?:async\s*)?)\s*\(\s*\{([^}]+)\}\s*\)/gi;
  let funcMatch;

  while ((funcMatch = funcSigRegex.exec(code)) !== null) {
    if (funcMatch && funcMatch[1]) {
      const rawParams = funcMatch[1].split(',');
      for (const rawParam of rawParams) {
        const trimmed = rawParam.trim();
        if (!trimmed) continue;

        const [paramKeyRaw, defaultValRaw] = trimmed.split('=').map(s => s.trim());
        const paramKey = paramKeyRaw.replace(/^[^a-zA-Z0-9_$]+/, '');

        if (paramKey && !jsdocKeys.has(paramKey)) {
          let inferredType: OptionDescriptor['type'] = 'string';
          let inferredDefault: any = '';

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

          const formattedLabel = paramKey
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());

          result.options.push({
            key: paramKey,
            label: formattedLabel,
            type: inferredType,
            default: inferredDefault,
            source: 'autodetected',
            description: 'Auto-detected from function signature'
          });
          jsdocKeys.add(paramKey);
        }
      }
    }
  }

  // 4. Extract Destructured Variables in Code Body: e.g. const { file, dryRun, retries = 2 } = options;
  const destructuredVarRegex = /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*(?:options|opts|args|argv|params|config|input)\b/gi;
  let destMatch;

  while ((destMatch = destructuredVarRegex.exec(code)) !== null) {
    if (destMatch[1]) {
      const rawVars = destMatch[1].split(',');
      for (const rawVar of rawVars) {
        const trimmed = rawVar.trim();
        if (!trimmed) continue;

        const [keyRaw, defaultValRaw] = trimmed.split('=').map(s => s.trim());
        const key = keyRaw.replace(/^[^a-zA-Z0-9_$]+/, '');

        if (key && !jsdocKeys.has(key)) {
          let inferredType: OptionDescriptor['type'] = 'string';
          let inferredDefault: any = '';

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

          const formattedLabel = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());

          result.options.push({
            key,
            label: formattedLabel,
            type: inferredType,
            default: inferredDefault,
            source: 'autodetected',
            description: 'Auto-detected from code destructuring'
          });
          jsdocKeys.add(key);
        }
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
      let inferredDefault: any = '';

      if (/^(is|enable|disable|has|use|with|show|hide|dry)/i.test(camelKey)) {
        inferredType = 'boolean';
        inferredDefault = false;
      } else if (/(count|num|number|size|delay|ms|retries|limit|offset|timeout|index|port|id)$/i.test(camelKey)) {
        inferredType = 'number';
        inferredDefault = 0;
      }

      const formattedLabel = camelKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());

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
      let inferredDefault: any = isNumberWrapper ? 0 : '';

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

      const formattedLabel = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());

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

  // 7. Extract CLI process.argv.includes Flags: e.g. const isVerbose = process.argv.includes('--verbose')
  const processArgvIncludesRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*process\.argv\.includes\(['"]--?([a-zA-Z0-9_$-]+)['"]\)/gi;
  let argvIncMatch;

  while ((argvIncMatch = processArgvIncludesRegex.exec(code)) !== null) {
    const varName = argvIncMatch[1].trim();
    const flagName = argvIncMatch[2].trim();
    const camelKey = flagName.replace(/-([a-z])/g, (_, g) => g.toUpperCase());

    const key = varName || camelKey;
    if (key && !jsdocKeys.has(key)) {
      const formattedLabel = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());

      result.options.push({
        key,
        label: formattedLabel,
        type: 'boolean',
        default: false,
        source: 'autodetected',
        description: `Auto-detected CLI boolean flag from process.argv.includes('--${flagName}')`
      });
      jsdocKeys.add(key);
    }
  }

  // 8. Extract CLI process.env Variables: e.g. const apiKey = process.env.API_KEY || 'default'
  const processEnvRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*process\.env\.([a-zA-Z0-9_$]+)(?:\s*\|\|\s*([^;\n]+))?/gi;
  let envMatch;

  while ((envMatch = processEnvRegex.exec(code)) !== null) {
    const key = envMatch[1].trim();
    const envVarName = envMatch[2].trim();
    const defaultValRaw = envMatch[3] ? envMatch[3].trim() : undefined;

    if (key && !jsdocKeys.has(key)) {
      let inferredType: OptionDescriptor['type'] = 'string';
      let inferredDefault: any = '';

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

      const formattedLabel = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());

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
    label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
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

  let defaultValue: any = '';
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
