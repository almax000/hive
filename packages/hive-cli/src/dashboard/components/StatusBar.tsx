/**
 * StatusBar component
 *
 * Shows git status and keyboard shortcuts.
 * Adapts colors based on current theme.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../hooks/useTheme.js';

interface GitStatus {
  branch: string;
  clean: boolean;
  ahead?: number;
  behind?: number;
}

interface StatusBarProps {
  gitStatus: GitStatus | null;
  embedded?: boolean;
}

export function StatusBar({ gitStatus, embedded = false }: StatusBarProps) {
  const colors = useTheme();

  // Compact status bar for embedded mode
  if (embedded) {
    return (
      <Box borderStyle="single" borderColor={colors.borderInactive} paddingX={1}>
        <Text color={colors.textDim}>[</Text>
        <Text color={colors.brand}>1-4</Text>
        <Text color={colors.textDim}>] attach [</Text>
        <Text color={colors.brand}>q</Text>
        <Text color={colors.textDim}>]uit</Text>
      </Box>
    );
  }

  // Full status bar for standalone mode
  return (
    <Box
      borderStyle="single"
      borderColor={colors.borderInactive}
      paddingX={1}
      justifyContent="space-between"
    >
      {/* Git status */}
      <Box>
        {gitStatus ? (
          <>
            <Text color={colors.info}>{gitStatus.branch}</Text>
            <Text color={colors.textDim}>{' '}</Text>
            {gitStatus.clean ? (
              <Text color={colors.success}>✓</Text>
            ) : (
              <Text color={colors.warning}>*</Text>
            )}
            {gitStatus.ahead !== undefined && gitStatus.ahead > 0 && (
              <Text color={colors.success}> ↑{gitStatus.ahead}</Text>
            )}
            {gitStatus.behind !== undefined && gitStatus.behind > 0 && (
              <Text color={colors.error}> ↓{gitStatus.behind}</Text>
            )}
          </>
        ) : (
          <Text color={colors.textDim}>git: loading...</Text>
        )}
      </Box>

      {/* Keyboard shortcuts */}
      <Box>
        <Text color={colors.textDim}>[</Text>
        <Text color={colors.brand}>1-4</Text>
        <Text color={colors.textDim}>] attach  [</Text>
        <Text color={colors.brand}>a</Text>
        <Text color={colors.textDim}>]ttach  [</Text>
        <Text color={colors.brand}>q</Text>
        <Text color={colors.textDim}>]uit</Text>
      </Box>
    </Box>
  );
}
