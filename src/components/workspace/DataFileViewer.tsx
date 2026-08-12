import React, { useState } from 'react';
import { WorkspaceNode, getFileKind } from '@/lib/workspace-store';
import { FileText, FileSpreadsheet, FileJson, Image as ImageIcon, Download, Copy, Check, Table, Code, Search, Sparkles } from 'lucide-react';

interface DataFileViewerProps {
  file: WorkspaceNode;
  onChangeContent: (newContent: string) => void;
}

export const DataFileViewer: React.FC<DataFileViewerProps> = ({ file, onChangeContent }) => {
  const [viewMode, setViewMode] = useState<'table' | 'raw'>('table');
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fileKind = file.fileKind || getFileKind(file.name);
  const content = file.code || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(content);
      onChangeContent(JSON.stringify(parsed, null, 2));
    } catch (e) {
      alert('Invalid JSON syntax');
    }
  };

  // Parse CSV content into rows & headers
  const parseCsv = (csvText: string) => {
    const lines = csvText.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return { headers: [], rows: [] };

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim());
      const rowObj: Record<string, string> = {};
      headers.forEach((h, i) => {
        rowObj[h] = vals[i] ?? '';
      });
      return rowObj;
    });

    return { headers, rows };
  };

  const { headers, rows } = fileKind === 'data-csv' ? parseCsv(content) : { headers: [], rows: [] };
  const filteredRows = rows.filter(r =>
    !searchTerm || JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateHexDump = (data: string) => {
    let rawString = data;
    if (data.startsWith('data:')) {
      try {
        const base64 = data.split(',')[1] || '';
        rawString = atob(base64);
      } catch (e) {
        rawString = data;
      }
    }
    const maxBytes = Math.min(rawString.length, 512);
    const rows: string[] = [];

    for (let i = 0; i < maxBytes; i += 16) {
      const offset = i.toString(16).padStart(8, '0');
      const hexBytes: string[] = [];
      const asciiBytes: string[] = [];

      for (let j = 0; j < 16; j++) {
        if (i + j < maxBytes) {
          const code = rawString.charCodeAt(i + j);
          hexBytes.push(code.toString(16).padStart(2, '0').toUpperCase());
          asciiBytes.push(code >= 32 && code <= 126 ? String.fromCharCode(code) : '.');
        } else {
          hexBytes.push('  ');
        }
      }

      rows.push(`${offset}: ${hexBytes.join(' ')}  |${asciiBytes.join('')}|`);
    }

    if (rawString.length > 512) {
      rows.push(`... (${rawString.length - 512} more bytes truncated)`);
    }

    return rows.join('\n');
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm flex flex-col h-[480px]">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          {fileKind === 'data-csv' && <FileSpreadsheet className="h-4 w-4 text-emerald-400" />}
          {fileKind === 'data-json' && <FileJson className="h-4 w-4 text-amber-400" />}
          {fileKind === 'data-image' && <ImageIcon className="h-4 w-4 text-blue-400" />}
          {fileKind === 'data-text' && <FileText className="h-4 w-4 text-purple-400" />}
          {fileKind === 'binary' && <FileText className="h-4 w-4 text-primary" />}

          <span className="text-xs font-bold font-mono tracking-tight text-foreground">
            {file.name}
          </span>

          <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground border border-border/40">
            {fileKind.toUpperCase()} ({file.sizeBytes || content.length} B)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {fileKind === 'data-csv' && (
            <div className="flex items-center rounded-lg border border-border/60 bg-background p-0.5 text-xs">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md font-medium transition-all ${viewMode === 'table' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Table className="h-3 w-3" />
                Table
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md font-medium transition-all ${viewMode === 'raw' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Code className="h-3 w-3" />
                Raw CSV
              </button>
            </div>
          )}

          {fileKind === 'data-json' && (
            <button
              onClick={handleFormatJson}
              className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all"
            >
              <Sparkles className="h-3 w-3 text-amber-400" />
              Format JSON
            </button>
          )}

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Content View Body */}
      <div className="flex-1 bg-[#0c0c0e] overflow-y-auto p-4">
        {/* CSV Interactive Data Table */}
        {fileKind === 'data-csv' && viewMode === 'table' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search CSV rows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 rounded-md border border-border bg-background text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <span className="text-xs text-muted-foreground font-mono">
                {rows.length} Total CSV Records
              </span>
            </div>

            <div className="rounded-lg border border-border/60 overflow-x-auto bg-background">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider font-mono">
                  <tr>
                    <th className="px-3 py-2 border-r border-border/40 w-10">#</th>
                    {headers.map(h => (
                      <th key={h} className="px-3 py-2 border-r border-border/40">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {filteredRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 border-r border-border/40 text-muted-foreground text-[11px]">{idx + 1}</td>
                      {headers.map(h => (
                        <td key={h} className="px-3 py-2 border-r border-border/40 break-all">{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Image Preview Container */}
        {fileKind === 'data-image' && (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <img
              src={file.binaryData || content}
              alt={file.name}
              className="max-h-[340px] rounded-lg border border-border/60 object-contain shadow-lg bg-black/40"
            />
            <a
              href={file.binaryData || content}
              download={file.name}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Download Image File
            </a>
          </div>
        )}

        {/* Universal Binary File Inspector */}
        {fileKind === 'binary' && (
          <div className="h-full flex flex-col space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-background/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground font-mono">{file.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    Binary Payload • {file.sizeBytes ? (file.sizeBytes / 1024).toFixed(1) + ' KB' : (content.length / 1024).toFixed(1) + ' KB'}
                  </div>
                </div>
              </div>

              <a
                href={file.binaryData || `data:application/octet-stream;base64,${btoa(content)}`}
                download={file.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                Download File
              </a>
            </div>

            <div className="flex-1 rounded-lg border border-border/60 bg-black/60 p-3 font-mono text-[11px] text-emerald-400 overflow-y-auto leading-relaxed select-all">
              <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2 tracking-wider">
                Hex Offset & ASCII Header Preview (First 512 Bytes)
              </div>
              <pre>{generateHexDump(file.binaryData || content)}</pre>
            </div>
          </div>
        )}

        {/* JSON / Text / Markdown / Raw CSV Text Editor */}
        {(fileKind === 'data-json' || fileKind === 'data-text' || (fileKind === 'data-csv' && viewMode === 'raw')) && (
          <textarea
            value={content}
            onChange={(e) => onChangeContent(e.target.value)}
            spellCheck={false}
            className="w-full h-full resize-none p-2 font-mono text-xs text-foreground bg-transparent focus:outline-none leading-relaxed border-0 selection:bg-primary/30"
          />
        )}
      </div>
    </div>
  );
};
