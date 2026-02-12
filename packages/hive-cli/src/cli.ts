#!/usr/bin/env node
/**
 * HiveCode CLI
 *
 * Multi-instance parallel Claude Code workflow system.
 */

import { Command } from 'commander';
import { basename } from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  startAllWorkers,
  stopAllWorkers,
  killAllWorkers,
  restartWorker,
  listWorkers,
  attachWorker,
  sendAllWorkerPrompts,
  getProjectConfig,
  sessionExists,
  getWorkerSessionName,
} from './workers.js';

import { startDashboard } from './dashboard/index.js';
import {
  startEmbeddedLayout,
  embeddedSessionExists,
  attachEmbeddedSession,
} from './embedded/index.js';
import { applyTmuxConfig } from './embedded/config.js';
import { initTheme, getThemeMode, type ThemeMode } from './theme/index.js';
import {
  setConfigValue,
  getConfigValue,
  unsetConfigValue,
  listConfig,
  getConfigPaths,
  type HiveConfig,
} from './config.js';

const VERSION = '0.3.0';

const program = new Command();

program
  .name('hivecode')
  .description('Multi-instance parallel Claude Code workflow system')
  .version(VERSION);

// ============================================================
// Queen command (standalone, no dashboard)
// ============================================================
program
  .command('queen')
  .description('Start Queen only (Claude Code without dashboard)')
  .action(() => {
    const config = getProjectConfig();

    // Ensure .hive directories exist
    mkdirSync(join(config.hiveDir, 'tasks'), { recursive: true });
    mkdirSync(join(config.hiveDir, 'status'), { recursive: true });

    console.log('\x1b[34m🐝 Starting HiveCode Queen\x1b[0m');
    console.log(`   Project: ${config.projectName}`);
    console.log('');
    console.log('Starting Claude Code with Queen role...');
    console.log('');

    // Execute Claude directly (replaces current process)
    const claude = spawn('claude', ['--dangerously-skip-permissions'], {
      stdio: 'inherit',
      cwd: config.projectRoot,
    });

    claude.on('error', (err) => {
      console.error(`\x1b[31mFailed to start Claude: ${err.message}\x1b[0m`);
      console.log('');
      console.log('Make sure Claude Code is installed:');
      console.log('  npm install -g @anthropic-ai/claude-code');
      process.exit(1);
    });

    claude.on('close', (code) => {
      process.exit(code || 0);
    });
  });

// ============================================================
// Workers command group
// ============================================================
const workersCmd = program
  .command('workers')
  .description('Manage HiveCode Workers');

workersCmd
  .command('up')
  .description('Start all 4 Workers (creates detached tmux sessions)')
  .action(() => {
    startAllWorkers();
  });

workersCmd
  .command('down')
  .description('Stop all Workers (sends /exit command)')
  .action(() => {
    stopAllWorkers();
  });

workersCmd
  .command('kill')
  .description('Kill all Worker sessions completely')
  .action(() => {
    killAllWorkers();
  });

workersCmd
  .command('restart <n>')
  .description('Restart a specific Worker (1-4)')
  .action((n: string) => {
    const workerId = parseInt(n, 10);
    if (isNaN(workerId) || workerId < 1 || workerId > 4) {
      console.error('\x1b[31mError: Worker ID must be 1-4\x1b[0m');
      process.exit(1);
    }
    restartWorker(workerId);
  });

workersCmd
  .command('list')
  .description('List Worker status')
  .action(() => {
    listWorkers();
  });

workersCmd
  .command('prompt')
  .description('Send initial prompts to all running Workers')
  .action(() => {
    sendAllWorkerPrompts();
  });

// ============================================================
// Legacy workers command (for backward compatibility)
// hivecode workers 2|3|4
// ============================================================
program
  .command('workers-legacy <count>')
  .description('Legacy: Create N workers in the current tmux session')
  .action((count: string) => {
    console.log('\x1b[33mNote: This is the legacy workers command.\x1b[0m');
    console.log('For the new architecture, use:');
    console.log('  hivecode workers up    # Start 4 detached Workers');
    console.log('  hivecode dashboard     # Monitor Workers');
    console.log('');

    // Forward to bash script for legacy behavior
    try {
      execSync(`"${process.argv[1]}" workers ${count}`, {
        stdio: 'inherit',
        env: { ...process.env, HIVECODE_LEGACY: '1' },
      });
    } catch {
      process.exit(1);
    }
  });

