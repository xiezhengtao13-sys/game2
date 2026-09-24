# 测试

## 怎么跑

```bash
npm test
```

产出示例：

```
▶ DemoWorld bounds (TASK-002)
  ✔ cannot leave the play area moving right (0.57ms)
  ...
ℹ tests 17
ℹ pass 17
ℹ fail 0
All 1 test file(s) passed.
```

## 为什么不用 Vitest

计划里原本要引入 Vitest，**实测在本环境无法运行**，因此改用 `node:test` + 自建 runner。

失败原因不是安装问题，而是环境限制：

```
Error: spawn EPERM
    at ensureServiceIsRunning (.../esbuild/lib/main.js:2272:29)
    at bundleConfigFile (.../vite/dist/node/chunks/config.js:35895:23)
```

Vite（以及被它用来做 TS 转换的 esbuild）走的是 esbuild 的 **service API**：启动一个长期存活、
用管道（pipe）通信的子进程。DSH 工作区沙箱禁止带管道的子进程，所以 `vitest run` 连配置文件都
加载不了，直接死在启动阶段。

这一点已逐一排除其他可能：

| 检查 | 结果 |
|---|---|
| esbuild 二进制本身可用吗 | ✅ `npx esbuild --version` → `0.28.2` |
| esbuild 的 **CLI** 可用吗 | ✅ 可用（`run-tests.mjs` 正是靠它） |
| esbuild 的 **service API** 可用吗 | ❌ `spawn EPERM` |
| `node --test <files>` 可用吗 | ❌ 它对每个测试文件派生子进程，同样 `spawn EPERM` |

结论：**凡是需要派生子进程的工具链，在此沙箱下都不可用**；只跑纯 `node` 进程的可用。

> 如果你在普通终端（不受沙箱限制）里跑，`npx vitest run` 是可以工作的。换回 Vitest 的成本很低：
> 把 `tests/*.test.ts` 里的 `node:test` / `node:assert` 换成 `vitest`，
> 恢复 `vitest.config.ts`，并把 `package.json` 的 `test` 脚本改回 `vitest run`。

## 自建 runner 的工作原理

`scripts/run-tests.mjs`：

1. 递归找出 `tests/**/*.test.ts`
2. 用 **esbuild CLI** 把每个测试文件打成单文件 ESM bundle，输出到系统临时目录
   （放临时目录是为了不污染 `tests/`，也避免 `tsconfig` 把产物当源码扫描）
3. 对每个 bundle 跑一次 `node <bundle>`，聚合退出码

代价：**测试文件之间没有进程隔离**（`node --test` 的每文件隔离用不了）。当前够用；
如果将来出现需要隔离的测试（例如互相污染全局状态），再说。

### 测试里怎么拿到项目根目录

测试被打包到临时目录后再运行，所以 **`import.meta.url` 指向的是临时目录，不是 `tests/`**，
不能用它推算项目根目录。runner 会通过环境变量把根目录传进来：

```ts
const projectRoot = process.env.TOWN_PROJECT_ROOT;
if (!projectRoot) throw new Error("TOWN_PROJECT_ROOT is not set; run tests via `npm test`");
```

需要读文件的测试（例如 `tests/assets.test.ts` 校验生成的 PNG）都走这条路。

## 测试里不能用的东西

- **不要 import 依赖 `import.meta.glob` 的模块**（如 `src/game/assets/index.ts` 的
  `loadGameAssets`）。那是 Vite 的构建期转换，在 `node` 下不存在。
  把需要测试的**纯逻辑单独导出**，例如同文件里的 `selectAssetSource` 就是为此拆出来的。
- 不要依赖浏览器 API。`src/game` 本就不该有，`src/engine` 里有（如 `AssetLoader` 用 `Image`），
  所以引擎里可测的部分要尽量抽成纯函数。

## 无头浏览器验证（截图与 DOM 检查）

本沙箱下 Chromium 需要命名管道，**默认会被拒绝**，必须单独授权。已验证可用的命令：

```powershell
msedge --headless=new --disable-gpu --hide-scrollbars --window-size=1280,800 `
  --virtual-time-budget=6000 `
  --screenshot="<out.png>" --user-data-dir="<workspace>/.shot-profile" `
  "http://localhost:4321/"
