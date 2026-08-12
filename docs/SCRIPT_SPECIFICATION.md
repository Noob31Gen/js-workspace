# Script Specification & Option Detection

The **JS Workspace** platform supports two clean methods for defining parameter inputs, options, and metadata inside your scripts.

---

## Method 1: JSDoc Header Annotations (Recommended)

Add a JSDoc block at the top of your script specifying `@name`, `@description`, and `@param` definitions.

```javascript
/**
 * @name Link Harvester
 * @description Scrapes a web page and extracts all hyperlinked URLs.
 * 
 * @param {string} targetUrl - Target URL to inspect - default: "https://news.ycombinator.com"
 * @param {number} maxLinks - Maximum links to collect - default: 25
 * @param {boolean} uniqueOnly - Deduplicate returned URLs - default: true
 * @param {select:fast|thorough} scanMode - Parsing aggressiveness - default: "fast"
 */
async function run({ targetUrl, maxLinks, uniqueOnly, scanMode }) {
  console.log(`Starting scan on ${targetUrl} [Mode: ${scanMode}]...`);
  
  // Use helper fetch (or extension fetch if CORS is needed)
  const res = await fetch(targetUrl);
  const html = await res.text();
  
  const hrefRegex = /href=["'](https?:\/\/[^"']+)["']/g;
  const links = [];
  let match;
  
  while ((match = hrefRegex.exec(html)) !== null && links.length < maxLinks) {
    if (!uniqueOnly || !links.includes(match[1])) {
      links.push(match[1]);
    }
  }
  
  console.log(`Successfully extracted ${links.length} links:`, links);
  return links;
}
```

### Supported JSDoc Data Types

| Type Syntax | Generated UI Element | Example Default Value |
| :--- | :--- | :--- |
| `{string}` | Text Input | `"https://example.com"` |
| `{number}` | Numeric Input / Stepper | `10` |
| `{boolean}` | Toggle Switch / Checkbox | `true` |
| `{select:opt1\|opt2\|opt3}` | Dropdown Select | `"opt1"` |
| `{text}` | Multi-line Textarea | `"Header 1\nHeader 2"` |

---

## Method 2: ES Config Object Export

Alternatively, export a structured `config` object containing exact parameter definitions and validation rules:

```javascript
export const config = {
  name: "API Data Aggregator",
  description: "Fetches user data from JSON APIs.",
  options: {
    endpoint: {
      type: "string",
      label: "API Endpoint URL",
      default: "https://jsonplaceholder.typicode.com/posts"
    },
    limit: {
      type: "number",
      label: "Record Limit",
      default: 5,
      min: 1,
      max: 100
    },
    includeComments: {
      type: "boolean",
      label: "Include Comments",
      default: false
    }
  }
};

export async function run(options) {
  console.log(`Fetching from ${options.endpoint}...`);
  const response = await fetch(`${options.endpoint}?_limit=${options.limit}`);
  const data = await response.json();
  console.table(data);
}
```

---

## Global Runtime Environment

Scripts executed inside the workspace have access to standard browser globals and worker utilities:

- **`console`**: `log()`, `info()`, `warn()`, `error()`, `table()`, `clear()`
- **`fetch(url, options)`**: Standard browser fetch API
- **`fetchViaExtension(url, options)`**: Extension-bridged fetch API (bypasses CORS)
- **`setTimeout` / `setInterval`**: Standard timer functions
- **`URL` / `URLSearchParams`**: Standard URL manipulation utilities
- **`TextEncoder` / `TextDecoder`**: Binary string utilities
