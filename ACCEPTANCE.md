# ForceTrack 发布验收

## 多项目扩展验收（2026-08-12）

基于 `MULTI_PROJECT_TECHNICAL_DESIGN.md` 的多项目扩展已达到本地发布候选标准。实现复用了 T0–T9 的任务、Sprint、Board、Summary 与 Timeline 逻辑，没有重写已合规功能。

| 验收面         | 结果                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| 项目数据边界   | 新增 V3 Workspace 聚合；每个项目独立保存任务、成员、Sprint、编号与更新时间                           |
| 迁移与恢复     | 加载顺序为 V3 → V2 → V1 → seed；旧数据只迁移、不回写，损坏 V3 会备份并恢复                           |
| 路由与历史     | 使用 `/projects/:projectId/:page`；旧链接重定向，切换项目保留当前页面，前进/后退恢复正确上下文       |
| 项目操作       | 支持创建、最近项目、项目内任务编号、成员管理；最后 Owner 与被任务引用的成员不可移除                  |
| 布局与可访问性 | 三段式 Header、移动端四页导航、右侧任务 Sheet、跳转主内容、动态标题、键盘项目选择和焦点恢复          |
| UX 启发式验收  | 目标范围 10/10；未留存 Severity 1–4 问题。验收中修正中文标题不一致、品牌上下文、移动点击区与菜单换行 |

验证证据：

- `pnpm check`：Prettier、ESLint、TypeScript、28 个 Vitest 文件 / 174 条测试和生产构建通过。
- `pnpm test:coverage`：174 条测试通过；全局 statements/branches/functions/lines 为 80.49%/70.28%/78.66%/82.08%，全部既有阈值通过；`src/infrastructure/**` 为 97.76%/93.23%/100%/97.61%。
- `pnpm test:e2e`：19 条 Chromium E2E 通过，包括创建隔离项目、项目任务键、跨项目同页切换、历史恢复和 390 px 任务 Sheet。
- 真实浏览器可视走查：1280 px 与 390 px 下检查 Summary、项目菜单、用户菜单、任务 Sheet 和未保存确认；控制台 error/warning 为 0。
- `git diff --check`：通过。

范围说明：跨项目全局搜索、真实登录/邀请与云端同步仍按技术设计排除；项目删除保存在本地，必须输入完整项目名称确认。当前“成员”是浏览器本地项目成员，不暗示已发送邀请。

---

验收日期：2026-08-12（Asia/Shanghai）<br>
候选基线：`dd9614a`（T8 / PR #7 已合入 `main`）+ 当前工作区 T9 回归、门禁和文档改动<br>
验收范围：`TECHNICAL_DESIGN.md` T0–T9 / G6

## 发布结论

扩展 MVP 达到本地静态发布候选标准：全量静态检查、单元/组件测试、风险覆盖率门禁、16 条 Chromium E2E、生产构建和 Google Chrome 151 四路由 smoke 均通过；未发现阻塞级缺陷。

本验收不代表已部署到线上。`dist/` 已生成，可交给支持 SPA fallback 的静态托管平台。Chrome 151 的截图和路由检查由真实 Chrome 二进制以自动化方式完成；指针/键盘拖拽手感由 Playwright Chromium 自动化与应用内浏览器可视走查覆盖，没有伪报为人工接管 Chrome GUI。

## 执行前审计与差距处理

