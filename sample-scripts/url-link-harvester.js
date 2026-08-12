/**
 * @name URL Link Harvester
 * @description Fetches a web page and extracts all hyperlinked URLs matching custom filter criteria.
 * 
 * @param {string} targetUrl Target Web Page URL - default: "https://news.ycombinator.com"
 * @param {number} maxLinks Maximum Links to Extract - default: 20
 * @param {boolean} uniqueOnly Deduplicate Returned Links - default: true
 * @param {select:all|http-only|https-only} protocolFilter Filter Protocols - default: "https-only"
 */
async function run({ targetUrl, maxLinks, uniqueOnly, protocolFilter }) {
  console.log(`📡 Fetching page content from: ${targetUrl}...`);

  let html;
  try {
    const res = await fetch(targetUrl);
    html = await res.text();
  } catch (err) {
    console.warn(`⚠️ Standard fetch failed (CORS restriction likely). Attempting via extension helper...`);
    const extResult = await fetchViaExtension(targetUrl);
    if (!extResult.success) {
      throw new Error(`Failed to fetch page: ${extResult.error}`);
    }
    html = extResult.data;
  }

  console.log(`Parsing HTML string (${html.length} bytes)...`);

  const hrefRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
  const links = [];
  let match;

  while ((match = hrefRegex.exec(html)) !== null && links.length < maxLinks) {
    const link = match[1];

    if (protocolFilter === 'https-only' && !link.startsWith('https://')) continue;
    if (protocolFilter === 'http-only' && !link.startsWith('http://')) continue;

    if (!uniqueOnly || !links.includes(link)) {
      links.push(link);
    }
  }

  console.log(`✅ Extracted ${links.length} matching URLs:`);
  console.table(links.map((url, idx) => ({ Index: idx + 1, URL: url })));

  return links;
}
