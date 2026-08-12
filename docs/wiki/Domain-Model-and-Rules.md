# 领域模型与业务规则

## Workspace 聚合

```text
WorkspaceSnapshotV3
└── projects: ProjectAggregate[]
    ├── 项目元数据与 nextTaskNumber
    ├── tasks: Task[]
    ├── members: ProjectMember[]
    └── sprints: Sprint[]
```

Task、Sprint、Member 都属于一个项目聚合；Task 不重复保存 `projectId`。跨项目操作必须在 Workspace 层定位目标项目，项目内规则继续由 task action/reducer 处理。

## Project

关键字段：

- `id`：全局唯一、用于路由。
- `key`：全局大小写不敏感唯一，格式为 `^[A-Z][A-Z0-9]{1,9}$`；创建后不可变。
- `nextTaskNumber`：必须大于该项目现有 Task Key 的最大序号。
- `createdAt` / `updatedAt`：ISO timestamp。

新建项目会生成稳定的 `id` 和 `key`，并创建一个本地 Owner。编辑项目只能修改名称和描述。

## Task

| 字段          | 规则                                                   |
| ------------- | ------------------------------------------------------ |
| `key`         | `${project.key}-${positiveInteger}`，项目内唯一        |
| `workType`    | `task` / `story` / `bug` / `epic`                      |
| `status`      | `todo` / `in_progress` / `in_review` / `done`          |
| `priority`    | `low` / `medium` / `high`                              |
| `title`       | trim 后 1–100 字符                                     |
| `description` | 最多 2000 字符                                         |
| `labels`      | 最多 10 个，每个 1–50 字符，保存前 trim/去重           |
| `storyPoints` | `null` 或 0–100 整数                                   |
| 日期          | `YYYY-MM-DD`；截止日期不能早于开始日期                 |
| `parentId`    | 只能指向同项目 Epic，Epic 自身不能有 parent            |
| 人员引用      | 只能指向同项目且 `joined` 的成员                       |
| `sprintId`    | 只能指向同项目 Sprint；编辑时不能指向 completed Sprint |

`position` 和 `rank` 是两个独立维度：

- `position`：Board 内同一 workflow status 的顺序。
- `rank`：Backlog/某个 Sprint 规划区内的顺序。

移动 Backlog 任务只改变 `sprintId` 和 `rank`，不应顺带改变 workflow `status`。Board 移动改变 `status` 和 `position`，不要用 `rank` 替代。

## Sprint

Sprint 状态为 `planned`、`active`、`completed`。

生命周期规则：

1. 新建 Sprint 必须有名称；目标最多 500 字符。
2. 启动前必须有开始/结束日期，结束日期不能早于开始日期。
3. 空 Sprint 不允许启动。
4. 每个项目最多一个 active Sprint；不同项目可以各有一个。
5. Board 只展示当前项目 active Sprint 中的任务。
6. 完成 Sprint 时，Done 任务留在该 completed Sprint；未完成任务原子移动到 Backlog 或另一个 planned Sprint。
7. completed Sprint 不允许继续编辑或再次启动。

## Member

- 名称必填，最多 80 字符。
- Email 必填、格式合法，并在项目内大小写不敏感唯一。
- 当前本地模式下新成员直接为 `joined`；`pending` 为未来邀请能力预留。
- 角色为 `owner` 或 `member`。
- 最后一个 Owner 不能移除；被任务引用的成员必须先解除引用或重新分配。

## Selector 约定

Summary、Backlog、Board 和通用筛选优先通过 `*-selectors.ts` 计算，不把派生结果存入 Context 或 `localStorage`。

- Selector 不修改输入数组，返回新的数组/对象。
- 同一筛选维度内为 OR，不同维度之间为 AND。
- 改动 selector 时必须补充纯函数单测，并检查跨视图一致性。

## 修改领域规则的最小闭环

1. 更新 `src/domain` 类型、校验、action/reducer。
2. 更新 `src/infrastructure` 的 V3 Schema；不要放宽冻结的 V1/V2 迁移契约。
3. 更新 fixture、Repository/迁移测试和 reducer/action 测试。
4. 更新相关 feature selector 与 UI。
5. 补浏览器主流程，并运行 [测试与质量门禁](Testing-and-Quality.md)。