| 项目        | 审计结论                                                                                                               | T9 处理                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| T0–T4 基线  | CRUD、Board、偏好、持久化已有回归                                                                                      | 复用原测试并纳入全量回归，没有重写                                                      |
| 九类 P0 E2E | 原 14 条测试覆盖 CRUD、Board、偏好、Backlog、Sprint、Summary/Timeline 基础和本地用户；组合搜索及日期跨视图同步证据不足 | 新增 2 条发布 E2E，补五维筛选与 Board → Timeline → Summary 同步                         |
| 核心覆盖率  | 全局 statements 80.28%，但 domain statements/branches 为 86.8%/79.24%，且没有可执行 threshold                          | 补状态机、校验、reducer guard、迁移/恢复分支测试，并在 Vitest 配置中加入发布阻断阈值    |
| 发布文档    | `ACCEPTANCE.md` 缺失，README 仍描述 T0–T4                                                                              | 新建本文件，更新导航、Sprint、本地用户、测试、构建和存储说明                            |
| 浏览器验收  | Playwright 配置为 Chromium 1280×720                                                                                    | 保留完整 Chromium E2E，并用 Google Chrome 151.0.7922.109 检查四路由、截图、宽度和控制台 |

## T0–T9 证据

| Task                       | 复用 / 修正 / 新增                                                           | 验证证据                                              | 状态 |
| -------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------- | ---- |
| T0 工程基础                | 复用 Vite、TypeScript、ESLint、Prettier、Vitest、Playwright                  | `pnpm check`、`pnpm build`                            | 通过 |
| T1 领域与持久化            | 复用 Task CRUD、Repository 和本地持久化；T9 补边界覆盖                       | domain / infrastructure 单测与 coverage threshold     | 通过 |
| T2 Shell、路由、i18n、主题 | 复用四路由、双语、明暗主题和预挂载脚本                                       | 偏好 E2E、Chrome 四路由 smoke、资源 key 测试          | 通过 |
| T3 TaskDialog CRUD         | 复用统一 TaskDialog、校验、脏表单确认和状态替代路径                          | 组件测试、CRUD E2E                                    | 通过 |
| T4 Board 与 DnD            | 复用四列、Pointer/Keyboard sensor、持久化排序                                | Board reducer/DnD 单测、2 条 Board E2E                | 通过 |
| T5 V2 / 迁移 / selectors   | 复用显式 V1/V2 边界、单活动 Sprint、共享 selectors                           | 迁移、schema、repository、selector 测试；风险阈值     | 通过 |
| T6 Backlog / Sprint        | 复用排序、跨区拖拽和 Sprint 生命周期；T9 补组合过滤 E2E                      | Backlog DnD、Sprint 生命周期和 Task9 筛选 E2E         | 通过 |
| T7 Summary / Timeline      | 复用七个 Summary 模块、统一过滤结果集和只读 Timeline；T9 补日期/完成同步 E2E | selector/组件测试、Summary/Timeline 和 Task9 同步 E2E | 通过 |
| T8 本地用户与恢复          | 复用成员创建/唯一性、四页联动、Error Boundary、反馈和 768 px 路径            | Task8 组件测试及 3 条集成 E2E                         | 通过 |
| T9 回归与发布验收          | 新增发布 E2E、覆盖率门禁、README 与验收记录                                  | 本文件所列全量命令与浏览器证据                        | 通过 |

## 自动化回归

### 标准门禁

- `pnpm check`：格式、ESLint、TypeScript、23 个 Vitest 文件、生产构建全部退出码 0。
- `pnpm test:coverage`：23 个文件 / 142 条测试通过，所有配置阈值通过。
- `pnpm test:e2e`：9 类 P0 映射到 8 个 spec 文件，共 16 条 Chromium 测试通过。
- `pnpm build`：生成 `dist/index.html`、CSS 和 JS 静态资源。
- `git diff --check`：通过。

### 覆盖率门禁

| 范围                    | Statements |   Branches |  Functions |      Lines | 阈值                                             |
| ----------------------- | ---------: | ---------: | ---------: | ---------: | ------------------------------------------------ |
| 全局                    |     82.54% |     74.22% |     79.81% |     83.95% | statements/lines/functions ≥ 75%，branches ≥ 70% |
| `src/domain/**`         |     96.77% |     94.71% |     97.22% |     98.01% | 全部 ≥ 90%                                       |
| shared selectors        | ≥ 90% gate | ≥ 90% gate | ≥ 90% gate | ≥ 90% gate | 全部 ≥ 90%                                       |
| `src/infrastructure/**` | ≥ 90% gate | ≥ 90% gate | ≥ 90% gate | ≥ 90% gate | 全部 ≥ 90%                                       |

