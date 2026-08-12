# 故障排查

## 页面刷新后 404

开发服务器通常不会有此问题。静态部署需要配置 SPA fallback，把未知路径返回 `index.html`；否则 `/projects/:projectId/board` 等直接访问会失败。

## 应用提示已恢复数据

V3 Workspace 或 Preferences 解析失败时，Repository 会备份原始字符串并恢复旧数据或 Seed：

- `forcetrack:recovery:workspace:last-invalid`
- `forcetrack:recovery:preferences:last-invalid`

先在浏览器 DevTools 的 Application → Local Storage 中复制这些值，再尝试修复。不要直接覆盖备份，也不要让旧 V1/V2 数据覆盖合法 V3。

## 保存失败但页面仍然更新

这是预期的降级行为：Provider 先更新内存，再串行保存。浏览器禁用存储、配额不足或 `setItem` 抛错时，当前页面仍可操作，但刷新可能丢失变化。

检查：

1. 浏览器是否允许该站点使用 localStorage。
2. 控制台是否有存储相关错误。
3. 是否出现应用内持久化失败提示。
4. 后续一次成功保存是否清除了提示。

## 跳到了错误项目

- 检查 URL 的 `projectId` 是否存在。
- 检查 `forcetrack:preferences:v2` 中的 `lastProjectId` 和 `recentProjectIds`。
- 合法项目化 URL 优先于偏好；根路径和旧路由才使用最近项目回退。
- 路由必须通过 `src/app/route-paths.ts` 生成。

## Board 为空

Board 只显示当前项目 active Sprint 的任务。依次确认：

1. 当前项目是否有 active Sprint。
2. Sprint 是否包含至少一个 Task。
3. Task 的 `sprintId` 是否指向该 active Sprint。
4. 是否误把 Backlog `rank` 当作 Board `position` 修改。

## Sprint 无法启动

启动要求：Sprint 为 planned、日期完整且有效、至少有一个任务，并且同项目不存在其他 active Sprint。不同项目的 active Sprint 不冲突。

## 拖拽测试偶发失败

- 确认没有旧的 `pnpm dev` 占用 `127.0.0.1:4173`。
- 指针拖拽和键盘拖拽应分别排查。
- 多列 Board 使用自定义横向键盘坐标策略，不要退回 dnd-kit 默认策略。
- 断言最终状态和刷新后的持久化状态，不只断言 DragOverlay。
- `ResizeObserver` 消息不能自动视为业务失败；结合 page error、console 和最终 DOM 判断。

## 清空本地数据重新开始

该操作会删除当前站点的本地项目、任务和偏好，且无法从应用内恢复。先导出或复制需要保留的 Local Storage 值，再在 DevTools 中逐项删除 `forcetrack:*` key 并刷新。

不要在共享调试环境或用户浏览器中未经确认执行清空操作。

## 测试环境异常

```bash
node --version
pnpm --version
pnpm install
pnpm exec playwright install chromium
pnpm check
```

项目要求 Node 24 和 pnpm 10。若只在 E2E 失败，先检查 4173 端口、Chromium 安装以及 Playwright HTML report/trace。

仍无法定位时，在 Issue/PR 中附上最小复现、当前路由、浏览器与 viewport、相关 localStorage key 的结构（不要贴敏感数据）、完整命令和首个错误。
