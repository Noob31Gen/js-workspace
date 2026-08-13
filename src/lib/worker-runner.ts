import { buildWorkerDependencyLoader } from './dependency-resolver';
import { WorkspaceNode } from './workspace-store';

export interface ConsoleLogMessage {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error' | 'table';
  data: any[];
  timestamp: string;
}

export interface FramePayload {
  type: 'html' | 'image' | 'table' | 'json';
  content: any;
  title?: string;
}

export interface ExecutionResult {
  raw: any;
  frame?: FramePayload;
  executionTimeMs: number;
}

export interface FsMutationPayload {
  action: 'write' | 'mkdir' | 'delete';
  path: string;
  content?: string;
}

export interface WorkerRunOptions {
  code: string;
  args: Record<string, any>;
  nodes?: WorkspaceNode[];
  currentFilePath?: string;
  timeoutMs?: number;
  onLog: (msg: ConsoleLogMessage) => void;
  onFsMutation?: (mutation: FsMutationPayload) => void;
  onSuccess: (result: ExecutionResult) => void;
  onError: (error: string) => void;
}

export class ScriptRunner {
  private currentWorker: Worker | null = null;
  private timeoutTimer: any = null;

  public execute({
    code,
    args,
    nodes = [],
    currentFilePath = 'main.js',
    timeoutMs = 30000,
    onLog,
    onFsMutation,
    onSuccess,
    onError
  }: WorkerRunOptions) {
    this.stop(); // Stop any currently running worker

    const startTime = performance.now();
    const dependencyLoaderCode = buildWorkerDependencyLoader(nodes, currentFilePath);

    // Wrap user script into a Web Worker environment with dependency loader
    const workerScript = `
      ${dependencyLoaderCode}

      const formatTime = () => new Date().toLocaleTimeString();
      
      const sendLog = (type, data) => {
        postMessage({
          type: 'LOG',
          logType: type,
          timestamp: formatTime(),
          data: data.map(item => {
            if (item instanceof Error) return item.message || String(item);
            if (typeof item === 'object') {
              try { return JSON.parse(JSON.stringify(item)); } catch(e) { return String(item); }
            }
            return item;
          })
        });
      };

      console.log = (...args) => sendLog('log', args);
      console.info = (...args) => sendLog('info', args);
      console.warn = (...args) => sendLog('warn', args);
      console.error = (...args) => sendLog('error', args);
      console.table = (...args) => sendLog('table', args);

      // Web Worker Message Listener
      self.onmessage = async (event) => {
        const { code, args } = event.data;
        try {
          let transformedCode = code
            .replace(/import\s+\*\s+as\s+([a-zA-Z0-9_$]+)\s+from\s+['"]([^'"]+)['"]/g, 'const $1 = require("$2");')
            .replace(/import\s+([a-zA-Z0-9_$]+)\s+from\s+['"]([^'"]+)['"]/g, 'const $1 = (require("$2").default || require("$2"));')
            .replace(/import\s*\{([^}]+)\}\s*from\s+['"]([^'"]+)['"]/g, 'const {$1} = require("$2");')
            .replace(/export\s+async\s+function\s+run/g, 'async function run')
            .replace(/export\s+function\s+run/g, 'function run');

          const scriptFunc = new Function('__workspace_args__', 'require', 'workspace', 'process', 'Buffer', \`
            return (async () => {
              if (__workspace_args__ && typeof __workspace_args__ === 'object') {
                const argvList = ['node', typeof CURRENT_FILE_PATH !== 'undefined' ? CURRENT_FILE_PATH : 'script.js'];
                Object.entries(__workspace_args__).forEach(([k, v]) => {
                  if (v !== undefined && v !== null && v !== '') {
                    argvList.push(String(v));
                  }
                });
                process.argv = argvList;
              }

              \${transformedCode}

              if (typeof run === 'function') {
                return await run(__workspace_args__);
              }
            })();
          \`);

          const rawResult = await scriptFunc(args, self.require, self.workspace, self.process, self.Buffer);
          
          // Frame Payload Detection
          let frame = null;
          if (typeof rawResult === 'string') {
            const trimmed = rawResult.trim();
            if (trimmed.startsWith('<') && (trimmed.endsWith('>') || trimmed.includes('</'))) {
              frame = { type: 'html', content: rawResult, title: 'Rendered HTML Output' };
            } else if (trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
              frame = { type: 'image', content: rawResult, title: 'Image Frame Render' };
            }
          } else if (Array.isArray(rawResult) && rawResult.length > 0 && typeof rawResult[0] === 'object') {
            frame = { type: 'table', content: rawResult, title: 'Structured Record Set' };
          } else if (rawResult && typeof rawResult === 'object' && rawResult.__html) {
            frame = { type: 'html', content: rawResult.__html, title: rawResult.__title || 'Custom Component Frame' };
          }

          postMessage({ 
            type: 'COMPLETE', 
            success: true, 
            result: { raw: rawResult, frame } 
          });
        } catch (err) {
          postMessage({ type: 'COMPLETE', success: false, error: err.message || String(err) });
        }
      };
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    this.currentWorker = new Worker(workerUrl);

    // Safety timeout
    this.timeoutTimer = setTimeout(() => {
      if (this.currentWorker) {
        this.stop();
        onError(`Execution Timed Out after ${timeoutMs / 1000} seconds.`);
      }
    }, timeoutMs);

    this.currentWorker.onmessage = async (event: MessageEvent) => {
      const data = event.data;

      if (data.type === 'LOG') {
        onLog({
          id: Math.random().toString(36).substring(2, 9),
          type: data.logType,
          data: data.data,
          timestamp: data.timestamp
        });
      } else if (data.type === 'FS_MUTATION') {
        if (onFsMutation) {
          onFsMutation({
            action: data.action,
            path: data.path,
            content: data.content
          });
        }
      } else if (data.type === 'COMPLETE') {
        const executionTimeMs = Math.round(performance.now() - startTime);
        this.clearTimer();
        URL.revokeObjectURL(workerUrl);

        if (data.success) {
          onSuccess({
            raw: data.result.raw,
            frame: data.result.frame,
            executionTimeMs
          });
        } else {
          onError(data.error);
        }
      }
    };

    this.currentWorker.onerror = (err) => {
      this.clearTimer();
      URL.revokeObjectURL(workerUrl);
      onError(err.message || 'Worker runtime error during script execution');
    };

    this.currentWorker.postMessage({ code, args });
  }

  public stop() {
    this.clearTimer();
    if (this.currentWorker) {
      this.currentWorker.terminate();
      this.currentWorker = null;
    }
  }

  private clearTimer() {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }
}