阈值写入 `vitest.config.ts`，后续降低覆盖率会让 `pnpm test:coverage` 失败，而不是只输出一个未被检查的百分比。

### 九类 P0 浏览器流程

1. CRUD 与持久化：`task-crud.spec.ts`。
2. Board 流转：`board-dnd.spec.ts`。
3. 搜索筛选：`task9-release.spec.ts` 五维 AND/OR 组合与清除恢复。
4. Board/Timeline 一致性：`task9-release.spec.ts` 新建日期、Timeline 展示、编辑完成后同步 Summary。
5. 偏好持久化：`home.spec.ts`。
6. Backlog 规划：`backlog-dnd.spec.ts`。
7. Sprint 生命周期：`sprint-lifecycle.spec.ts`。
8. Summary 一致性：`summary-timeline.spec.ts` + `task9-release.spec.ts`。
9. 本地用户：`task8-integration.spec.ts`。

额外回归包括键盘 Board/Backlog 拖拽、planned Sprint 编辑/删除、损坏存储恢复和 768 px 关键操作可达性。

## 浏览器与视觉验收

- Google Chrome `151.0.7922.109`，1280×720：`/summary`、`/backlog`、`/board`、`/timeline` 均返回 200，标题正确，`scrollWidth === viewport width === 1280`。
- 四页真实 Chrome 截图已检查：Header、主操作、筛选、Sprint/Board 列、Timeline 条带均完整可见。
- 应用内 Chromium 1280×720 进行了第二轮可视走查，console warning/error 为 0。
- Playwright Chromium 额外验证 768×720 下导航与 Backlog 关键操作可达且无页面级横向溢出。
- V1 → V2、刷新持久化、损坏存储恢复和偏好预挂载均有自动化证据；`index.html` 在 React 挂载前设置 `lang`、`data-theme` 和 `color-scheme`。

## 已知限制与非阻塞项

- 生产 JS 单 chunk 约 730 KB（gzip 约 222 KB），Vite 给出大于 500 KB 的非阻塞警告；后续可按路由拆包。
- 并行 E2E 的开发服务器偶发输出 `ResizeObserver loop completed with undelivered notifications`；页面 console/pageerror 断言和真实 Chrome smoke 均为 0，未观察到行为失败。
- MVP 浏览器门禁仍以 Chromium 为主；未执行 Firefox/Safari 兼容性回归。
- 未执行线上托管验收；部署时必须配置未知路径回退 `index.html`。
- 明确排除真实登录、邀请、角色/权限、并行 Sprint、评论、报表、版本、依赖和 Timeline 轴上拖拽，没有半成品入口。

## Jira 来源与 MVP 适配

- [Summary view](https://support.atlassian.com/jira-software-cloud/docs/what-is-the-summary-view/)：对应 Summary 模块、筛选和派生指标。
- [Scrum backlog](https://support.atlassian.com/jira-software-cloud/docs/use-your-scrum-backlog/)：对应 Backlog section、Sprint 规划和任务移动。
- [Enable sprints](https://support.atlassian.com/jira-software-cloud/docs/enable-sprints/)：对应 Sprint 生命周期；MVP 固定最多一个 active Sprint。
- [Rank a work item](https://support.atlassian.com/jira-software-cloud/docs/rank-an-issue/)：对应独立 `rank` 和 Backlog 拖拽排序。
- [Team-managed access](https://support.atlassian.com/jira-software-cloud/docs/manage-how-people-access-your-team-managed-project/)：仅适配本地成员列表和分配，不实现邀请/权限。
- [Timeline](https://support.atlassian.com/jira-software-cloud/docs/what-is-the-timeline-and-how-do-i-use-it/)：对应只读日期条、范围和未排期工作；不实现轴上拖拽与 roll-up。
