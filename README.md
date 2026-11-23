# ✦ 离散星海 · 卡戎号残响 (Discrete Star Sea: Echoes of Charon)

> **地球历 2491 年（《守望协定》第 3 年）** —— 一款 **Undertale / Deltarune 风格**的高对比像素硬科幻弹幕 RPG。  
> 驾驶「拓荒者一号」孤身登临失联三年的姐妹舰「卡戎号」残骸：**强攻（FIGHT）** 还是 **干预与解耦（ACT + MERCY）**，你的每一次抉择都将改写结局。

<p align="center">
  <a href="https://codespaces.new/xiezhengtao13-sys/game2?quickstart=1">
    <img src="https://img.shields.io/badge/%E2%98%81%EF%B8%8F_%E4%BA%91%E7%AB%AF%E4%B8%80%E9%94%AE%E6%B8%B8%E7%8E%A9-GitHub_Codespaces-22c55e?style=for-the-badge&logo=github" alt="GitHub Codespaces 一键云端游玩" />
  </a>
  &nbsp;
  <a href="https://xiezhengtao13-sys.github.io/game2/">
    <img src="https://img.shields.io/badge/%F0%9F%9A%80_%E6%B5%8F%E8%A7%88%E5%99%A8%E7%A7%92%E5%BC%80%E7%9B%B4%E7%8E%A9-GitHub_Pages-38bdf8?style=for-the-badge&logo=githubpages" alt="GitHub Pages 在线直玩" />
  </a>
  &nbsp;
  <a href="https://stackblitz.com/github/xiezhengtao13-sys/game2/tree/main/agent_web_game_starter">
    <img src="https://img.shields.io/badge/%E2%9A%A1_%E4%BA%91%E7%AB%AF_IDE_%E8%BF%90%E8%A1%8C-StackBlitz-f59e0b?style=for-the-badge&logo=stackblitz" alt="StackBlitz 云端运行" />
  </a>
</p>

---

## 🎮 云端一键游玩入口（浏览器直接运行）

| 入口方式 | 直接点击启动 | 特点与说明 |
| :--- | :--- | :--- |
| **☁️ GitHub Codespaces（私有仓库直接可用）** | **[▶ 一键云端启动游玩](https://codespaces.new/xiezhengtao13-sys/game2?quickstart=1)** | 点击后在 GitHub 云端容器自动启动内置零依赖服务（`8080` 端口），并自动弹出浏览器窗口即刻开玩；**无需公开仓库、无需本地安装任何环境**。 |
| **🚀 GitHub Pages（0 秒免加载直玩）** | **[▶ https://xiezhengtao13-sys.github.io/game2/](https://xiezhengtao13-sys.github.io/game2/)** | 静态托管单文件完整版（仅 `134 KB`），点击秒开、支持分享给好友直玩。<br><sub>※ 当前仓库为 Private，需在 GitHub 仓库 `Settings → Pages → Source` 选择 `GitHub Actions`（免费版账号需先将仓库设为 Public）后自动激活。</sub> |
| **⚡ StackBlitz（浏览器 WebContainers）** | **[▶ 在 StackBlitz 中启动](https://stackblitz.com/github/xiezhengtao13-sys/game2/tree/main/agent_web_game_starter)** | 浏览器内直接运行 Vite 源码并实时热重载（适合公开仓库边玩边改）。 |

> 💡 **单文件离线兜底**：仓库根目录的 [`index.html`](./index.html)（以及 [`game.html`](./game.html)）均为 **100% 自包含单文件 HTML**，直接下载双击即可用任意浏览器离线畅玩。

---

## 🕹️ 操作指南

| 按键 / 控制 | 功能说明 |
| :--- | :--- |
| **`WASD`** 或 **`方向键`** | 探索移动 / 红心自由闪避 / **蓝心 `0.45g` 跳跃** / **绿心四向举盾格挡** |
| **`Shift`**（弹幕中按住） | 低速微调闪避模式 |
| **`Z` / `Enter` / `空格`** | 调查互动 / 确认对话与选项 / **FIGHT 暴击命中** / **黄心向上发射脉冲炮** |
| **`X` / `Esc`** | 返回上级菜单 / 立即显示整行对话 |
| **`C` / `Tab`** | 探索界面打开随身补给包与船员档案（`ITEM / STAT`） |
| **`M`** 或右下角 **`🔊 音效`** | 开关内置 WebAudio 芯片音乐与角色语音 |
| **`F`** 或右下角 **`⛶ 全屏`** | 切换全屏沉浸模式 |

*(战斗菜单、对话与暴击条同样支持**鼠标直接点击**操作)*

---

## 🌟 核心玩法与亮点

1. **开局 15 秒直入高潮 · 5 大高密度残骸舱段**
   - `01 破损对接气闸`（迎宾终端突袭教学）→ `02 冰封生态与休眠长廊`（三联继电器解谜 + `MED-07`）→ `03 寂静信号中继厅`（`MNA-01` 只读频道 + 连续体探针）→ `04 焦黑舰桥前廊`（投降白旗信标 + 复兴派处刑官瓦尔克）→ `05 破碎中枢 · 星海圣殿`（卡戎号残响 `CHARON-Ω`）。
2. **完整 4 色灵魂弹幕机制 + TP 擦弹共鸣**
   - ❤️ **自由核**（360° 闪避与摩斯电码激光网）｜ 💙 **0.45g 重力核**（跳跃躲避心电图冰柱）｜ 💛 **脉冲反击核**（射击摧毁同化节点）｜ 💚 **电磁护盾核**（四向盾反复兴派热能长矛与翻转黄矛）。
   - 贴近弹幕擦弹或精准盾反可积累左侧 **`TP` 槽**，触发专属 **「✦ 守望共鸣」**。
3. **真 · 多路线分支与 3 重结局**
   - **真·守望共鸣结局（全员和平解耦）** / **残响归航（中立）** / **真空寂灭（全灭清除线）**——若一路摧毁所有敌人，最终 Boss `CHARON-Ω` 将进入**终末复仇态**，先手突袭并**亲手斩断【MERCY 解耦】按钮**。
4. **纯代码高对比像素美术 + WebAudio 芯片音乐**
   - 全部动态 Boss 立绘、说话动画头像与远望号舷窗远景均以高对比像素实时渲染；内置 7 首独立复古合成器 BGM 与 11 种角色专属语音音效，零外部媒体依赖。

---

## 🛠️ 本地工程开发模式

```bash
git clone https://github.com/xiezhengtao13-sys/game2.git
cd game2/agent_web_game_starter
npm install
npm test                # 运行自动化战斗、四色灵魂与场景渲染测试
npm run dev             # 启动本地 Vite 开发服务器
npm run build:standalone # 重新打包单文件 dist/yuanwang_game.html
```

---

*© 2026 离散星海项目组 · 基于《离散星海》2491 守望协定世界观设定*
