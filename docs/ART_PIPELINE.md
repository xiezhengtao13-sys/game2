# 美术管线

## 核心约束

**代码里不允许出现任何硬编码的精灵图。**

因为本项目的美术路线是：**先用占位色块跑通玩法，之后再用生成式 AI 出正式图**。
如果代码里散落着 `"player.png"` 这样的路径或 `32` 这样的尺寸，替换美术就会变成一场
全代码库的搜索替换。所以规则是：**游戏代码只通过 id 引用素材，永远拿不到文件路径。**

## 机制

### 1. 单一事实来源：`src/game/assets/manifest.ts`

每个视觉元素一条记录：

```ts
export interface AssetSpec {
  id: string;              // "crop_wheat_stage2"
  nameZh: string;          // "小麦·成熟"
  descZh: string;          // 中文描述，供人阅读
  descEn: string;          // 英文描述，直接喂给图像生成模型
  size: { w: number; h: number };
  anchor: "center" | "bottom-center";  // bottom-center 让物体"站"在格子上
  placeholder: PlaceholderRecipe;       // 占位色块怎么画
}
```

`descEn` 是**给图像生成模型的提示词**，所以要写得具体：
视角、构图、配色、线条风格都要交代，而不是只写"小麦"。

### 2. 生成占位图

```bash
npm run art
```

把所有 spec 渲染成 `assets/generated/<id>.png`（用 esbuild + Node 生成，
**不引入 Pillow 等额外依赖**）。

### 3. 生成美术需求单

```bash
npm run art:brief
```

产出 `docs/美术需求.md`：一张表格，每行一个素材，含 id、尺寸、锚点、中英文描述。
**直接拿去喂图像生成工具**，不需要再手工整理。

### 4. 运行时兜底

`AssetLoader` 的查找顺序：

1. `assets/sprites/<id>.png` —— **正式美术放这里**
2. `assets/generated/<id>.png` —— 占位图
3. 内存中程序化画的兜底色块（连占位图都缺时，保证不崩）

### 5. 替换美术 = 放文件

把 AI 生成的图按 `<id>.png` 命名丢进 `assets/sprites/`，**代码一行都不用改**。

## 为什么占位图必须"看得出区别"

占位色块也不能糊弄：小麦的三个生长阶段必须有肉眼可辨的差异，
否则玩家（和我）根本看不出作物熟了没有。占位阶段同样要能验证玩法。

## 已知代价

占位美术的观感会明显低于"童年梦想中的游戏"。这是刻意的取舍：
先用最低成本验证玩法是否成立，再投入美术。**Milestone 2 结束时是一次检查点**——
如果那时看着提不起劲，应该先做美术替换，而不是继续堆功能。
