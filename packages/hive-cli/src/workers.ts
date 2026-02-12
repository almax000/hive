/**
 * Worker management module
 *
 * Manages 4 fixed Workers as independent detached tmux sessions.
 * Workers are long-lived and maintain context across sessions.
 */

import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';

export interface WorkerStatus {
  status: 'idle' | 'coding' | 'testing' | 'reviewing' | 'ready_for_review' | 'approved';
  branch?: string;
  current?: string;
  percent?: number;
  subagent?: {
    name: string;
    status: 'running' | 'passed' | 'failed';
    message?: string;
  };
}

export interface WorkerInfo {
  id: number;
  sessionName: string;
  worktreePath: string;
  logPath: string;
  running: boolean;
  status?: WorkerStatus;
}

const WORKER_COUNT = 4;
const LOG_DIR = '/tmp';

/**
 * Get project configuration from current directory
 */
export function getProjectConfig() {
  const projectRoot = process.cwd();
  const projectName = basename(projectRoot);
  const hiveDir = join(projectRoot, '.hive');
  const worktreeBase = join(dirname(projectRoot), '.worktrees', projectName);

  return {
    projectRoot,
    projectName,
    hiveDir,
    worktreeBase,
  };
}

/**
 * Get session name for a worker
 */
export function getWorkerSessionName(projectName: string, workerId: number): string {
  return `hive-${projectName}-worker-${workerId}`;
}

/**
 * Get log file path for a worker
 */
export function getWorkerLogPath(projectName: string, workerId: number): string {
  return join(LOG_DIR, `hive-${projectName}-worker-${workerId}.log`);
}

/**
 * Check if a tmux session exists
 */
