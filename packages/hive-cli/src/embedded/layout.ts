/**
 * HiveCode Embedded Layout
 *
 * Creates a tmux layout with:
 * - Left: Queen (Claude Code) - 60%
 * - Right: Ink Dashboard (single pane showing all workers) - 40%
 *
 * Features:
 * - Ctrl+b w: Toggle dashboard visibility
 * - Dashboard auto-resizes with terminal
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getProjectConfig, startWorker } from '../workers.js';
import { applyTmuxConfig } from './config.js';
import { setupKeybindings } from './keybindings.js';
import { ensureHiveInitialized } from '../init.js';

interface LayoutOptions {
  workerCount?: number;
  queenWidthPercent?: number;
  showWorkers?: boolean;
}

/**
 * Get the embedded session name
 */
export function getEmbeddedSessionName(projectName: string): string {
  return `hivecode-${projectName}`;
}

/**
 * Check if embedded session exists
 */
export function embeddedSessionExists(projectName: string): boolean {
  const sessionName = getEmbeddedSessionName(projectName);
  try {
    execSync(`tmux has-session -t "${sessionName}" 2>/dev/null`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create the embedded layout with Queen and Dashboard
 */
export function createEmbeddedLayout(options: LayoutOptions = {}): string {
  const config = getProjectConfig();
  const sessionName = getEmbeddedSessionName(config.projectName);
  const workerCount = Math.min(options.workerCount ?? 4, 4);
  const queenWidth = options.queenWidthPercent ?? 60;
  const showWorkers = options.showWorkers ?? true;

  // Auto-initialize HiveCode if needed (creates .hive, hooks, etc.)
  ensureHiveInitialized(config, true); // silent mode - index.ts handles logging

  // Kill existing session if it exists
  if (embeddedSessionExists(config.projectName)) {
    execSync(`tmux kill-session -t "${sessionName}" 2>/dev/null`, { stdio: 'ignore' });
  }

  // Create new session
  execSync(
    `tmux new-session -d -s "${sessionName}" -c "${config.projectRoot}" -x 200 -y 50`,
    { stdio: 'ignore' }
  );

  // Apply HiveCode tmux configuration
  applyTmuxConfig(sessionName);

  // Start Workers in background
  for (let i = 1; i <= workerCount; i++) {
    startWorker(i);
  }

  // Wait for workers to initialize
  execSync('sleep 0.5');

  if (showWorkers) {
    // Split: Queen (left) | Dashboard (right)
    const dashboardPercent = 100 - queenWidth;
    execSync(
      `tmux split-window -h -p ${dashboardPercent} -t "${sessionName}:0"`,
      { stdio: 'ignore' }
    );

    // Name panes
    execSync(`tmux select-pane -t "${sessionName}:0.0" -T "Queen"`, { stdio: 'ignore' });
    execSync(`tmux select-pane -t "${sessionName}:0.1" -T "Dashboard"`, { stdio: 'ignore' });

    // Start Dashboard in right pane (embedded mode)
    execSync(
      `tmux send-keys -t "${sessionName}:0.1" "hivecode dashboard --embedded" Enter`,
      { stdio: 'ignore' }
    );
  }

  // Setup keybindings
  setupKeybindings(sessionName, config.projectName);

  // Start Claude Code in Queen pane
  execSync(
    `tmux send-keys -t "${sessionName}:0.0" "claude --dangerously-skip-permissions" Enter`,
    { stdio: 'ignore' }
  );

  // Focus on Queen pane
  execSync(`tmux select-pane -t "${sessionName}:0.0"`, { stdio: 'ignore' });

  return sessionName;
}
