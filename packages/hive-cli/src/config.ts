/**
 * HiveCode Configuration Management
 *
 * Supports two config levels:
 * - Global: ~/.config/hivecode/config.json
 * - Local (project): .hive/config.json
 *
 * Local config overrides global config.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface HiveConfig {
  theme?: 'light' | 'dark' | 'auto';
  // Future config options can be added here
}

const CONFIG_FILENAME = 'config.json';
const GLOBAL_CONFIG_DIR = join(homedir(), '.config', 'hivecode');
const GLOBAL_CONFIG_PATH = join(GLOBAL_CONFIG_DIR, CONFIG_FILENAME);

/**
 * Get the local config path for a project
 */
export function getLocalConfigPath(projectRoot: string): string {
  return join(projectRoot, '.hive', CONFIG_FILENAME);
}

/**
 * Read config from a file
 */
function readConfigFile(path: string): HiveConfig {
  try {
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8');
      return JSON.parse(content) as HiveConfig;
    }
  } catch {
    // Invalid JSON or read error, return empty config
  }
  return {};
}

/**
 * Write config to a file
 */
function writeConfigFile(path: string, config: HiveConfig): void {
  const dir = join(path, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
}

/**
 * Get global config
 */
export function getGlobalConfig(): HiveConfig {
  return readConfigFile(GLOBAL_CONFIG_PATH);
}

/**
 * Get local (project) config
 */
export function getLocalConfig(projectRoot: string): HiveConfig {
  return readConfigFile(getLocalConfigPath(projectRoot));
}

/**
 * Get merged config (local overrides global)
 */
export function getMergedConfig(projectRoot?: string): HiveConfig {
  const global = getGlobalConfig();
  const local = projectRoot ? getLocalConfig(projectRoot) : {};
  return { ...global, ...local };
}

/**
 * Set a config value
 */
export function setConfigValue(
  key: keyof HiveConfig,
  value: string,
  options: { local?: boolean; projectRoot?: string } = {}
): void {
  const path = options.local && options.projectRoot
    ? getLocalConfigPath(options.projectRoot)
    : GLOBAL_CONFIG_PATH;

  const config = readConfigFile(path);

  // Type-safe value assignment
  if (key === 'theme') {
    if (value === 'light' || value === 'dark' || value === 'auto') {
      config.theme = value;
    } else {
      throw new Error(`Invalid theme value: ${value}. Must be 'light', 'dark', or 'auto'.`);
    }
  } else {
    throw new Error(`Unknown config key: ${key}`);
  }

  writeConfigFile(path, config);
}

/**
 * Get a config value
 */
export function getConfigValue(
  key: keyof HiveConfig,
  projectRoot?: string
): string | undefined {
  const config = getMergedConfig(projectRoot);
  return config[key];
}

/**
 * Unset a config value
 */
export function unsetConfigValue(
  key: keyof HiveConfig,
  options: { local?: boolean; projectRoot?: string } = {}
): void {
  const path = options.local && options.projectRoot
    ? getLocalConfigPath(options.projectRoot)
    : GLOBAL_CONFIG_PATH;

  const config = readConfigFile(path);
  delete config[key];
  writeConfigFile(path, config);
}

/**
 * List all config with source information
 */
export function listConfig(projectRoot?: string): Array<{
  key: string;
  value: string;
  source: 'global' | 'local';
}> {
  const global = getGlobalConfig();
  const local = projectRoot ? getLocalConfig(projectRoot) : {};
  const result: Array<{ key: string; value: string; source: 'global' | 'local' }> = [];

  // Add global config
  for (const [key, value] of Object.entries(global)) {
    if (value !== undefined) {
      result.push({ key, value: String(value), source: 'global' });
    }
  }

  // Add/override with local config
  for (const [key, value] of Object.entries(local)) {
    if (value !== undefined) {
      const existing = result.findIndex(r => r.key === key);
      if (existing >= 0) {
        result[existing] = { key, value: String(value), source: 'local' };
      } else {
        result.push({ key, value: String(value), source: 'local' });
      }
    }
  }

  return result;
}

/**
 * Get config file paths for display
 */
export function getConfigPaths(projectRoot?: string): {
  global: string;
  local: string | null;
} {
  return {
    global: GLOBAL_CONFIG_PATH,
    local: projectRoot ? getLocalConfigPath(projectRoot) : null,
  };
}