export function sessionExists(sessionName: string): boolean {
  try {
    execSync(`tmux has-session -t "${sessionName}" 2>/dev/null`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get worktree path for a worker
 */
export function getWorktreePath(worktreeBase: string, workerId: number): string {
  return join(worktreeBase, `worker-${workerId}`);
}

/**
 * Create worktree for a worker if it doesn't exist
 */
export function createWorktree(
  projectRoot: string,
  worktreeBase: string,
  workerId: number,
  branch?: string
): string {
  const worktreePath = getWorktreePath(worktreeBase, workerId);

  // Create worktree base directory if needed
  if (!existsSync(worktreeBase)) {
    mkdirSync(worktreeBase, { recursive: true });
  }

  // If worktree already exists, return it
  if (existsSync(worktreePath)) {
    return worktreePath;
  }

  // Create worktree with a workspace branch
  const workspaceBranch = branch || `worker-${workerId}-workspace`;
  try {
    execSync(
      `git worktree add "${worktreePath}" -b "${workspaceBranch}" 2>/dev/null || git worktree add "${worktreePath}" "${workspaceBranch}" 2>/dev/null || true`,
      { cwd: projectRoot, stdio: 'ignore' }
    );
  } catch {
    // Worktree creation failed, use project root
    return projectRoot;
  }

  return existsSync(worktreePath) ? worktreePath : projectRoot;
}

/**
 * Read worker status from status file
 */
export function readWorkerStatus(hiveDir: string, workerId: number): WorkerStatus | undefined {
  const statusFile = join(hiveDir, 'status', `worker-${workerId}.json`);
  if (!existsSync(statusFile)) {
    return undefined;
  }
  try {
    const content = readFileSync(statusFile, 'utf-8');
    return JSON.parse(content) as WorkerStatus;
  } catch {
    return undefined;
  }
}

/**
 * Get information about all workers
 */
export function getWorkersInfo(): WorkerInfo[] {
  const config = getProjectConfig();
  const workers: WorkerInfo[] = [];

  for (let i = 1; i <= WORKER_COUNT; i++) {
    const sessionName = getWorkerSessionName(config.projectName, i);
    const worktreePath = getWorktreePath(config.worktreeBase, i);
    const logPath = getWorkerLogPath(config.projectName, i);
    const running = sessionExists(sessionName);
    const status = readWorkerStatus(config.hiveDir, i);

    workers.push({
      id: i,
      sessionName,
      worktreePath,
      logPath,
      running,
      status,
    });
  }

  return workers;
}

/**
 * Start a single worker
 */
export function startWorker(workerId: number): boolean {
  const config = getProjectConfig();
  const sessionName = getWorkerSessionName(config.projectName, workerId);

  // Skip if already running
  if (sessionExists(sessionName)) {
    console.log(`  Worker-${workerId} already running`);
    return true;
  }

  // Create worktree
  const worktreePath = createWorktree(
    config.projectRoot,
    config.worktreeBase,
    workerId
  );

  // Create log file
  const logPath = getWorkerLogPath(config.projectName, workerId);
  writeFileSync(logPath, '', { flag: 'w' });

  try {
    // Create detached tmux session
    execSync(
      `tmux new-session -d -s "${sessionName}" -c "${worktreePath}"`,
      { stdio: 'ignore' }
    );

    // Enable logging via pipe-pane
    execSync(
      `tmux pipe-pane -t "${sessionName}" "cat >> ${logPath}"`,
      { stdio: 'ignore' }
    );

    // Configure tmux options
    execSync(`tmux set-option -t "${sessionName}" mouse on`, { stdio: 'ignore' });

    // Start Claude Code
    execSync(
      `tmux send-keys -t "${sessionName}" "claude --dangerously-skip-permissions" Enter`,
      { stdio: 'ignore' }
    );

    console.log(`  Worker-${workerId} started (${sessionName})`);
    return true;
  } catch (error) {
    console.error(`  Failed to start Worker-${workerId}: ${error}`);
    return false;
  }
}

/**
 * Start all workers (hivecode workers up)
 */
export function startAllWorkers(): void {
  const config = getProjectConfig();

  console.log(`\x1b[34m🐝 Starting HiveCode Workers\x1b[0m`);
  console.log(`   Project: ${config.projectName}`);
  console.log('');

  // Ensure .hive directories exist
  mkdirSync(join(config.hiveDir, 'tasks'), { recursive: true });
  mkdirSync(join(config.hiveDir, 'status'), { recursive: true });

  let started = 0;
  for (let i = 1; i <= WORKER_COUNT; i++) {
    if (startWorker(i)) {
      started++;
    }
  }

  console.log('');
  console.log(`\x1b[32m✅ ${started}/${WORKER_COUNT} Workers ready\x1b[0m`);
  console.log('');
  console.log('Workers are running in detached tmux sessions.');
  console.log('Use `hivecode dashboard` to monitor them.');
}

/**
 * Stop a single worker (keep session, just send /exit)
 */
export function stopWorker(workerId: number): boolean {
  const config = getProjectConfig();
  const sessionName = getWorkerSessionName(config.projectName, workerId);

  if (!sessionExists(sessionName)) {
    console.log(`  Worker-${workerId} not running`);
    return false;
  }

  try {
    // Send /exit command to Claude
    execSync(`tmux send-keys -t "${sessionName}" "/exit" Enter`, { stdio: 'ignore' });
    console.log(`  Worker-${workerId} stopping...`);
    return true;
  } catch (error) {
    console.error(`  Failed to stop Worker-${workerId}: ${error}`);
    return false;
  }
}

/**
 * Stop all workers (hivecode workers down)
 */
export function stopAllWorkers(): void {
  console.log(`\x1b[34m🐝 Stopping HiveCode Workers\x1b[0m`);
  console.log('');

  for (let i = 1; i <= WORKER_COUNT; i++) {
    stopWorker(i);
  }

  console.log('');
  console.log('\x1b[32m✅ Stop commands sent\x1b[0m');
  console.log('   Workers will exit gracefully.');
}

/**
 * Kill a worker session completely (for restart)
 */
export function killWorker(workerId: number): boolean {
  const config = getProjectConfig();
  const sessionName = getWorkerSessionName(config.projectName, workerId);

  if (!sessionExists(sessionName)) {
    return true; // Already not running
  }

  try {
    execSync(`tmux kill-session -t "${sessionName}"`, { stdio: 'ignore' });
    console.log(`  Worker-${workerId} killed`);
    return true;
  } catch (error) {
    console.error(`  Failed to kill Worker-${workerId}: ${error}`);
    return false;
  }
}

/**
 * Restart a specific worker (hivecode workers restart N)
 */
export function restartWorker(workerId: number): void {
  if (workerId < 1 || workerId > WORKER_COUNT) {
    console.error(`\x1b[31mError: Worker ID must be 1-${WORKER_COUNT}\x1b[0m`);
    return;
  }

  console.log(`\x1b[34m🐝 Restarting Worker-${workerId}\x1b[0m`);
  console.log('');

  killWorker(workerId);

  // Wait a moment for cleanup
  execSync('sleep 1');

  startWorker(workerId);

  console.log('');
  console.log(`\x1b[32m✅ Worker-${workerId} restarted\x1b[0m`);
}

/**
 * Kill all worker sessions
 */
export function killAllWorkers(): void {
  console.log(`\x1b[34m🐝 Killing all HiveCode Workers\x1b[0m`);
  console.log('');

  for (let i = 1; i <= WORKER_COUNT; i++) {
    killWorker(i);
  }

  console.log('');
  console.log('\x1b[32m✅ All Workers killed\x1b[0m');
}

/**
 * List worker status (hivecode workers list / hivecode status)
 */
export function listWorkers(): void {
  const config = getProjectConfig();
  const workers = getWorkersInfo();

  console.log(`\x1b[34m🐝 HiveCode Workers\x1b[0m`);
  console.log(`   Project: ${config.projectName}`);
  console.log('');

  for (const worker of workers) {
    const statusIcon = worker.running ? '\x1b[32m●\x1b[0m' : '\x1b[90m○\x1b[0m';
    const statusText = worker.running ? 'running' : 'stopped';
    const workerStatus = worker.status?.status || 'unknown';
    const branch = worker.status?.branch || '-';

    console.log(`  ${statusIcon} Worker-${worker.id}  ${statusText.padEnd(8)}  ${workerStatus.padEnd(12)}  ${branch}`);

    if (worker.status?.subagent) {
      const sa = worker.status.subagent;
      console.log(`      └─ [${sa.name}] ${sa.status}: ${sa.message || ''}`);
    }
  }

  console.log('');
}

/**
 * Attach to a worker session
 */
export function attachWorker(workerId: number): void {
  const config = getProjectConfig();
  const sessionName = getWorkerSessionName(config.projectName, workerId);

  if (!sessionExists(sessionName)) {
    console.error(`\x1b[31mWorker-${workerId} is not running\x1b[0m`);
    return;
  }

  // Use spawn with inherit to hand over control to tmux
  const tmux = spawn('tmux', ['attach', '-t', sessionName], {
    stdio: 'inherit',
  });

  tmux.on('error', (err) => {
    console.error(`Failed to attach: ${err.message}`);
  });
}

/**
 * Send initial prompt to a worker
 */
export function sendWorkerPrompt(workerId: number): void {
  const config = getProjectConfig();
  const sessionName = getWorkerSessionName(config.projectName, workerId);

  if (!sessionExists(sessionName)) {
    console.error(`Worker-${workerId} is not running`);
    return;
  }

  const prompt = `Read .hive/tasks/worker-${workerId}.md for your task, then start working. Update .hive/status/worker-${workerId}.json when done.`;

  try {
    execSync(`tmux send-keys -t "${sessionName}" "${prompt}" Enter`, { stdio: 'ignore' });
    console.log(`  Prompt sent to Worker-${workerId}`);
  } catch (error) {
    console.error(`  Failed to send prompt to Worker-${workerId}: ${error}`);
  }
}

/**
 * Send prompts to all running workers
 */
export function sendAllWorkerPrompts(): void {
  console.log(`\x1b[34m🐝 Sending prompts to Workers\x1b[0m`);
  console.log('');

  for (let i = 1; i <= WORKER_COUNT; i++) {
    const config = getProjectConfig();
    const sessionName = getWorkerSessionName(config.projectName, i);
    if (sessionExists(sessionName)) {
      sendWorkerPrompt(i);
    }
  }

  console.log('');
  console.log('\x1b[32m✅ Prompts sent\x1b[0m');
}
