# assets/sprites/ —— 正式美术放这里

这个目录一开始是空的（甚至不存在）：在放进第一张正式图之前，游戏用的是
`assets/generated/` 里的占位图。

## 怎么用

1. 按 `docs/美术需求.md` 里的 `文件名` 一列命名，例如 `tile_deck.png`、`fx_desk.png`、
   `crew_down_walkA.png`
2. 直接丢进这个目录（**平铺，不要建子目录**——构建期的 glob 只匹配
   `assets/sprites/*.png`）
3. 重启 `npm run dev`（第一次新建这个目录时尤其要重启，见下）
4. `npm test`

放进来就生效，**不需要改任何代码**：`assets/sprites/<id>.png` 优先于
`assets/generated/<id>.png`，找不到才退回占位图。

## 为什么第一次要重启开发服务器

`src/game/assets/index.ts` 里的 `import.meta.glob` 是**构建期**解析的。目录不存在时
它匹配到空集合，也没建立起对目录的监听，所以新建目录、丢进第一批图之后，
Vite 不一定会发现——重启一次最省事。

（这个坑有前科：曾经 `import.meta.glob?.(...)` 写成可选调用，Vite 不认，
结果十个任务里所有精灵都在静默使用兜底色块，而截图看上去完全正常。）

## 别靠眼睛确认图有没有加载

放完图之后看 `#debug-probe` 里的 `artMissingCount` 与 `artFailureCount`，
两个都必须是 `0`。方法见 `docs/TESTING.md`。

## 自动化守卫

`tests/assets.test.ts` 会读磁盘上的真实文件，检查：

- 每个 manifest 素材都有占位图（漏了会提示 `npm run art`）
- 两个目录里**没有 manifest 不认识的 PNG**（文件名打错时，游戏只会继续画占位图，
  看起来像是故意的——所以在这里拦住）
- 每张 PNG 的**像素尺寸等于 manifest 声明值**（尺寸不对会被拉伸变形，肉眼很难判断）
- `assets/sprites/` 优先于 `assets/generated/`

所以尺寸或文件名不对时，`npm test` 会直接变红，而不是等到玩的时候觉得"哪里怪怪的"。
