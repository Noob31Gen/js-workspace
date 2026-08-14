import React, { useState } from 'react';
import { WorkspaceNode, getFileKind } from '@/lib/workspace-store';
import { FileText, FileSpreadsheet, FileJson, Image as ImageIcon, Download, Copy, Check, Table, Code, Search, Sparkles, MoreVertical } from 'lucide-react';

interface DataFileViewerProps {
  file: WorkspaceNode;
  onChangeContent: (newContent: string) => void;
}

export const DataFileViewer: React.FC<DataFileViewerProps> = ({ file, onChangeContent }) => {
  const [viewMode, setViewMode] = useState<'table' | 'raw'>('table');
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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
    } catch {
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
      } catch {
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

  // Handle clipboard paste safely for large payloads (> 10 MB)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardText = e.clipboardData.getData('text');
    if (!clipboardText) return;

    const pasteSizeBytes = new Blob([clipboardText]).size;
    const MAX_PASTE_BYTES = 10 * 1024 * 1024; // 10 MB

    if (pasteSizeBytes > MAX_PASTE_BYTES) {
      e.preventDefault();
      const sizeMB = (pasteSizeBytes / (1024 * 1024)).toFixed(2);
      const truncatedText = clipboardText.slice(0, MAX_PASTE_BYTES);

      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newContent = content.substring(0, start) + truncatedText + content.substring(end);
      onChangeContent(newContent);

      alert(`⚠️ Clipboard Warning: Pasted data (${sizeMB} MB) exceeds the 10 MB safety limit.\n\nThe text has been safely truncated to 10 MB to protect browser execution stability.`);
    }
  };

  const handleDownloadFile = () => {
    let url = file.binaryData;
    let createdUrl = false;
    if (!url) {
      const mimeTypes: Record<string, string> = {
        'data-json': 'application/json',
        'data-csv': 'text/csv',
        'data-text': 'text/plain',
        'code': 'text/javascript',
        'binary': 'application/octet-stream'
      };
      const mime = mimeTypes[fileKind] || 'text/plain';
      const blob = new Blob([content], { type: `${mime};charset=utf-8` });
      url = URL.createObjectURL(blob);
      createdUrl = true;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (createdUrl) {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm flex flex-col h-full min-h-0 flex-1 md:h-[520px] relative z-10">
      {/* Header Toolbar */}
      <div className="relative z-30 flex items-center justify-between border-b border-border/60 bg-muted/40 px-3 sm:px-4 py-2.5 overflow-visible gap-2 min-w-0 max-w-full">
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          {fileKind === 'data-csv' && <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />}
          {fileKind === 'data-json' && <FileJson className="h-4 w-4 text-amber-400 shrink-0" />}
          {fileKind === 'data-image' && <ImageIcon className="h-4 w-4 text-blue-400 shrink-0" />}
          {fileKind === 'data-text' && <FileText className="h-4 w-4 text-purple-400 shrink-0" />}
          {fileKind === 'binary' && <FileText className="h-4 w-4 text-primary shrink-0" />}

          <span className="text-xs font-bold font-mono tracking-tight text-foreground truncate shrink-0">
            {file.name}
          </span>

          <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground border border-border/40 shrink-0 hidden sm:inline">
            {fileKind.toUpperCase()} ({file.sizeBytes || content.length} B)
          </span>
        </div>

        {/* Desktop Large Screen Toolbar Options */}
        <div className="hidden xl:flex items-center gap-2">
          {fileKind === 'data-csv' && (
            <div className="flex items-center rounded-lg border border-border/60 bg-background p-0.5 text-xs">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md font-medium transition-all cursor-pointer ${viewMode === 'table' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                title="Render CSV data in interactive spreadsheet table format"
              >
                <Table className="h-3 w-3" />
                Table
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md font-medium transition-all cursor-pointer ${viewMode === 'raw' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                title="View raw unformatted CSV text"
              >
                <Code className="h-3 w-3" />
                Raw CSV
              </button>
            </div>
          )}

          {fileKind === 'data-json' && (
            <button
              onClick={handleFormatJson}
              className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Prettify and format JSON structure"
            >
              <Sparkles className="h-3 w-3 text-amber-400" />
              Format JSON
            </button>
          )}

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="Copy entire file content to clipboard"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownloadFile}
            className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-2.5 py-1 text-[11px] font-bold shadow hover:bg-primary/90 transition-all cursor-pointer"
            title={`Export and download "${file.name}" to disk`}
          >
            <Download className="h-3 w-3" />
            <span>Export File</span>
          </button>
        </div>

        {/* Compact & 3-Dot Options Dropdown (< 1280px) */}
        <div className="flex xl:hidden items-center gap-1.5 shrink-0 ml-auto">
          <div className="relative">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-1 rounded-md border border-border/60 bg-background text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="More Data File Options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMobileMenu && (
              <div className="absolute right-0 top-8 z-50 w-44 rounded-xl border border-border/80 bg-card p-1.5 shadow-2xl space-y-1 text-xs font-sans animate-in fade-in zoom-in duration-150">
                {fileKind === 'data-csv' && (
                  <button
                    onClick={() => { setViewMode(viewMode === 'table' ? 'raw' : 'table'); setShowMobileMenu(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted flex items-center gap-2 text-foreground font-medium cursor-pointer"
                    title={`Toggle between table and raw text view`}
                  >
                    <Table className="h-3.5 w-3.5 text-primary" />
                    <span>Switch to {viewMode === 'table' ? 'Raw CSV' : 'Table View'}</span>
                  </button>
                )}

                {fileKind === 'data-json' && (
                  <button
                    onClick={() => { handleFormatJson(); setShowMobileMenu(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted flex items-center gap-2 text-foreground font-medium cursor-pointer"
                    title="Prettify and format JSON structure"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>Format JSON</span>
                  </button>
                )}

                <button
                  onClick={() => { handleCopy(); setShowMobileMenu(false); }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted flex items-center gap-2 text-foreground font-medium cursor-pointer"
                  title="Copy entire file content to clipboard"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-emerald-400" />}
                  <span>{copied ? 'Copied File' : 'Copy File Content'}</span>
                </button>

                <button
                  onClick={() => { handleDownloadFile(); setShowMobileMenu(false); }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20 flex items-center gap-2 cursor-pointer"
                  title={`Export and download "${file.name}" to disk`}
                >
                  <Download className="h-3.5 w-3.5 text-primary" />
                  <span>Export File</span>
                </button>
              </div>
            )}
          </div>
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
            onPaste={handlePaste}
            spellCheck={false}
            className="w-full h-full resize-none p-2 font-mono text-xs text-foreground bg-transparent focus:outline-none leading-relaxed border-0 selection:bg-primary/30"
          />
        )}
      </div>
    </div>
  );
};
