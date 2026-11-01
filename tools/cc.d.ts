/** 本文件仅用于本地命令行语法检查（tsconfig.check.json），Cocos 编辑器内不需要。 */

declare module 'cc' {
  export class CcStub {
    [k: string]: any;
    static [k: string]: any;
    constructor(...args: any[]);
  }
  export class Component extends CcStub {
    node: any;
    scheduleOnce(cb: any, t?: any): void;
    start?(): void;
    onLoad?(): void;
  }
  export class Node extends CcStub {
    static TouchEventType: any;
  }
  export class Sprite extends CcStub {
    static SizeMode: any;
    static Type: any;
  }
  export class SpriteFrame extends CcStub {}
  export class Label extends CcStub {
    static Overflow: any;
  }
  export class Color extends CcStub {}
  export class UITransform extends CcStub {}
  export class Widget extends CcStub {}
  export class UIOpacity extends CcStub {}
  export class ImageAsset extends CcStub {}
  export class Texture2D extends CcStub {}
  export class SpriteAtlas extends CcStub {}
  export class Texture extends CcStub {}
  export class Vec3 extends CcStub {}
  export class AudioSource extends CcStub {}
  export class AudioClip extends CcStub {}
  export class JsonAsset extends CcStub {}
  export class ProgressBar extends CcStub {}
  export const _decorator: any;
  export const resources: any;
  export const game: any;
  export const director: any;
  export const sys: any;
  export function tween(...args: any[]): any;
}
