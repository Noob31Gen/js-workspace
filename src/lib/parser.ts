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

  // 2. Extract @param JSDoc annotations
  // Format: @param {type} key Label - default: "val"
  const paramRegex = /@param\s+\{([^}]+)\}\s+([a-zA-Z0-9_$]+)\s+([^-]+)(?:\s*-\s*default:\s*(.+))?/gi;
  let match;

  while ((match = paramRegex.exec(code)) !== null) {
    const rawType = match[1].trim().toLowerCase();
    const key = match[2].trim();
    const label = match[3].trim();
    const rawDefault = match[4] ? match[4].trim() : undefined;

    jsdocKeys.add(key);

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
    } else if (rawType === 'number') {
      type = 'number';
    } else if (rawType === 'boolean') {
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
      defaultValue = rawDefault !== undefined ? Number(rawDefault) : (minVal ?? 0);
    } else if (type === 'boolean') {
      defaultValue = rawDefault === 'true';
    } else if (type === 'select') {
      const cleanedDefault = rawDefault ? rawDefault.replace(/^["']|["']$/g, '') : '';
      defaultValue = cleanedDefault || (optionsList && optionsList[0]) || '';
    } else if (type === 'json') {
      defaultValue = rawDefault ? rawDefault : '{}';
    } else {
      defaultValue = rawDefault ? rawDefault.replace(/^["']|["']$/g, '') : '';
    }

    result.options.push({
      key,
      label,
      type,
      default: defaultValue,
      options: optionsList,
      min: minVal,
      max: maxVal,
      step: stepVal,
      source: 'jsdoc'
    });
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

  // 5. Extract Direct Property Usage in Code Body: e.g. options.file, options.dryRun, options['batch-size']
  const propAccessRegex = /(?:options|opts|args|argv|params|config|input)\.([a-zA-Z0-9_$]+)|(?:options|opts|args|argv|params|config|input)\[['"]([a-zA-Z0-9_$-]+)['"]\]/gi;
  let propMatch;

  while ((propMatch = propAccessRegex.exec(code)) !== null) {
    const rawProp = propMatch[1] || propMatch[2];
    if (!rawProp) continue;

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

  return result;
}
