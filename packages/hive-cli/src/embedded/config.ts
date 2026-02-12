/**
 * HiveCode tmux Configuration
 *
 * Applies optimized tmux settings for the best HiveCode experience:
 * - Mouse support with natural scrolling
 * - System clipboard integration
 * - HiveCode-branded status bar with theme support
 * - True color support
 */

import { execSync } from 'node:child_process';
import { platform } from 'node:os';
import { getTheme } from '../theme/index.js';

/**
 * Apply HiveCode tmux configuration to a session
 */
export function applyTmuxConfig(sessionName: string): void {
  const isMac = platform() === 'darwin';

  // Helper to run tmux set-option
  const setOption = (option: string, value: string) => {
    try {
      execSync(`tmux set-option -t "${sessionName}" ${option} ${value}`, { stdio: 'ignore' });
    } catch {
      // Ignore errors for unsupported options
    }
  };

  // Helper to run tmux set-option -g (global)
  const setGlobal = (option: string, value: string) => {
    try {
      execSync(`tmux set-option -g ${option} ${value}`, { stdio: 'ignore' });
    } catch {
      // Ignore errors
    }
  };

  // === Mouse Support ===
  setOption('mouse', 'on');

  // Let terminal apps handle their own scrolling (vim, less, etc.)
  try {
    execSync(`tmux set-option -ga terminal-overrides ',xterm*:smcup@:rmcup@'`, { stdio: 'ignore' });
  } catch {}

  // === Clipboard Integration ===
  setGlobal('set-clipboard', 'on');

  if (isMac) {
    // macOS: Use pbcopy/pbpaste for system clipboard
    try {
      // Copy on mouse selection
      execSync(
        `tmux bind-key -T copy-mode MouseDragEnd1Pane send-keys -X copy-pipe-and-cancel "pbcopy"`,
        { stdio: 'ignore' }
      );
      // Copy with 'y' in copy mode
      execSync(
        `tmux bind-key -T copy-mode-vi y send-keys -X copy-pipe-and-cancel "pbcopy"`,
        { stdio: 'ignore' }
      );
    } catch {}
  }

  // === Status Bar (HiveCode Branding) ===
  const theme = getTheme();

  setOption('status', 'on');
  setOption('status-position', 'top');
  setOption('status-interval', '1');

  // Status bar colors (themed)
  setOption('status-style', `"bg=${theme.tmux.statusBg},fg=${theme.tmux.statusFg}"`);

  // Left side: HiveCode branding + session name
  setOption(
    'status-left',
    `"#[fg=${theme.tmux.brand},bold]🐝 HiveCode#[default] | #[fg=${theme.tmux.success}]#S#[default] "`
  );
  setOption('status-left-length', '40');

  // Right side: HiveCode mode hint + git branch + time
  // Shows [^\]mode hint so users know how to enter HiveCode mode
  const gitBranchCmd = 'git -C #{pane_current_path} branch --show-current 2>/dev/null || echo ""';
  setOption(
    'status-right',
    `"#[fg=${theme.tmux.textDim}][^\\\\]mode#[default] #[fg=${theme.tmux.gitBranch}]#(${gitBranchCmd})#[default] #[fg=${theme.tmux.textSecondary}]%H:%M#[default] "`
  );
  setOption('status-right-length', '60');

  // === Pane Borders ===
  setOption('pane-border-style', `"fg=${theme.tmux.borderInactive}"`);
  setOption('pane-active-border-style', `"fg=${theme.tmux.borderActive}"`);
  setOption('pane-border-status', 'top');
  setOption('pane-border-format', '" #{pane_title} "');

  // === Window/Terminal Settings ===
  setGlobal('set-titles', 'on');
  setGlobal('set-titles-string', '"🐝 HiveCode - #S"');

  // === Performance ===
  setGlobal('escape-time', '0');
  setGlobal('history-limit', '50000');

  // === True Color Support ===
  setGlobal('default-terminal', '"xterm-256color"');
  try {
    execSync(`tmux set-option -ga terminal-overrides ",xterm-256color:Tc"`, { stdio: 'ignore' });
  } catch {}

  // === Focus Events (for vim, etc.) ===
  setGlobal('focus-events', 'on');
}

/**
 * Generate a tmux config file that users can source.
 * Uses the current theme colors.
 */
export function generateTmuxConfigFile(): string {
  const theme = getTheme();

  return `# HiveCode tmux configuration
# Source this file: tmux source-file ~/.config/hivecode/tmux.conf
# Or add to ~/.tmux.conf: source-file ~/.config/hivecode/tmux.conf
#
# Theme: ${theme.mode}

# === Mouse Support ===
set -g mouse on
set -ga terminal-overrides ',xterm*:smcup@:rmcup@'

# === Clipboard Integration (macOS) ===
set -g set-clipboard on
bind-key -T copy-mode MouseDragEnd1Pane send-keys -X copy-pipe-and-cancel "pbcopy"
bind-key -T copy-mode-vi y send-keys -X copy-pipe-and-cancel "pbcopy"

# === Status Bar (HiveCode Branding) ===
set -g status on
set -g status-position top
set -g status-interval 1
set -g status-style 'bg=${theme.tmux.statusBg},fg=${theme.tmux.statusFg}'
set -g status-left '#[fg=${theme.tmux.brand},bold]🐝 HiveCode#[default] | #[fg=${theme.tmux.success}]#S#[default] '
set -g status-left-length 40
set -g status-right '#[fg=${theme.tmux.textDim}][^\\]mode#[default] #[fg=${theme.tmux.gitBranch}]#(git -C #{pane_current_path} branch --show-current 2>/dev/null)#[default] #[fg=${theme.tmux.textSecondary}]%H:%M#[default] '
set -g status-right-length 60

# === Pane Borders ===
set -g pane-border-style 'fg=${theme.tmux.borderInactive}'
set -g pane-active-border-style 'fg=${theme.tmux.borderActive}'
set -g pane-border-status top
set -g pane-border-format ' #{pane_title} '

# === Window/Terminal Settings ===
set -g set-titles on
set -g set-titles-string '🐝 HiveCode - #S'

# === Performance ===
set -g escape-time 0
set -g history-limit 50000

# === True Color Support ===
set -g default-terminal 'xterm-256color'
set -ga terminal-overrides ',xterm-256color:Tc'

# === Focus Events ===
set -g focus-events on
`;
}
