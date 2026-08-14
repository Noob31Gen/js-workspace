/**
 * @name API Data Aggregator
 * @description Queries public JSON endpoints, filters records, and outputs clean table data.
 * 
 * @param {string} endpoint JSON Endpoint URL - default: "https://jsonplaceholder.typicode.com/posts"
 * @param {number} limit Maximum Records - default: 5
 * @param {boolean} includeMeta Print JSON Schema Metadata - default: true
 */
export async function run({ endpoint, limit, includeMeta }) {
  console.log(`🔍 Requesting JSON data from ${endpoint}...`);

  const response = await fetch(`${endpoint}?_limit=${limit}`);
  if (!response.ok) {
    throw new Error(`API returned HTTP status ${response.status}`);
  }

  const posts = await response.json();
  console.log(`Received ${posts.length} records.`);

  if (includeMeta) {
    console.log("Record Schema Keys:", Object.keys(posts[0] || {}));
  }

  console.table(posts.map(p => ({ ID: p.id, Title: p.title.slice(0, 30) + '...', User: p.userId })));

  return posts;
}
