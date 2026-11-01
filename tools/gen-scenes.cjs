/**
 * 场景生成器：产出 loading/home/game 三个 .scene 文件与对应 .meta，
 * 以及三个场景控制器的 .meta（固定 UUID，保证场景中的组件引用有效）。
 *
 * 场景保持最小结构（Canvas + Camera + Root 控制器），
 * 全部 UI 由控制器代码构建，降低手工场景文件出错风险。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCENES = path.join(ROOT, 'assets', 'scenes');
fs.mkdirSync(SCENES, { recursive: true });

const SCRIPT_UUIDS = {
  LoadingSceneCtl: 'b1000000-0000-4000-8000-000000000001',
  HomeSceneCtl: 'b1000000-0000-4000-8000-000000000002',
  GameSceneCtl: 'b1000000-0000-4000-8000-000000000003',
  CollectionSceneCtl: 'b1000000-0000-4000-8000-000000000004',
};
const SCENE_UUIDS = {
  loading: 'a1000000-0000-4000-8000-000000000001',
  home: 'a1000000-0000-4000-8000-000000000002',
  game: 'a1000000-0000-4000-8000-000000000003',
  collection: 'a1000000-0000-4000-8000-000000000004',
};

const V3 = (x, y, z) => ({ __type__: 'cc.Vec3', x, y, z });
const QUAT = () => ({ __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 });

function buildScene(name, scriptUuid) {
  const objs = [];
  const id = () => objs.length;

  // 0 SceneAsset
  objs.push({
    __type__: 'cc.SceneAsset',
    _name: name,
    _objFlags: 0,
    scene: { __id__: 1 },
    autoReleaseAssets: false,
    _id: `${name}-asset`,
  });
  // 1 Scene
  objs.push({
    __type__: 'cc.Scene',
    _name: name,
    _objFlags: 0,
    _parent: null,
    _children: [{ __id__: 2 }],
    _active: true,
    _components: [],
    _prefab: null,
    autoReleaseAssets: false,
    _globals: null, // 占位，最后回填
    _id: `${name}-scene`,
  });
  // 2 Canvas
  objs.push({
    __type__: 'cc.Node',
    _name: 'Canvas',
    _objFlags: 0,
    _parent: { __id__: 1 },
    _children: [{ __id__: 4 }, { __id__: 7 }],
    _active: true,
    _components: [{ __id__: 3 }],
    _prefab: null,
    _lpos: V3(0, 0, 0),
    _lrot: QUAT(),
    _lscale: V3(1, 1, 1),
    _mobility: 0,
    _layer: 33554432,
    _euler: V3(0, 0, 0),
    _id: `${name}-canvas`,
  });
  // 3 Canvas + UITransform + Widget（三个组件合并为节点单组件数组一个？不行，分开 push）
  // 修正：Canvas 组件数组装三个
  objs[2]._components = [{ __id__: 3 }, { __id__: 4 }, { __id__: 5 }];
  objs[2]._children = [{ __id__: 6 }, { __id__: 8 }];
  objs.push({
    __type__: 'cc.UITransform',
    node: { __id__: 2 },
    _enabled: true,
    _contentSize: { __type__: 'cc.Size', width: 750, height: 1334 },
    _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 },
    _id: `${name}-canvas-ut`,
  });
  objs.push({
    __type__: 'cc.Canvas',
    node: { __id__: 2 },
    _enabled: true,
    _cameraComponent: { __id__: 8 },
    _alignCanvasWithScreen: true,
    _id: `${name}-canvas-comp`,
  });
  objs.push({
    __type__: 'cc.Widget',
    node: { __id__: 2 },
    _enabled: true,
    _alignFlags: 45,
    _target: null,
    _left: 0,
    _right: 0,
    _top: 0,
    _bottom: 0,
    _horizontalCenter: 0,
    _verticalCenter: 0,
    _isAbsLeft: true,
    _isAbsRight: true,
    _isAbsTop: true,
    _isAbsBottom: true,
    _isAbsHorizontalCenter: true,
    _isAbsVerticalCenter: true,
    _originalWidth: 0,
    _originalHeight: 0,
    _alignMode: 2,
    _id: `${name}-canvas-widget`,
  });
  // 6 Camera node
  objs.push({
    __type__: 'cc.Node',
    _name: 'Camera',
    _objFlags: 0,
    _parent: { __id__: 2 },
    _children: [],
    _active: true,
    _components: [{ __id__: 7 }],
    _prefab: null,
    _lpos: V3(0, 0, 1000),
    _lrot: QUAT(),
    _lscale: V3(1, 1, 1),
    _mobility: 0,
    _layer: 33554432,
    _euler: V3(0, 0, 0),
    _id: `${name}-camera`,
  });
  objs.push({
    __type__: 'cc.Camera',
    node: { __id__: 6 },
    _enabled: true,
    _projection: 0,
    _priority: 0,
    _fov: 45,
    _fovAxis: 0,
    _orthoHeight: 667,
    _near: 1,
    _far: 2000,
    _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
    _depth: 1,
    _stencil: 0,
    _clearFlags: 6,
    _rect: { __type__: 'cc.Rect', x: 0, y: 0, width: 1, height: 1 },
    _aperture: 19,
    _shutter: 7,
    _isOrthographic: true,
    _visibility: 1108344832,
    _targetTexture: null,
    _id: `${name}-camera-comp`,
  });
  // 8 占位对齐：cc.Camera 是 __id__ 7? 上面 objs.push 顺序：6=node,7=camera comp
  // 9 Root node
  objs.push({
    __type__: 'cc.Node',
    _name: 'Root',
    _objFlags: 0,
    _parent: { __id__: 2 },
    _children: [],
    _active: true,
    _components: [{ __id__: 9 }],
    _prefab: null,
    _lpos: V3(0, 0, 0),
    _lrot: QUAT(),
    _lscale: V3(1, 1, 1),
    _mobility: 0,
    _layer: 33554432,
    _euler: V3(0, 0, 0),
    _id: `${name}-root`,
  });
  objs.push({
    __type__: scriptUuid,
    node: { __id__: 8 },
    _enabled: true,
    _id: `${name}-root-comp`,
  });

  // SceneGlobals 回填
  const globalsId = objs.length;
  objs[1]._globals = { __id__: globalsId };
  objs.push({
    __type__: 'cc.SceneGlobals',
    ambient: {
      __type__: 'cc.AmbientInfo',
      _skyColorHDR: { __type__: 'cc.Color', r: 0.2, g: 0.5, b: 0.8, a: 40 },
      _skyColor: { __type__: 'cc.Color', r: 0.2, g: 0.5, b: 0.8, a: 40 },
      _skyColorLDR: { __type__: 'cc.Color', r: 0.45, g: 0.65, b: 0.9, a: 25 },
      _skyIllumHDR: 20000,
      _skyIllumLDR: 20000,
      _skyIllum: 20000,
      _groundAlbedoHDR: { __type__: 'cc.Color', r: 0.2, g: 0.2, b: 0.2, a: 255 },
      _groundAlbedo: { __type__: 'cc.Color', r: 0.2, g: 0.2, b: 0.2, a: 255 },
      _groundAlbedoLDR: { __type__: 'cc.Color', r: 0.2, g: 0.2, b: 0.2, a: 255 },
    },
    shadows: {
      __type__: 'cc.ShadowsInfo',
      _enabled: false,
      _type: 0,
      _planeBias: 1,
      _normalBias: 0.5,
      _saturation: 0.8,
    },
    _skybox: {
      __type__: 'cc.SkyboxInfo',
      _enabled: false,
      _envLightingType: -1,
      _envmapHDR: null,
      _envmap: null,
      _envmapLDR: null,
      _diffuseMapHDR: null,
      _diffuseMapLDR: null,
      _enabledHDR: true,
      _enabledLDR: true,
      _HDR: 1,
      _reflectionHDR: 1,
      _reflectionLDR: 1,
    },
    fog: {
      __type__: 'cc.FogInfo',
      _type: 0,
      _fogColor: { __type__: 'cc.Color', r: 200, g: 200, b: 200, a: 255 },
      _enabled: false,
      _fogDensity: 0.3,
      _fogStart: 0.5,
      _fogEnd: 300,
      _fogAtten: 5,
      _fogTop: 1.5,
      _fogRange: 1.2,
    },
    postSettings: { __type__: 'cc.PostSettingsInfo', _toneMappingType: 0 },
  });

  // 校验：Canvas 子节点引用一致性
  objs[2]._children = [{ __id__: 6 }, { __id__: 8 }];

  return JSON.stringify(objs, null, 2);
}

for (const [name, uuid] of Object.entries(SCENE_UUIDS)) {
  const sceneJson = buildScene(name, SCRIPT_UUIDS[name.replace(/^./, (c) => c.toUpperCase())] || '');
  const scriptKey = { loading: 'LoadingSceneCtl', home: 'HomeSceneCtl', game: 'GameSceneCtl', collection: 'CollectionSceneCtl' }[name];
  const sceneJson2 = buildScene(name, SCRIPT_UUIDS[scriptKey]);
  fs.writeFileSync(path.join(SCENES, `${name}.scene`), sceneJson2);
  fs.writeFileSync(
    path.join(SCENES, `${name}.scene.meta`),
    JSON.stringify({ ver: '1.1.50', importer: 'scene', imported: true, uuid, files: ['.json'], subMetas: {}, userData: {} }, null, 2)
  );
  console.log('scene:', name);
}

for (const [script, uuid] of Object.entries(SCRIPT_UUIDS)) {
  const p = path.join(ROOT, 'assets', 'scripts', 'scenes', `${script}.ts.meta`);
  fs.writeFileSync(
    p,
    JSON.stringify({ ver: '4.0.24', importer: 'typescript', imported: true, uuid, files: [], subMetas: {}, userData: {} }, null, 2)
  );
  console.log('meta:', script);
}
console.log('SCENES DONE');
