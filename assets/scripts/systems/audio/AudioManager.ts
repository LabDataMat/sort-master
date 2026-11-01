import { EventHub } from '../../core/EventHub';
import { _decorator, Component, AudioSource, AudioClip, resources, Node, game, director } from 'cc';

/**
 * 统一音频管理（Cocos 侧）。
 * - 音效 / 背景音乐分离，各自开关
 * - 资源从 resources 异步加载，加载失败不阻断游戏
 */
export class AudioManager {
  private static _inst: AudioManager;
  static get inst(): AudioManager {
    if (!AudioManager._inst) AudioManager._inst = new AudioManager();
    return AudioManager._inst;
  }

  private source: AudioSource | null = null;
  private clips = new Map<string, AudioClip>();
  musicOn = true;
  sfxOn = true;
  private currentBgm = '';

  attach(root: Node) {
    const node = new Node('__AudioManager__');
    root.addChild(node);
    game.addPersistRootNode(root);
    this.source = node.addComponent(AudioSource);
  }

  loadAll(onDone?: () => void) {
    const list = ['click', 'move', 'match', 'combo', 'booster', 'win', 'lose', 'coin', 'unlock'];
    let pending = list.length + 2;
    const done = () => {
      if (--pending <= 0) onDone?.();
    };
    for (const name of list) {
      resources.load(`audio/sfx/${name}`, AudioClip, (err, clip) => {
        if (!err && clip) this.clips.set(name, clip);
        else console.warn('[Audio] load fail:', name, err);
        done();
      });
    }
    resources.load('audio/bgm/bgm_home', AudioClip, (e, c) => {
      if (!e && c) this.clips.set('bgm_home', c);
      done();
    });
    resources.load('audio/bgm/bgm_game', AudioClip, (e, c) => {
      if (!e && c) this.clips.set('bgm_game', c);
      done();
    });
  }

  play(name: string, volume = 1) {
    if (!this.sfxOn) return;
    const clip = this.clips.get(name);
    if (clip && this.source) this.source.playOneShot(clip, volume);
  }

  playBgm(name: 'bgm_home' | 'bgm_game') {
    if (!this.source) return;
    if (this.currentBgm === name && this.source.playing) return;
    const clip = this.clips.get(name);
    if (!clip) return;
    this.currentBgm = name;
    this.source.stop();
    if (this.musicOn) {
      this.source.clip = clip;
      this.source.loop = true;
      this.source.volume = 0.6;
      this.source.play();
    }
  }

  stopBgm() {
    this.currentBgm = '';
    this.source?.stop();
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (!on) this.source?.stop();
    else if (this.currentBgm) {
      const name = this.currentBgm;
      this.currentBgm = '';
      this.playBgm(name as any);
    }
  }

  setSfx(on: boolean) {
    this.sfxOn = on;
  }
}
