# ForceTrack 多项目工作台、页面布局与缓存技术方案

> 文档版本：v1.0  
> 日期：2026-08-12  
> 状态：待实施  
> 基线：[TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md) 中已完成的 T0–T9 MVP  
> 需求输入：整体界面、导航、项目操作入口与用户偏好重构

本文是 T0–T9 完成后的下一阶段独立方案，覆盖项目创建与切换、整体界面重构、操作入口、成员管理、用户偏好和缓存。若本文与原技术设计中的“单项目”“双路由”或旧 Header 假设冲突，以本文为准；原文仍作为已完成 MVP 的历史实现与回归依据。

## 1. 目标、边界与关键决策

目标信息层级固定为：

```text
全局项目上下文
├── 切换项目
├── 新建项目
└── 当前项目成员管理

当前项目页面
├── Summary / 概览
├── Backlog
├── Board / 看板
└── Timeline / 时间线

页面内业务操作
├── 新建任务
├── 新建 Sprint
├── 开始 Sprint
└── 完成 Sprint

当前用户
├── 帮助与快捷键
├── 主题
├── 语言
└── 退出登录（仅真实认证模式）
```

本阶段采用以下不可混淆的边界：

- 项目操作位于 Header 左侧 Project Switcher，不与任务/Sprint 操作并排。
- 四个业务页面的导航位于 Header 中间，只改变当前项目内的页面。
- 主题、语言和会话位于 Header 右侧用户菜单，不写入项目数据。
- 新建任务、Sprint 生命周期等高频动作留在具体页面的 `PageHeader` 或内容卡片中。
- 项目管理集中在 Project Switcher 的单一入口，不增加独立设置路由或隐藏触发方式；项目 Key 创建后不可修改。
- 保持现有深色、克制、偏 Linear/Vercel 的视觉方向，不复制第三方品牌资产。
- 不给每条 Task 增加 `projectId`；Task、Sprint、Member 继续作为项目聚合内的数据，避免所有 selectors 重复进行项目过滤。
- 当前项目由 URL 决定；`lastProjectId` 只是用户恢复偏好，不能成为第二个路由真相源。

真实登录、邮件邀请和云端权限并非当前纯前端仓库已经具备的能力。目标界面为它们保留稳定端口，但本地模式不得伪造“已发送邮件”或“已退出服务端会话”：

- 本地模式继续使用“添加成员”，成员直接成为 `joined`。
- 接入 `InvitationRepository` 后才切换为“邀请成员”，并显示 `pending` 状态。
- 只有 `IdentityProvider` 返回 `authenticated` 时才显示“退出登录”。
- 布局和组件不得依赖具体身份实现，后续替换端口时不重做 Header。

## 2. 现状复用与差距

| 范围                              | 当前实现                                      | 处理策略                                      |
| --------------------------------- | --------------------------------------------- | --------------------------------------------- |
| Summary、Backlog、Board、Timeline | 页面从 `useTasks()` 读取单一 `TaskSnapshotV2` | 保留页面主体，向其提供当前项目数据视图        |
| Task/Sprint/Member reducer        | 已覆盖任务与 Sprint 生命周期                  | 继续作为项目内部 reducer，不重写规则          |
| Repository 保存队列               | 单快照、串行持久化                            | 提升为 Workspace 保存队列，保持失败时内存可用 |
| `TaskSnapshotV2`                  | 无项目元数据，固定 `FT-N`                     | 保留为旧数据迁移输入，新增 Workspace V3       |
| 路由                              | `/summary`、`/backlog`、`/board`、`/timeline` | 新增项目化路由，旧路由只做兼容重定向          |
| Header                            | 品牌、四个 Tab、独立“设置”按钮                | 改为左项目、中导航、右用户的三段式布局        |
| Task 编辑器                       | 居中 Dialog                                   | 复用 `TaskForm`，外壳迁移到右侧 Sheet/Drawer  |
| 本地成员                          | 项目快照内的成员，可创建                      | 增加成员管理页；角色/邀请状态按能力分阶段启用 |
| 主题与语言                        | `PreferencesProvider` + localStorage          | 保持全局归属，升级偏好 Schema 并支持 `system` |

## 3. 应用 Shell 与页面布局