// ============================================================
// Dashboard command
// ============================================================
program
  .command('dashboard')
  .alias('dash')
  .description('Start the TUI monitoring dashboard')
  .option('--embedded', 'Run in embedded mode (compact layout)')
  .option('--theme <mode>', 'Color theme: light, dark, or auto (default: auto)', 'auto')
  .action((options: { embedded?: boolean; theme: string }) => {
    const config = getProjectConfig();

    // Initialize theme
    const themeOverride = options.theme === 'auto'
      ? undefined
      : (options.theme as ThemeMode);
    initTheme(themeOverride, config.projectRoot);

    startDashboard({ embedded: options.embedded });
  });

// ============================================================
// Embedded command (default - Queen + Worker logs in single tmux layout)
// ============================================================
program
  .command('embedded', { isDefault: true })
  .alias('e')
  .description('Start HiveCode (Queen + Worker log panels)')
  .option('-w, --workers <count>', 'Number of workers to start', '4')
  .option('--queen-width <percent>', 'Queen pane width percentage', '60')
  .option('--no-panels', 'Start without worker panels (Queen only)')
  .option('--attach', 'Attach to existing session if available')
  .option('--theme <mode>', 'Color theme: light, dark, or auto (default: auto)', 'auto')
  .action((options: { workers: string; queenWidth: string; panels?: boolean; attach?: boolean; theme: string }) => {
    const config = getProjectConfig();

    // Initialize theme (auto-detect or use override)
    const themeOverride = options.theme === 'auto'
      ? undefined
      : (options.theme as ThemeMode);
    initTheme(themeOverride, config.projectRoot);

    // If --attach and session exists, just attach
    if (options.attach && embeddedSessionExists(config.projectName)) {
      attachEmbeddedSession(config.projectName);
      return;
    }

    const workerCount = parseInt(options.workers, 10);
    const queenWidth = parseInt(options.queenWidth, 10);
    // --no-panels sets panels to false, default is true
    const showWorkers = options.panels !== false;

    if (isNaN(workerCount) || workerCount < 1 || workerCount > 4) {
      console.error('\x1b[31mError: Worker count must be 1-4\x1b[0m');
      process.exit(1);
    }

    if (isNaN(queenWidth) || queenWidth < 40 || queenWidth > 80) {
      console.error('\x1b[31mError: Queen width must be 40-80%\x1b[0m');
      process.exit(1);
    }

    startEmbeddedLayout({
      workerCount,
      queenWidthPercent: queenWidth,
      showWorkers,
    });
  });

// ============================================================
// Status command
// ============================================================
program
  .command('status')
  .description('Show Worker status (text output)')
  .action(() => {
    listWorkers();
  });

// ============================================================
// Attach command
// ============================================================
program
  .command('attach [n]')
  .description('Attach to a Worker session (1-4)')
  .action((n?: string) => {
    if (n) {
      const workerId = parseInt(n, 10);
      if (isNaN(workerId) || workerId < 1 || workerId > 4) {
        console.error('\x1b[31mError: Worker ID must be 1-4\x1b[0m');
        process.exit(1);
      }
      attachWorker(workerId);
    } else {
      // Attach to first running worker
      const config = getProjectConfig();
      for (let i = 1; i <= 4; i++) {
        const sessionName = getWorkerSessionName(config.projectName, i);
        if (sessionExists(sessionName)) {
          attachWorker(i);
          return;
        }
      }
      console.error('\x1b[31mNo running Workers found\x1b[0m');
      console.log('Start Workers with: hivecode workers up');
    }
  });

// ============================================================
// Init command
// ============================================================
program
  .command('init')
  .description('Initialize .hive directory for a project')
  .action(() => {
    initHive();
  });

// ============================================================
// Config command group
// ============================================================
const configCmd = program
  .command('config')
  .description('Manage HiveCode configuration');

