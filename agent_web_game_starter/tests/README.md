# tests

纯逻辑单元测试放这里，文件名 `*.test.ts`。

```bash
npm test
```

用 `node:test` + `node:assert/strict`。**为什么不是 Vitest、以及完整约定，见
[`docs/TESTING.md`](../docs/TESTING.md)。**

## 约定

- 通过**公开接口**观察被测对象，不要为了测试给生产代码加 `xxxForTest()` 之类的后门。
  参考 `demo-world.test.ts`：它用 spy 截获 `render()` 画出的矩形来读玩家位置。
- `src/game` 不依赖 DOM，所以纯逻辑测试直接在 Node 下跑，不需要 jsdom。
- 新增测试后**必须制造一次它要抓的错误**，确认测试真的会失败。不会失败的测试没有价值。
- 浏览器端 E2E / 截图验证不属于这里，目前由人工按需执行；方案见
  [`docs/TESTING.md`](../docs/TESTING.md) 的说明。
