# hivecode

Multi-instance parallel Claude Code workflow system.

## Installation

```bash
npm install -g hivecode
```

## Prerequisites

- [tmux](https://github.com/tmux/tmux): `brew install tmux`
- [Claude Code](https://claude.ai/code): `npm install -g @anthropic-ai/claude-code`

## Quick Start: Embedded Layout (Recommended)

The new embedded layout provides the best experience - Queen and Dashboard side-by-side in a single terminal:

```bash
cd your-project
hivecode init       # First time setup
hivecode embedded   # Start everything in one command!
```

```
┌────────────────────────────────────┬─────────────────────┐
│                                    │  ┌───────────────┐  │
│     Claude Code (Queen)            │  │ W1 ● coding   │  │
│     Full native experience         │  │ feature/auth  │  │
│                                    │  ├───────────────┤  │
│     > Your prompt here...          │  │ W2 ◐ testing  │  │
│                                    │  │ feature/api   │  │
│     Claude response...             │  ├───────────────┤  │
│                                    │  │ W3 ○ idle     │  │
│                                    │  │ —             │  │
│          65% width                 │  ├───────────────┤  │
│                                    │  │ W4 ● review   │  │
│                                    │  │ review/auth   │  │
│                                    │  └───────────────┘  │
│                                    │       35% width     │
├────────────────────────────────────┴─────────────────────┤
│  🐝 HiveCode | project-name     [^\]mode  main   22:45  │
└──────────────────────────────────────────────────────────┘
```

**HiveCode Mode** (`Ctrl+\`):
Press `Ctrl+\` to enter HiveCode mode, then single key:
- `w` - Toggle Dashboard visibility
- `1-4` - Attach to Worker
- `Esc` - Exit mode

**tmux Prefix** (`Ctrl+b`):
- `h/l` - Focus left/right pane
- `d` - Detach (keep running in background)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Queen (Coordinator)                                        │
│  - Creates plans, distributes tasks, monitors, coordinates  │
│  - Does NOT write code directly                             │
├─────────────────────────────────────────────────────────────┤
│  Worker 1        Worker 2        Worker 3        Worker 4   │
│  Own claude      Own claude      Own claude      Own claude  │
│  Own worktree    Own worktree    Own worktree    Own worktree│
└─────────────────────────────────────────────────────────────┘
```

**Key Design:**
- **Queen** runs in your terminal (full Claude Code experience)
- **Workers** are 4 fixed, long-lived processes in detached tmux sessions
- **Communication** via `.hive/` directory (task files, status JSON)
- **Workers maintain context** - no need to restart between tasks

## Usage

### Embedded Layout (New!)

```bash
# Start embedded layout (Queen + Dashboard + Workers)
hivecode embedded          # Default: 4 workers, 65% queen width
hivecode e                 # Short alias
hivecode e -w 2            # Start with 2 workers
hivecode e --queen-width 70  # Custom queen width

# Re-attach to existing session
hivecode e --attach
```

### Traditional Separate Windows

```bash
# Initialize HiveCode for a project
cd your-project
hivecode init

# Start Queen (Claude Code with role injection)
hivecode

# In another terminal, start Workers
hivecode workers up       # Start all 4 Workers

# Monitor Workers
hivecode dashboard        # TUI dashboard with live updates
hivecode status           # Text-based status

# Worker management
hivecode workers down     # Stop Workers gracefully
hivecode workers kill     # Force kill all Workers
hivecode workers restart 2  # Restart specific Worker

# Other commands
hivecode attach 1         # Attach to Worker-1 session
hivecode stop --all       # Stop everything
hivecode clean            # Clean worktrees
```

## Dashboard

The TUI dashboard shows real-time status of all Workers:

```
┌────────────────────────────────────────┐
│  🐝 HiveCode        project-name       │
├────────────────────────────────────────┤
│  Worker-1  feature/auth  ● coding      │
│  ──────────────────────────────────    │
│  Writing src/auth.ts                   │
│  ⠋ [lint] Running eslint...            │
├────────────────────────────────────────┤
│  Worker-2  feature/api   ◐ testing     │
│  ──────────────────────────────────    │
│  ✓ [test] 42 tests passed              │
├────────────────────────────────────────┤
│  Worker-3  review/auth   ● reviewing   │
│  ──────────────────────────────────    │
│  ⠋ [code-review] Analyzing...          │
├────────────────────────────────────────┤
│  Worker-4  —             ○ idle        │
│  ──────────────────────────────────    │
│  (waiting for assignment)              │
├────────────────────────────────────────┤
│  main ✓ │ [1-4] attach  [a]ttach [q]uit│
└────────────────────────────────────────┘
```

**Keyboard shortcuts:**
- `1-4` - Attach to specific Worker
- `a` - Attach to first running Worker
- `q` - Quit dashboard

## Workflow

1. **Initialize**: `hivecode init` creates `.hive/` directory and hooks
2. **Plan**: Edit `.hive/assignment.md` with your overall task plan
3. **Distribute**: Create task files in `.hive/tasks/worker-N.md`
4. **Start**: `hivecode embedded` (recommended) or `hivecode` + `hivecode workers up`
5. **Monitor**: Dashboard shows real-time Worker status
6. **Review**: Assign Workers to review each other's code
7. **Merge**: Queen coordinates final merge

## Task File Format

```markdown
# .hive/tasks/worker-1.md
---
branch: feature/my-feature
on_complete: wait
reviewer: worker-4
---

# Task Title

## Objective
Clear description of what to accomplish.

## Tasks
1. Specific task 1
2. Specific task 2

## Acceptance Criteria
- [ ] Tests pass
- [ ] Code reviewed
```

## Status File Format

Workers update `.hive/status/worker-N.json`:

```json
{
  "status": "coding",
  "branch": "feature/my-feature",
  "current": "Implementing login function",
  "percent": 60,
  "subagent": {
    "name": "lint",
    "status": "running",
    "message": "Running eslint..."
  }
}
```

**Status values:**
- `idle` - Waiting for task
- `coding` - Writing code
- `testing` - Running lint/test
- `reviewing` - Reviewing code
- `ready_for_review` - Code complete
- `approved` - Review passed

## Keybindings

HiveCode provides two keybinding systems:

### HiveCode Mode (`Ctrl+\`)

Press `Ctrl+\` to enter HiveCode mode. The status bar will change to show available commands:

```
▶ [w]toggle [1-4]worker [Esc]exit
```

| Key | Action |
|-----|--------|
| `w` | Toggle Dashboard visibility |
| `1-4` | Attach to Worker 1-4 |
| `q` | Return to HiveCode (from Worker) |
| `Esc` | Exit mode (no action) |

After any action, HiveCode mode automatically exits.

### tmux Prefix (`Ctrl+b`)

Standard tmux keybindings also work:

| Key | Action |
|-----|--------|
| `h` | Focus Queen (left pane) |
| `l` | Focus Dashboard (right pane) |
| `1-4` | Attach to Worker |
| `b` | Return to embedded session |
| `w` | Toggle Dashboard |
| `D` | Toggle fullscreen |
| `S` | Show status popup |
| `R` | Restart all Workers |
| `d` | Detach (keep running) |

## tmux Experience

HiveCode automatically configures tmux for the best experience:

- **Mouse support**: Scroll, click, resize panes
- **Clipboard integration**: Copy with mouse selection (automatically copied to system clipboard on macOS)
- **True color support**: Full 24-bit color
- **HiveCode branding**: Amber-themed status bar with git branch info

### Manual tmux Configuration

If you want to apply HiveCode's tmux settings to your own sessions:

```bash
# Copy the config
cp node_modules/hivecode/tmux/hivecode.tmux.conf ~/.config/hivecode/

# Add to your ~/.tmux.conf
source-file ~/.config/hivecode/tmux.conf
```

## Building from Source

```bash
cd packages/hive-cli
npm install
npm run build
```

## License

MIT
