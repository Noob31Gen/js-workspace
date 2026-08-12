import { WorkspaceNode, getFileKind, MAX_FILE_SIZE_BYTES } from './workspace-store';

export interface ImportedWorkspaceBundle {
  workspaceName: string;
  nodes: WorkspaceNode[];
  activeFileId: string;
}

const IGNORED_PATHS = ['node_modules/', '.git/', '.DS_Store', 'dist/', 'build/', '.vscode/'];

function shouldIgnorePath(relPath: string): boolean {
  return IGNORED_PATHS.some(ignored => relPath.includes(ignored));
}

/**
 * Parses an HTML5 webkitdirectory FileList into a new standalone Workspace bundle.
 */
export async function parseLocalFolder(fileList: FileList): Promise<ImportedWorkspaceBundle> {
  const files = Array.from(fileList);
  if (files.length === 0) {
    throw new Error('No files found in selected folder.');
  }

  // First file's path gives root folder name (e.g. "music-transfer/src/index.js")
  const samplePath = files[0].webkitRelativePath || files[0].name;
  const rootFolderName = samplePath.split('/')[0] || 'Imported Folder';

  const folderMap = new Map<string, string>(); // path -> node.id
  const nodes: WorkspaceNode[] = [];

  for (const file of files) {
    const relPath = file.webkitRelativePath || file.name;
    if (shouldIgnorePath(relPath)) continue;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      console.warn(`Skipping large file "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB > 5 MB limit)`);
      continue;
    }

    // Process directories in path
    const parts = relPath.split('/');
    parts.pop(); // Remove filename to get dir path

    let currentPath = '';
    let parentId: string | null = null;

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!folderMap.has(currentPath)) {
        const folderId = `folder-imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        nodes.push({
          id: folderId,
          name: part,
          type: 'folder',
          path: currentPath,
          parentId,
          expanded: true
        });
        folderMap.set(currentPath, folderId);
      }
      parentId = folderMap.get(currentPath)!;
    }

    // Read file content
    const fileKind = getFileKind(file.name);
    const fileId = `file-imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const isImageOrBinary = fileKind === 'data-image' || fileKind === 'binary';

    let code: string | undefined;
    let binaryData: string | undefined;

    if (isImageOrBinary) {
      binaryData = await readFileAsDataUrl(file);
    } else {
      code = await readFileAsText(file);
    }

    nodes.push({
      id: fileId,
      name: file.name,
      type: 'file',
      path: relPath,
      parentId,
      fileKind,
      sizeBytes: file.size,
      code,
      binaryData
    });
  }

  const activeFile = nodes.find(n => n.type === 'file') || nodes[0];

  return {
    workspaceName: rootFolderName,
    nodes,
    activeFileId: activeFile?.id || ''
  };
}

/**
 * Extracts a .zip archive using JSZip into a standalone Workspace bundle.
 */
export async function parseZipArchive(zipFile: File): Promise<ImportedWorkspaceBundle> {
  const cdnUrl = 'https://esm.sh/jszip';
  const JSZipModule = await import(/* @vite-ignore */ cdnUrl);
  const JSZip = JSZipModule.default || JSZipModule;
  const zip = await JSZip.loadAsync(zipFile);

  const rootFolderName = zipFile.name.replace(/\.zip$/i, '');
  const folderMap = new Map<string, string>();
  const nodes: WorkspaceNode[] = [];

  const entries = Object.keys(zip.files);

  for (const entryPath of entries) {
    if (shouldIgnorePath(entryPath)) continue;
    const entry = zip.files[entryPath];

    const cleanPath = entryPath.replace(/\/$/, '');
    if (!cleanPath) continue;

    const parts = cleanPath.split('/');

    if (entry.dir) {
      // Create folder node
      let currentPath = '';
      let parentId: string | null = null;

      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (!folderMap.has(currentPath)) {
          const folderId = `folder-zip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          nodes.push({
            id: folderId,
            name: part,
            type: 'folder',
            path: currentPath,
            parentId,
            expanded: true
          });
          folderMap.set(currentPath, folderId);
        }
        parentId = folderMap.get(currentPath)!;
      }
    } else {
      // Create file node
      const fileName = parts.pop() || cleanPath;
      let currentPath = '';
      let parentId: string | null = null;

      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (!folderMap.has(currentPath)) {
          const folderId = `folder-zip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          nodes.push({
            id: folderId,
            name: part,
            type: 'folder',
            path: currentPath,
            parentId,
            expanded: true
          });
          folderMap.set(currentPath, folderId);
        }
        parentId = folderMap.get(currentPath)!;
      }

      const fileKind = getFileKind(fileName);
      const isImageOrBinary = fileKind === 'data-image' || fileKind === 'binary';
      const fileId = `file-zip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      let code: string | undefined;
      let binaryData: string | undefined;

      if (isImageOrBinary) {
        const base64 = await entry.async('base64');
        binaryData = `data:application/octet-stream;base64,${base64}`;
      } else {
        code = await entry.async('string');
      }

      nodes.push({
        id: fileId,
        name: fileName,
        type: 'file',
        path: cleanPath,
        parentId,
        fileKind,
        sizeBytes: code ? code.length : 0,
        code,
        binaryData
      });
    }
  }

  const activeFile = nodes.find(n => n.type === 'file') || nodes[0];

  return {
    workspaceName: rootFolderName,
    nodes,
    activeFileId: activeFile?.id || ''
  };
}

/**
 * Reads a single file for insertion into the current active workspace.
 */
export async function parseSingleFile(file: File, targetPath: string, parentId: string | null): Promise<WorkspaceNode> {
  const fileKind = getFileKind(file.name);
  const fileId = `file-usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const isImageOrBinary = fileKind === 'data-image' || fileKind === 'binary';

  let code: string | undefined;
  let binaryData: string | undefined;

  if (isImageOrBinary) {
    binaryData = await readFileAsDataUrl(file);
  } else {
    code = await readFileAsText(file);
  }

  return {
    id: fileId,
    name: file.name,
    type: 'file',
    path: targetPath,
    parentId,
    fileKind,
    sizeBytes: file.size,
    code,
    binaryData
  };
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || '');
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || '');
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
