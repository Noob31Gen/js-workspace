/**
 * @name Interactive Frame & Multi-Element Test Suite
 * @description Comprehensive test script for evaluating DOM element creation, multiple iframes, horizontal & vertical scrollability, dynamic element removal, and live user interactivity.
 * 
 * @param {string} testTitle Title of Test Suite - default: "Interactive Frame & DOM Sandbox Showcase"
 * @param {range:1:5:1} iframeCount Number of Sub-Iframes to Inject - default: 2
 * @param {select:Indigo|Emerald|Crimson|Amber} themeColor Accent Color Theme - default: "Indigo"
 * @param {boolean} enableWideGrid Enable 1200px Wide Horizontal Scroll Table - default: true
 * @param {boolean} enableTallSection Enable 1500px Tall Vertical Scroll Section - default: true
 */
function run({
  testTitle = "Interactive Frame & DOM Sandbox Showcase",
  iframeCount = 2,
  themeColor = "Indigo",
  enableWideGrid = true,
  enableTallSection = true
}) {
  console.log("==================================================");
  console.log(`🚀 STARTING: ${testTitle}`);
  console.log(`🎨 Accent Theme: ${themeColor} | 📦 Iframes: ${iframeCount}`);
  console.log("==================================================");

  // 1. Theme Color Palettes
  const themes = {
    Indigo: { primary: '#6366f1', light: '#818cf8', bg: '#312e81', border: '#4338ca' },
    Emerald: { primary: '#10b981', light: '#34d399', bg: '#064e3b', border: '#047857' },
    Crimson: { primary: '#f43f5e', light: '#fb7185', bg: '#881337', border: '#be123c' },
    Amber: { primary: '#f59e0b', light: '#fbbf24', bg: '#78350f', border: '#b45309' }
  };
  const theme = themes[themeColor] || themes.Indigo;

  // 2. Clean up any previous test instances
  const existingApp = document.getElementById("interactive-test-root");
  if (existingApp) {
    existingApp.remove();
    console.log("🧹 Cleaned up existing test container via existingApp.remove()");
  }

  // 3. Create Main Root Container
  const root = document.createElement("div");
  root.id = "interactive-test-root";
  root.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  root.style.backgroundColor = "#09090b";
  root.style.color = "#f4f4f5";
  root.style.borderRadius = "14px";
  root.style.border = `1px solid ${theme.border}`;
  root.style.padding = "20px";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "20px";

  // 4. Header Bar with Dynamic Badge
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.flexWrap = "wrap";
  header.style.gap = "12px";
  header.style.paddingBottom = "16px";
  header.style.borderBottom = "1px solid #27272a";

  const titleGroup = document.createElement("div");
  const titleEl = document.createElement("h2");
  titleEl.innerText = testTitle;
  titleEl.style.margin = "0";
  titleEl.style.fontSize = "20px";
  titleEl.style.fontWeight = "700";
  titleEl.style.color = theme.light;

  const subtitleEl = document.createElement("p");
  subtitleEl.innerText = "Tests multiple iframes, element spawning/removal, canvas, scrollability, and live DOM clicks.";
  subtitleEl.style.margin = "4px 0 0 0";
  subtitleEl.style.fontSize = "12px";
  subtitleEl.style.color = "#a1a1aa";

  titleGroup.appendChild(titleEl);
  titleGroup.appendChild(subtitleEl);

  const statusBadge = document.createElement("span");
  statusBadge.innerText = `${themeColor.toUpperCase()} ACTIVE`;
  statusBadge.style.backgroundColor = theme.bg;
  statusBadge.style.color = theme.light;
  statusBadge.style.padding = "4px 12px";
  statusBadge.style.borderRadius = "9999px";
  statusBadge.style.fontSize = "11px";
  statusBadge.style.fontWeight = "bold";
  statusBadge.style.border = `1px solid ${theme.border}`;

  header.appendChild(titleGroup);
  header.appendChild(statusBadge);
  root.appendChild(header);

  // 5. Interactive Section 1: Live Click Counter & Dynamic Element Spawner
  const interactiveCard = document.createElement("div");
  interactiveCard.style.backgroundColor = "#18181b";
  interactiveCard.style.padding = "16px";
  interactiveCard.style.borderRadius = "12px";
  interactiveCard.style.border = "1px solid #27272a";

  const cardTitle = document.createElement("h3");
  cardTitle.innerText = "⚡ Interactive Widget Controls (Click & Mutate DOM)";
  cardTitle.style.margin = "0 0 12px 0";
  cardTitle.style.fontSize = "14px";
  cardTitle.style.color = "#fafafa";
  interactiveCard.appendChild(cardTitle);

  const controlsRow = document.createElement("div");
  controlsRow.style.display = "flex";
  controlsRow.style.flexWrap = "wrap";
  controlsRow.style.gap = "10px";
  controlsRow.style.alignItems = "center";

  // Counter Display
  const counterDisplay = document.createElement("span");
  counterDisplay.id = "live-counter-val";
  counterDisplay.innerText = "Count: 0";
  counterDisplay.style.fontSize = "13px";
  counterDisplay.style.fontWeight = "bold";
  counterDisplay.style.color = theme.light;
  counterDisplay.style.backgroundColor = "#27272a";
  counterDisplay.style.padding = "6px 14px";
  counterDisplay.style.borderRadius = "8px";

  // Increment Button
  const incBtn = document.createElement("button");
  incBtn.innerText = "➕ Increment Counter";
  incBtn.style.padding = "6px 14px";
  incBtn.style.backgroundColor = theme.primary;
  incBtn.style.color = "#ffffff";
  incBtn.style.border = "none";
  incBtn.style.borderRadius = "8px";
  incBtn.style.cursor = "pointer";
  incBtn.style.fontWeight = "600";
  incBtn.style.fontSize = "12px";
  incBtn.setAttribute("onclick", "var el = document.getElementById('live-counter-val'); if (el) { var count = parseInt(el.innerText.replace('Count: ', '') || '0') + 1; el.innerText = 'Count: ' + count; }");

  // Spawn Element Button
  const spawnBtn = document.createElement("button");
  spawnBtn.innerText = "✨ Spawn Dynamic Tag";
  spawnBtn.style.padding = "6px 14px";
  spawnBtn.style.backgroundColor = "#27272a";
  spawnBtn.style.color = "#e4e4e7";
  spawnBtn.style.border = "1px solid #3f3f46";
  spawnBtn.style.borderRadius = "8px";
  spawnBtn.style.cursor = "pointer";
  spawnBtn.style.fontWeight = "600";
  spawnBtn.style.fontSize = "12px";

  // Container for spawned tags
  const tagsContainer = document.createElement("div");
  tagsContainer.id = "spawned-tags-box";
  tagsContainer.style.display = "flex";
  tagsContainer.style.flexWrap = "wrap";
  tagsContainer.style.gap = "8px";
  tagsContainer.style.marginTop = "12px";

  spawnBtn.setAttribute("onclick", "var tagBox = document.getElementById('spawned-tags-box'); if (tagBox) { var tagId = 'tag-' + Math.floor(Math.random() * 9000 + 1000); var span = document.createElement('span'); span.id = tagId; span.style.display = 'inline-flex'; span.style.alignItems = 'center'; span.style.gap = '6px'; span.style.backgroundColor = '#27272a'; span.style.color = '#f4f4f5'; span.style.padding = '3px 8px'; span.style.borderRadius = '6px'; span.style.fontSize = '11px'; span.style.fontFamily = 'monospace'; span.innerHTML = 'Item #' + tagId + ' <button style=\"background:transparent;color:#ef4444;border:none;cursor:pointer;font-weight:bold;\" onclick=\"this.parentElement.remove()\">✕</button>'; tagBox.appendChild(span); }");

  controlsRow.appendChild(counterDisplay);
  controlsRow.appendChild(incBtn);
  controlsRow.appendChild(spawnBtn);
  interactiveCard.appendChild(controlsRow);
  interactiveCard.appendChild(tagsContainer);
  root.appendChild(interactiveCard);

  // 6. Interactive Section 2: Multiple Sandboxed Iframes
  const iframesSection = document.createElement("div");
  iframesSection.style.display = "flex";
  iframesSection.style.flexDirection = "column";
  iframesSection.style.gap = "10px";

  const iframesTitle = document.createElement("h3");
  iframesTitle.innerText = `🖼️ Multiple Iframe Injection (${iframeCount} Active Frames)`;
  iframesTitle.style.margin = "0";
  iframesTitle.style.fontSize = "14px";
  iframesTitle.style.color = "#fafafa";
  iframesSection.appendChild(iframesTitle);

  const iframesGrid = document.createElement("div");
  iframesGrid.style.display = "grid";
  iframesGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(280px, 1fr))";
  iframesGrid.style.gap = "14px";

  for (let i = 1; i <= iframeCount; i++) {
    const frameCard = document.createElement("div");
    frameCard.id = `iframe-card-${i}`;
    frameCard.style.backgroundColor = "#18181b";
    frameCard.style.borderRadius = "10px";
    frameCard.style.border = "1px solid #27272a";
    frameCard.style.overflow = "hidden";
    frameCard.style.display = "flex";
    frameCard.style.flexDirection = "column";

    const frameHeader = document.createElement("div");
    frameHeader.style.padding = "8px 12px";
    frameHeader.style.backgroundColor = "#27272a";
    frameHeader.style.display = "flex";
    frameHeader.style.justifyContent = "space-between";
    frameHeader.style.alignItems = "center";

    const frameLabel = document.createElement("span");
    frameLabel.innerText = `Iframe Channel #${i}`;
    frameLabel.style.fontSize = "11px";
    frameLabel.style.fontFamily = "monospace";
    frameLabel.style.fontWeight = "bold";
    frameLabel.style.color = theme.light;

    const frameCloseBtn = document.createElement("button");
    frameCloseBtn.innerText = "Remove Frame";
    frameCloseBtn.style.padding = "2px 8px";
    frameCloseBtn.style.fontSize = "10px";
    frameCloseBtn.style.backgroundColor = "#7f1d1d";
    frameCloseBtn.style.color = "#fca5a5";
    frameCloseBtn.style.border = "none";
    frameCloseBtn.style.borderRadius = "4px";
    frameCloseBtn.style.cursor = "pointer";
    frameCloseBtn.setAttribute("onclick", `document.getElementById('iframe-card-${i}')?.remove()`);

    frameHeader.appendChild(frameLabel);
    frameHeader.appendChild(frameCloseBtn);

    const subIframe = document.createElement("iframe");
    subIframe.style.height = "160px";
    subIframe.style.width = "100%";
    subIframe.style.border = "none";
    subIframe.setAttribute("sandbox", "allow-scripts");
    subIframe.src = "about:blank";

    frameCard.appendChild(frameHeader);
    frameCard.appendChild(subIframe);
    iframesGrid.appendChild(frameCard);
    console.log(`[+] Mounted Sub-Iframe #${i} with sandbox="allow-scripts"`);
  }

  iframesSection.appendChild(iframesGrid);
  root.appendChild(iframesSection);

  // 7. Scrollability Test 1: 1,200px Wide Multi-Column Grid (Horizontal Scroll)
  if (enableWideGrid) {
    const wideSection = document.createElement("div");
    wideSection.style.display = "flex";
    wideSection.style.flexDirection = "column";
    wideSection.style.gap = "8px";

    const wideTitle = document.createElement("h3");
    wideTitle.innerText = "↔️ Horizontal Scrollability Test (1,200px Wide Table)";
    wideTitle.style.margin = "0";
    wideTitle.style.fontSize = "14px";
    wideTitle.style.color = "#fafafa";
    wideSection.appendChild(wideTitle);

    const scrollContainer = document.createElement("div");
    scrollContainer.style.width = "100%";
    scrollContainer.style.overflowX = "auto";
    scrollContainer.style.webkitOverflowScrolling = "touch";
    scrollContainer.style.border = "1px solid #27272a";
    scrollContainer.style.borderRadius = "10px";
    scrollContainer.style.backgroundColor = "#121214";

    const wideTable = document.createElement("table");
    wideTable.style.width = "1200px";
    wideTable.style.borderCollapse = "collapse";
    wideTable.style.fontSize = "11px";
    wideTable.style.textAlign = "left";
    wideTable.style.fontFamily = "monospace";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr style="background: #18181b; border-bottom: 1px solid #27272a; color: #a1a1aa; text-transform: uppercase;">
        <th style="padding: 10px 12px; width: 60px;">ID</th>
        <th style="padding: 10px 12px; width: 140px;">Service Name</th>
        <th style="padding: 10px 12px; width: 120px;">Cluster Node</th>
        <th style="padding: 10px 12px; width: 100px;">Region</th>
        <th style="padding: 10px 12px; width: 100px;">Status</th>
        <th style="padding: 10px 12px; width: 100px;">Latency</th>
        <th style="padding: 10px 12px; width: 110px;">Throughput</th>
        <th style="padding: 10px 12px; width: 130px;">Active SSL Cert</th>
        <th style="padding: 10px 12px; width: 120px;">Allocated RAM</th>
        <th style="padding: 10px 12px; width: 120px;">Monthly Budget</th>
      </tr>
    `;
    wideTable.appendChild(thead);

    const tbody = document.createElement("tbody");
    const mockServices = [
      { id: 'SRV-01', name: 'Auth Gateway', node: 'node-us-east-1a', reg: 'us-east', stat: 'Healthy', lat: '12ms', tps: '14,200 req/s', ssl: 'LetEncrypt-v3', ram: '8.0 GB', budget: '$4,200' },
      { id: 'SRV-02', name: 'GraphQL Proxy', node: 'node-eu-west-1b', reg: 'eu-west', stat: 'Healthy', lat: '18ms', tps: '8,900 req/s', ssl: 'DigiCert-Pro', ram: '16.0 GB', budget: '$6,800' },
      { id: 'SRV-03', name: 'Search Engine', node: 'node-ap-south-2', reg: 'ap-south', stat: 'Warning', lat: '45ms', tps: '3,100 req/s', ssl: 'Cloudflare-Edge', ram: '32.0 GB', budget: '$12,400' }
    ];

    tbody.innerHTML = mockServices.map(s => `
      <tr style="border-bottom: 1px solid #27272a;">
        <td style="padding: 8px 12px; color: #a1a1aa;">${s.id}</td>
        <td style="padding: 8px 12px; font-weight: bold; color: #f4f4f5;">${s.name}</td>
        <td style="padding: 8px 12px; color: ${theme.light};">${s.node}</td>
        <td style="padding: 8px 12px; color: #a1a1aa;">${s.reg}</td>
        <td style="padding: 8px 12px;"><span style="background: ${s.stat === 'Healthy' ? '#064e3b' : '#78350f'}; color: ${s.stat === 'Healthy' ? '#6ee7b7' : '#fcd34d'}; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${s.stat}</span></td>
        <td style="padding: 8px 12px; color: #38bdf8;">${s.lat}</td>
        <td style="padding: 8px 12px; color: #e4e4e7;">${s.tps}</td>
        <td style="padding: 8px 12px; color: #a1a1aa;">${s.ssl}</td>
        <td style="padding: 8px 12px; color: #e4e4e7;">${s.ram}</td>
        <td style="padding: 8px 12px; font-weight: bold; color: #34d399;">${s.budget}</td>
      </tr>
    `).join('');
    wideTable.appendChild(tbody);
    scrollContainer.appendChild(wideTable);
    wideSection.appendChild(scrollContainer);
    root.appendChild(wideSection);
  }

  // 8. Scrollability Test 2: 1,500px Tall Vertical Scroll Section
  if (enableTallSection) {
    const tallSection = document.createElement("div");
    tallSection.style.display = "flex";
    tallSection.style.flexDirection = "column";
    tallSection.style.gap = "10px";

    const tallTitle = document.createElement("h3");
    tallTitle.innerText = "↕️ Vertical Scrollability Test (1,500px Tall Status Feed)";
    tallTitle.style.margin = "0";
    tallTitle.style.fontSize = "14px";
    tallTitle.style.color = "#fafafa";
    tallSection.appendChild(tallTitle);

    const tallFeed = document.createElement("div");
    tallFeed.style.backgroundColor = "#121214";
    tallFeed.style.border = "1px solid #27272a";
    tallFeed.style.borderRadius = "10px";
    tallFeed.style.padding = "16px";
    tallFeed.style.display = "flex";
    tallFeed.style.flexDirection = "column";
    tallFeed.style.gap = "12px";

    for (let i = 1; i <= 15; i++) {
      const feedItem = document.createElement("div");
      feedItem.style.padding = "12px 14px";
      feedItem.style.backgroundColor = i % 2 === 0 ? "#18181b" : "#202024";
      feedItem.style.borderRadius = "8px";
      feedItem.style.border = "1px solid #27272a";
      feedItem.style.display = "flex";
      feedItem.style.justifyContent = "space-between";
      feedItem.style.alignItems = "center";

      const feedText = document.createElement("span");
      feedText.innerText = `Checkpoint Step #${i}: Telemetry stream verified and processed without packet loss.`;
      feedText.style.fontSize = "12px";
      feedText.style.color = "#e4e4e7";

      const feedTime = document.createElement("span");
      feedTime.innerText = `+${i * 120}ms`;
      feedTime.style.fontSize = "11px";
      feedTime.style.fontFamily = "monospace";
      feedTime.style.color = theme.light;

      feedItem.appendChild(feedText);
      feedItem.appendChild(feedTime);
      tallFeed.appendChild(feedItem);
    }

    tallSection.appendChild(tallFeed);
    root.appendChild(tallSection);
  }

  // 9. Append Assembled Tree to Document Body
  document.body.appendChild(root);
  console.log("✅ Successfully injected interactive DOM tree into Frame Preview!");

  return {
    status: "success",
    testSuite: testTitle,
    theme: themeColor,
    subIframesMounted: iframeCount,
    featuresTested: [
      "Dynamic Element Creation & Attributes",
      "Live In-Frame Counter Clicks",
      "Dynamic Tag Spawner & .remove() Deletion",
      "Multiple Sandboxed Sub-Iframes",
      "1200px Horizontal Table Scroll",
      "1500px Vertical Feed Scroll"
    ]
  };
}

module.exports = { run };
