using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace SortMaster.EditorTools
{
    /// <summary>
    /// 工程自动化配置。
    /// 设计目标：项目首次被 Unity 打开时即可用，无需任何手工拖拽或场景连线。
    /// 所有 UI 由运行时脚本构建，因此这里只需保证「有一个可构建的空场景」与「WebGL 参数正确」。
    /// </summary>
    [InitializeOnLoad]
    public static class ProjectSetup
    {
        public const string ScenePath = "Assets/Scenes/Main.unity";
        private const string SessionKey = "SortMaster.SetupDone";

        static ProjectSetup()
        {
            // 每个编辑器会话只自动执行一次，避免反复写盘
            if (SessionState.GetBool(SessionKey, false)) return;
            SessionState.SetBool(SessionKey, true);
            EditorApplication.delayCall += () =>
            {
                try { Ensure(false); }
                catch (System.Exception e) { Debug.LogWarning("[SortMaster] 自动配置跳过：" + e.Message); }
            };
        }

        [MenuItem("Sort Master/Setup Project", priority = 0)]
        public static void SetupMenu() => Ensure(true);

        /// <summary>
        /// 幂等配置：场景存在性、Build Settings、Player/WebGL 参数。
        /// </summary>
        public static void Ensure(bool verbose)
        {
            EnsureScene();
            EnsureBuildSettings();
            EnsurePlayerSettings();
            if (verbose) Debug.Log("[SortMaster] 工程配置完成");
            AssetDatabase.SaveAssets();
        }

        private static void EnsureScene()
        {
            var dir = Path.GetDirectoryName(ScenePath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir)) Directory.CreateDirectory(dir);

            if (File.Exists(ScenePath)) return;

            // 空场景即可：GameBootstrap 通过 RuntimeInitializeOnLoadMethod 在运行时构建全部内容
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.Refresh();
        }

        private static void EnsureBuildSettings()
        {
            var scenes = EditorBuildSettings.scenes;
            foreach (var s in scenes)
            {
                if (s.path == ScenePath && s.enabled) return;
            }
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        }

        private static void EnsurePlayerSettings()
        {
            PlayerSettings.companyName = "LabDataMat";
            PlayerSettings.productName = "收纳大作战 Sort Master";
            PlayerSettings.bundleVersion = "1.0.0";

            // 竖屏休闲游戏
            PlayerSettings.defaultScreenWidth = 750;
            PlayerSettings.defaultScreenHeight = 1334;
            PlayerSettings.defaultWebScreenWidth = 750;
            PlayerSettings.defaultWebScreenHeight = 1334;
            PlayerSettings.runInBackground = true;

            // WebGL 仅支持 IL2CPP；裁剪引擎代码以缩小包体
            PlayerSettings.SetScriptingBackend(BuildTargetGroup.WebGL, ScriptingImplementation.IL2CPP);
            PlayerSettings.stripEngineCode = true;

            // GitHub Pages 无法自定义响应头：使用 Gzip + 解压回退，确保浏览器可解压
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
            PlayerSettings.WebGL.decompressionFallback = true;
            PlayerSettings.WebGL.dataCaching = true;
            PlayerSettings.WebGL.template = "PROJECT:SortMaster";

            // 纹理：运行时用 Texture2D 生成 Sprite，无需逐张设置 Sprite 导入类型
            PlayerSettings.colorSpace = ColorSpace.Gamma;
        }
    }
}
