export interface OptionDescriptor {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'text';
  default: any;
  options?: string[]; // For select dropdowns
  description?: string;
}

export interface ParsedScriptMeta {
  name: string;
  description: string;
  options: OptionDescriptor[];
}

/**
 * Parses script source code for JSDoc `@name`, `@description`, and `@param` annotations.
 */
export function parseScriptOptions(code: string): ParsedScriptMeta {
  const result: ParsedScriptMeta = {
    name: 'Untitled Script',
    description: 'Custom browser script',
    options: []
  };

  // 1. Extract @name
  const nameMatch = code.match(/@name\s+(.+)/i);
  if (nameMatch) {
    result.name = nameMatch[1].trim();
  }

  // 2. Extract @description
  const descMatch = code.match(/@description\s+(.+)/i);
  if (descMatch) {
    result.description = descMatch[1].trim();
  }

  // 3. Extract @param annotations
  // Format: @param {type} key Label - default: "val"
  const paramRegex = /@param\s+\{([^}]+)\}\s+([a-zA-Z0-9_$]+)\s+([^-]+)(?:\s*-\s*default:\s*(.+))?/gi;
  let match;

  while ((match = paramRegex.exec(code)) !== null) {
    const rawType = match[1].trim().toLowerCase();
    const key = match[2].trim();
    const label = match[3].trim();
    const rawDefault = match[4] ? match[4].trim() : undefined;

    let type: OptionDescriptor['type'] = 'string';
    let options: string[] | undefined = undefined;

    if (rawType.startsWith('select:')) {
      type = 'select';
      options = rawType.replace('select:', '').split('|').map(s => s.trim());
    } else if (rawType === 'number') {
      type = 'number';
    } else if (rawType === 'boolean') {
      type = 'boolean';
    } else if (rawType === 'text') {
      type = 'text';
    }

    let defaultValue: any = '';
    if (type === 'number') {
      defaultValue = rawDefault ? Number(rawDefault) : 0;
    } else if (type === 'boolean') {
      defaultValue = rawDefault === 'true';
    } else if (type === 'select') {
      const cleanedDefault = rawDefault ? rawDefault.replace(/^["']|["']$/g, '') : '';
      defaultValue = cleanedDefault || (options && options[0]) || '';
    } else {
      defaultValue = rawDefault ? rawDefault.replace(/^["']|["']$/g, '') : '';
    }

    result.options.push({
      key,
      label,
      type,
      default: defaultValue,
      options
    });
  }

  return result;
}
