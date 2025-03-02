type LogEntry = {
  type: 'log' | 'error' | 'warn' | 'info';
  time: string;
  data: any[];
};

type ConsoleMethodType = 'log' | 'error' | 'warn' | 'info';

export class ConsoleLogger {
  private static instance: ConsoleLogger;
  private logs: LogEntry[] = [];
  private originalMethods: Record<ConsoleMethodType, Function> = {} as Record<ConsoleMethodType, Function>;

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
    const methodsToOverride: ConsoleMethodType[] = ['log', 'error', 'warn', 'info'];

    methodsToOverride.forEach(method => {
      this.originalMethods[method] = console[method];
      // Use type assertion to ensure TypeScript knows what we're doing
      console[method as keyof Console] = (...args: any[]) => {
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
    const filename = 'console_debug.json';
    
    try {
      // Always attempt server-side save first
      fetch('/api/save-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: this.logs,
          path: filename
        }),
      }).then(response => {
        if (!response.ok) {
          console.warn('Server-side log saving failed, falling back to browser download');
          this.downloadToDevice(logData, filename);
        } else {
          console.log('Logs saved successfully on server');
        }
      }).catch(error => {
        console.error('Error saving logs to server:', error);
        this.downloadToDevice(logData, filename);
      });
    } catch (error) {
      console.error('Failed to save logs:', error);
      this.downloadToDevice(logData, filename);
    }
  }

  private downloadToDevice(data: string, filename: string) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearLogs() {
    this.logs = [];
  }

  destroy() {
    const methodsToRestore: ConsoleMethodType[] = ['log', 'error', 'warn', 'info'];
    
    methodsToRestore.forEach(method => {
      console[method as keyof Console] = this.originalMethods[method] as any;
    });
    
    this.logs = [];
  }
}

export const debugLog = (pageName: string, message: string, data?: any) => {
  if (pageName === 'workeducation3_page') {
    if (data) {
      console.log(`[${pageName}] ${message}`, data);
    } else {
      console.log(`[${pageName}] ${message}`);
    }
  }
}; 