```

`--virtual-time-budget` 会让游戏真正推进几秒再截图，所以能验证动画与相机跟随，不只是首帧。

### 怎么读到游戏内部状态

Canvas 对外是不透明的，截图只能看像素，所以游戏会把实时状态写进一个隐藏的
`#debug-probe` 元素，并在 `window.__probe()` 暴露同一份数据：

```powershell
msedge --headless=new --disable-gpu --virtual-time-budget=6000 `
  --user-data-dir="<workspace>/.shot-profile" --dump-dom "http://localhost:4321/"
```

输出里搜 `id="debug-probe"` 即可拿到 JSON（相机、玩家坐标、精灵帧的屏幕位置等）。

### 用像素验证渲染位置时的坑

**不要拿两次不同页面加载的数据互相比较。** 曾经因此误判了整整一轮：
一次加载读到的相机坐标，与另一次加载截出的图，被当成同一帧来解释，于是得出
「渲染位置不对」的错误结论，实际代码完全正确。

要比较就用同一次加载：加 `?debug=1`，游戏会在 canvas 里画出标记
（原点 6×6、精灵帧左上角 3×3），标记和状态来自同一帧。

另外注意 **canvas 被 CSS 缩放过**（`max-height: calc(100vh - 40px)`），
浏览器窗口不是 1280×800 时，屏幕坐标 ≠ canvas 坐标，比对前必须先算出缩放比。
先从截图里找 `#1b1b1b` 背景的范围即可推出来。

### 美术有没有真的加载：不能靠眼睛看

**这是本项目最贵的一课。** 有一段时间所有精灵都渲染成兜底的纯色方块，
而**截图看上去完全正常**——草地是绿的，路是棕的，房子有米色墙和红屋顶。
因为兜底色块是按素材的真实配色挑的，肉眼根本分不出来。
结果：从 TASK-102 到 TASK-112，横跨十个任务，「已目视确认」的截图里
其实一张图都没加载过。

两个原因叠在一起，而且**两个都不报错**：

1. `import.meta.glob?.(...)` 不会被 Vite 转换。Vite 按字面文本匹配
   `import.meta.glob(`，写成可选调用形式它就不认，运行时求值为 undefined。
   动机本是让模块在 Node 下也能 import——代价是整个取图机制静默失效。
2. `loadGameAssets()` 只加载一份手写清单（玩家帧 + 瓦片），
   建筑、作物、物品、UI 全都没被请求过。

所以 **判断美术是否加载，必须看状态而不是看画面**：

```powershell
msedge --headless=new --disable-gpu --virtual-time-budget=8000 `
  --user-data-dir="<workspace>/.shot-profile" --dump-dom "<url>"
```

然后读 `#debug-probe` 里的 `artMissingCount` 与 `artFailureCount`——
两者都必须为 `0`。这两个数字比任何截图都可靠。

推论：**兜底色要挑得丑一点**。好看的兜底色块会掩盖「图没加载」这件事。

## 写测试的约定

- 测试放在 `tests/`，文件名 `*.test.ts`
- 用 `node:test` 的 `describe` / `test`，断言用 `node:assert/strict`
- **不要为了测试给生产代码开后门**。参照 `tests/demo-world.test.ts`：
  它通过公开的 `render()` 接口 + spy 观察玩家位置，而不是加一个 `getPlayerForTest()`
- `src/game` 不依赖 DOM，所以纯逻辑测试都应在 Node 下直接跑，不需要 jsdom
- 适合自动测试的功能**必须**补测试（`docs/AGENT_RULES.md` Definition of Done）

## 新增测试后必须做的验证

新写的测试要通过，但**光通过不算数**——不能失败的测试没有价值。
每加一条断言，都至少手动制造一次它要抓的错误，确认测试确实变红。例如：

```bash
# 临时把钳制上界改成 WORLD_WIDTH（错误写法），确认测试失败
npm test   # 应看到 ✖ 与 exit code 1
```

TASK-101 建立时就做过这一步：把钳制上界改错 → 5 条失败；
去掉斜向归一化 → 4 条失败（`expected 353.55 to be within 5e-10 of 250`）。
