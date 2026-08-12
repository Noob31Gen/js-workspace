import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScriptEditor } from '@/components/workspace/ScriptEditor';
import { DynamicOptionForm } from '@/components/workspace/DynamicOptionForm';
import { ConsoleViewer } from '@/components/workspace/ConsoleViewer';
import { DocViewerModal } from '@/components/workspace/DocViewerModal';
import { parseScriptOptions } from '@/lib/parser';
import { ScriptRunner, ConsoleLogMessage } from '@/lib/worker-runner';
import { Terminal, ShieldCheck, Sparkles } from 'lucide-react';

const INITIAL_SCRIPTS = [
  {
    id: 'url-harvester',
    name: 'URL Link Harvester',
    description: 'Scrapes web pages & extracts hyperlinks',
    category: 'Network',
    code: `/**
 * @name URL Link Harvester
 * @description Fetches a web page and extracts all hyperlinked URLs matching custom filter criteria.
 * 
 * @param {string} targetUrl Target Web Page URL - default: "https://news.ycombinator.com"
 * @param {number} maxLinks Maximum Links to Extract - default: 15
 * @param {boolean} uniqueOnly Deduplicate Returned Links - default: true
 * @param {select:all|http-only|https-only} protocolFilter Filter Protocols - default: "https-only"
 */
async function run({ targetUrl, maxLinks, uniqueOnly, protocolFilter }) {
  console.log(\`📡 Fetching page content from: \${targetUrl}...\`);

  let html;
  try {
    const res = await fetch(targetUrl);
    html = await res.text();
  } catch (err) {
    console.warn(\`⚠️ Standard fetch failed (CORS restriction likely). Using sample demo HTML data...\`);
    html = '<a href="https://github.com">GitHub</a> <a href="https://news.ycombinator.com">HackerNews</a> <a href="https://react.dev">React</a>';
  }

  console.log(\`Parsing HTML payload (\${html.length} characters)...\`);

  const hrefRegex = /href=["'](https?:\\/\\/[^"']+)["']/gi;
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

  console.log(\`✅ Found \${links.length} URLs:\`);
  console.table(links.map((url, idx) => ({ Index: idx + 1, URL: url })));

  return links;
}`
  },
  {
    id: 'api-aggregator',
    name: 'API Data Processor',
    description: 'Queries REST endpoints & formats JSON tables',
    category: 'API',
    code: `/**
 * @name API Data Processor
 * @description Queries public JSON endpoints, filters records, and outputs clean table data.
 * 
 * @param {string} endpoint JSON Endpoint URL - default: "https://jsonplaceholder.typicode.com/posts"
 * @param {number} limit Maximum Records - default: 5
 * @param {boolean} includeMeta Print JSON Schema Metadata - default: true
 */
async function run({ endpoint, limit, includeMeta }) {
  console.log(\`🔍 Requesting JSON data from \${endpoint}...\`);

  const response = await fetch(\`\${endpoint}?_limit=\${limit}\`);
  if (!response.ok) {
    throw new Error(\`API returned HTTP status \${response.status}\`);
  }

  const posts = await response.json();
  console.log(\`Received \${posts.length} records.\`);

  if (includeMeta) {
    console.log("Record Schema Keys:", Object.keys(posts[0] || {}));
  }

  console.table(posts.map(p => ({ ID: p.id, Title: p.title.slice(0, 35) + '...', User: p.userId })));

  return posts;
}`
  },
  {
    id: 'text-analyzer',
    name: 'Text & Keyword Analyzer',
    description: 'Computes character count & word frequency',
    category: 'Utilities',
    code: `/**
 * @name Text & Keyword Analyzer
 * @description Computes word statistics, character counts, and keyword frequencies.
 * 
 * @param {text} sampleText Input Text to Analyze - default: "JavaScript is a versatile language for browser execution and workspace automation."
 * @param {number} topWords Number of Top Words to Output - default: 5
 * @param {boolean} ignoreCase Case Insensitive Matching - default: true
 */
async function run({ sampleText, topWords, ignoreCase }) {
  console.log("Analyzing text input...");

  const textToProcess = ignoreCase ? sampleText.toLowerCase() : sampleText;
  const words = textToProcess.match(/\\b\\w+\\b/g) || [];
  const charCount = sampleText.length;

  const wordCounts = {};
  words.forEach(w => {
    wordCounts[w] = (wordCounts[w] || 0) + 1;
  });

  const sortedWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topWords);

  console.log(\`Statistics: Total Characters: \${charCount} | Total Words: \${words.length}\`);
  console.log(\`Top \${topWords} Most Frequent Words:\`);
  console.table(sortedWords.map(([word, freq]) => ({ Word: word, Frequency: freq })));

  return { charCount, wordCount: words.length, topWords: sortedWords };
}`
  }
];

