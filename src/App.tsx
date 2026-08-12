import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScriptEditor } from '@/components/workspace/ScriptEditor';
import { DynamicOptionForm } from '@/components/workspace/DynamicOptionForm';
import { ConsoleViewer } from '@/components/workspace/ConsoleViewer';
import { FramePreview } from '@/components/workspace/FramePreview';
import { DocViewerModal } from '@/components/workspace/DocViewerModal';
import { WorkspaceManagerModal } from '@/components/workspace/WorkspaceManagerModal';
import { parseScriptOptions } from '@/lib/parser';
import { ScriptRunner, ConsoleLogMessage, FramePayload, ExecutionResult } from '@/lib/worker-runner';
import { DataFileViewer } from '@/components/workspace/DataFileViewer';
import { WorkspaceStore, Workspace, WorkspaceNode, getFileKind } from '@/lib/workspace-store';
import { Terminal, ShieldCheck, Sparkles, Layout, Code2, Play, Sliders, Layers, Folder, FileCode, Check } from 'lucide-react';

const runner = new ScriptRunner();

export function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => WorkspaceStore.loadWorkspaces());
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => workspaces[0]?.id || 'ws-default-demo');
  const [activeFileId, setActiveFileId] = useState<string>(() => workspaces[0]?.activeFileId || 'file-main-orchestrator');

  const [optionValues, setOptionValues] = useState<Record<string, any>>({});
  const [logs, setLogs] = useState<ConsoleLogMessage[]>([]);
  const [frame, setFrame] = useState<FramePayload | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [outputResult, setOutputResult] = useState<any>(null);
  const [errorResult, setErrorResult] = useState<string | null>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | undefined>(undefined);

  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [isWsManagerOpen, setIsWsManagerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  const activeNodes = activeWorkspace?.nodes || [];
  const activeFile = activeNodes.find(n => n.id === activeFileId) || activeNodes.find(n => n.type === 'file');
  const activeCode = activeFile?.code || '';

  // Persist workspace changes
  useEffect(() => {
    WorkspaceStore.saveWorkspaces(workspaces);
  }, [workspaces]);

  // Parse JSDoc parameters whenever active code changes
  const parsedMeta = parseScriptOptions(activeCode);

  const handleUpdateActiveCode = (newCode: string) => {
    if (!activeFile) return;
    setWorkspaces(prevWorkspaces =>
      prevWorkspaces.map(ws => {
        if (ws.id !== activeWorkspaceId) return ws;
        return {
          ...ws,
          nodes: ws.nodes.map(n => n.id === activeFile.id ? { ...n, code: newCode } : n)
        };
      })
    );
  };

  const handleRunScript = () => {
    setLogs([]);
    setFrame(null);
    setOutputResult(null);
    setErrorResult(null);
    setIsRunning(true);

    runner.execute({
      code: activeCode,
      args: optionValues,
      nodes: activeNodes,
      currentFilePath: activeFile?.path || 'main.js',
      onLog: (msg) => setLogs(prev => [...prev, msg]),
      onFsMutation: (mutation) => {
        if (mutation.action === 'write' && mutation.content !== undefined) {
          const filePath = mutation.path;
          const fileName = filePath.split('/').pop() || filePath;

          setWorkspaces(prevWorkspaces =>
            prevWorkspaces.map(ws => {
              if (ws.id !== activeWorkspaceId) return ws;

              const existingNode = ws.nodes.find(n => n.path === filePath);
              if (existingNode) {
                return {
                  ...ws,
                  nodes: ws.nodes.map(n => n.id === existingNode.id ? { ...n, code: mutation.content } : n)
                };
              } else {
                const newNode: WorkspaceNode = {
                  id: `file-fs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  name: fileName,
                  type: 'file',
                  path: filePath,
                  parentId: null,
                  code: mutation.content
                };
                return {
                  ...ws,
                  nodes: [...ws.nodes, newNode]
                };
              }
            })
          );
        }
      },
      onSuccess: (res: ExecutionResult) => {
        setIsRunning(false);
        setOutputResult(res.raw);
        if (res.frame) {
          setFrame(res.frame);
          setActiveTab('preview');
        }
        setExecutionTimeMs(res.executionTimeMs);
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

  // Node CRUD handlers
  const handleToggleFolder = (folderId: string) => {
    setWorkspaces(prev => prev.map(ws => {
      if (ws.id !== activeWorkspaceId) return ws;
      return {
        ...ws,
        nodes: ws.nodes.map(n => n.id === folderId ? { ...n, expanded: !n.expanded } : n)
      };
    }));
  };

  const handleCreateFile = (parentId: string | null, name: string) => {
    const parent = activeWorkspace.nodes.find(n => n.id === parentId);
    const parentPath = parent ? parent.path : '';
    const filePath = parentPath ? `${parentPath}/${name}` : name;
    const newId = `file-${Date.now()}`;

    const newNode: WorkspaceNode = {
      id: newId,
      name,
      type: 'file',
      path: filePath,
      parentId,
      code: `/**\n * @name ${name}\n * @description Custom script\n */\nexport function hello() {\n  return "Hello from ${name}";\n}\n\nasync function run() {\n  return hello();\n}`
    };

    setWorkspaces(prev => prev.map(ws => {
      if (ws.id !== activeWorkspaceId) return ws;
      return {
        ...ws,
        nodes: [...ws.nodes, newNode],
        activeFileId: newId
      };
    }));
    setActiveFileId(newId);
  };

  const handleCreateFolder = (parentId: string | null, name: string) => {
    const parent = activeWorkspace.nodes.find(n => n.id === parentId);
    const parentPath = parent ? parent.path : '';
    const folderPath = parentPath ? `${parentPath}/${name}` : name;
    const newId = `folder-${Date.now()}`;

    const newNode: WorkspaceNode = {
      id: newId,
      name,
      type: 'folder',
      path: folderPath,
      parentId,
      expanded: true
    };

    setWorkspaces(prev => prev.map(ws => {
      if (ws.id !== activeWorkspaceId) return ws;
      return {
        ...ws,
        nodes: [...ws.nodes, newNode]
      };
    }));
  };

  const handleRenameNode = (nodeId: string, newName: string) => {
    setWorkspaces(prev => prev.map(ws => {
      if (ws.id !== activeWorkspaceId) return ws;
      const target = ws.nodes.find(n => n.id === nodeId);
      if (!target) return ws;

      const parent = ws.nodes.find(n => n.id === target.parentId);
      const parentPath = parent ? parent.path : '';
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;

      return {
        ...ws,
        nodes: ws.nodes.map(n => n.id === nodeId ? { ...n, name: newName, path: newPath } : n)
      };
    }));
  };

  const handleDeleteNode = (nodeId: string) => {
    setWorkspaces(prev => prev.map(ws => {
      if (ws.id !== activeWorkspaceId) return ws;
      const filtered = ws.nodes.filter(n => n.id !== nodeId && n.parentId !== nodeId);
      const remainingFile = filtered.find(n => n.type === 'file');
      return {
        ...ws,
        nodes: filtered,
        activeFileId: remainingFile ? remainingFile.id : ''
      };
    }));
  };

  // Workspace CRUD handlers
  const handleCreateWorkspace = (name: string, description: string) => {
    const newWsId = `ws-${Date.now()}`;
    const defaultFileId = `file-main-${Date.now()}`;
    const newWs: Workspace = {
      id: newWsId,
      name,
      description,
      activeFileId: defaultFileId,
      nodes: [
        {
          id: defaultFileId,
          name: 'main.js',
          type: 'file',
          path: 'main.js',
          parentId: null,
          code: `/**\n * @name ${name} Main\n * @description Entry script\n */\nasync function run() {\n  console.log("Welcome to ${name}!");\n  return "Hello World";\n}`
        }
      ]
    };

    setWorkspaces(prev => [...prev, newWs]);
    setActiveWorkspaceId(newWsId);
    setActiveFileId(defaultFileId);
  };

  const handleDeleteWorkspace = (id: string) => {
    if (workspaces.length <= 1) return;
    const remaining = workspaces.filter(w => w.id !== id);
    setWorkspaces(remaining);
    setActiveWorkspaceId(remaining[0].id);
    setActiveFileId(remaining[0].activeFileId || '');
  };

  const handleExportWorkspace = (id: string) => {
    const ws = workspaces.find(w => w.id === id);
    if (!ws) return;
    const blob = new Blob([JSON.stringify(ws, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ws.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-workspace.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportWorkspace = (imported: Workspace) => {
    const newWs: Workspace = {
      ...imported,
      id: `ws-${Date.now()}`
    };
    setWorkspaces(prev => [...prev, newWs]);
    setActiveWorkspaceId(newWs.id);
    const file = newWs.nodes.find(n => n.type === 'file');
    if (file) setActiveFileId(file.id);
  };

  return (
    <AppLayout
      workspaces={workspaces}
      activeWorkspaceId={activeWorkspaceId}
      activeFileId={activeFileId}
      nodes={activeNodes}
      onSelectFile={setActiveFileId}
      onToggleFolder={handleToggleFolder}
      onCreateFile={handleCreateFile}
      onCreateFolder={handleCreateFolder}
      onRenameNode={handleRenameNode}
      onDeleteNode={handleDeleteNode}
      onOpenWorkspaceManager={() => setIsWsManagerOpen(true)}
      onSelectDoc={setSelectedDoc}
    >
      {/* Banner / Title & Active File Breadcrumb */}
      <div className="space-y-2 mb-4 border-b border-border/40 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1">
              <span className="text-primary font-bold">{activeWorkspace.name}</span>
              <span>/</span>
              <span className="bg-muted px-2 py-0.5 rounded text-foreground font-semibold flex items-center gap-1 border border-border/40">
                <FileCode className="h-3 w-3 text-primary" />
                {activeFile?.path || 'No File Selected'}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-sans font-black tracking-tight text-foreground bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text">
              {parsedMeta.name || activeFile?.name || 'Workspace'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {parsedMeta.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${activeTab === 'editor'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground'
                }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              Editor Workspace
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${activeTab === 'preview'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground'
                }`}
            >
              <Layout className="h-3.5 w-3.5" />
              Frame Preview {frame && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
            </button>
          </div>
        </div>
      </div>

      {/* Editor & Dynamic Option Form Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'editor' ? (
            activeFile && (activeFile.fileKind || getFileKind(activeFile.name)) !== 'code' ? (
              <DataFileViewer
                file={activeFile}
                onChangeContent={handleUpdateActiveCode}
              />
            ) : (
              <ScriptEditor
                code={activeCode}
                onChangeCode={handleUpdateActiveCode}
                onRun={handleRunScript}
                onStop={handleStopScript}
                isRunning={isRunning}
              />
            )
          ) : (
            <FramePreview frame={frame} />
          )}
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
        executionTimeMs={executionTimeMs}
      />

      {/* Workspace Manager Modal */}
      {isWsManagerOpen && (
        <WorkspaceManagerModal
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onClose={() => setIsWsManagerOpen(false)}
          onSelectWorkspace={setActiveWorkspaceId}
          onCreateWorkspace={handleCreateWorkspace}
          onDeleteWorkspace={handleDeleteWorkspace}
          onImportWorkspace={handleImportWorkspace}
          onExportWorkspace={handleExportWorkspace}
        />
      )}

      {/* Modal Documentation Viewer */}
      <DocViewerModal
        docName={selectedDoc}
        onClose={() => setSelectedDoc(null)}
      />
    </AppLayout>
  );
}

export default App;
