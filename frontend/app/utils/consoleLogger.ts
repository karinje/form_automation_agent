type LogEntry = {
  type: 'log' | 'error' | 'warn' | 'info';
  time: string;
  data: any[];
};

export class ConsoleLogger {
  private static instance: ConsoleLogger;
  private logs: LogEntry[] = [];
  private originalMethods: Record<string, Function> = {};

  private constructor() {
    this.initializeLogger();
  }

  static getInstance(): ConsoleLogger {
    if (!ConsoleLogger.instance) {
      ConsoleLogger.instance = new ConsoleLogger();
    }
    return ConsoleLogger.instance;
  }

  private initializeLogger() {
    const methodsToOverride = ['log', 'error', 'warn', 'info'] as const;

    methodsToOverride.forEach(method => {
      this.originalMethods[method] = console[method];
      console[method] = (...args: any[]) => {
        this.capture(method, args);
        this.originalMethods[method].apply(console, args);
      };
    });
  }

  private capture(type: LogEntry['type'], args: any[]) {
    this.logs.push({
      type,
      time: new Date().toISOString(),
      data: args
    });
  }

  downloadLogs() {
    const logData = JSON.stringify(this.logs, null, 2);
    
    // Always save to the same file
    fetch('/api/save-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        logs: this.logs,
        path: 'console_debug.json'
      }),
    }).then(response => {
      if (!response.ok) {
        // Fallback to browser download if server save fails
        this.downloadToDevice(logData, 'console_debug.json');
      }
    }).catch(() => {
      // Fallback to browser download if fetch fails
      this.downloadToDevice(logData, 'console_debug.json');
    });
  }

  private downloadToDevice(data: string, filename: string) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  clearLogs() {
    this.logs = [];
  }

  destroy() {
    Object.entries(this.originalMethods).forEach(([method, originalFn]) => {
      console[method] = originalFn;
    });
    this.logs = [];
  }
}

export const debugLog = (pageName: string, message: string, data?: any) => {
  if (pageName === 'previous_travel_page' || message.includes('[Mapping Creation]')) {
    if (data) {
      console.log(`[${pageName}] ${message}`, data);
    } else {
      console.log(`[${pageName}] ${message}`);
    }
  }
}; 