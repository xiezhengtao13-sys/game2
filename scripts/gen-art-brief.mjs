// Generates the art brief: one row per asset, ready to feed to an image
// generator.
//
//   npm run art:brief
//
// Output: docs/美术需求.md
//
// This is generated rather than hand-written so it can never drift out of sync
// with the manifest -- adding an asset automatically adds its row.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadTsModule } from "./lib/load-ts.mjs";
import { manifestEntry, projectRoot } from "./lib/paths.mjs";

const outFile = join(projectRoot, "docs", "美术需求.md");
const { ALL_ASSETS } = await loadTsModule(manifestEntry);

const CATEGORY_LABELS = {
  terrain: "地形瓦片",
  character: "角色",
  fixture: "场景物件（家具与设备）",
  item: "物品图标",
  ui: "界面元素"
};

const lines = [
  "# 美术需求",
  "",
  "> **本文件由 `npm run art:brief` 自动生成，请勿手工编辑。**",
  "> 素材的唯一事实来源是 `src/game/assets/manifest.ts`；改 manifest 后重新生成本文件。",
  "",
  "## 怎么用",
  "",
  "每行一个素材。把 `英文描述` 一列直接作为图像生成提示词使用，",
  "出图后按 `文件名` 一列命名，放进 `assets/sprites/` 即可自动生效——**不需要改任何代码**。",
  "",
  "生成时请注意：",
  "",
  "- 尺寸列是硬性要求，出图后需缩放到该尺寸",
  `- 锚点 \`bottom-center\` 表示图片底边中点会落在格子上，角色与建筑要留出底部对齐的余地`,
  "- 透明背景（PNG alpha）",
  "- 统一风格：扁平 2D 矢量、深色描边、圆润造型、无透视",
  "",
  `共 ${ALL_ASSETS.length} 个素材。`,
  ""
];

for (const category of ["terrain", "character", "fixture", "item", "ui"]) {
  const specs = ALL_ASSETS.filter((a) => a.category === category);
  if (specs.length === 0) continue;

  lines.push(`## ${CATEGORY_LABELS[category] ?? category}`, "");
  lines.push("| 文件名 | 名称 | 尺寸 | 锚点 | 中文说明 | 英文描述（提示词） |");
  lines.push("|---|---|---|---|---|---|");

  for (const spec of specs) {
    const file = `${spec.id}.png`;
    const size = `${spec.size.w}×${spec.size.h}`;
    // Escape pipes so a description can never break the table.
    const clean = (s) => s.replace(/\|/g, "\\|");
    lines.push(
      `| \`${file}\` | ${clean(spec.nameZh)} | ${size} | \`${spec.anchor}\` | ${clean(spec.descZh)} | ${clean(spec.descEn)} |`
    );
  }
  lines.push("");
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, lines.join("\n"), "utf8");

console.log(`Wrote art brief for ${ALL_ASSETS.length} asset(s) to docs/美术需求.md`);
