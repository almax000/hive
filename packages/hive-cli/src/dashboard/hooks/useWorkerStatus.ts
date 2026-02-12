/**
 * useWorkerStatus hook
 *
 * Polls worker status files and returns current worker info.
 */

import { useState, useEffect } from 'react';
import { getWorkersInfo, type WorkerInfo } from '../../workers.js';

const POLL_INTERVAL = 1000; // 1 second

export function useWorkerStatus(projectName: string): WorkerInfo[] {
  const [workers, setWorkers] = useState<WorkerInfo[]>(() => getWorkersInfo());

  useEffect(() => {
    const interval = setInterval(() => {
      setWorkers(getWorkersInfo());
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [projectName]);

  return workers;
}
