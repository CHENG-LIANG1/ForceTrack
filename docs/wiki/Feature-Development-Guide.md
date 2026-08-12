# 功能开发指南

## 按功能定位代码

| 改动            | 主要入口                                                 | 通常还要检查                                                   |
| --------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| 项目 CRUD/切换  | `src/features/projects`、`src/app/WorkspaceProvider.tsx` | `domain/project.ts`、V3 Schema、route paths、multi-project E2E |
| Task 表单/校验  | `src/features/task-editor`、`src/domain/task.ts`         | actions/reducer、i18n、CRUD E2E                                |
| Backlog/排序    | `src/features/backlog`                                   | `backlog-selectors.ts`、`backlog-dnd.ts`、reducer、Backlog E2E |
| Sprint 生命周期 | `src/domain/sprint.ts`、`src/domain/actions.ts`          | reducer、Backlog dialogs、Sprint E2E                           |
| Board/拖拽      | `src/features/board`                                     | `board-selectors.ts`、`board-dnd.ts`、reducer、Board E2E       |
| Summary 指标    | `src/features/summary`                                   | shared filters、selector 单测、跨视图 E2E                      |
| Timeline        | `src/features/timeline`                                  | 日期规则、selector 单测、Summary/Timeline E2E                  |
| 成员            | `src/features/members`、`src/domain/member.ts`           | Workspace commands、引用完整性、成员 E2E                       |
| 路由/导航       | `src/app/routes.tsx`、`route-paths.ts`、`AppHeader.tsx`  | Preferences、浏览器历史、多项目 E2E                            |
| 主题/语言       | `PreferencesProvider`、`src/i18n`、`src/styles`          | 预挂载主题逻辑、资源 key 测试、home E2E                        |
| 本地存储/迁移   | `src/infrastructure`                                     | 冻结旧 Schema、fixtures、恢复与迁移测试                        |

## 推荐实现顺序

对于跨层功能，按以下顺序提交最容易审查：

1. 明确用户行为、范围外内容和可验证验收标准。
2. 审计现有实现，标记“已满足 / 部分满足 / 缺失 / 不符合 / 无法验证”。
3. 先改领域模型和纯函数测试。
4. 再改 Repository/Schema/迁移及测试。
5. 接入 Context 命令和 selector。
6. 最后实现 UI、i18n 和 E2E。
7. 更新技术文档与验收证据。

不要重写已满足规则的模块；优先补真实差距，保留已有回归。

## UI 组件边界

所有适用的可见控件都应复用或补齐 `src/components/ui` 下的 shadcn/ui 抽象，例如 `Button`、`Input`、`Textarea`、`Select`、`Checkbox`、`Dialog`、`Sheet`、`Popover`、`Tooltip` 和 `AlertDialog`。

- Feature 组件不得直接 import Radix primitives。
- Radix 仅在 `src/components/ui` 内封装。
- 图标使用 Lucide，不使用 Unicode 符号冒充图标。
- 颜色使用 `src/styles` 中的语义令牌，不在 feature 中新增硬编码主题色。
- 危险操作使用明确确认；脏表单关闭必须保护用户输入。
- 新控件必须有键盘路径、可访问名称、焦点恢复和窄屏可达性。

## 注释约定

新增文件和关键方法添加简洁的“目的/原因”注释，优先解释：

- 为什么需要这个边界或兼容层。
- 哪个不变量或竞态由此保护。
- 为什么选择这一实现而不是更直接的写法。

不要注释显而易见的语法，也不要在 JSON 翻译资源中伪造注释字段。

## i18n 约定

- 用户可见的固定文案同时加入 `zh-CN.json` 和 `en-US.json`。
- 用户输入的项目名、任务名和描述保持原文，不翻译。
- 日期和数字使用当前 locale 的格式化能力，不在组件中手写中英文格式。
- 修改 key 后运行资源一致性测试，并在两种语言下走查关键路径。

## 拖拽约定

Board 和 Backlog 是独立的排序语义：Board 用 `position`，Backlog/Sprint 用 `rank`。dnd-kit 的默认键盘坐标不适合多列 Board；保留项目自定义的横向键盘策略，并测试跨列最终持久化结果。

## 完成定义

功能只有在规则、UI、持久化、测试和文档一致时才完成。仅“页面能点”不代表数据迁移、刷新恢复、键盘访问或跨视图一致性已经通过。