### 3.1 桌面端 Header

Header 使用三列 CSS Grid，而不是依赖左右内容宽度碰巧让导航居中：

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [◉ ForceTrack⌄]      [概览 Backlog 看板 时间线]          [?] [LC⌄] │
└──────────────────────────────────────────────────────────────────────┘
```

推荐布局令牌：

```css
--app-header-height: 56px;
--app-content-max: 1440px;
--app-page-gutter: clamp(16px, 3vw, 40px);
--app-drawer-width: 560px;
```

```css
.site-header {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto minmax(220px, 1fr);
  align-items: center;
  min-height: var(--app-header-height);
}
```

- 左区左对齐，包含 Project Switcher。
- 中区保持几何居中，只包含四个项目页面 Tab。
- 右区右对齐，包含帮助图标和用户菜单。
- Header 可 sticky，但不得覆盖 Dialog、Sheet、Popover；层级通过统一 z-index 令牌管理。
- 选中 Tab 使用较亮文字、底部短线或轻量背景，不使用厚重胶囊按钮。
- 页面内容统一进入 `.page-shell`；Board 可使用全宽，其他页面使用最大宽度和统一 gutter。

### 3.2 页面 Header 与业务按钮

页面 Header 结构统一为：

```text
Eyebrow / breadcrumb
页面标题                         次要动作   主要动作
页面说明
```

操作归属固定如下：

| 页面     | 次要动作                          | 主要动作                       |
| -------- | --------------------------------- | ------------------------------ |
| Summary  | 无                                | 新建任务                       |
| Backlog  | 新建 Sprint                       | 新建任务                       |
| Board    | 完成 Sprint（仅有 active Sprint） | 新建任务（仅有 active Sprint） |
| Timeline | 无                                | 新建任务                       |
| Members  | 无                                | 添加/邀请成员                  |

页面中原则上最多一个 Primary Button。没有活动 Sprint 时，Board 只显示“前往 Backlog”的 Empty State，不在 Board 创建 Sprint。

### 3.3 响应式布局

| 断点         | Header                                              | 页面操作                            | 业务内容                                    |
| ------------ | --------------------------------------------------- | ----------------------------------- | ------------------------------------------- |
| `>= 1024px`  | 三列完整显示                                        | 标题右侧完整文案                    | Board 四列横向布局                          |
| `768–1023px` | 项目区和用户区固定，中间 Tab 可横向滚动             | 允许换行                            | Board 保持横向滚动                          |
| `< 768px`    | 第一行项目/用户，第二行可滚动 Tab；帮助收进用户菜单 | 按钮缩短但保留 `aria-label`/Tooltip | Drawer 全屏，Board 横向滚动，不压成四个窄列 |

移动端不能把桌面 Header 全部硬压进一行。项目切换器和用户菜单始终可达，当前页面 Tab 必须保持可识别选中态。

## 4. 路由与导航方案

规范路由改为：

```text
/projects/:projectId/summary
/projects/:projectId/backlog
/projects/:projectId/board
/projects/:projectId/timeline
/projects/:projectId/members
```

- `members` 是 Project Switcher 进入的管理页，不出现在中间四个一级 Tab。
- `/` 根据 `lastProjectId` 进入其 Summary；偏好不存在或项目无效时进入第一个项目。
- 旧 `/summary`、`/backlog`、`/board`、`/timeline` 等待 Workspace hydrate 后，重定向至对应项目化路由。
- 未知 `projectId` 重定向到有效项目的相同页面；页面名也无效时回到 Summary。
- 切换项目时保留当前页面类型；在 Members 切换项目时仍进入目标项目 Members。
- 新建项目成功后进入 `/projects/:newProjectId/summary`。
- 启动 Sprint 成功后进入当前项目 Board。
- 浏览器前进/后退以 URL 重新解析项目上下文，并同步最近项目偏好。

路由构造函数集中在 `route-paths.ts`：

```ts
projectRoutes.summary(projectId);
projectRoutes.backlog(projectId);
projectRoutes.board(projectId);
projectRoutes.timeline(projectId);
projectRoutes.members(projectId);
```

组件不得手写 `'/backlog'` 或拼接不受校验的路径。

## 5. Header 组件与交互入口

### 5.1 Project Switcher

Project Switcher 使用 shadcn/ui `Popover` 或 `DropdownMenu` 组合，项目数量超过 7 时显示搜索框；搜索使用本地、大小写不敏感的名称/Key 匹配。

```text
项目
搜索项目…

