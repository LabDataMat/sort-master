# Phaser 3 重制：交付报告

> 完成时间：2026-11-01
> 本地工程：`F:\Game3.0-Phaser`
> 仓库目录：`phaser-game/`
> 在线地址：https://labdatamat.github.io/sort-master/

## 一、结论

| 项目 | 结果 |
|---|---|
| 技术栈 | Phaser 3.90.0 + TypeScript 5.9.3 + Vite 5.4.21 |
| 核心玩法测试 | **33/33 通过**（Vitest） |
| 关卡数量 | **100 关 / 12759 件物品**，全部通过可解性验证 |
| 构建 | **成功**，`dist` 6.6MB |
| 部署 | **成功**，GitHub Actions 自动构建并发布 |
| 线上端到端验收 | **10/10 通过**（真实点击） |
| 不相邻三消 | **线上实测通过**（槽内 0/2/4 位三个相同物品消除） |

## 二、依赖版本

| 依赖 | 版本 |
|---|---|
| phaser | 3.90.0 |
| typescript | 5.9.3 |
| vite | 5.4.21 |
| vitest | 2.1.9 |

## 三、核心规则实现

`src/core/MatchSystem.ts` 以 `Map<itemId, SlotItem[]>` 计数，**不使用相邻匹配**：

- 任意 3 个相同即消除；
- 4 个 → 消除 3 留 1；6 个 → 两组；
- 消除后保持剩余物品相对顺序；
- 移除即不参与后续匹配，杜绝重复消除。

`MatchSystem` / `SlotManager` / `BoardModel` / `GameSession` 均不依赖 Phaser，可独立测试。

## 四、自动化测试

### 4.1 单元测试（`npm test`）

```
tests/match.test.ts     13 passed
tests/session.test.ts    8 passed
tests/level.test.ts      7 passed
tests/save.test.ts       5 passed
------------------------------------
合计                    33 passed
```

覆盖需求列出的全部用例：相邻/不相邻三消、两同不消、四同、六同、异类不误消、槽位释放、槽满判负、槽满可消、撤回、关卡加载、进度保存。

### 4.2 端到端验收（真实 Chrome）

脚本：`tools/phaser-e2e.mjs`

本地（`http://127.0.0.1:4173/sort-master/`）与线上（`https://labdatamat.github.io/sort-master/`）各执行一次，均为 10/10：

```
PASS  主菜单场景已激活
PASS  画布尺寸有效 [500x889]
PASS  三个不相邻相同物品可消除（真实点击 A,B,A,C,A） [槽内序列=cup,book,cup,book]
PASS  进入游戏并加载关卡 [L1 12件]
PASS  存在被遮挡物品（真实遮挡） [可点 5/12]
PASS  按解法点击可清空棋盘并通关 [victory]
PASS  过程中发生多次消除 [clears=4]
PASS  通关后写入存档
PASS  刷新后进度保留 [maxUnlocked=2]
PASS  全程无控制台错误
```

「不相邻三消」的验证方式：用真实鼠标点击构造 `A,B,A,C,A` 序列，三个 A 分别落在槽内第 0、2、4 位，消除后槽内不再有 A。

## 五、关卡数据

- 100 关，12759 件物品，物品数 12~150，层数 2~7，槽容量统一 7。
- 旧项目 JSON 为「规格」（无坐标），通过 `scripts/convert-levels.mjs` 转换：
  读取规格 → 调用旧项目生成器生成布局 → 按本项目规则完整模拟 → 验证通过后输出。
- 逐关可解性回放：**100/100 通过**；布局签名去重 ≥ 95，无大量重复关卡。

## 六、构建产物

```
dist/                        6.6MB
├── index.html               0.95KB
├── assets/index-*.js        27KB    (gzip 9.2KB)
├── assets/phaser-*.js       1.44MB  (gzip 340KB)
├── assets/index-*.css       0.33KB
├── assets/items/            844KB   (30 张)
├── assets/ui/               1.2MB   (43 张)
├── assets/audio/            1.2MB   (11 个)
└── levels/                  2.0MB   (100 关 JSON)
```

首屏加载以 Phaser 引擎为主（gzip 约 340KB）；关卡 JSON 进入关卡时按需 `fetch`，不一次性加载。

## 七、部署

`.github/workflows/pages.yml`：

1. 检出仓库
2. Node 20 + npm 缓存
3. `npm ci`
4. `npm test`（失败即终止，不会发布坏版本）
5. `npm run build`
6. 上传 `phaser-game/dist` 并部署 Pages
7. 支持 `workflow_dispatch` 手动触发

线上验证：

- `https://labdatamat.github.io/sort-master/` 返回 200，标题为「收纳大作战 Sort Master」；
- `assets/index-*.js`、`phaser-*.js`、`index-*.css`、`levels/level_100.json`、`assets/items/donut.png`、`assets/audio/bgm_home.wav` 均返回 200；
- 资源路径均为 `/sort-master/...` 相对子路径，未写死根域名。

## 八、已知说明

1. **音频自动播放**：移动端浏览器要求用户交互后才能播放，已改为首次指针事件时解锁并重试 BGM。
2. **npm 镜像**：本地 `.npmrc` 使用国内镜像加速；`package-lock.json` 已规范化为官方源地址，CI 可直接 `npm ci`。
3. **旧版保留**：`playable-preview/` 与 `UnityProject/` 仍保留在仓库中，但线上入口已切换为 Phaser 版；旧部署配置备份于 `.github/pages-preview.yml.bak`。
4. **洗牌语义**：仅在当前可点击物品之间交换类型，不改变位置与遮挡结构，因此不会破坏关卡合法性。