configCmd
  .command('set <key> <value>')
  .description('Set a config value (e.g., hivecode config set theme light)')
  .option('--local', 'Set in project config (.hive/config.json) instead of global')
  .action((key: string, value: string, options: { local?: boolean }) => {
    const projectConfig = getProjectConfig();
    try {
      setConfigValue(key as keyof HiveConfig, value, {
        local: options.local,
        projectRoot: projectConfig.projectRoot,
      });
      const scope = options.local ? 'local' : 'global';
      console.log(`\x1b[32m✓\x1b[0m Set ${key} = ${value} (${scope})`);
    } catch (error) {
      console.error(`\x1b[31mError:\x1b[0m ${(error as Error).message}`);
      process.exit(1);
    }
  });

configCmd
  .command('get <key>')
  .description('Get a config value')
  .action((key: string) => {
    const projectConfig = getProjectConfig();
    const value = getConfigValue(key as keyof HiveConfig, projectConfig.projectRoot);
    if (value !== undefined) {
      console.log(value);
    } else {
      console.log(`\x1b[33m(not set)\x1b[0m`);
    }
  });

configCmd
  .command('unset <key>')
  .description('Remove a config value')
  .option('--local', 'Remove from project config instead of global')
  .action((key: string, options: { local?: boolean }) => {
    const projectConfig = getProjectConfig();
    unsetConfigValue(key as keyof HiveConfig, {
      local: options.local,
      projectRoot: projectConfig.projectRoot,
    });
    const scope = options.local ? 'local' : 'global';
    console.log(`\x1b[32m✓\x1b[0m Removed ${key} (${scope})`);
  });

configCmd
  .command('list')
  .description('List all config values')
  .action(() => {
    const projectConfig = getProjectConfig();
    const configs = listConfig(projectConfig.projectRoot);
    const paths = getConfigPaths(projectConfig.projectRoot);

    console.log('\x1b[34m🐝 HiveCode Configuration\x1b[0m');
    console.log('');

    if (configs.length === 0) {
      console.log('  \x1b[33m(no configuration set)\x1b[0m');
    } else {
      for (const { key, value, source } of configs) {
        const sourceTag = source === 'local' ? '\x1b[36m[local]\x1b[0m' : '\x1b[90m[global]\x1b[0m';
        console.log(`  ${key} = \x1b[32m${value}\x1b[0m ${sourceTag}`);
      }
    }

    console.log('');
    console.log('\x1b[90mConfig files:\x1b[0m');
    console.log(`  Global: ${paths.global}`);
    if (paths.local) {
      console.log(`  Local:  ${paths.local}`);
    }
  });

configCmd
  .command('path')
  .description('Show config file paths')
  .action(() => {
    const projectConfig = getProjectConfig();
    const paths = getConfigPaths(projectConfig.projectRoot);
    console.log(`Global: ${paths.global}`);
    if (paths.local) {
      console.log(`Local:  ${paths.local}`);
    }
  });

// ============================================================
// Theme command (quick access for toggling)
// ============================================================
const themeCmd = program
  .command('theme')
  .description('Manage color theme');

themeCmd
  .command('toggle')
  .description('Toggle between light and dark theme')
  .option('--session <name>', 'tmux session to update (for internal use)')
  .action((options: { session?: string }) => {
    const projectConfig = getProjectConfig();

    // Get current theme
    const currentTheme = getConfigValue('theme', projectConfig.projectRoot) || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    // Update config
    setConfigValue('theme', newTheme, { projectRoot: projectConfig.projectRoot });

    // Re-initialize theme
    initTheme(newTheme as ThemeMode, projectConfig.projectRoot);

    // If session provided, re-apply tmux config
    if (options.session) {
      try {
        applyTmuxConfig(options.session);
      } catch {
        // Ignore errors if not in tmux
      }
    }

    // Show feedback
    const icon = newTheme === 'light' ? '☀️' : '🌙';
    console.log(`${icon} Theme: ${newTheme}`);
  });

