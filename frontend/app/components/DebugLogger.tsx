'use client';

import { ConsoleLogger } from '@/utils/consoleLogger';

export const DebugLogger = ({ debugMode = false }) => {
  const handleDownload = () => {
    ConsoleLogger.getInstance().downloadLogs();
  };

  const handleClear = () => {
    ConsoleLogger.getInstance().clearLogs();
    console.log('Logs cleared');
  };

  // Don't render if debug mode is off
  if (!debugMode) return null;

  return (
    <div className="fixed bottom-4 right-4 flex gap-2">
      <button 
        onClick={handleClear}
        className="bg-red-600 text-white px-4 py-2 rounded"
      >
        Clear Logs
      </button>
      <button 
        onClick={handleDownload}
        className="bg-gray-800 text-white px-4 py-2 rounded"
      >
        Download Logs
      </button>
    </div>
  );
};