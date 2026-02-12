/**
 * useGitStatus hook
 *
 * Polls git status and returns current branch info.
 */

import { useState, useEffect } from 'react';
import { execSync } from 'node:child_process';

interface GitStatus {
  branch: string;
  clean: boolean;
  ahead?: number;
  behind?: number;
}

const POLL_INTERVAL = 5000; // 5 seconds

function getGitStatus(): GitStatus | null {
  try {
    // Get current branch
    const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();

    // Check if working directory is clean
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    const clean = status.trim() === '';

    // Get ahead/behind counts
    let ahead: number | undefined;
    let behind: number | undefined;
    try {
      const revList = execSync('git rev-list --left-right --count HEAD...@{upstream} 2>/dev/null', {
        encoding: 'utf-8',
      }).trim();
      const [a, b] = revList.split('\t').map(Number);
      ahead = a || 0;
      behind = b || 0;
    } catch {
      // No upstream configured
    }

    return { branch, clean, ahead, behind };
  } catch {
    return null;
  }
}

export function useGitStatus(): GitStatus | null {
  const [status, setStatus] = useState<GitStatus | null>(() => getGitStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getGitStatus());
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return status;
}
