/**
 * HiveCode Theme System
 *
 * Provides automatic terminal theme detection with manual override support.
 *
 * Priority order:
 * 1. CLI argument --theme light|dark (highest)
 * 2. Environment variable HIVECODE_THEME
 * 3. Project config .hive/config.json
 * 4. Global config ~/.config/hivecode/config.json
 * 5. Terminal background detection (COLORFGBG)
 * 6. Default: dark theme (lowest)
 */

import type { Theme, ThemeMode } from './types.js';
import { darkTheme, lightTheme } from './colors.js';
import { getMergedConfig } from '../config.js';

export type { Theme, ThemeMode, TmuxColors, InkColors, InkColorName } from './types.js';
export { darkTheme, lightTheme } from './colors.js';

// Module-level state for current theme
let currentTheme: Theme = darkTheme;

/**
 * Detect terminal theme based on environment variables
 *
 * Uses COLORFGBG which is set by many terminals (vim, tmux, etc.)
 * Format: "foreground;background" or "fg;bg;cursor"
 * Background value: 0-6 = dark colors, 7-15 = light colors
 */
function detectTerminalTheme(): ThemeMode {
  // Method 1: COLORFGBG environment variable
  const colorfgbg = process.env.COLORFGBG;
  if (colorfgbg) {
    const parts = colorfgbg.split(';');
    // Background is usually the second value, or last if there's a cursor color
    const bg = parseInt(parts[1] || parts[parts.length - 1], 10);
    if (!isNaN(bg)) {
      // ANSI colors 0-6 are dark, 7-15 are light
      // 0=black, 1=red, 2=green, 3=yellow, 4=blue, 5=magenta, 6=cyan
      // 7=white, 8=bright black, 9-15=bright colors
      return bg >= 7 ? 'light' : 'dark';
    }
  }

  // Method 2: Terminal-specific detection
  const termProgram = process.env.TERM_PROGRAM;

  // macOS Terminal.app defaults to light theme
  if (termProgram === 'Apple_Terminal') {
    return 'light';
  }

  // iTerm2 and Ghostty often use dark themes, but we can't reliably detect
  // Default to dark which is more common among developers
  return 'dark';
}

/**
 * Initialize the theme system
 *
 * @param override - Optional theme mode override (from CLI --theme flag)
 * @param projectRoot - Optional project root for reading local config
 * @returns The initialized theme
 */
export function initTheme(override?: ThemeMode, projectRoot?: string): Theme {
  // Priority: CLI override > env var > config > auto-detection > default
  let mode: ThemeMode;

  if (override) {
    // 1. CLI argument (highest priority)
    mode = override;
  } else if (process.env.HIVECODE_THEME === 'light' || process.env.HIVECODE_THEME === 'dark') {
    // 2. Environment variable
    mode = process.env.HIVECODE_THEME;
  } else {
    // 3. Config file (local overrides global)
    const config = getMergedConfig(projectRoot);
    if (config.theme === 'light' || config.theme === 'dark') {
      mode = config.theme;
    } else if (config.theme === 'auto' || !config.theme) {
      // 4. Auto-detection
      mode = detectTerminalTheme();
    } else {
      mode = detectTerminalTheme();
    }
  }

  currentTheme = mode === 'light' ? lightTheme : darkTheme;
  return currentTheme;
}

/**
 * Get the current theme
 *
 * @returns The current theme (defaults to dark if not initialized)
 */
export function getTheme(): Theme {
  return currentTheme;
}

/**
 * Get theme mode as string (for display/debugging)
 */
export function getThemeMode(): ThemeMode {
  return currentTheme.mode;
}
