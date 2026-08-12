# 本地开发与启动

## 环境要求

- Node.js `>=24 <25`
- pnpm `>=10 <11`，仓库锁定 `pnpm@10.33.3`
- Chromium，用于 Playwright E2E

建议先确认版本：

```bash
node --version
pnpm --version
```

## 启动项目

```bash
git clone https://github.com/CHENG-LIANG1/ForceTrack.git
cd ForceTrack
pnpm install
pnpm dev
```

Vite 通常会在 `http://localhost:5173` 启动；以终端实际输出为准。

## 推荐的首次检查

```bash
pnpm check
pnpm test:e2e
```

`pnpm check` 会依次执行格式检查、ESLint、TypeScript、Vitest 和生产构建。首次运行 E2E 如果缺少浏览器，可执行：

```bash
pnpm exec playwright install chromium
```

## 常用命令

| 命令                 | 用途                          |
| -------------------- | ----------------------------- |
| `pnpm dev`           | 启动开发服务器                |
| `pnpm build`         | TypeScript 构建并生成 `dist/` |
| `pnpm preview`       | 本地预览生产构建              |
| `pnpm test`          | Vitest 监听模式               |
| `pnpm test:coverage` | 单元/组件测试与覆盖率门禁     |
| `pnpm test:e2e`      | Chromium 端到端测试           |
| `pnpm check`         | 完整静态和单元质量门禁        |
| `pnpm format`        | 写入 Prettier 格式化结果      |

## 浏览主要页面

规范路由是：

```text
/projects/:projectId/summary
/projects/:projectId/backlog
/projects/:projectId/board
/projects/:projectId/timeline
```

`/` 以及旧的 `/summary`、`/backlog`、`/board`、`/timeline` 会在 Workspace 加载后重定向到有效项目。成员管理从 Project Switcher 打开，不占用独立路由。请使用 `src/app/route-paths.ts` 的路由构造函数，不要在组件里手写项目 URL。

## 构建与静态托管

```bash
pnpm build
pnpm preview
```

部署 `dist/` 时，静态主机必须把未知路径回退到 `index.html`，否则直接刷新项目化路由会返回 404。

下一步：阅读 [系统架构](Architecture.md)，然后根据改动类型查看 [功能开发指南](Feature-Development-Guide.md)。
