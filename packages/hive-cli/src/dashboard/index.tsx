/**
 * Dashboard entry point
 *
 * Renders the TUI dashboard using Ink.
 * Supports both standalone and embedded modes.
 */

import React from 'react';
import { render } from 'ink';
import { App } from './App.js';
import { basename } from 'node:path';

interface DashboardOptions {
  projectName?: string;
  embedded?: boolean;
}

export function startDashboard(options: DashboardOptions | string = {}): void {
  // Handle legacy string argument
  const opts = typeof options === 'string' ? { projectName: options } : options;
  const name = opts.projectName || basename(process.cwd());
  const embedded = opts.embedded || false;

  const { waitUntilExit } = render(<App projectName={name} embedded={embedded} />);

  waitUntilExit().catch(() => {
    // Exit gracefully
  });
}