最近项目
✓ ForceTrack   FT
  SciFlow      SF
  Personal     PER

查看全部项目
────────────────
+ 新建项目
成员管理
```

- 当前项目显示 Check，项目项同时显示名称和 Key。
- 最近项目最多 5 个，由 `recentProjectIds` 决定，不写入项目实体。
- 选择项目后立即关闭菜单、导航到目标路由并恢复焦点。
- “新建项目”和“成员管理”位于分隔线下方。
- 切换列表不混入行内设置；编辑与删除统一进入“项目管理”，不增加隐藏设置入口。
- 项目名称过长时单行截断，但 Tooltip/可访问名称保留完整名称。

### 5.2 新建项目

新建项目使用居中 Dialog，而不是 Sheet：

| 字段 | 规则                                                                 |
| ---- | -------------------------------------------------------------------- |
| 名称 | 必填，trim 后 1–80 字符                                              |
| 描述 | 可选，最多 500 字符                                                  |
| Key  | 必填，自动生成且创建前可改；`^[A-Z][A-Z0-9]{1,9}$`；大小写不敏感唯一 |

- 自动 Key 只在用户尚未手工修改 Key 时随名称更新。
- 提交时同步执行领域校验，重复提交期间禁用按钮。
- 创建成功后原子加入 Workspace，再导航到新项目 Summary。
- 项目 Key 创建后不可修改；本阶段不建设旧 Key 重定向表。
- 新项目为空：`nextTaskNumber = 1`、无 Task/Sprint；本地身份可用时将当前用户作为第一个 Owner，否则保持空成员列表。

### 5.3 用户菜单和帮助

右侧只保留：

```text
[?] [Avatar/Initials⌄]
```

- `?` 打开帮助 Popover，承载快捷键、产品文档和版本信息；小屏收进用户菜单。
- 用户菜单顶部显示当前用户名称/邮箱；无真实身份时显示明确的本地模式身份，不伪造登录状态。
- 主题与语言使用子菜单或单选组，修改立即生效。
- “退出登录”只在真实认证会话中出现；退出后清理内存会话缓存，不删除本地项目数据和显式用户偏好。
- 删除现有 Header 右侧独立“设置”文字按钮，不新增空设置页。

## 6. Task、Sprint 与成员操作方案

### 6.1 Task Sheet

新增/编辑 Task 的 `TaskForm` 继续复用，但容器从居中 Dialog 调整为右侧 shadcn/ui `Sheet`：

- 桌面宽度建议 520–600px，小屏全屏。
- Board 入口默认关联当前 active Sprint。
- Backlog 分区入口默认关联对应 Sprint；Backlog 总区入口默认 `sprintId = null`。
- Summary/Timeline 入口默认 `sprintId = activeSprint?.id ?? null`。
- 保存后保持当前页面和筛选上下文，只关闭 Sheet 并更新列表。
- Escape 可关闭；草稿脏时先展示 AlertDialog。
- Sheet 关闭后焦点返回触发按钮。
- 移除运行时 `ACTIVE_SPRINT_ID` 默认值；该常量只允许存在于旧迁移/演示种子边界。

### 6.2 Sprint 操作

- “新建 Sprint”只在 Backlog PageHeader。
- “开始 Sprint”只在对应 planned Sprint 卡片。
- “完成 Sprint”只在有 active Sprint 的 Board PageHeader。
- 创建 Sprint 可不填日期；启动时必须补齐开始/结束日期且至少包含一个任务。
- 同一项目最多一个 active Sprint；不同项目之间互不影响。
- 完成 Sprint 的未完成任务迁移继续由单一 reducer action 原子执行。

### 6.3 成员管理

Members 页面使用项目级列表，列出头像、名称、邮箱、角色和状态：

```ts
type ProjectMemberRole = 'owner' | 'member';
type ProjectMemberStatus = 'joined' | 'pending';
```

- 本地模式：使用“添加成员”，保存后直接为 `joined`；不声称已发送邮件。
- 云端模式：`InvitationRepository.send()` 成功后记录 `pending`，接受邀请后改为 `joined`。
- `pending` 成员不能被设为 assignee/reporter。
- 每个项目至少保留一个 Owner；不能移除最后一个 Owner。
- 移除成员前检查其任务引用；必须先改派或由单一 action 将引用清空，不能留下悬空 ID。
- active Sprint 卡片可以展示 joined 成员头像组；头像区进入 Members，`+` 快捷打开添加/邀请成员，图标按钮必须有 Tooltip。

## 7. 数据模型与领域边界

V1/V2 继续是只读迁移契约；多项目使用新的 Workspace V3：

```ts
interface WorkspaceSnapshotV3 {
  schemaVersion: 3;
  projects: ProjectAggregate[];
}

