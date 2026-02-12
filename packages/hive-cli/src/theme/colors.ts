/**
 * Color definitions for HiveCode themes
 *
 * Dark theme: Optimized for dark terminal backgrounds
 * Light theme: Optimized for light terminal backgrounds
 */

import type { Theme } from './types.js';

/**
 * Dark theme - default for most terminals
 *
 * Uses bright colors that stand out against dark backgrounds:
 * - Amber/gold brand color for HiveCode identity
 * - Green for success/active states
 * - Standard semantic colors for status indicators
 */
export const darkTheme: Theme = {
  mode: 'dark',
  tmux: {
    statusBg: '#1e1e1e',
    statusFg: '#ffffff',
    brand: '#ffc107',       // Amber - honey gold
    borderActive: '#ffc107',
    borderInactive: '#444444',
    gitBranch: '#2196f3',   // Blue
    success: '#4caf50',     // Green
    warning: '#ff9800',     // Orange
    error: '#f44336',       // Red
    textSecondary: '#888888',
    textDim: '#666666',
  },
  ink: {
    brand: 'yellow',
    border: 'green',
    borderInactive: 'gray',
    text: 'white',
    textDim: 'gray',
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'cyan',
  },
};

/**
 * Light theme - for terminals with light backgrounds
 *
 * Uses darker, more saturated colors for readability:
 * - Dark amber brand color (visible on white)
 * - Darker variants of semantic colors
 * - High contrast text colors
 */
export const lightTheme: Theme = {
  mode: 'light',
  tmux: {
    statusBg: '#f5f5f5',
    statusFg: '#1e1e1e',
    brand: '#b8860b',       // DarkGoldenrod - visible on light bg
    borderActive: '#b8860b',
    borderInactive: '#cccccc',
    gitBranch: '#1565c0',   // Dark Blue
    success: '#2e7d32',     // Dark Green
    warning: '#e65100',     // Dark Orange
    error: '#c62828',       // Dark Red
    textSecondary: '#555555',
    textDim: '#888888',
  },
  ink: {
    brand: 'yellowBright',  // Brighter yellow for light bg
    border: 'green',
    borderInactive: 'blackBright',
    text: 'black',
    textDim: 'blackBright',
    success: 'green',
    error: 'red',
    warning: 'yellowBright',
    info: 'cyan',
  },
};
