/**
 * HiveCode Embedded Layout Module
 *
 * Creates a tmux-based embedded layout with:
 * - Left: Queen (Claude Code) - full interactive experience
 * - Right: 4 Worker log panes showing streaming output (read-only)
 *
 * Features:
 * - Ctrl+b w: Toggle workers panel visibility
 * - Workers show real-time log streaming
 * - HiveCode branded status bar
 */

import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getProjectConfig } from '../workers.js';
import { createEmbeddedLayout, getEmbeddedSessionName, embeddedSessionExists } from './layout.js';

export { getEmbeddedSessionName, embeddedSessionExists } from './layout.js';

interface EmbeddedLayoutOptions {
  workerCount?: number;
  queenWidthPercent?: number;
  showWorkers?: boolean;
}

/**
 * Check if tmux is installed
 */
export function checkTmux(): boolean {
  try {
    execSync('which tmux', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check terminal compatibility
 */
export function checkTerminal(): { compatible: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const cols = process.stdout.columns || 80;
  const term = process.env.TERM || '';
  const termProgram = process.env.TERM_PROGRAM || '';

  if (cols < 120) {
    warnings.push(`Terminal width (${cols}) below recommended 120 columns for best experience`);
  }

  if (!term.includes('256color') && !term.includes('truecolor')) {
    warnings.push('Terminal may not support full colors');
  }

  if (termProgram === 'Apple_Terminal') {
    warnings.push('macOS Terminal.app detected - consider iTerm2 or Ghostty for better experience');
  }

  return { compatible: true, warnings };
}

/**
 * Attach to the embedded session
 */
export function attachEmbeddedSession(projectName: string): void {
  const sessionName = getEmbeddedSessionName(projectName);

  if (!embeddedSessionExists(projectName)) {
    console.error(`\x1b[31mNo embedded session found for ${projectName}\x1b[0m`);
    console.log('Start with: hivecode');
    process.exit(1);
  }

  const tmux = spawn('tmux', ['attach', '-t', sessionName], {
    stdio: 'inherit',
  });

  tmux.on('error', (err) => {
    console.error(`Failed to attach: ${err.message}`);
    process.exit(1);
  });
}

/**
 * Start the embedded layout (main entry point)
 */
export function startEmbeddedLayout(options: EmbeddedLayoutOptions = {}): void {
  const config = getProjectConfig();

  // Check if this is a fresh project (no .hive yet)
  const isNewProject = !existsSync(join(config.projectRoot, '.hive'));

  console.log('\x1b[33m🐝 HiveCode\x1b[0m');
  console.log(`   Project: ${config.projectName}`);
  if (isNewProject) {
    console.log('   \x1b[32m(auto-initializing...)\x1b[0m');
  }
  console.log('');

  // Check tmux
  if (!checkTmux()) {
    console.error('\x1b[31mError: tmux is required\x1b[0m');
    console.log('');
    console.log('Install tmux:');
    console.log('  macOS:  brew install tmux');
    console.log('  Linux:  sudo apt install tmux');
    process.exit(1);
  }

  // Check terminal
  const termCheck = checkTerminal();
  if (termCheck.warnings.length > 0) {
    for (const warning of termCheck.warnings) {
      console.log(`\x1b[33m⚠️  ${warning}\x1b[0m`);
    }
    console.log('');
  }

  // Create layout
  console.log('  Starting Workers...');
  const sessionName = createEmbeddedLayout(options);

  console.log('');
  console.log('\x1b[32m✅ Ready!\x1b[0m');
  console.log('');
  console.log('Layout:');
  console.log('  \x1b[36mLeft\x1b[0m   Claude Code (Queen) - interactive');
  console.log('  \x1b[36mRight\x1b[0m  Worker Dashboard (status monitoring)');
  console.log('');
  console.log('\x1b[33mHiveCode Mode (Ctrl+\\):\x1b[0m');
  console.log('  Press \x1b[33mCtrl+\\\x1b[0m then single key:');
  console.log('  \x1b[33mw\x1b[0m      Toggle Dashboard');
  console.log('  \x1b[33m1-4\x1b[0m    Attach to Worker');
  console.log('  \x1b[33mEsc\x1b[0m    Exit mode');
  console.log('');
  console.log('tmux Prefix (\x1b[90mCtrl+b\x1b[0m):');
  console.log('  \x1b[90mh/l\x1b[0m    Focus left/right');
  console.log('  \x1b[90md\x1b[0m      Detach (keep running)');
  console.log('');

  // Attach to the session
  attachEmbeddedSession(config.projectName);
}
