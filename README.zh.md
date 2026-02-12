# HiveCode

[English](./README.md) | 中文

一个让多个 Claude Code 实例真正并行工作的工作流系统，采用 Queen/Worker 架构与 Git worktree 隔离。

## 什么是 HiveCode？

HiveCode 是一个多实例 Claude Code 协作系统。不同于共享上下文的串行子代理，HiveCode 在隔离的 Git worktree 中启动**独立的 Claude 进程**，通过基于文件的通信协议进行协调。

```
+-------------------------------------------------------------+
|  Queen（协调者）                                              |
|  - 制定计划、分配任务                                          |
|  - 监控进度、协调合并                                          |
|  - 不直接编写代码                                              |
+-------------------------------------------------------------+
|  Worker 1        Worker 2        Worker 3                   |
|  +---------+    +---------+    +---------+                  |
|  | claude  |    | claude  |    | claude  |                  |
|  | process |    | process |    | process |                  |
|  +---------+    +---------+    +---------+                  |
|  独立 worktree   独立 worktree   独立 worktree                |
+-------------------------------------------------------------+
```

## 快速开始

```bash
npm install -g hivecode

# 嵌入式布局：Queen + Dashboard 并排显示
hivecode embedded

# 传统模式：独立窗口
hivecode              # 启动 Queen
hivecode workers up   # 启动 4 个 Worker
hivecode dashboard    # TUI 监控面板
hivecode status       # 查看状态
hivecode stop --all   # 停止所有进程
```

## 架构

### 基于文件的通信

```
.hive/
├── tasks/           # Queen 在此分配任务
│   ├── worker-1.md  # Worker 1 的任务描述
│   ├── worker-2.md
│   └── worker-3.md
├── status/          # Worker 在此报告状态
│   ├── worker-1.json
│   ├── worker-2.json
│   └── worker-3.json
└── assignment.md    # 任务分配计划
```

### Git Worktree 隔离

每个 Worker 在独立的 Git worktree 中工作，提供物理级别的代码隔离，并行任务之间不会产生冲突。

```
~/project/main/              # 主仓库（Queen）
~/project/.worktrees/
├── worker-1/                # Worker 1 的隔离工作区
├── worker-2/                # Worker 2 的隔离工作区
└── worker-3/                # Worker 3 的隔离工作区
```

## 嵌入式布局快捷键

| 按键（前缀 `Ctrl+b`） | 功能 |
|------------------------|------|
| `h` | 聚焦 Queen（左侧） |
| `l` | 聚焦 Dashboard（右侧） |
| `1-4` | 切换到 Worker 1-4 |
| `D` | 全屏切换 |
| `d` | 分离（后台运行） |
| `b` | 返回嵌入式会话（从 Worker） |

<details>
<summary><strong>与子代理的对比</strong></summary>

| 特性 | 子代理（Task 工具） | HiveCode |
|------|---------------------|----------|
| 执行方式 | 串行子代理 | 真正的并行进程 |
| 上下文 | 共享会话上下文 | 独立上下文 |
| 代码隔离 | 相同工作目录 | Git worktree 隔离 |
| 可见性 | 工具调用结果 | 实时分屏面板 |
| 适用场景 | 探索、调研 | 独立功能开发 |

</details>

## 许可证

MIT
