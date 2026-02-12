/**
 * HiveCode TUI Dashboard
 *
 * Displays 4 vertical WorkerCard components with streaming logs.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { WorkerCard } from './components/WorkerCard.js';
import { StatusBar } from './components/StatusBar.js';
import { useWorkerStatus } from './hooks/useWorkerStatus.js';
import { useGitStatus } from './hooks/useGitStatus.js';
import { useTheme } from './hooks/useTheme.js';
import { attachWorker } from '../workers.js';

interface AppProps {
  projectName: string;
  embedded?: boolean;
}

export function App({ projectName, embedded = false }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const workers = useWorkerStatus(projectName);
  const gitStatus = useGitStatus();
  const colors = useTheme();
  const [selectedWorker, setSelectedWorker] = useState<number | null>(null);

  // Get terminal dimensions for full-height layout
  const termHeight = stdout?.rows || 24;

  // Keyboard shortcuts
  useInput((input, key) => {
    // Quit
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }

    // Attach to worker (1-4)
    if (['1', '2', '3', '4'].includes(input)) {
      const workerId = parseInt(input, 10);
      setSelectedWorker(workerId);
      // Note: We'll handle the actual attach after a brief visual feedback
      setTimeout(() => {
        exit();
        // The attach happens after Ink unmounts
        process.nextTick(() => {
          attachWorker(workerId);
        });
      }, 100);
      return;
    }

    // Attach shortcut
    if (input === 'a') {
      // Find first running worker
      const running = workers.find(w => w.running);
      if (running) {
        setSelectedWorker(running.id);
        setTimeout(() => {
          exit();
          process.nextTick(() => {
            attachWorker(running.id);
          });
        }, 100);
      }
      return;
    }
  });

  return (
    <Box flexDirection="column" width="100%" height={termHeight}>
      {/* Header - compact in embedded mode */}
      {embedded ? (
        <Box borderStyle="single" borderColor={colors.brand} paddingX={1}>
          <Text color={colors.brand} bold>Workers</Text>
          <Text color={colors.textDim}> | </Text>
          <Text color={colors.info}>{projectName}</Text>
        </Box>
      ) : (
        <Box paddingX={1} marginBottom={1}>
          <Text bold color={colors.brand}>
            {' '}
          </Text>
          <Text bold color={colors.text}> HiveCode</Text>
          <Text color={colors.textDim}>{'  '}</Text>
          <Text color={colors.info}>{projectName}</Text>
        </Box>
      )}

      {/* Worker Cards - flex to fill available space */}
      <Box flexDirection="column" flexGrow={1}>
        {workers.map((worker) => (
          <WorkerCard
            key={worker.id}
            worker={worker}
            projectName={projectName}
            selected={selectedWorker === worker.id}
            compact={embedded}
          />
        ))}
      </Box>

      {/* Status Bar */}
      <StatusBar gitStatus={gitStatus} embedded={embedded} />
    </Box>
  );
}
