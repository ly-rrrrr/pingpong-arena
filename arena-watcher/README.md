# Arena Watcher v0.1

面向 pingpong-arena 的 AI 调试基础设施 — 实时采集 App/后端运行时事件，生成结构化 bug incident，通过 MCP 暴露给 Claude Code 进行分析和自动修复。

## 架构

```
Expo App (手机) ──→ Collector (HTTP :4317) ──→ .arena-watch/incidents/
后端 Server ──→ Collector                         │
                                                  ▼
Claude Code ←── MCP Server ←── .arena-watch/
```

## 组件

| 文件 | 作用 |
|---|---|
| `src/collector.ts` | HTTP 服务，接收前后端事件，生成 incident JSON |
| `src/mcp-server.ts` | Claude MCP stdio server，暴露 7 个工具 |
| `src/summarize.ts` | incident 摘要生成 (CLI) |
| `src/run-checks.ts` | pnpm check/lint/test 封装 |

## 使用

### 启动 Collector

```bash
cd pingpong-arena
pnpm arena:watch    # 启动在 :4317
```

### Claude MCP

由 `.mcp.json` 自动注册，Claude Code 启动时连接。

### Claude 命令

```
/arena-debug latest   # 只读分析最新 incident
/arena-fix latest     # 分析 + 修复 + 自动 check/test
/arena-verify         # 回归验证当前状态
```

## MCP 工具

| 工具 | 描述 |
|---|---|
| `arena_latest_incident` | 获取最新 bug 摘要（timeline, errors, suspect files） |
| `arena_read_incident(id)` | 读取完整 incident JSON |
| `arena_list_incidents(status?)` | 列出所有 incidents |
| `arena_search_logs(query, sinceMinutes)` | 搜索前端/后端日志 |
| `arena_get_project_state` | 获取 git diff, 修改文件 |
| `arena_run_checks(kind)` | 运行 check/lint/test |
| `arena_mark_incident_fixed(id)` | 标记已修复 |
| `arena_find_suspect_files(id)` | 基于 route/error/failed-request 推断可疑文件 |

## 项目结构

```
pingpong-arena/
  arena-watcher/              # ← 本包 (独立基础设施)
    src/
      collector.ts            # HTTP event collector
      mcp-server.ts           # Claude MCP server
      summarize.ts            # Incident summarizer
      run-checks.ts           # Check runner
  lib/dev/                    # 前端埋点 (App 内)
    arena-observer.tsx        # Provider + console/error/fetch/route patch
    report-bug.ts             # BUG 按钮上报
    network-proxy.ts          # API 追踪
    state-snapshot.ts         # AsyncStorage 快照
    types.ts                  # ArenaIncident 等类型
  components/dev/
    BugReportButton.tsx       # 悬浮 BUG 按钮
  server/
    dev-observer.ts           # 后端事件发送
  .claude/
    skills/arena-{debug,fix,verify}/  # Claude 调试 SOP
    settings.json             # PostToolUse Hook
    hooks/post-edit-check.sh  # 自动 typecheck
  .mcp.json                   # MCP 注册
```

## 未来规划

- **v0.2**: Vite Dashboard (实时事件流 + 可视化控制台)
- **v0.3**: 自动截图/录屏、时间线回放、状态 diff
- **v0.4**: 一键 Claude 修复按钮、WebSocket 实时推送
