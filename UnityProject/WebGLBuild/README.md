# WebGLBuild

此目录由 Unity 构建生成，请勿手工编辑。

## 生成方式

在 Unity 中打开工程后执行菜单：

```
Sort Master → Build WebGL
```

或命令行：

```
Unity.exe -batchmode -quit -projectPath "F:\Game3.0-Unity" ^
  -executeMethod SortMaster.EditorTools.BuildScript.BuildWebGL ^
  -logFile build.log
```

## 产物结构

```
WebGLBuild/
├── index.html
├── Build/
│   ├── WebGL.loader.js
│   ├── WebGL.framework.js.gz
│   ├── WebGL.wasm.gz
│   └── WebGL.data.gz
└── TemplateData/   （本项目模板为自包含，可能不存在）
```

## 部署注意

- 已配置 **Gzip + Decompression Fallback**，因此 GitHub Pages 无需自定义响应头即可运行。
- 所有路径均为相对路径，兼容 `https://labdatamat.github.io/sort-master/` 子路径。
