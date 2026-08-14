import React, { useState } from 'react';
import { WorkspaceNode, Workspace } from '@/lib/workspace-store';
import { ConsoleLogMessage, FramePayload } from '@/lib/worker-runner';
import { OptionDescriptor } from '@/lib/parser';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav, MobileTab } from './MobileBottomNav';
import { MobileSymbolBar } from './MobileSymbolBar';
import { MobileFileDrawer } from './MobileFileDrawer';
import { ScriptEditor } from '@/components/workspace/ScriptEditor';
import { DataFileViewer } from '@/components/workspace/DataFileViewer';
import { DynamicOptionForm } from '@/components/workspace/DynamicOptionForm';
import { ConsoleViewer } from '@/components/workspace/ConsoleViewer';
import { FramePreview } from '@/components/workspace/FramePreview';

interface MobileAppLayoutProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  activeFileId: string;
  activeFile: WorkspaceNode | null;
  nodes: WorkspaceNode[];
  activeCode: string;
  onUpdateActiveCode: (newCode: string) => void;
  onSelectFile: (fileId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onCreateFile: (parentId: string | null, name: string) => void;
  onCreateFolder: (parentId: string | null, name: string) => void;
  onRenameNode: (nodeId: string, newName: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onMoveNode?: (nodeId: string, targetParentId: string | null) => void;
  onInspectNode?: (node: WorkspaceNode) => void;
  onExportNode?: (node: WorkspaceNode) => void;
  onOpenWorkspaceManager: () => void;
  onOpenDocs: (docName: string) => void;
  onRunScript: () => void;
  onStopScript: () => void;
  isRunning: boolean;
  logs: ConsoleLogMessage[];
  onClearLogs: () => void;
  outputResult: any;
  errorResult: string | null;
  executionTimeMs?: number;
  inputPrompt?: string | null;
  onSendInput?: (value: string) => void;
  parsedOptions: OptionDescriptor[];
  optionValues: Record<string, any>;
  onChangeOptionValue: (key: string, val: any) => void;
  frame: FramePayload | null;
  onOpenResultWindow: () => void;
  onImportClick: () => void;
  onOpenExtensionModal: () => void;
  extensionActive: boolean;
  isOnline: boolean;
  getFileKind: (filename: string) => any;
}

export const MobileAppLayout: React.FC<MobileAppLayoutProps> = ({
  workspaces,
  activeWorkspaceId,
  activeFileId,
  activeFile,
  nodes,
  activeCode,
  onUpdateActiveCode,
  onSelectFile,
  onToggleFolder,
  onCreateFile,
  onCreateFolder,
  onRenameNode,
  onDeleteNode,
  onDuplicateNode,
  onMoveNode,
  onInspectNode,
  onExportNode,
  onOpenWorkspaceManager,
  onOpenDocs,
  onRunScript,
  onStopScript,
  isRunning,
  logs,
  onClearLogs,
  outputResult,
  errorResult,
  executionTimeMs,
  inputPrompt,
  onSendInput,
  parsedOptions,
  optionValues,
  onChangeOptionValue,
  frame,
  onOpenResultWindow,
  onImportClick,
  onOpenExtensionModal,
  extensionActive,
  isOnline,
  getFileKind
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>('editor');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const handleInsertSymbol = (symbol: string) => {
    onUpdateActiveCode(activeCode + symbol);
  };

  const handleSave = () => {
    onUpdateActiveCode(activeCode);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  return (
    <div className="h-full w-full bg-background text-foreground flex flex-col font-sans overflow-hidden select-none relative">
      {/* 1. Mobile Top Header */}
      <MobileHeader
        activeFile={activeFile}
        workspaceName={activeWorkspace?.name || 'Workspace'}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onRun={onRunScript}
        onStop={onStopScript}
        isRunning={isRunning}
        onSaveScript={handleSave}
        justSaved={justSaved}
        onOpenDocs={onOpenDocs}
        onImportClick={onImportClick}
        onOpenExtensionModal={onOpenExtensionModal}
        onOpenResultWindow={onOpenResultWindow}
        onDeleteActiveFile={onDeleteNode}
        onDuplicateActiveFile={onDuplicateNode}
        extensionActive={extensionActive}
        isOnline={isOnline}
        inputPrompt={inputPrompt}
      />

      {/* 2. Mobile Main Canvas Content Area */}
      <main className="flex-1 overflow-hidden p-2 relative flex flex-col min-h-0 bg-background/50">
        {activeTab === 'editor' && (
          <div className="h-full w-full flex flex-col min-h-0">
            {activeFile && (activeFile.fileKind || getFileKind(activeFile.name)) !== 'code' ? (
              <DataFileViewer
                file={activeFile}
                onChangeContent={onUpdateActiveCode}
              />
            ) : (
              <ScriptEditor
                code={activeCode}
                onChangeCode={onUpdateActiveCode}
                onRun={onRunScript}
                onStop={onStopScript}
                isRunning={isRunning}
                onSaveScript={onUpdateActiveCode}
              />
            )}
          </div>
        )}

        {activeTab === 'params' && (
          <div className="h-full w-full overflow-hidden flex flex-col min-h-0">
            <DynamicOptionForm
              options={parsedOptions}
              values={optionValues}
              onChangeValue={onChangeOptionValue}
            />
          </div>
        )}

        {activeTab === 'console' && (
          <div className="h-full w-full overflow-hidden flex flex-col min-h-0">
            <ConsoleViewer
              logs={logs}
              onClearLogs={onClearLogs}
              outputResult={outputResult}
              errorResult={errorResult}
              executionTimeMs={executionTimeMs}
              onOpenResultWindow={onOpenResultWindow}
              inputPrompt={inputPrompt}
              onSendInput={onSendInput}
              isRunning={isRunning}
            />
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="h-full w-full overflow-hidden flex flex-col min-h-0">
            <FramePreview frame={frame} />
          </div>
        )}
      </main>

      {/* 3. Touch Quick Symbol Bar (Shown when on Editor tab) */}
      {activeTab === 'editor' && (
        <MobileSymbolBar onInsertSymbol={handleInsertSymbol} />
      )}

      {/* 4. Native Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        logCount={logs.length}
        paramCount={parsedOptions.length}
        hasFrame={!!frame}
        inputPrompt={inputPrompt}
        hasError={!!errorResult || logs.some(l => l.type === 'error')}
      />

      {/* 5. Mobile File Explorer Bottom Sheet Drawer */}
      <MobileFileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        activeFileId={activeFileId}
        nodes={nodes}
        onSelectFile={onSelectFile}
        onToggleFolder={onToggleFolder}
        onCreateFile={onCreateFile}
        onCreateFolder={onCreateFolder}
        onRenameNode={onRenameNode}
        onDeleteNode={onDeleteNode}
        onDuplicateNode={onDuplicateNode}
        onMoveNode={onMoveNode}
        onInspectNode={onInspectNode}
        onExportNode={onExportNode}
        onOpenWorkspaceManager={onOpenWorkspaceManager}
      />
    </div>
  );
};