themeCmd
  .command('set <mode>')
  .description('Set theme to light, dark, or auto')
  .action((mode: string) => {
    if (mode !== 'light' && mode !== 'dark' && mode !== 'auto') {
      console.error('\x1b[31mError: Theme must be light, dark, or auto\x1b[0m');
      process.exit(1);
    }

    const projectConfig = getProjectConfig();
    setConfigValue('theme', mode, { projectRoot: projectConfig.projectRoot });

    const icon = mode === 'light' ? '☀️' : mode === 'dark' ? '🌙' : '🔄';
    console.log(`${icon} Theme set to: ${mode}`);
  });

themeCmd
  .command('show')
  .description('Show current theme')
  .action(() => {
    const projectConfig = getProjectConfig();
    initTheme(undefined, projectConfig.projectRoot);
    const mode = getThemeMode();
    const icon = mode === 'light' ? '☀️' : '🌙';
    console.log(`${icon} Current theme: ${mode}`);
  });

// ============================================================
// Stop command
// ============================================================
program
  .command('stop')
  .option('--all', 'Stop everything (Workers and legacy session)')
  .description('Stop Workers')
  .action((options: { all?: boolean }) => {
    if (options.all) {
      killAllWorkers();
      // Also kill legacy session if exists
      const config = getProjectConfig();
      const legacySession = `hivecode-${config.projectName}`;
      try {
        execSync(`tmux kill-session -t "${legacySession}" 2>/dev/null`, { stdio: 'ignore' });
        console.log(`  Legacy session ${legacySession} killed`);
      } catch {
        // Session doesn't exist
      }
    } else {
      stopAllWorkers();
    }
  });

// ============================================================
// Clean command
// ============================================================
program
  .command('clean')
  .description('Clean up worktrees')
  .action(() => {
    const config = getProjectConfig();
    console.log('Cleaning worktrees...');

    if (existsSync(config.worktreeBase)) {
      try {
        for (let i = 1; i <= 4; i++) {
          const worktreePath = join(config.worktreeBase, `worker-${i}`);
          if (existsSync(worktreePath)) {
            try {
              execSync(`git worktree remove --force "${worktreePath}" 2>/dev/null`, {
                cwd: config.projectRoot,
                stdio: 'ignore',
              });
              console.log(`  Removed: worker-${i}`);
            } catch {
              execSync(`rm -rf "${worktreePath}"`, { stdio: 'ignore' });
              console.log(`  Force removed: worker-${i}`);
            }
          }
        }
      } catch (error) {
        console.error(`  Cleanup error: ${error}`);
      }
    }

    console.log('\x1b[32m✅ Cleanup complete\x1b[0m');
  });

