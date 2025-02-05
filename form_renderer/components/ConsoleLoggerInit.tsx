'use client';

import { ConsoleLogger } from '@/utils/consoleLogger';

export function ConsoleLoggerInit() {
  if (typeof window !== 'undefined') {
    const logger = ConsoleLogger.getInstance();
    (window as any).downloadLogs = () => logger.downloadLogs();
  }
  return null;
} 