interface ProjectAggregate {
  id: string;
  key: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  nextTaskNumber: number;
  tasks: Task[];
  members: ProjectMember[];
  sprints: Sprint[];
}

interface UserPreferencesV2 {
  locale: 'zh-CN' | 'en-US';
  theme: 'system' | 'light' | 'dark';
  lastProjectId: string | null;
  recentProjectIds: string[];
}
```

关键不变量：

- Project ID 全局唯一，Project Key 大小写不敏感唯一。
- Task ID 在项目内唯一；Task Key 必须符合 `${project.key}-${positiveInteger}`。
- `nextTaskNumber` 大于本项目已有 Task Key 的最大序号。
- Task 的 assignee、reporter、parent、sprint 引用只能指向同一项目中的有效实体。
- `position` 与 `rank` 继续分离并只在项目内连续。
- 每个项目最多一个 active Sprint；多个项目可分别拥有自己的 active Sprint。
- `lastProjectId` 和最近项目是用户导航偏好，不放进共享 Workspace 领域快照。

为避免放宽旧数据契约，新增 V3 项目感知 Schema；不得直接把 V2 的 `^FT-` 校验改成任意 Key。领域函数改为接收最小结构：

```ts
interface PlanningState {
  nextTaskNumber: number;
  tasks: Task[];
  members: ProjectMember[];
  sprints: Sprint[];
}
```

`createTask(projectKey, state, input)` 生成动态 Key；task reducer 通过泛型或项目 wrapper 保留 Project 元数据。

## 8. 状态管理与数据流

`WorkspaceProvider` 是新的唯一业务状态拥有者，并同时提供：

```text
ProjectContext
├── projects
├── currentProject
├── createProject
└── switchProject（导航 + 最近项目偏好）

