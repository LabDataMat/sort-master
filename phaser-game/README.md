# 收纳大作战 Sort Master（Phaser 3 版）

2D 休闲收纳消除游戏，纯浏览器运行。

**核心规则**：收纳槽中**任意三个相同物品即消除，不要求相邻、不要求连续点击**。

- 在线试玩：https://labdatamat.github.io/sort-master/
- 技术栈：Phaser 3 + TypeScript + Vite
- 关卡：100 关，数据驱动，全部通过可解性验证

## 一、技术栈与版本

| 依赖 | 版本 |
|---|---|
| Phaser | 3.87.x |
| TypeScript | 5.6.x |
| Vite | 5.4.x |
| Vitest | 2.1.x |
| Node.js | ≥ 18（开发使用 22） |

## 二、本地运行

```bash
cd phaser-game
npm install
npm run dev        # 开发服务器 http://localhost:5173/sort-master/
```

生产构建与本地预览：

```bash
npm run build      # 类型检查 + 构建到 dist/
npm run preview    # http://localhost:4173/sort-master/
```

> `base` 固定为 `/sort-master/`，因此本地预览也必须带该子路径，才能与线上一致。

## 三、目录结构

```
phaser-game/
├── public/
│   ├── assets/items/      30 张物品图（240×240）
│   ├── assets/ui/         43 张 UI 图
│   ├── assets/audio/      BGM 2 + SFX 9
│   └── levels/            100 关 JSON
├── src/
│   ├── core/              纯逻辑（无 Phaser 依赖，可单测）
│   │   ├── MatchSystem.ts     消除规则（按 itemId 计数）
│   │   ├── SlotManager.ts     收纳槽容量与顺序
│   │   ├── BoardModel.ts      棋盘遮挡与可点击判定
│   │   ├── GameSession.ts     单局编排、撤回、提示、洗牌
│   │   ├── LevelLoader.ts     按需加载关卡
│   │   ├── LevelValidator.ts  结构与可解性校验
│   │   └── SaveManager.ts     localStorage 存档
│   ├── scenes/            Boot / Menu / LevelSelect / Game
│   ├── ui/                按钮、提示、图片工具
│   ├── theme.ts           设计分辨率、配色、资源清单
│   ├── audio.ts           BGM/SFX 管理
│   ├── services.ts        全局存档与加载器
│   └── main.ts            入口
├── scripts/convert-levels.mjs   旧项目关卡转换脚本
├── tests/                 Vitest 测试
├── vite.config.ts
└── package.json
```

## 四、核心玩法实现

`MatchSystem.resolveMatches` 以 `Map<itemId, SlotItem[]>` 分组计数：

| 场景 | 结果 |
|---|---|
| `A,B,A,C,A` | 三个 A 消除，剩余 `B,C`（**不相邻**） |
| `A,B,A` | 不消除 |
| `A,A,A,A` | 消除 3 个，剩余 1 个 |
| `A×6` | 两组消除 |
| `A,A,A,B,B,B` | 两组分别消除 |

- 消除后其余物品保持原有相对顺序；
- 物品一旦移除即不再参与匹配，机制上杜绝重复消除；
- `MatchSystem` / `SlotManager` 不依赖 Phaser，可独立测试。

遮挡规则：层号大者在上，同层时索引大者在上；两物品矩形宽高重叠均达到较小边的 35% 才算遮挡；被遮挡物品不可点击，上层移除后自动解锁。

## 五、关卡数据与转换

旧项目 `F:\Game3.0` 的关卡 JSON 只含**规格参数**（物品数、类型数、层数、半径等），坐标由旧项目运行时生成器产出，不能直接复制。

转换脚本 `scripts/convert-levels.mjs`：

1. 读取旧项目规格；
2. 调用旧项目生成器按固定种子生成布局；
3. 用**本项目规则**完整模拟（遮挡 → 拾取 → 计数式三消 → 容量 7 → 冰冻/锁定）；
4. 验证通过后写出 `public/levels/level_XXX.json`。

```bash
npm run convert
```

当前数据：100 关、12759 件物品、物品数 12~150、层数 2~7、槽容量统一 7，**100/100 通过可解性验证**。

## 六、测试

```bash
npm test
```

覆盖 33 项：

- 核心消除 13 项（含不相邻三消、四同、六同、顺序保持、不重复消除、槽满边界）；
- 单局流程 8 项（重复拾取、遮挡解锁、胜负判定、撤回、提示、洗牌）；
- 关卡 7 项（100 关加载、逐关可解性回放、布局不重复、类型资源齐全）；
- 存档 5 项（解锁、持久化、道具扣减、异常降级）。

另有真实浏览器端到端验收（仓库根目录 `tools/phaser-e2e.mjs`）：

- 真实点击构造 `A,B,A,C,A` 序列，验证**不相邻三消**；
- 按关卡解法逐击通关，验证遮挡、消除、胜利、存档与刷新保留；
- 当前结果：10/10 通过。

## 七、构建与部署

```bash
npm run build      # 产物 dist/（约 6.6MB，含图片/音频/关卡）
```

部署由 `.github/workflows/pages.yml` 自动完成：

1. 检出仓库；
2. `npm ci` 安装依赖；
3. `npm test` 运行测试（失败则终止）；
4. `npm run build` 构建；
5. 上传 `phaser-game/dist` 并部署到 GitHub Pages。

支持 `workflow_dispatch` 手动触发。所有资源使用 `import.meta.env.BASE_URL` 前缀，兼容 `https://labdatamat.github.io/sort-master/` 子路径。

## 八、适配与性能

- 设计分辨率 750×1334，`Phaser.Scale.FIT` 等比缩放并居中，适配 PC 与移动端；
- 指针事件统一处理鼠标与触屏；
- 启动只预加载 30 物品 + 21 UI + 11 音频；关卡 JSON 进入关卡时按需 `fetch`；
- Phaser 单独分包（gzip 约 340KB），业务代码约 9KB（gzip）；
- 粒子与 Tween 数量受控，无逐帧对象创建。

## 九、说明

- 存档键：`sort_master_phaser_v1`（localStorage），刷新/关闭浏览器后保留。
- 音频在移动端需首次交互后解锁，已在首次指针事件中处理。
- `npm install` 使用国内镜像（`.npmrc`）；`package-lock.json` 已规范化为官方源地址，CI 可直接 `npm ci`。
