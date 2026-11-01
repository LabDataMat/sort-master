# 收纳大作战 Sort Master（Unity 2D 重制版）

2D 休闲收纳消除游戏。核心规则：**收纳槽内任意三个相同物品即消除，不要求相邻**。

> 本工程为 Unity 2D 版本，与仓库中的 `playable-preview`（TypeScript/Web 版）并存。
> 两者共享同一套关卡数据与美术资源。

## 一、环境要求

| 项目 | 版本 |
|---|---|
| Unity Editor | **2022.3 LTS**（任意补丁版；Unity 6 亦可，打开时会提示升级） |
| 构建模块 | **WebGL Build Support**（必须） |
| 平台 | Windows / macOS 均可 |

本机当前**未安装 Unity**，因此工程尚未执行过编译与构建。首次打开前请先完成安装（见第五节）。

## 二、打开与运行

1. Unity Hub → Add → 选择 `F:\Game3.0-Unity`。
2. 首次打开会自动执行 `ProjectSetup`：创建 `Assets/Scenes/Main.unity`、写入 Build Settings、配置 WebGL 参数。
   - 若未自动执行，可手动点击菜单 **Sort Master → Setup Project**。
3. 打开 `Assets/Scenes/Main.unity`，点击 Play 即可运行。
   - 场景本身为空，全部界面由 `GameBootstrap` 在运行时构建，**不需要任何手工拖拽或预制体连线**。

## 三、构建 WebGL

菜单 **Sort Master → Build WebGL**，产物输出到 `WebGLBuild/`。

本地验证（必须，不能只看构建成功日志）：

```bash
npx http-server WebGLBuild -p 8080 -c-1
# 浏览器打开 http://localhost:8080
```

检查项：
- 加载页显示 Logo、进度百分比；
- 进度到 100% 后进入主菜单；
- 能进入第 1 关并完成一次「不相邻三同消除」；
- 控制台无 404、无关键异常；
- 刷新页面后关卡进度保留。

> 注意：直接双击 `index.html`（file://）无法运行，浏览器会因跨域限制拒绝加载 `.wasm`/`.data`。必须通过 HTTP 服务访问。

## 四、目录结构

```
Assets/
├── Scripts/
│   ├── Core/          GameConfig、Texts、GameBootstrap、GameManager
│   ├── Gameplay/      MatchSystem（纯逻辑）、SlotManager、BoardManager、LevelSession
│   ├── Levels/        LevelData、LevelLoader、LevelValidator
│   ├── Items/         ItemDatabase（运行时 Texture2D → Sprite）
│   ├── Save/          SaveManager（PlayerPrefs）
│   ├── Audio/         AudioManager
│   ├── UI/            UIFactory、各 Screen/Popup、ItemView、SlotView
│   └── Editor/        ProjectSetup、BuildScript
├── Resources/
│   ├── Textures/      items(30) / ui(43) / collect(48)
│   ├── Audio/         bgm(2) / sfx(9)
│   ├── Data/levels/   100 关 JSON
│   └── Fonts/         NotoSansSC-Regular.otf（子集，646 字，156KB）
├── Tests/EditMode/    NUnit 测试
└── WebGLTemplates/    自定义加载页
```

## 五、Unity 安装步骤（本机尚未安装）

1. 下载并安装 **Unity Hub**：https://unity.com/download
2. Hub → Installs → Install Editor → 选择 **2022.3 LTS** 最新补丁版。
3. 在模块列表中勾选 **WebGL Build Support**（必选）。
4. 安装完成后登录 Unity 账号（个人版免费许可证即可）。
5. 用 Hub 打开 `F:\Game3.0-Unity`。

## 六、核心规则实现

`MatchSystem.Resolve` 采用**按 ItemId 计数**的方式：

- 任意 3 个相同即消除，与位置、相邻关系无关；
- 4 个相同 → 消除 3 个，剩余 1 个；
- 6 个相同 → 两组消除；
- 消除后其余物品保持原有相对顺序；
- 消除即从数据中移除，机制上杜绝重复消除。

`MatchSystem` 与 `SlotManager` 完全解耦，且不依赖 `UnityEngine`，可独立单测。

## 七、测试

Unity → Window → General → Test Runner → EditMode → Run All。

覆盖：
- 需求文档要求的 10 个必测用例；
- 重复拾取拒绝、遮挡拒绝、撤回恢复、通关判定；
- 100 关加载；
- 抽样关卡可解性回放。

> 当前环境无 Unity / .NET，C# 测试**尚未执行**。规则逻辑已用等价 Node 实现实跑验证：
> `node Tools/verify-match-rules.cjs`（12/12 通过）。两者不可互相替代。

## 八、关卡数据

- 100 关，物品数 12~150，层数 2~7，槽容量统一 7。
- 由 `Tools/bake-levels.cjs` 从旧项目生成器烘焙，并用**新规则**完整模拟验证可解性（100/100）。
- 每关 JSON 含 `solution` 字段（已验证的通关拾取序列），运行时可复核。

重新烘焙：

```bash
node Tools/bake-levels.cjs
```

## 九、已知限制

- 本机未安装 Unity，**尚未编译、尚未构建、尚未部署**。
- 因此以下内容无法在当前环境验证：C# 编译、EditMode 测试、WebGL 构建、线上运行。
- `WebGLBuild/` 目前为空占位，需在 Unity 中构建后生成。
- 工程当前**不含 `.meta` 文件**：首次用 Unity 打开时会自动生成 GUID。由于本工程不使用预制体与场景引用（UI 全部代码构建），不会因此丢失引用；首次打开后请把生成的 `.meta` 一并提交到仓库。