TaskContext
├── snapshot（当前 ProjectAggregate 的 PlanningState 视图）
└── 保留现有 Task/Sprint/Member commands
```

页面继续消费 `useTasks()`，降低迁移面；Header 和 Project Route Guard 消费 `useProjects()`。

项目内写操作：

```text
页面 command
→ 捕获 route 中的 projectId
→ 对该 ProjectAggregate 执行现有 action/reducer
→ Workspace reducer 替换对应项目
→ 立即更新内存 UI
→ 串行保存完整 WorkspaceSnapshotV3
```

action 必须携带或闭包捕获 `projectId`。不能等异步保存时再读取“当前项目”，否则用户快速切换项目时可能发生跨项目写入。

Project Switch 不重建 Provider、不重新 seed，也不把旧项目 Task 留在组件 local state。Task Sheet、Sprint Dialog 和拖拽状态在项目切换前关闭，避免对新项目提交旧草稿。

## 9. 缓存、持久化与失效策略

### 9.1 数据分层

| 数据                             | 权威来源                         | 内存缓存            | 浏览器持久化                       | 失效条件                   |
| -------------------------------- | -------------------------------- | ------------------- | ---------------------------------- | -------------------------- |
| Projects/Tasks/Sprints/Members   | `WorkspaceProvider` + Repository | 完整 Workspace      | `forcetrack:workspace:v3`          | 任一领域 mutation          |
| 主题/语言/最近项目               | `PreferencesProvider`            | 当前 preferences    | `forcetrack:preferences:v2`        | 用户修改或有效路由切换     |
| 当前项目/当前页面                | URL                              | React Router        | 不另存页面；仅保存 `lastProjectId` | 导航、前进/后退            |
| Summary/Backlog/Board 派生结果   | selectors                        | 当前 render/useMemo | 不持久化                           | 当前项目引用或筛选变化     |
| Dialog/Sheet、筛选草稿、拖拽预览 | 组件 state                       | 临时                | 不持久化                           | 关闭、提交、项目切换、刷新 |
| 认证会话                         | `IdentityProvider`               | 内存                | 未来使用 HttpOnly Cookie           | 登录、退出、会话过期       |

`localStorage` 在当前本地产品中是持久化数据库，不只是可随时丢弃的缓存，因此所有写入必须先过 Zod 校验并保留版本号。组件不得直接访问 Storage。

### 9.2 本地存储 Key

```text
forcetrack:workspace:v3
forcetrack:preferences:v2
forcetrack:tasks:v2                  # 只读迁移来源
forcetrack:tasks:v1                  # 只读迁移来源
forcetrack:recovery:workspace:last-invalid
forcetrack:recovery:preferences:last-invalid
```

- Workspace 使用单 Key 完整快照，保持项目创建、成员变化和任务写入的单次 `setItem` 原子性。
- 不采用“一项目一个 Key + 单独索引”，避免索引已写但项目数据失败、项目已删但索引残留等跨 Key 半完成状态。
- 所有 mutation 先同步计算 next state，再进入已有 Promise 保存队列；后一个保存必须基于最新 Workspace ref。
- 保存失败时保留内存操作结果并显示“刷新后可能丢失”，后续成功保存可清除提示。
- 派生 selectors 不写入 localStorage，也不设置 TTL；以不可变项目引用自然失效。
- 不引入 Service Worker、IndexedDB、TanStack Query 或虚拟列表；出现附件、离线队列、数千任务或后端 API 后再评估。

### 9.3 V1/V2 → V3 迁移

加载优先级：

1. V3 存在且合法：直接加载，绝不读取旧 Key 覆盖它。
2. V3 缺失且 V2 合法：将 V2 原样包装为默认 `FT` 项目并写入 V3。
3. 仅 V1 合法：沿用现有 V1 → V2 迁移，再包装为 V3。
4. 所有业务 Key 缺失：创建一个带演示数据的 ForceTrack 项目。
5. V3 损坏：先备份原始字符串，再从合法 V2 恢复；V2 也不可用时才恢复演示项目。

确定性默认项目：

```ts
{
  id: 'project-forcetrack',
  key: 'FT',
  name: 'ForceTrack',
  description: '',
  ...legacyV2PlanningData
}
```

迁移必须保留 Task/Member/Sprint ID、Task Key、日期、状态、`position`、`rank` 和引用关系；V1/V2 原始字符串不删除、不覆盖。合法空 Workspace/Project 不得被重新 seed，重复刷新不得再次创建默认项目。

Preferences V1 → V2 保留现有 locale/theme，增加 `lastProjectId = null` 和空 recent 列表；若旧主题不含 `system`，不擅自改成 system。

### 9.4 最近项目和路由缓存

- 每次进入合法项目路由，将 ID 移到 `recentProjectIds` 首位，去重后最多保留 5 个。
- `lastProjectId` 仅供 `/` 和旧路由重定向使用，URL 已包含合法项目时 URL 优先。
- 删除/不可访问项目导致偏好悬空时，过滤无效 ID 并回退第一个项目。
- 最近项目更新失败不影响项目切换；它属于可降级用户偏好。

### 9.5 未来后端缓存

接入 API 后再引入 TanStack Query：

```text
['projects']
['project', projectId]
['project', projectId, 'tasks']
['project', projectId, 'members']
['project', projectId, 'sprints']
```

- 服务端数据成为权威来源，localStorage 不再保存完整业务快照，只保留偏好和可明确丢弃的离线草稿。
- mutation 使用服务端 revision/ETag 做并发检查；失败时回滚乐观更新并展示冲突。
- 认证 token 不写 localStorage，使用安全的 HttpOnly Cookie。
- 不在当前本地阶段提前安装 Query 库或模拟网络缓存。

## 10. 主题、国际化与视觉令牌

- `theme` 恢复为 `system | light | dark`；system 使用 `matchMedia('(prefers-color-scheme: dark)')` 并监听系统变化。
- 显式 light/dark 不跟随系统变化；偏好修改立即更新 `documentElement.dataset.theme`。
- React 挂载前读取合法主题偏好，避免首屏闪烁；损坏偏好使用独立 recovery Key，不覆盖 Workspace recovery。
- 所有颜色继续通过 CSS Variables/Design Tokens；Feature 组件不得新增硬编码颜色。
- 中文导航固定为“概览 / Backlog / 看板 / 时间线”，英文固定为“Summary / Backlog / Board / Timeline”。
- 用户输入的项目名、任务名和描述保持原文，不翻译。
- 日期、数字和相对时间使用当前 locale 的 `Intl`/date-fns locale；不得在组件中手写中英文日期格式。

## 11. shadcn/ui 与组件边界

新增可见控件必须复用或补齐 `src/components/ui` 下的 shadcn/ui 抽象：

| 场景                       | 组件                                 |
| -------------------------- | ------------------------------------ |
| Project Switcher、用户菜单 | `DropdownMenu`/`Popover`             |
| 项目搜索                   | `Command` 或 `Input` + 列表语义      |
| 新建项目、Sprint           | `Dialog`                             |
| Task 创建/编辑             | `Sheet`                              |
| 脏表单确认、移除成员       | `AlertDialog`                        |
| 主题/语言/角色             | `Select` 或 `DropdownMenuRadioGroup` |
| 头像                       | `Avatar`                             |
| 图标说明                   | `Tooltip`                            |
| 全部操作                   | `Button`                             |

Feature 组件不得直接 import Radix primitives；Radix 只允许封装在 `src/components/ui`。新增文件和关键方法添加简洁的目的/原因注释，不在 JSON 国际化资源中伪造注释字段。

## 12. 无障碍与交互反馈

- Project Switcher、用户菜单、Dialog 和 Sheet 支持键盘打开、方向键导航、Escape 关闭和正确焦点恢复。
- Project Tab 使用真实链接；当前项提供 `aria-current="page"`。
- 图标按钮必须有 `aria-label` 和 Tooltip，不能只依赖图形含义。
- Sheet 打开后焦点进入标题或首个字段，关闭回到原触发器。
- 创建/邀请/保存期间禁用重复提交；成功和失败都提供明确反馈。
- 项目切换时关闭当前项目的 Sheet/Dialog；有脏表单时先确认，不静默丢弃。
- 危险操作使用 AlertDialog；“完成 Sprint”是重要但非删除操作，页面按钮保持 secondary，确认按钮可以强调。
- 深浅主题均检查文本、边框、焦点环和拖拽 Drop Target 对比度。

## 13. 推荐目录变化

```text
src/
├── app/
│   ├── WorkspaceProvider.tsx
│   ├── project-context.ts
│   ├── ProjectRouteGuard.tsx
│   └── route-paths.ts
├── domain/
│   ├── project.ts
│   ├── workspace.ts
│   └── workspace-reducer.ts
├── infrastructure/
│   ├── local-workspace-repository.ts
│   ├── workspace-migration.ts
│   └── storage-schema.ts
├── features/
│   ├── projects/
│   │   ├── ProjectSwitcher.tsx
│   │   └── CreateProjectDialog.tsx
│   ├── members/
│   │   ├── MembersPage.tsx
│   │   └── MemberDialog.tsx
│   └── task-editor/
│       └── TaskSheet.tsx
└── components/ui/
    ├── avatar.tsx
    ├── dropdown-menu.tsx
    ├── sheet.tsx
    └── tooltip.tsx
