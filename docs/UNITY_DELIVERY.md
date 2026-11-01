# Unity 2D 重制：交付报告（阶段一）

> 生成时间：2026-11-01
> 工程路径：`F:\Game3.0-Unity`（仓库内镜像：`UnityProject/`）

## 一、结论摘要

| 项目 | 状态 |
|---|---|
| 旧项目资源检查 | 完成（30 物品 / 43 UI / 48 收藏 / 100 关） |
| Unity 环境检查 | **完成：本机未安装 Unity** |
| Unity 工程与全部 C# 源码 | 完成（27 个 .cs，含 Editor 自动化） |
| 100 关数据烘焙与可解性验证 | 完成（100/100 通过，新规则） |
| 核心规则 10 用例验证 | 完成（等价实现实跑 12/12；C# 测试已编写待 Unity 执行） |
| C# 编译 | **未执行（无 Unity / 无 .NET）** |
| Unity EditMode 测试 | **未执行（无 Unity）** |
| WebGL 构建 | **未执行（无 Unity）** |
| GitHub Pages 部署 | **未执行（无构建产物）** |
| 线上可玩验收 | **未达成** |

**唯一阻塞项：本机未安装 Unity Editor 与 WebGL 构建模块。**

## 二、环境检查结果（实测）

```
Unity Hub           未安装（无目录、无注册表项）
Unity Editor        未安装（C:\ / D:\ 全盘无 Unity.exe）
卸载注册表 Unity 项   无
Unity 进程           无
dotnet SDK          未安装
csc / Add-Type      被安全策略禁用
磁盘可用             E: 62.8GB / F: 404.9GB
```

Unity 的安装与许可证激活必须由用户登录完成，无法无人值守执行。

## 三、已完成的工作

### 3.1 资源导入

| 类别 | 数量 | 说明 |
|---|---|---|
| 物品图 | 30 张 240×240 PNG | 含 donut / duck / pencil / apple 等 |
| UI 图 | 43 张 | 按钮、托盘、槽位、道具、宝箱、边框、Logo |
| 收藏品 | 48 张 200×200 PNG | 甜品 / 水果 / 文具等 |
| 音频 | BGM 2 + SFX 9 | wav |
| 字体 | Noto Sans SC 子集 | 646 字，156KB（OFL 授权） |

采用**运行时 `Texture2D` → `Sprite.Create`** 方案，不依赖每张图的导入类型设置，避免工程在其它 Unity 版本打开时丢图。

### 3.2 关卡数据

- 100 关，物品 12~150，层数 2~7，槽容量统一 7。
- 由旧项目生成器烘焙（固定种子，可复现），并用**新规则**完整模拟验证：
  - 遮挡 → 拾取 → 计数式三消 → 容量 7 → 冰冻/锁定解锁
  - 结果：**100/100 可解**
- 独立复核脚本再次验证：100/100，30 种物品全部有图。

### 3.3 C# 实现（27 个文件）

| 模块 | 文件 |
|---|---|
| Core | GameConfig、Texts、GameBootstrap、GameManager |
| Gameplay | MatchSystem、SlotManager、BoardManager、LevelSession |
| Levels | LevelData、LevelLoader、LevelValidator |
| Items | ItemDatabase |
| Save | SaveManager（PlayerPrefs，WebGL 写入 IndexedDB） |
| Audio | AudioManager |
| UI | UIFactory、MainMenuScreen、LevelSelectScreen、GameScreen、ResultPopup、PausePopup、SettingsPopup、ItemView、SlotView |
| Editor | ProjectSetup（自动建场景/构建设置）、BuildScript（WebGL 构建入口） |

架构要点：
- **代码驱动 UI**：无预制体、无场景连线，`[RuntimeInitializeOnLoadMethod]` 启动即构建，规避 GUID/引用丢失。
- **逻辑与表现分离**：`MatchSystem` / `SlotManager` / `BoardManager` 不依赖 `UnityEngine`，可独立单测。
- **输入闸门**：动画期间 `_inputLocked` 拦截重复点击，逻辑在点击瞬间即完成结算。
- **自动配置**：首次打开自动创建场景、写入 Build Settings、设置 Gzip + 解压回退。

### 3.4 测试

**已编写（待 Unity 执行）**：`Assets/Tests/EditMode/`

- `MatchSystemTests`：10 个必测用例 + 2 个附加（多类型同时三消、不重复消除）
- `LevelSessionTests`：重复拾取拒绝、遮挡拒绝、撤回恢复、通关判定
- `LevelDataTests`：100 关加载、5 个抽样关卡可解性回放

**已实跑（当前环境可验证）**：`node Tools/verify-match-rules.cjs`

```
12 通过，0 失败
```

该脚本用 Node 复刻同一算法并执行 10 个必测用例。**它不能替代 C# 测试**，两者算法逐行对应，但 C# 仍需 Unity 编译验证。

### 3.5 构建与部署配置

- `Assets/WebGLTemplates/SortMaster/index.html`：自包含加载页（Logo、进度条、百分比、失败重试、响应式、相对路径）。
- `.github/workflows/deploy-webgl.yml`：手动触发的 Pages 部署，带「产物不存在则失败」保护。
- 旧 `pages.yml`（部署 `playable-preview`）**保持不变**，线上旧版仍可用。

## 四、未完成项及原因

| 未完成 | 原因 | 解除条件 |
|---|---|---|
| C# 编译验证 | 本机无 Unity / 无 .NET | 安装 Unity 2022.3 LTS |
| EditMode 测试执行 | 同上 | 同上 |
| WebGL 构建 | 同上（且需 WebGL Build Support 模块） | 同上 |
| 本地浏览器验证 | 无构建产物 | 构建完成后 `npx http-server WebGLBuild` |
| GitHub Pages 部署 | 无构建产物 | 本地验证通过后手动触发 workflow |
| 线上验收 | 同上 | 同上 |

## 五、下一步（按顺序）

1. 安装 Unity Hub 与 **Unity 2022.3 LTS + WebGL Build Support**，登录激活。
2. Hub 打开 `F:\Game3.0-Unity`，等待 `ProjectSetup` 自动完成（或执行菜单 `Sort Master → Setup Project`）。
3. Test Runner → EditMode → Run All，确认全部通过。
4. 菜单 `Sort Master → Build WebGL`，产物输出到 `WebGLBuild/`。
5. `npx http-server WebGLBuild -p 8080`，浏览器实测：
   - 加载页 → 主菜单 → 第 1 关；
   - **验证三个不相邻相同物品可消除**；
   - 刷新后进度保留。
6. 将 `WebGLBuild/` 提交到仓库根目录（与 `UnityProject/` 同级）。
7. 手动触发 `Deploy Unity WebGL` workflow，确认线上可玩。
8. 线上确认无误后，再取消 `deploy-webgl.yml` 中 `push` 触发器注释，并停用旧的 preview workflow。

## 六、风险提示

1. **未编译风险**：C# 代码未经编译器验证，首次在 Unity 中打开可能出现少量编译错误（已做括号平衡、引用完整性、API 保守性检查，但无法完全排除）。
2. **模板占位符风险**：自定义 WebGL 模板使用 Unity 2022 标准占位符（`{{{ LOADER_FILENAME }}}` 等），若版本差异导致未替换，构建会报错，可在 `PlayerSettings.WebGL.template` 回退为 `APPLICATION:Default`。
3. **字体渲染**：使用 Legacy `Text` + 动态字体，CJK 依赖字体子集；若新增文案未重新生成子集，会出现缺字（脚本：`node Tools/extract-font-chars.cjs`）。
