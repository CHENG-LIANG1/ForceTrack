# 测试与质量门禁

## 合并前必跑

```bash
pnpm check
pnpm test:coverage
pnpm test:e2e
git diff --check
```

`pnpm check` 已包含 Prettier check、ESLint、TypeScript、Vitest 和生产构建。`test:coverage` 与 `test:e2e` 仍需单独执行。

当前仓库没有 `.github/workflows`；质量门禁主要依赖贡献者在 PR 前运行并贴出真实结果。不要把未执行的浏览器或人工验收写成“通过”。

## 测试分层

| 层级                | 位置                                  | 关注点                                            |
| ------------------- | ------------------------------------- | ------------------------------------------------- |
| Domain 单测         | `src/domain/**/*.test.ts`             | 校验、不变量、状态机、排序归一化                  |
| Infrastructure 单测 | `src/infrastructure/**/*.test.ts`     | Schema、Repository、迁移、恢复、写失败            |
| Selector 单测       | `src/features/**/*-selectors.test.ts` | 纯派生、过滤组合、输入不变性                      |
| Component 测试      | `src/**/*.test.tsx`                   | 用户交互、Dialog/Sheet、Context 集成、无障碍状态  |
| E2E                 | `e2e/*.spec.ts`                       | 浏览器主流程、刷新持久化、项目隔离、键盘/窄屏路径 |

测试注入优先使用 Provider 暴露的 Repository 和 `DomainDependencies`，让 ID 与时间可预测，不要在测试里依赖真实时钟或随机 UUID。

## 覆盖率阈值

`vitest.config.ts` 中的门禁为：

- 全局：statements/lines/functions ≥ 75%，branches ≥ 70%。
- `src/domain/**`：四项均 ≥ 90%。
- `src/infrastructure/**`：四项均 ≥ 90%。
- `src/features/**/*-selectors.ts`：四项均 ≥ 90%。

阈值是最低保护线，不是删减高价值断言的目标。

## E2E 运行模型

- Playwright 使用 Chromium Desktop Chrome，默认 viewport 为 1280 × 720。
- 测试服务地址为 `http://127.0.0.1:4173`。
- 普通 feature spec 默认写入 `forcetrack:onboarding:v1=complete`，引导流程有独立测试。
- CI 环境下失败会重试 2 次，并在首次重试保留 trace；本地默认不重试。
- 失败时截图，HTML report 不自动弹出。

涉及响应式或关键操作可达性的变更，至少补 390 px 或项目既有 768 px 路径；涉及拖拽时同时覆盖 pointer 和 keyboard。

## 按改动选择回归

| 改动             | 最小针对性验证                                              |
| ---------------- | ----------------------------------------------------------- |
| Task CRUD        | task/domain tests + task editor tests + `task-crud.spec.ts` |
| Board            | reducer/DnD tests + `board-dnd.spec.ts`                     |
| Backlog/Sprint   | backlog selectors/DnD + sprint lifecycle E2E                |
| Project/路由     | project/workspace tests + `multi-project.spec.ts`           |
| 存储迁移         | Schema、Repository、migration tests + 刷新/恢复 E2E         |
| Summary/Timeline | selector/component tests + summary/timeline E2E             |
| i18n/主题        | resource tests + preferences/home E2E                       |

合并前仍要跑完整门禁；表格只用于开发中的快速反馈。

## 验收记录

PR 描述应区分：

- 自动化验证：命令、退出码、通过数量。
- 代码级检查：例如 `git diff --check`、Schema/路由审计。
- 浏览器可视走查：浏览器、viewport、页面和观察结果。
- 未执行或受限项：明确写出，不用推测补齐。

最新基线证据见 [ACCEPTANCE.md](https://github.com/CHENG-LIANG1/ForceTrack/blob/main/ACCEPTANCE.md)。
