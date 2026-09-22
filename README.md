# Agent Web Game Starter

一个面向 Agent 协作的轻量 2D Web 游戏骨架。

## 技术栈
- TypeScript
- Vite
- Canvas2D
- HTML/CSS
- Vitest（后续）
- Playwright（后续）

## 当前目标
先完成一个最小可玩闭环：
1. 打开页面
2. 玩家可移动
3. 敌人生成并追踪玩家
4. 玩家和敌人发生简单交互
5. 可以失败 / 重开

## 开发原则
1. 游戏世界进入 Canvas，不把角色/敌人做成 DOM。
2. `src/game` 不直接依赖浏览器 API。
3. `src/engine` 只实现当前游戏真正需要的能力。
4. 每个功能都通过独立 Task 实现。
5. Agent 修改前先阅读 `docs/AGENT_RULES.md` 与 `TASKS.md`。
6. 不提前设计通用游戏引擎。
