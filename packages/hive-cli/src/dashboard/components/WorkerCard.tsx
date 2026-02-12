/**
 * WorkerCard component
 *
 * Displays a single Worker's status, branch, and streaming logs.
 * Automatically adapts to terminal width and theme.
 */

import React from 'react';
import { Box, Text, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import type { WorkerInfo } from '../../workers.js';
import { useWorkerLogs } from '../hooks/useWorkerLogs.js';
import { useTheme } from '../hooks/useTheme.js';
import type { InkColorName } from '../../theme/index.js';

interface WorkerCardProps {
  worker: WorkerInfo;
  projectName: string;
  selected?: boolean;
  compact?: boolean;
}

// Status icons mapping - colors will be resolved at render time using theme
type StatusKey = 'idle' | 'coding' | 'testing' | 'reviewing' | 'ready_for_review' | 'approved' | 'unknown';

const STATUS_ICONS: Record<StatusKey, { icon: string; colorKey: 'textDim' | 'success' | 'warning' | 'info' | 'brand' }> = {
  idle: { icon: '○', colorKey: 'textDim' },
  coding: { icon: '●', colorKey: 'success' },
  testing: { icon: '◐', colorKey: 'warning' },
  reviewing: { icon: '●', colorKey: 'info' },
  ready_for_review: { icon: '◉', colorKey: 'info' },
  approved: { icon: '✓', colorKey: 'success' },
  unknown: { icon: '?', colorKey: 'textDim' },
};

export function WorkerCard({ worker, projectName, selected, compact = false }: WorkerCardProps) {
  const { stdout } = useStdout();
  const termWidth = stdout?.columns || 80;
  const colors = useTheme();

  const logs = useWorkerLogs(projectName, worker.id);
  const status = (worker.status?.status || (worker.running ? 'idle' : 'stopped')) as StatusKey;
  const statusConfig = STATUS_ICONS[status] || STATUS_ICONS.unknown;
  const statusColor = colors[statusConfig.colorKey] as InkColorName;
  const branch = worker.status?.branch || '—';
  const subagent = worker.status?.subagent;

  // Calculate available width (account for borders and padding)
  const contentWidth = Math.max(termWidth - 4, 20);
  const logLineWidth = Math.max(contentWidth - 2, 15);

  // Get last few lines of logs for display (more lines in compact mode since we have flexGrow)
  const recentLogs = logs.slice(compact ? -5 : -4);

  // Compact mode: flexible cards for embedded layout (fills available space)
  if (compact) {
    const branchMaxLen = Math.max(Math.floor(contentWidth * 0.4), 10);
    const displayBranch = branch.length > branchMaxLen
      ? branch.slice(0, branchMaxLen - 1) + '…'
      : branch;

    return (
      <Box
        borderStyle={selected ? 'bold' : 'single'}
        borderColor={selected ? colors.brand : worker.running ? colors.border : colors.borderInactive}
        paddingX={1}
        flexDirection="column"
        flexGrow={1}
      >
        {/* Single header line */}
        <Box>
          <Text bold color={worker.running ? colors.text : colors.textDim}>
            W{worker.id}
          </Text>
          <Text color={colors.textDim}> </Text>
          <Text color={statusColor}>
            {statusConfig.icon}
          </Text>
          <Text color={colors.textDim}> </Text>
          <Text color={colors.info} wrap="truncate">
            {displayBranch}
          </Text>
        </Box>

        {/* Content area: logs or status (flexible height) */}
        <Box flexDirection="column" flexGrow={1}>
          {worker.running ? (
            <>
              {/* Current task description */}
              {worker.status?.current && (
                <Text color={colors.text} wrap="truncate">
                  {worker.status.current.slice(0, logLineWidth)}
                </Text>
              )}

              {/* Subagent status */}
              {subagent && (
                <Text color={subagent.status === 'running' ? colors.warning : subagent.status === 'passed' ? colors.success : colors.error} wrap="truncate">
                  {subagent.status === 'running' && <Spinner type="dots" />}
                  {subagent.status === 'running' ? ' ' : subagent.status === 'passed' ? '✓ ' : '✗ '}
                  [{subagent.name}] {subagent.message || ''}
                </Text>
              )}

              {/* Recent logs */}
              {recentLogs.length > 0 ? (
                recentLogs.map((line, i) => (
                  <Text key={i} color={colors.textDim} wrap="truncate">
                    {line.slice(0, logLineWidth)}
                  </Text>
                ))
              ) : !worker.status?.current && !subagent && (
                <Text color={colors.textDim} dimColor>initializing...</Text>
              )}
            </>
          ) : (
            <Text color={colors.textDim} dimColor>(stopped)</Text>
          )}
        </Box>
      </Box>
    );
  }

  // Standard mode: full cards
  return (
    <Box
      flexDirection="column"
      borderStyle={selected ? 'bold' : 'single'}
      borderColor={selected ? colors.brand : worker.running ? colors.border : colors.borderInactive}
      paddingX={1}
      marginBottom={0}
    >
      {/* Header row: Worker name, branch, status */}
      <Box>
        <Text bold color={worker.running ? colors.text : colors.textDim}>
          Worker-{worker.id}
        </Text>
        <Text color={colors.textDim}>{'  '}</Text>
        <Text color={colors.info} wrap="truncate">{branch}</Text>
        <Text color={colors.textDim}>{'  '}</Text>
        <Text color={statusColor}>
          {statusConfig.icon} {status}
        </Text>
      </Box>

      {/* Divider - dynamic width */}
      <Box marginY={0}>
        <Text color={colors.textDim}>{'─'.repeat(Math.max(contentWidth - 2, 10))}</Text>
      </Box>

      {/* Content area: logs or idle message */}
      <Box flexDirection="column" height={3}>
        {worker.running ? (
          <>
            {/* Recent activity */}
            {recentLogs.length > 0 ? (
              recentLogs.map((line, i) => (
                <Text key={i} color={colors.textDim} wrap="truncate">
                  {line.slice(0, logLineWidth)}
                </Text>
              ))
            ) : (
              <Text color={colors.textDim}>(initializing...)</Text>
            )}

            {/* Subagent status */}
            {subagent && (
              <Box marginTop={0}>
                {subagent.status === 'running' ? (
                  <Text color={colors.warning} wrap="truncate">
                    <Spinner type="dots" /> [{subagent.name}] {subagent.message || 'Running...'}
                  </Text>
                ) : subagent.status === 'passed' ? (
                  <Text color={colors.success}>
                    ✓ [{subagent.name}] Passed
                  </Text>
                ) : (
                  <Text color={colors.error} wrap="truncate">
                    ✗ [{subagent.name}] {subagent.message || 'Failed'}
                  </Text>
                )}
              </Box>
            )}
          </>
        ) : (
          <Text color={colors.textDim} dimColor>
            (not running)
          </Text>
        )}
      </Box>
    </Box>
  );
}
