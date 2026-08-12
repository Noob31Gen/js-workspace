import { fetchViaExtension } from './extension-client';

export interface ConsoleLogMessage {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error' | 'table';
  data: any[];
  timestamp: string;
}

export interface WorkerRunOptions {
  code: string;
  args: Record<string, any>;
  timeoutMs?: number;
  onLog: (msg: ConsoleLogMessage) => void;
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}

export class ScriptRunner {
  private currentWorker: Worker | null = null;
  private timeoutTimer: any = null;

  public execute({ code, args, timeoutMs = 30000, onLog, onSuccess, onError }: WorkerRunOptions) {
    this.stop(); // Stop any currently running worker

    // Wrap user script into a self-contained Web Worker script
    const workerScript = `
      // Worker Console Wrapper
      const formatTime = () => new Date().toLocaleTimeString();
      const sendLog = (type, data) => {
        postMessage({
          type: 'LOG',
          logType: type,
          timestamp: formatTime(),
          data: data.map(item => (typeof item === 'object' ? JSON.parse(JSON.stringify(item)) : item))
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
          // Inject code
          const scriptFunc = new Function('args', \`
            \${code}
            if (typeof run === 'function') {
              return run(args);
            } else {
              throw new Error("No 'async function run(args)' found in script!");
            }
          \`);

          const result = await scriptFunc(args);
          postMessage({ type: 'COMPLETE', success: true, result });
        } catch (err) {
          postMessage({ type: 'COMPLETE', success: false, error: err.message || String(err) });
        }
      };
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    this.currentWorker = new Worker(workerUrl);

    // Timeout safety termination
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
      } else if (data.type === 'COMPLETE') {
        this.clearTimer();
        URL.revokeObjectURL(workerUrl);

        if (data.success) {
          onSuccess(data.result);
        } else {
          onError(data.error);
        }
      }
    };

    this.currentWorker.onerror = (err) => {
      this.clearTimer();
      URL.revokeObjectURL(workerUrl);
      onError(err.message || 'Worker runtime execution error');
    };

    // Send code and arguments to worker
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