const runner = new ScriptRunner();

export function App() {
  const [scripts, setScripts] = useState(INITIAL_SCRIPTS);
  const [activeScriptId, setActiveScriptId] = useState('url-harvester');
  const [code, setCode] = useState(INITIAL_SCRIPTS[0].code);
  const [optionValues, setOptionValues] = useState<Record<string, any>>({});
  const [logs, setLogs] = useState<ConsoleLogMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [outputResult, setOutputResult] = useState<any>(null);
  const [errorResult, setErrorResult] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  // Parse JSDoc parameters whenever code changes
  const parsedMeta = parseScriptOptions(code);

  useEffect(() => {
    const active = scripts.find(s => s.id === activeScriptId);
    if (active) {
      setCode(active.code);
      setLogs([]);
      setOutputResult(null);
      setErrorResult(null);
    }
  }, [activeScriptId]);

  const handleRunScript = () => {
    setLogs([]);
    setOutputResult(null);
    setErrorResult(null);
    setIsRunning(true);

    runner.execute({
      code,
      args: optionValues,
      onLog: (msg) => setLogs(prev => [...prev, msg]),
      onSuccess: (result) => {
        setIsRunning(false);
        setOutputResult(result);
      },
      onError: (err) => {
        setIsRunning(false);
        setErrorResult(err);
      }
    });
  };

  const handleStopScript = () => {
    runner.stop();
    setIsRunning(false);
    setErrorResult('Execution terminated by user.');
  };

  const handleNewScript = () => {
    const newId = `custom-${Date.now()}`;
    const newScript = {
      id: newId,
      name: 'Custom Script',
      description: 'User created script',
      category: 'Custom',
      code: `/**\n * @name Custom Script\n * @param {string} input - default: "Hello World"\n */\nasync function run({ input }) {\n  console.log("Output:", input);\n  return input;\n}`
    };
    setScripts(prev => [newScript, ...prev]);
    setActiveScriptId(newId);
  };

  return (
    <AppLayout
      scripts={scripts}
      activeScriptId={activeScriptId}
      onSelectScript={setActiveScriptId}
      onNewScript={handleNewScript}
      onSelectDoc={setSelectedDoc}
    >
      {/* Banner / Title Header */}
      <div className="space-y-2 mb-4">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/80 bg-clip-text">
          {parsedMeta.name}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {parsedMeta.description}
        </p>
      </div>

      {/* Editor & Option Inputs Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ScriptEditor
            code={code}
            onChangeCode={setCode}
            onRun={handleRunScript}
            onStop={handleStopScript}
            isRunning={isRunning}
          />
        </div>

        <div className="space-y-6">
          <DynamicOptionForm
            options={parsedMeta.options}
            values={optionValues}
            onChangeValue={(key, val) => setOptionValues(prev => ({ ...prev, [key]: val }))}
          />
        </div>
      </div>

      {/* Live Console Output Drawer */}
      <ConsoleViewer
        logs={logs}
        onClearLogs={() => setLogs([])}
        outputResult={outputResult}
        errorResult={errorResult}
      />

      {/* Modal Documentation Viewer */}
      <DocViewerModal
        docName={selectedDoc}
        onClose={() => setSelectedDoc(null)}
      />
    </AppLayout>
  );
}

export default App;