```

迁移期间可保留 `TaskProvider` 名称，但最终只能有一个 Workspace 业务状态拥有者，不能让 TaskProvider 和 WorkspaceProvider 各自保存一份可漂移快照。

## 14. 实施顺序与 Gate

| Task | 内容                                                         | 独立验收                                     |
| ---- | ------------------------------------------------------------ | -------------------------------------------- |
| P0   | 现状/差距审计，冻结 V1/V2 fixtures 和旧路由回归              | 差距表、迁移 fixtures、工作树证据齐全        |
| P1   | Workspace V3、Project 领域规则、动态 Task Key                | Schema/reducer 单测通过，旧 V2 Schema 未放宽 |
| P2   | LocalWorkspaceRepository、Preferences V2、迁移/恢复/保存队列 | V1/V2/V3、空数据、损坏、写失败测试通过       |
| P3   | WorkspaceProvider、ProjectContext、项目化路由和旧路由兼容    | URL/切换/刷新/前进后退组件测试通过           |
| P4   | 三段式 Header、Project Switcher、新建项目、用户菜单          | 桌面/键盘/主题/语言交互通过                  |
| P5   | Task Sheet、页面操作入口、Board/Sprint 卡片整理              | 四页面 CRUD/Sprint 回归通过                  |
| P6   | Members 页面和本地成员管理；云端邀请端口仅定义不伪实现       | 成员引用、Owner、状态规则单测通过            |
| P7   | 响应式、无障碍、完整 E2E 和文档证据                          | `pnpm check`、Chromium E2E、人工矩阵通过     |

必须按 P0 → P2 → P3 的顺序先稳定数据和迁移，再重构 Header/UI；不得先做只能展示假项目数据的切换器。

## 15. 验收标准

### 项目与数据

- 旧 V2 首次启动后完整出现在默认 `FT` 项目；旧 Key 保持不变且迁移只发生一次。
- 新建 `GAME` 项目后自动进入其 Summary，第一条任务为 `GAME-1`。
- 两个项目的 Task、Sprint、Member、Summary 统计和 Timeline 完全隔离。
- 每个项目可独立拥有一个 active Sprint，项目切换不改变另一项目状态。
- 快速“保存任务 → 切换项目”不会把任务写入目标项目。
- 刷新、旧路由、无效项目 URL、浏览器前进/后退都解析到正确项目和页面。

### 布局与入口

- 桌面 Header 明确分为左项目、中导航、右用户，四个页面选中态清晰。
- Header 不出现独立设置、新建项目、新建 Sprint、新增成员或新建任务按钮。
- 新建项目和成员管理只能从 Project Switcher 主入口到达；不存在项目设置入口。
- 四个页面的动作符合 3.2 节表格，单页最多一个 Primary Button。
- Task 使用右侧 Sheet，关闭后焦点回到触发器；脏表单不会被静默丢弃。
- 无 active Sprint 的 Board 显示 Empty State 和“前往 Backlog”，不提供创建 Sprint。

### 缓存与恢复

- 合法空 Workspace/Project 刷新后仍为空，不重新注入演示数据。
- 损坏 Workspace 与 Preferences 分别备份，不相互覆盖 recovery 内容。
- localStorage 写失败时当前内存操作仍可见，页面显示非阻塞持久化警告。
- `lastProjectId` 损坏或悬空不会白屏，URL 中合法项目始终优先。
- 派生 Summary/Backlog 数据不持久化，不会在项目切换后显示旧项目缓存。

### 质量门禁

- 新增领域规则有单测，Header/路由/Sheet 有组件测试，迁移与跨项目隔离有 E2E。
- 仅键盘可切换项目、导航四页、创建项目、打开/提交/关闭 Sheet 和修改主题/语言。
- `pnpm check`、完整 Chromium E2E、`git diff --check` 通过；控制台无新增 error。
- 中英文、light/dark/system 和 1280×720、768px、390px 三档布局均有验收证据。

## 16. 明确禁止和延后范围

本阶段禁止：

- 把所有操作堆在 Header 右上角。
- 在 Task 上增加冗余 `projectId` 后让页面自行过滤全量任务。
- 同时维护 URL currentProject 与另一个可独立修改的 activeProject 状态。
- 绕过 Repository 从 UI 直接读写 localStorage。
- 放宽或覆盖 V1/V2 Schema 以“简化”迁移。
- 提供项目设置入口、空设置页、假退出登录或声称已发送的假邀请。
- 将主题/语言放进项目数据，或将项目最近访问记录写进共享 Project 实体。

明确延后：项目归档、项目模板、收藏与完整项目目录、跨项目搜索、真实邮件邀请、角色权限执行、云同步、多标签页冲突合并、离线同步队列、附件和审计日志。
