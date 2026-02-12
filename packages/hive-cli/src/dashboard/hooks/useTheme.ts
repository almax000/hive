/**
 * Theme hook for Ink components
 *
 * Provides access to the current theme's Ink colors.
 */

import { getTheme, type InkColors } from '../../theme/index.js';

/**
 * Get the current Ink color palette
 *
 * This hook returns the Ink-specific colors from the current theme.
 * Use this in components to get theme-aware colors.
 *
 * @example
 * ```tsx
 * const colors = useTheme();
 * <Text color={colors.brand}>HiveCode</Text>
 * ```
 */
export function useTheme(): InkColors {
  return getTheme().ink;
}
