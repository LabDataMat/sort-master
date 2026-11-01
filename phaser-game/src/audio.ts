import Phaser from 'phaser';
import { save } from './services';

let bgm: Phaser.Sound.BaseSound | null = null;
let bgmKey = '';

export function playBgm(scene: Phaser.Scene, key: string, volume = 0.35): void {
  if (!save.data.musicOn) {
    stopBgm();
    return;
  }
  if (bgmKey === key && bgm && bgm.isPlaying) return;

  stopBgm();
  try {
    bgm = scene.sound.add(key, { loop: true, volume });
    bgm.play();
    bgmKey = key;
  } catch {
    bgm = null;
    bgmKey = '';
  }
}

export function stopBgm(): void {
  if (!bgm) return;
  try {
    bgm.stop();
    bgm.destroy();
  } catch {
    /* ignore */
  }
  bgm = null;
  bgmKey = '';
}

export function playSfx(scene: Phaser.Scene, key: string, volume = 0.55): void {
  if (!save.data.sfxOn) return;
  try {
    scene.sound.play(key, { volume });
  } catch {
    /* 音频不可用时静默降级 */
  }
}

/** 设置变更后调用：关闭音乐时立即停止 */
export function applyAudioSettings(): void {
  if (!save.data.musicOn) stopBgm();
}
