# Agent Rules

## 基本原则
1. 修改任何功能前先阅读 README.md、TASKS.md。
2. 只实现当前任务要求，不主动扩展框架。
3. 禁止为了“未来可能需要”增加复杂抽象。
4. `src/game` 不直接调用 DOM API。
5. 浏览器相关能力集中在 engine/platform/ui。
6. 新增 public API 时，应说明其使用者。
7. 完成任务后必须执行构建检查。
8. 不顺手重构无关代码。
9. 一次 Task 尽量对应一次独立提交。

## Definition of Done
一个 Task 只有同时满足以下条件才算完成：
- 功能实现
- TypeScript 编译通过
- 无明显 Console Error
- 验收条件全部满足
- 若功能适合自动测试，则补充测试
