using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace SortMaster.EditorTools
{
    /// <summary>
    /// WebGL 构建入口（供本机菜单与 GitHub Actions 的 game-ci 调用）。
    /// 用法：
    ///   本机：菜单 Sort Master/Build WebGL
    ///   CI  ：-executeMethod SortMaster.EditorTools.BuildScript.BuildWebGL
    /// </summary>
    public static class BuildScript
    {
        private const string OutputFolder = "WebGLBuild";

        [MenuItem("Sort Master/Build WebGL", priority = 20)]
        public static void BuildWebGL()
        {
            ProjectSetup.Ensure(true);

            // 批处理模式下当前工作目录不一定等于工程根目录，使用绝对路径更可靠
            string projectRoot = Directory.GetParent(Application.dataPath).FullName;
            string outputDir = Path.Combine(projectRoot, OutputFolder);

            if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.WebGL)
            {
                Debug.Log("[SortMaster] 切换构建目标到 WebGL…");
                if (!EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL))
                {
                    throw new Exception("切换 WebGL 构建目标失败，请确认已安装 WebGL Build Support 模块。");
                }
            }

            if (Directory.Exists(outputDir)) Directory.Delete(outputDir, true);
            Directory.CreateDirectory(outputDir);

            var options = new BuildPlayerOptions
            {
                scenes = new[] { ProjectSetup.ScenePath },
                locationPathName = outputDir,
                target = BuildTarget.WebGL,
                options = BuildOptions.None,
            };

            Debug.Log("[SortMaster] 开始构建 WebGL → " + outputDir);
            var report = BuildPipeline.BuildPlayer(options);
            var summary = report.summary;

            Debug.Log($"[SortMaster] 构建结果={summary.result} 大小={summary.totalSize / 1024f / 1024f:F2}MB 耗时={summary.totalTime}");

            if (summary.result != BuildResult.Succeeded)
            {
                throw new Exception($"WebGL 构建失败：{summary.result}，错误数={summary.totalErrors}");
            }
        }
    }
}
