import { WorkspaceNode, getFileKind } from './workspace-store';
import { resolveFilePath } from './dependency-resolver';

/**
 * Result of analyzing entrypoints in a workspace.
 */
export interface EntrypointAnalysisResult {
  coreNodeIds: Set<string>;
  scores: Record<string, number>;
  primaryCoreNodeId: string | null;
}

/**
 * Analyzes the workspace file graph and import dependencies to identify 
 * the parent/core entrypoint JavaScript/TypeScript file(s).
 */
export function identifyCoreFiles(nodes: WorkspaceNode[]): EntrypointAnalysisResult {
  const coreNodeIds = new Set<string>();
  const scores: Record<string, number> = {};

  const fileNodes = (nodes || []).filter(n => n.type === 'file');
  const codeNodes = fileNodes.filter(n => getFileKind(n.name) === 'code');

  if (codeNodes.length === 0) {
    return { coreNodeIds, scores, primaryCoreNodeId: null };
  }

  // If there's only 1 code file, it's automatically the core file
  if (codeNodes.length === 1) {
    coreNodeIds.add(codeNodes[0].id);
    scores[codeNodes[0].id] = 10;
    return { coreNodeIds, scores, primaryCoreNodeId: codeNodes[0].id };
  }

  // Create path lookup maps
  const pathToNodeMap = new Map<string, WorkspaceNode>();
  fileNodes.forEach(n => {
    pathToNodeMap.set(n.path, n);
    // Also store normalized lower-case path
    pathToNodeMap.set(n.path.toLowerCase(), n);
  });

  const importedByCount: Record<string, number> = {};
  const importsOthersCount: Record<string, number> = {};
  const hasRunFuncMap: Record<string, boolean> = {};

  codeNodes.forEach(n => {
    importedByCount[n.id] = 0;
    importsOthersCount[n.id] = 0;
    hasRunFuncMap[n.id] = false;
  });

  // Regex patterns to detect imports & requires
  const importRegex = /(?:import\s+(?:[\s\S]*?from\s+)?|require\s*\(\s*|workspace\.import\s*\(\s*|fs\.readFileSync\s*\(\s*)['"]([^'"]+)['"]/g;
  const runFuncRegex = /(?:async\s+function\s+run|function\s+run|export\s+default|@name|@description)/;

  // Analyze code content of each file
  codeNodes.forEach(node => {
    const code = node.code || '';

    if (runFuncRegex.test(code)) {
      hasRunFuncMap[node.id] = true;
    }

    let match: RegExpExecArray | null;
    importRegex.lastIndex = 0;

    const importedPaths = new Set<string>();

    while ((match = importRegex.exec(code)) !== null) {
      const rawImportPath = match[1];
      if (rawImportPath && (rawImportPath.startsWith('.') || rawImportPath.startsWith('/'))) {
        const resolved = resolveFilePath(rawImportPath, node.path);
        importedPaths.add(resolved);
        importedPaths.add(resolved.toLowerCase());
        
        // Also check with common code extensions
        ['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.json'].forEach(ext => {
          importedPaths.add((resolved + ext).toLowerCase());
        });
      }
    }

    // Match imported paths to workspace nodes
    importedPaths.forEach(targetPath => {
      const targetNode = pathToNodeMap.get(targetPath);
      if (targetNode && targetNode.id !== node.id && targetNode.type === 'file') {
        importsOthersCount[node.id] = (importsOthersCount[node.id] || 0) + 1;
        importedByCount[targetNode.id] = (importedByCount[targetNode.id] || 0) + 1;
      }
    });
  });

  // Calculate entrypoint score for each file
  let maxScore = -Infinity;
  let primaryCoreNodeId: string | null = null;

  codeNodes.forEach(node => {
    let score = 0;

    // +4 points for having run() function or JSDoc entry headers
    if (hasRunFuncMap[node.id]) score += 4;

    // +3 points per workspace file it imports
    score += (importsOthersCount[node.id] || 0) * 3;

    // -6 points if it is imported by another workspace file (it's a sub-module!)
    score -= (importedByCount[node.id] || 0) * 6;

    // +2 points if it's at workspace root level
    if (!node.parentId || !node.path.includes('/')) score += 2;

    // +2 points for conventional entry point filenames
    const nameLower = node.name.toLowerCase();
    if (['main.js', 'index.js', 'app.js', 'run.js', 'script.js', 'server.js', 'main.mjs', 'index.mjs', 'app.ts', 'index.ts', 'main.ts'].includes(nameLower)) {
      score += 2;
    }

    scores[node.id] = score;

    // A node qualifies as a core file if it is NOT imported by any other file (importedByCount === 0)
    // AND has positive score or imports other files.
    if ((importedByCount[node.id] || 0) === 0 && score > 0) {
      coreNodeIds.add(node.id);
    }

    if (score > maxScore) {
      maxScore = score;
      primaryCoreNodeId = node.id;
    }
  });

  // Fallback: If no node passed the > 0 threshold without being imported, pick the single highest scoring file
  if (coreNodeIds.size === 0 && primaryCoreNodeId) {
    coreNodeIds.add(primaryCoreNodeId);
  }

  return {
    coreNodeIds,
    scores,
    primaryCoreNodeId
  };
}
