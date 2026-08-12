# ForceTrack 开发者 Wiki

ForceTrack 是一个本地优先、无需后端即可运行的多项目任务管理 Web 应用。它覆盖项目、成员、Backlog、Sprint、Board、Summary 和 Timeline，并通过版本化 `localStorage` 持久化数据。

这份 Wiki 面向二次开发与团队协作，内容以仓库当前 `main` 为代码基线，更新于 2026-08-12。

## 从这里开始

| 目标                       | 页面                                            |
| -------------------------- | ----------------------------------------------- |
| 在本机跑起来               | [本地开发与启动](Getting-Started.md)            |
| 理解模块和数据流           | [系统架构](Architecture.md)                     |
| 修改模型或业务规则         | [领域模型与业务规则](Domain-Model-and-Rules.md) |
| 处理缓存、Schema 或迁移    | [存储与迁移](Storage-and-Migrations.md)         |
| 找到某个功能应该改哪些文件 | [功能开发指南](Feature-Development-Guide.md)    |
| 补测试并完成验收           | [测试与质量门禁](Testing-and-Quality.md)        |
| 提交代码和发起评审         | [协作与 PR 规范](Collaboration-Guide.md)        |
| 排查本地数据和常见异常     | [故障排查](Troubleshooting.md)                  |

## 产品能力

- 多项目创建、切换、编辑、删除和最近项目恢复。
- 项目内成员管理，以及任务负责人和报告人关联。
- Backlog 排序、任务跨 Sprint 规划，以及完整 Sprint 生命周期。
- 四状态 Board，支持指针和键盘拖拽，并持久化顺序。
- Summary 派生指标、组合筛选和只读 Timeline。
- 中文/英文与 Light/Dark 主题偏好；旧的 `system` 值会按当前系统主题一次性解析为显式选项。
- 首次使用引导、错误恢复、响应式布局和基础无障碍支持。

## 当前边界

当前版本是浏览器本地应用，不包含真实登录、邮件邀请、角色权限、云端同步、多人实时协作、并行活动 Sprint、评论、报表、版本、依赖关系或 Timeline 轴上拖拽。界面中的本地成员不代表真实账号或邀请状态。

## 权威资料

- [产品需求 PRD](https://github.com/CHENG-LIANG1/ForceTrack/blob/main/PRD.md)
- [MVP 技术设计](https://github.com/CHENG-LIANG1/ForceTrack/blob/main/TECHNICAL_DESIGN.md)
- [多项目技术设计](https://github.com/CHENG-LIANG1/ForceTrack/blob/main/MULTI_PROJECT_TECHNICAL_DESIGN.md)
- [发布验收证据](https://github.com/CHENG-LIANG1/ForceTrack/blob/main/ACCEPTANCE.md)

当 Wiki、设计文档和代码不一致时，以当前 `main` 的领域 Schema、测试和验收记录为准，并在同一个 PR 中同步修正文档。
