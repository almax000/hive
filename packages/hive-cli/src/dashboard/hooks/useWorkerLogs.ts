/**
 * useWorkerLogs hook
 *
 * Tails worker log files and returns recent lines.
 */

import { useState, useEffect, useRef } from 'react';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { getWorkerLogPath } from '../../workers.js';

const MAX_LINES = 100; // Keep last 100 lines in memory
const POLL_INTERVAL = 500; // 500ms

export function useWorkerLogs(projectName: string, workerId: number): string[] {
  const [lines, setLines] = useState<string[]>([]);
  const lastSizeRef = useRef<number>(0);
  const logPath = getWorkerLogPath(projectName, workerId);

  useEffect(() => {
    // Reset on worker change
    lastSizeRef.current = 0;
    setLines([]);

    const pollLog = () => {
      if (!existsSync(logPath)) {
        return;
      }

      try {
        const stat = statSync(logPath);
        const currentSize = stat.size;

        // Only read if file has grown
        if (currentSize > lastSizeRef.current) {
          const content = readFileSync(logPath, 'utf-8');
          const allLines = content.split('\n').filter((line) => line.trim() !== '');

          // Keep only recent lines
          const recentLines = allLines.slice(-MAX_LINES);
          setLines(recentLines);
          lastSizeRef.current = currentSize;
        }
      } catch {
        // File read error, ignore
      }
    };

    // Initial read
    pollLog();

    // Poll for changes
    const interval = setInterval(pollLog, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [logPath, workerId]);

  return lines;
}
