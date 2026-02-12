/**
 * Theme type definitions for HiveCode
 *
 * Supports both tmux (hex colors) and Ink (ANSI color names) styling.
 */

export type ThemeMode = 'light' | 'dark';

/**
 * Colors for tmux status bar and pane borders.
 * Uses hex color codes.
 */
export interface TmuxColors {
  statusBg: string;
  statusFg: string;
  brand: string;
  borderActive: string;
  borderInactive: string;
  gitBranch: string;
  success: string;
  warning: string;
  error: string;
  textSecondary: string;
  textDim: string;
}

/**
 * Colors for Ink components (dashboard).
 * Uses ANSI color names that Ink/Chalk understand.
 */
export type InkColorName =
  | 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray'
  | 'blackBright' | 'redBright' | 'greenBright' | 'yellowBright' | 'blueBright' | 'magentaBright' | 'cyanBright' | 'whiteBright';

export interface InkColors {
  brand: InkColorName;
  border: InkColorName;
  borderInactive: InkColorName;
  text: InkColorName;
  textDim: InkColorName;
  success: InkColorName;
  error: InkColorName;
  warning: InkColorName;
  info: InkColorName;
}

/**
 * Complete theme definition
 */
export interface Theme {
  mode: ThemeMode;
  tmux: TmuxColors;
  ink: InkColors;
}
