# HiveCode

English | [中文](./README.zh.md)

A workflow system that enables multiple Claude Code instances to work in true parallel, using Queen/Worker architecture with Git worktree isolation.

## What is HiveCode?

HiveCode is a multi-instance Claude Code collaboration system. Instead of serial sub-agents sharing one context, HiveCode launches **independent Claude processes** in isolated Git worktrees, coordinated through a file-based communication protocol.

```
+-------------------------------------------------------------+
|  Queen (Coordinator)                                        |
|  - Creates plans, assigns tasks                             |
|  - Monitors progress, coordinates merges                    |
|  - Never writes code directly                               |
+-------------------------------------------------------------+
|  Worker 1        Worker 2        Worker 3                   |
|  +---------+    +---------+    +---------+                  |
|  | claude  |    | claude  |    | claude  |                  |
|  | process |    | process |    | process |                  |
|  +---------+    +---------+    +---------+                  |
|  Own worktree   Own worktree   Own worktree                 |
+-------------------------------------------------------------+
```

## Quick Start

```bash
npm install -g hivecode

# Embedded layout: Queen + Dashboard side by side
hivecode embedded

# Traditional: separate windows
hivecode              # Start Queen
hivecode workers up   # Start 4 Workers
hivecode dashboard    # TUI monitoring panel
hivecode status       # View status
hivecode stop --all   # Stop everything
```

## Architecture

### File-based Communication

```
.hive/
├── tasks/           # Queen assigns tasks here
│   ├── worker-1.md  # Task description for Worker 1
│   ├── worker-2.md
│   └── worker-3.md
├── status/          # Workers report status here
│   ├── worker-1.json
│   ├── worker-2.json
│   └── worker-3.json
└── assignment.md    # Task allocation plan
```

### Git Worktree Isolation

Each Worker operates in its own Git worktree, providing physical code isolation with no conflicts between parallel tasks.

```
~/project/main/              # Main repository (Queen)
~/project/.worktrees/
├── worker-1/                # Worker 1's isolated workspace
├── worker-2/                # Worker 2's isolated workspace
└── worker-3/                # Worker 3's isolated workspace
```

## Embedded Layout Keybindings

| Key (prefix `Ctrl+b`) | Action |
|------------------------|--------|
| `h` | Focus Queen (left) |
| `l` | Focus Dashboard (right) |
| `1-4` | Attach to Worker 1-4 |
| `D` | Toggle fullscreen |
| `d` | Detach (run in background) |
| `b` | Return to embedded session (from Worker) |

<details>
<summary><strong>How It Compares to Sub-agents</strong></summary>

| Feature | Sub-agents (Task tool) | HiveCode |
|---------|----------------------|----------|
| Execution | Serial sub-agents | True parallel processes |
| Context | Shared session context | Independent contexts |
| Code isolation | Same working directory | Git worktree isolation |
| Visibility | Tool call results | Real-time split panes |
| Use case | Exploration, research | Independent feature development |

</details>

## License

MIT
