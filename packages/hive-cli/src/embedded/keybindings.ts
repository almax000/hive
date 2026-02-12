/**
 * HiveCode tmux Keybindings
 *
 * Two keybinding systems:
 *
 * 1. HiveCode Mode (Ctrl+\):
 *    - Press Ctrl+\ to enter HiveCode mode
 *    - Single-key commands: w (toggle), 1-4 (workers), Esc (exit)
 *    - Status bar shows available commands
 *    - Auto-exits after action or timeout
 *
 * 2. tmux Prefix (Ctrl+b):
 *    - h/l: Navigate between Queen and Dashboard
 *    - 1-4: Quick attach to Workers
 *    - D: Toggle fullscreen
 *    - d: Detach (standard tmux)
 */

import { execSync } from 'node:child_process';
import { getTheme } from '../theme/index.js';

/**
 * Generate status bar content strings based on current theme
 */
function getStatusBarStrings() {
  const theme = getTheme();

  const normalStatusRight = `"#[fg=${theme.tmux.textDim}][^\\\\]mode#[default] #[fg=${theme.tmux.gitBranch}]#(git -C #{pane_current_path} branch --show-current 2>/dev/null)#[default] #[fg=${theme.tmux.textSecondary}]%H:%M#[default] "`;

  const hiveModeStatusRight = `"#[fg=${theme.tmux.brand},bold]▶#[default] #[fg=${theme.tmux.statusFg}][w]#[fg=${theme.tmux.textSecondary}]toggle #[fg=${theme.tmux.statusFg}][1-4]#[fg=${theme.tmux.textSecondary}]worker #[fg=${theme.tmux.statusFg}][t]#[fg=${theme.tmux.textSecondary}]theme #[fg=${theme.tmux.statusFg}][Esc]#[fg=${theme.tmux.textSecondary}]exit#[default] "`;

  return { normalStatusRight, hiveModeStatusRight };
}

/**
 * Setup HiveCode-specific keybindings
 */
export function setupKeybindings(sessionName: string, projectName: string): void {
  const { normalStatusRight, hiveModeStatusRight } = getStatusBarStrings();

  // Helper to run tmux command
  const run = (cmd: string) => {
    try {
      execSync(cmd, { stdio: 'ignore' });
    } catch {
      // Ignore errors for unsupported bindings
    }
  };

  // Helper to bind a key in prefix table
  const bind = (key: string, command: string) => {
    run(`tmux bind-key -T prefix ${key} ${command}`);
  };

  // Helper to bind a key in hive mode table
  const bindHive = (key: string, command: string) => {
    run(`tmux bind-key -T hive ${key} ${command}`);
  };

  // ============================================================
  // HiveCode Mode (Ctrl+\)
  // ============================================================

  // Ctrl+\ enters HiveCode mode and updates status bar
  // Note: C-\\ is the tmux way to represent Ctrl+\
  run(`tmux bind-key -n C-\\\\ set-option -t "${sessionName}" status-right ${hiveModeStatusRight} \\; switch-client -T hive`);

  // Helper: exit hive mode and restore normal status bar
  const exitHiveMode = `set-option -t "${sessionName}" status-right ${normalStatusRight} \\; switch-client -T root`;

  // w = toggle Dashboard (zoom Queen pane), then exit mode
  bindHive('w', `resize-pane -Z -t "${sessionName}:0.0" \\; ${exitHiveMode}`);

  // 1-4 = attach to Worker, then exit mode
  for (let i = 1; i <= 4; i++) {
    const workerSession = `hive-${projectName}-worker-${i}`;
    bindHive(
      i.toString(),
      `if-shell "tmux has-session -t '${workerSession}' 2>/dev/null" "switch-client -t '${workerSession}'" "display-message 'Worker-${i} not running'" \\; ${exitHiveMode}`
    );
  }

  // q = return to HiveCode (from worker), then exit mode
  bindHive('q', `switch-client -t "${sessionName}" \\; ${exitHiveMode}`);

  // t = toggle theme, then exit mode
  // Runs hivecode theme toggle which updates config and re-applies tmux styling
  bindHive(
    't',
    `run-shell "hivecode theme toggle --session '${sessionName}'" \\; ${exitHiveMode}`
  );

  // Escape = exit mode without action
  bindHive('Escape', exitHiveMode);

  // Any other key = exit mode without action
  // This catches all undefined keys
  run(`tmux bind-key -T hive Any ${exitHiveMode}`);

  // ============================================================
  // tmux Prefix Keybindings (Ctrl+b)
  // ============================================================

  // === Pane Navigation ===
  // h = focus left (Queen)
  bind('h', 'select-pane -L');
  // l = focus right (Dashboard)
  bind('l', 'select-pane -R');

  // === Worker Quick Attach ===
  // 1-4 = attach to Worker 1-4
  for (let i = 1; i <= 4; i++) {
    const workerSession = `hive-${projectName}-worker-${i}`;
    // Use switch-client to attach to worker session
    bind(
      i.toString(),
      `if-shell "tmux has-session -t '${workerSession}' 2>/dev/null" "switch-client -t '${workerSession}'" "display-message 'Worker-${i} not running'"`
    );
  }

  // === Layout Controls ===
  // w = toggle workers panel (zoom Queen pane)
  bind('w', `resize-pane -Z -t "${sessionName}:0.0"`);
  // D = toggle zoom (fullscreen current pane)
  bind('D', 'resize-pane -Z');

  // === Return to Embedded Session ===
  // Bind 'b' to return to embedded session (works from worker sessions)
  bind('b', `switch-client -t "${sessionName}"`);

  // Also set up 'b' binding in each worker session
  for (let i = 1; i <= 4; i++) {
    const workerSession = `hive-${projectName}-worker-${i}`;
    run(`tmux bind-key -T prefix b switch-client -t "${sessionName}" 2>/dev/null || true`);
  }

  // === Quick Commands ===
  // S = show status (runs hivecode status in a popup)
  bind(
    'S',
    `display-popup -E -w 60 -h 20 "hivecode status; echo ''; echo 'Press any key to close'; read -n 1"`
  );

  // R = restart all workers
  bind(
    'R',
    `display-popup -E -w 60 -h 10 "hivecode workers kill && hivecode workers up; echo ''; echo 'Press any key to close'; read -n 1"`
  );
}

/**
 * Display keybindings help
 */
export function getKeybindingsHelp(): string {
  return `
\x1b[33m🐝 HiveCode Keybindings\x1b[0m

\x1b[36mHiveCode Mode (Ctrl+\\):\x1b[0m
  Press Ctrl+\\ to enter HiveCode mode, then:
  w       Toggle Dashboard visibility
  1-4     Attach to Worker 1-4
  t       Toggle theme (light/dark)
  q       Return to HiveCode (from Worker)
  Esc     Exit mode (no action)

\x1b[36mtmux Prefix (Ctrl+b):\x1b[0m
  h       Focus Queen (left pane)
  l       Focus Dashboard (right pane)
  1-4     Attach to Worker 1-4
  b       Return to embedded session
  w       Toggle Dashboard
  D       Toggle fullscreen

\x1b[36mCommands (Ctrl+b prefix):\x1b[0m
  S       Show status popup
  R       Restart all Workers
  d       Detach (keep running)
  ?       Show all keybindings
`;
}
