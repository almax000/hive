# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HiveCode is a multi-instance parallel Claude Code workflow system. Through the Queen/Worker pattern, multiple independent Claude processes work in isolated Git worktrees in parallel.

## Architecture

```
+-------------------------------------------------------------+
|  Queen (Coordinator)                                        |
|  - Creates plans, assigns tasks, monitors, coordinates      |
|  - Never writes code directly                               |
+-------------------------------------------------------------+
|  Worker 1        Worker 2        Worker 3                   |
|  Independent     Independent     Independent                |
|  claude process  claude process  claude process              |
|  Own worktree    Own worktree    Own worktree                |
+-------------------------------------------------------------+
```

**Tech stack**:
- Terminal backend: **tmux** (cross-platform)
- Code isolation: Git worktree
- Communication: File system (.hive/ directory)

**Distinction from sub-agents**: Sub-agents are serial, shared context; HiveCode uses true parallel processes with physical isolation.

## Commands

```bash
# Embedded layout (recommended)
hivecode embedded     # Queen + Dashboard side by side
hivecode e            # Shorthand

# Traditional: Separate windows
hivecode              # Start Queen
hivecode workers up   # Start 4 Workers
hivecode dashboard    # TUI monitoring panel
hivecode status       # View status
hivecode stop --all   # Stop all
```

## Key Directories

```
packages/hive-cli/       # Core CLI (TypeScript)
config/layouts/          # Layout configurations

.hive/                   # Runtime communication directory (generated)
├── tasks/               # Queen-assigned tasks (worker-N.md)
├── status/              # Worker status reports (worker-N.json)
└── assignment.md        # Task allocation
```

## Git Workflow

- **Commit messages must be in English**
- **Always ask for user confirmation before pushing**
- Follow conventional commit format: `type(scope): description`
