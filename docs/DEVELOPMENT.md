# DEVELOPMENT.md — 开发与运行指南

## 环境要求

| 组件 | 要求 | 本机状态（开发时检测） |
|---|---|---|
| Node.js | ≥ 18 | ✅ v22.22.2 |
| Cocos Creator | 3.8.x 稳定版 | ❌ 未安装（工程按 3.8.6 API 编写） |
| 微信开发者工具 | 最新稳定版 | ❌ 未安装 |

Cocos Creator 通过 [Cocos Dashboard](https://www.cocos.com/creator-download) 安装，选择 3.8.x 稳定版本。

## 首次在 Cocos Creator 中打开工程

1. 打开 Cocos Dashboard → 项目 → 导入 → 选择 `F:/Game3.0` 目录（package.json 中 `creator.version: 3.8.6`）。
2. 首次导入时编辑器会自动为缺失 `.meta` 的资源生成 meta 文件（物品图/音频/关卡 JSON/未内置 meta 的脚本）。
   - 三个场景文件与三个场景控制器脚本已内置固定 UUID 的 meta，保证场景对控制器的引用有效。
3. 打开 `assets/scenes/loading.scene` 并点击预览（▶）。

### 如果场景文件加载异常（低概率）

场景为免手工错误采用了最小结构。若编辑器报场景反序列化错误，手工重建 1 分钟即可：

1. 新建场景，删除默认灯光，添加 Canvas（自带 Camera）。
2. Canvas 下建空节点 `Root`。
3. 给 Root 挂载对应控制器组件：
   - loading 场景 → `LoadingSceneCtl`
   - home 场景 → `HomeSceneCtl`
   - game 场景 → `GameSceneCtl`
   - collection 场景 → `CollectionSceneCtl`
4. 项目设置 → 项目 → 设计分辨率：750×1334，勾选"适配宽度"。
5. 保存为同名场景文件。

所有 UI 由控制器代码在运行时构建（见 `assets/scripts/ui/UIFactory.ts`），场景本身无需摆放元素。

## 本地逻辑测试（无需编辑器）

```bash
npm install
npx tsc -p tsconfig.node.json     # 编译纯逻辑 + 测试
node build/tests/run.js           # 47 项测试
```

测试覆盖：三消/遮挡/冰冻/锁定/撤回/洗牌/移除/加槽/胜负/状态机/经济/签到/存档迁移/广告幂等/关卡结构/可解性复验/预览端到端（jsdom 真实 DOM 点击流程）。

### 语法检查 Cocos 脚本（无需编辑器）

```bash
npx tsc -p tsconfig.check.json    # 用 cc 类型桩做全量类型/语法检查
```

## 浏览器预览

```bash
node tools/serve.mjs 8377
# http://localhost:8377/playable-preview/index.html
```

预览与 Cocos 版共用 `gameplay/logic` 纯逻辑核心。改逻辑后重新打包（esbuild 单文件 bundle）：

```bash
npx esbuild playable-preview/src/preview-main.ts --bundle --format=esm --target=es2020 --outfile=playable-preview/build/preview-main.js
```

真实浏览器端到端验证（puppeteer-core + 本机 Chrome 无头，捕获控制台错误 + 真实点击）：

```bash
node tools/browser-verify.mjs   # 12 项检查 + 截图到 docs/screenshots/
```

## 重新生成资源

```bash
cd tools
npm install                 # @resvg/resvg-js
node gen-art.mjs            # 30 物品 + UI 素材（SVG→PNG）
node gen-audio.mjs          # 音效 + BGM（WAV）
node gen-levels.cjs         # 生成 + 校验 + 可解性验证 100 关
node gen-scenes.cjs         # 重新生成场景文件（一般不需要）
```

### 集中式物品堆算法（第四轮）

`tools/gen-levels.cjs` 的几何生成：

1. **主堆区域**：中心 (375, 470)，半径按难度 150→255（硬上限 255，保证整堆在 734×920 棋盘安全区内）。
2. **深度层**：2~7 层，层数权重 `0.75 + 0.55*(1-|l-mid|/mid)`（中间层最厚）。
3. **受控随机**：极坐标采样 `r = R·shrink(l)·(0.34+0.6·√rand)`，少量物品（8%~10%）外溢到边缘；
   每层有随机中心偏移（±26/±22）与旋转（±0.28rad），上层半径按 `1-0.075·l` 收窄。
4. **同层间距**：按难度 58→27px 递减（越难越密），不足时取 40 次采样中的最优解。
5. **密度自适应**：5×5 采样统计每个物品的可见面积（考虑 z 序），
   若完全不可见比例 >45% 或平均可见率 <15%，则自动扩堆（≤255）/加间距（≤50）/减层（≥5），最多 16 轮，保底可用。
6. **居中与裁剪**：按包围盒中心对齐棋盘中心，位置裁剪进安全区。
7. **遮挡推导**：`occlusion.derivedFromGeometry=true` + `edgeCount` 摘要；
   运行时 `OcclusionGraph` / 求解器 / 校验器统一按几何 + z 序推导（同层数组靠后在上）。

### 关卡生成与验证说明（构造式，保证可解）

`tools/gen-levels.cjs` 对每关执行：
1. 生成几何布局（2~6 层、同层最小间距 78px、z 序遮挡边，与运行时 `OcclusionGraph` 完全一致）。
2. 求一条合法**剥离顺序**：反复取当前未被遮挡的物品并移除（等价于真实点击可达性）。
3. 沿剥离顺序用**安全连续匹配模式**分配类型（峰值槽位 ≤6）：
   - `[A,A,A]`、`[A,A,B,B,B,A]`、`[A,A,B,B,B,C,C,C,A]`、`[A,B,B,B,A,A]`
   - 因此按该顺序游玩必然通关（在"连续三个相同才消除"规则下成立）。
4. 障碍（冰冻/锁定）放在剥离顺序靠后位置，保证拾取时已解冻/解锁。
5. 用与游戏完全相同的规则**回放**该序列，全部消除才写 `solutionValidation.verified=true`，
   并把序列存入 `solutionValidation.solution`。
6. 自动化测试用 `GameSession` 逐关回放该序列（比搜索更强的存在性证明）。

**未通过验证的关卡不会标记为正式关卡**（manifest 会列出 unverified）。

### 三消规则与遮挡语义（重要）

- 消除唯一规则：槽内**三个连续相同**才消除（`MatchManager`），单轮扫描后左补位一次；
  绝不做"全局同类计数≥3"的判定。
- 遮挡 z 序：层号大者在上；同层时数组靠后者渲染在上（预览与 Cocos 均按数组顺序建节点）。
  任何在视觉上盖住物品中心的遮挡者必然构成 ≥35% 重叠的遮挡边 → 该物品不可点击，
  因此"逻辑可点击"与"视觉可点击"严格等价（L25 实测 0 不一致）。

## 收藏 / 成长 / 奖励流程（第二轮新增）

- `collection/CollectionData.ts`：48 件收藏品（4 系列 × 12，4 稀有度）、里程碑表、稀有度关卡门槛。
- `collection/CollectionManager.ts`：确定性发奖（首次通关必得 / 里程碑指定 / 稀有度渐进）、重复转碎片、碎片兑换、系列完成解锁主题。
- `systems/progress/ProgressManager.ts`：玩家等级（EXP）、每日任务（4 项，事件驱动）、里程碑奖励。
- `ui/ChestUI.ts`：分阶段开箱（出现 → 晃动 → 开启 → 光效 → 收藏品弹出 → NEW → 进度 → 下一关）。
- `scenes/CollectionSceneCtl.ts`：收藏册场景（4 系列 tab、12 格网格、剪影、详情、兑换）。
- **奖励在通关时即结算并持久化**（宝箱动画只做展示），按 `chest:runId:levelId` 幂等，避免玩家中途退出丢失奖励。

## 存档 v2

新增字段：`levelStars / playerLevel / playerXp / collection / fragments / seriesCompleted / dailyTasks / claims`。
- 键名仍为 `sort_master_save_v1`，`schemaVersion: 2`；
- **checksum 在迁移前对原始数据校验**（迁移会新增字段，否则旧档会被误判损坏）；
- v1→v2 迁移保留关卡、金币、道具、设置、签到记录。

## 2.5D 美术管线（第三轮视觉重构）

- `tools/gen-art2.mjs`：统一着色系统 —— `defs()`（柔光/接触阴影/颗粒滤镜 + 顶部光 + 暗角）、
  `contact()/ambient()`（接触与环境投影）、`body()+lin()`（三段体积渐变）、`shade()`（暗部）、
  `rim()`（轮廓光）、`spec()`（镜面高光）。
- 每件物品按"阴影 → 主体 → 暗部 → 轮廓光 → 高光 → 材质细节"顺序绘制，统一 3/4 俯视与左上来光。
- 输出 240×240 PNG（游戏内 100px 显示，2.4x 余量），UI 素材按设计尺寸 1.5x 输出。
- 物品堆叠的轻微旋转由 `tile.id` 确定性哈希生成（±7.4°），**围绕中心旋转**，不改变逻辑遮挡矩形，
  因此命中判定与遮挡关系完全不受影响（L2/L25/L60 实测 0 偏差）。
- Cocos 端 `TileView` 使用 `shadow_soft.png` 作为子节点接触阴影 + `node.angle` 微旋转；
  预览端用 CSS `drop-shadow` + `transform: rotate()` 实现同样效果。

## 架构要点

- **逻辑与表现彻底分离**：`gameplay/logic` 全部纯 TS（无 `cc` 导入），同一份逻辑跑在 Cocos、浏览器预览、Node 测试三端。
- **遮挡是独立数据**：`OcclusionGraph` 显式维护 upper→lower 遮挡边，运行时由几何重建与更新，点击可行性查询该图，绝不依赖渲染顺序。关卡 JSON 中 `blockerRelations` 与运行时几何推导强制一致（校验器复核）。
- **状态机**：`GameSession` 管理 READY/PLAYING/MOVING/MATCHING/VICTORY/FAILED/PAUSED；匹配逻辑即时结算，动画只消费事件；表现层用 `inputLocked` 闸门防动画期间重复点击。
- **发奖幂等**：所有奖励必须携带唯一 requestId 经 `RewardManager.grant()`；关卡结算按 runId 防重；广告奖励只在 `completed=true` 后发放。
- **广告**：业务只依赖 `AdManager`，服务可注入（微信/Mock）。微信实现遵守"onClose isEnded 才算完整观看"、show 失败有限重试、重复回调幂等。
- **存档**：schemaVersion + checksum + 缺失字段补默认 + v0→v1 迁移；损坏回退默认档，游戏可启动。

## 性能措施

- 特效粒子对象池（FXLayer 预热 20，上限 60）。
- 求解器使用增量遮挡计数，不做对象克隆。
- 存档节流写入（≥2s 间隔）。
- 事件监听随节点销毁清理；纹理按需加载并缓存 SpriteFrame。
- 竖屏 750×1334 fitWidth 适配；顶部 UI 预留安全区（PlatformManager.getSafeAreaTop）。