// ============================================================
// Init helper function
// ============================================================
function initHive(): void {
  const config = getProjectConfig();

  console.log(`\x1b[34m🐝 Initializing HiveCode for ${config.projectName}\x1b[0m`);
  console.log('');

  // 1. Create .hive directory structure
  mkdirSync(join(config.hiveDir, 'tasks'), { recursive: true });
  mkdirSync(join(config.hiveDir, 'status'), { recursive: true });
  console.log('  ✓ Created .hive/tasks and .hive/status');

  // 2. Create .claude/hooks directory
  const hooksDir = join(config.projectRoot, '.claude', 'hooks');
  mkdirSync(hooksDir, { recursive: true });
  console.log('  ✓ Created .claude/hooks');

  // 3. Generate hook script
  const hookScript = join(hooksDir, 'inject-hive-role.sh');
  const hookContent = `#!/bin/bash
#
# inject-hive-role.sh - Hive role auto-injection
#
# Auto-generated by: hivecode init
#

set -e

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
[ -z "$CWD" ] && CWD=$(pwd)

# Detect Worker worktree (path ends with /worker-N)
if echo "$CWD" | grep -qE '/worker-[0-9]+$'; then
    WORKER_ID=$(basename "$CWD" | sed 's/worker-//')
    cat << EOF
<hive-role>
You are Hive Worker-\${WORKER_ID}.

Your responsibilities:
1. Read .hive/tasks/worker-\${WORKER_ID}.md to get your task
2. Focus on completing the assigned task
3. After completion, run lint/test to verify
4. Update .hive/status/worker-\${WORKER_ID}.json

Status file format:
{
  "status": "idle|coding|testing|reviewing|ready_for_review|approved",
  "branch": "feature/xxx",
  "current": "Current work description",
  "percent": 50,
  "subagent": {
    "name": "lint|test|code-review",
    "status": "running|passed|failed",
    "message": "Optional message"
  }
}

Start by reading your task file.
</hive-role>
EOF
    exit 0
fi

# Detect Queen (project root with .hive directory)
if [ -d "$CWD/.hive" ]; then
    cat << EOF
<hive-role>
You are Hive Queen (coordinator).

Your responsibilities:
1. Create plans and distribute tasks to .hive/tasks/worker-N.md
2. Monitor .hive/status/ to track Worker progress
3. When PRs are ready, have a Worker run code-reviewer subagent
4. Coordinate merges and resolve conflicts

You do NOT write code directly. Focus on coordination and decisions.

Worker management commands:
- hivecode workers up       Start all 4 Workers
- hivecode workers down     Stop all Workers
- hivecode workers restart N  Restart a specific Worker
- hivecode dashboard        Monitor Workers in TUI
- hivecode status           Show Worker status

Workers are persistent and maintain context. Assign tasks based on:
- Current workload and expertise
- Task dependencies
- Code review needs (1-2 Workers can review others)

Start by reading .hive/assignment.md to understand the current task allocation.
</hive-role>
EOF
    exit 0
fi

exit 0
`;

  writeFileSync(hookScript, hookContent, { mode: 0o755 });
  console.log('  ✓ Created hook script');

  // 4. Create/update .claude/settings.json
  const settingsFile = join(config.projectRoot, '.claude', 'settings.json');
  if (existsSync(settingsFile)) {
    const content = readFileSync(settingsFile, 'utf-8');
    if (content.includes('inject-hive-role.sh')) {
      console.log('  ✓ Hook already configured in settings.json');
    } else {
      console.log('\x1b[33m  ⚠️  settings.json exists but hook not configured\x1b[0m');
      console.log('     Please add the hook manually or backup and re-run init');
    }
  } else {
    const settings = {
      hooks: {
        SessionStart: [
          {
            matcher: 'startup',
            hooks: [
              {
                type: 'command',
                command: '"$CLAUDE_PROJECT_DIR/.claude/hooks/inject-hive-role.sh"',
                statusMessage: 'Loading Hive role...',
              },
            ],
          },
        ],
      },
    };
    writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    console.log('  ✓ Created .claude/settings.json with hook');
  }

  // 5. Create sample task files
  for (let i = 1; i <= 2; i++) {
    const taskFile = join(config.hiveDir, 'tasks', `worker-${i}.md`);
    if (!existsSync(taskFile)) {
      const taskContent = `---
branch: feature/worker-${i}-task
on_complete: wait
---

# Worker-${i} Task

## Objective

Describe the task here.

## Tasks

1. Task 1
2. Task 2

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
`;
      writeFileSync(taskFile, taskContent);
    }
  }
  console.log('  ✓ Created sample task files');

  // 6. Create assignment.md if not exists
  const assignmentFile = join(config.hiveDir, 'assignment.md');
  if (!existsSync(assignmentFile)) {
    const assignmentContent = `# Task Assignment

## Overview

Describe the overall task here.

## Workers

| Worker | Task | Branch |
|--------|------|--------|
| Worker-1 | Task description | \`feature/task-1\` |
| Worker-2 | Task description | \`feature/task-2\` |
| Worker-3 | (idle) | — |
| Worker-4 | Code Review | \`review/*\` |

## Acceptance Criteria

1. All tests pass
2. Code reviewed
`;
    writeFileSync(assignmentFile, assignmentContent);
    console.log('  ✓ Created .hive/assignment.md');
  }

  console.log('');
  console.log('\x1b[32m✅ HiveCode initialized!\x1b[0m');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Edit .hive/assignment.md with your task plan');
  console.log('  2. Edit .hive/tasks/worker-*.md with specific tasks');
  console.log('  3. Run \'hivecode\' to start Queen');
  console.log('  4. Run \'hivecode workers up\' to start Workers');
  console.log('  5. Run \'hivecode dashboard\' to monitor');
}

// Parse and execute
program.parse();
