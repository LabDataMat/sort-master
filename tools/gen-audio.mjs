/**
 * 音频合成器：程序化生成全部音效与两段 BGM（16bit PCM WAV）。
 * 风格：柔和的休闲游戏音色（正弦+三角波，轻淡混响感）。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SFX_DIR = path.join(__dirname, '..', 'assets', 'resources', 'audio', 'sfx');
const BGM_DIR = path.join(__dirname, '..', 'assets', 'resources', 'audio', 'bgm');
fs.mkdirSync(SFX_DIR, { recursive: true });
fs.mkdirSync(BGM_DIR, { recursive: true });

const SR = 22050;

function writeWav(file, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((v * 32767) | 0, 44 + i * 2);
  }
  fs.writeFileSync(file, buf);
}

const NOTE = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, C6: 1046.5, E6: 1318.5, G6: 1568.0 };

function tone(samples, t0, dur, freq, vol = 0.5, type = 'sine', attack = 0.01, release = 0.08) {
  const s0 = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  for (let i = 0; i < len && s0 + i < samples.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / attack) * Math.min(1, Math.max(0, (dur - t) / release));
    let v;
    const ph = 2 * Math.PI * freq * t;
    if (type === 'sine') v = Math.sin(ph);
    else if (type === 'tri') v = Math.asin(Math.sin(ph)) * (2 / Math.PI);
    else if (type === 'square') v = Math.sign(Math.sin(ph)) * 0.5;
    else v = Math.sin(ph); // sine default
    // 轻微泛音增加质感
    v += 0.25 * Math.sin(2 * ph) * (type === 'sine' ? 1 : 0);
    samples[s0 + i] += v * env * vol;
  }
}

function silence(sec) {
  return new Array(Math.floor(sec * SR)).fill(0);
}

// ---------- SFX ----------
{
  // click: 轻快短促
  const s = silence(0.09);
  tone(s, 0, 0.07, 880, 0.35, 'sine', 0.005, 0.04);
  writeWav(path.join(SFX_DIR, 'click.wav'), s);
}
{
  // move: 滑动嗖声（频率下扫）
  const s = silence(0.16);
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    const f = 700 - 400 * (t / 0.16);
    const env = Math.min(1, t / 0.01) * Math.min(1, (0.16 - t) / 0.06);
    s[i] = Math.sin(2 * Math.PI * f * t) * env * 0.3;
  }
  writeWav(path.join(SFX_DIR, 'move.wav'), s);
}
{
  // match: 明亮三连音
  const s = silence(0.5);
  tone(s, 0, 0.12, NOTE.E5, 0.4, 'sine', 0.005, 0.06);
  tone(s, 0.09, 0.12, NOTE.G5, 0.4, 'sine', 0.005, 0.06);
  tone(s, 0.18, 0.22, NOTE.C6, 0.45, 'sine', 0.005, 0.14);
  writeWav(path.join(SFX_DIR, 'match.wav'), s);
}
{
  // combo: 上行四音
  const s = silence(0.6);
  [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => tone(s, i * 0.08, 0.14, f, 0.35, 'tri', 0.005, 0.08));
  writeWav(path.join(SFX_DIR, 'combo.wav'), s);
}
{
  // booster: 双音闪烁
  const s = silence(0.4);
  tone(s, 0, 0.1, NOTE.A5, 0.35, 'sine', 0.004, 0.05);
  tone(s, 0.12, 0.18, NOTE.E6, 0.35, 'sine', 0.004, 0.1);
  writeWav(path.join(SFX_DIR, 'booster.wav'), s);
}
{
  // win: 胜利旋律
  const s = silence(1.7);
  const mel = [[NOTE.C5, 0, 0.16], [NOTE.E5, 0.14, 0.16], [NOTE.G5, 0.28, 0.16], [NOTE.C6, 0.42, 0.3], [NOTE.G5, 0.76, 0.14], [NOTE.C6, 0.9, 0.6]];
  for (const [f, t, d] of mel) tone(s, t, d, f, 0.4, 'tri', 0.01, 0.12);
  tone(s, 0.42, 0.3, NOTE.E5, 0.2, 'sine', 0.01, 0.12);
  tone(s, 0.9, 0.6, NOTE.G5 + 130, 0.18, 'sine', 0.01, 0.3);
  writeWav(path.join(SFX_DIR, 'win.wav'), s);
}
{
  // lose: 温和下行
  const s = silence(1.1);
  const mel = [[NOTE.G4, 0, 0.25], [NOTE.E4, 0.26, 0.25], [NOTE.C4, 0.52, 0.5]];
  for (const [f, t, d] of mel) tone(s, t, d, f, 0.4, 'sine', 0.01, 0.18);
  writeWav(path.join(SFX_DIR, 'lose.wav'), s);
}
{
  // coin: 金币双击
  const s = silence(0.25);
  tone(s, 0, 0.08, NOTE.B5, 0.35, 'square', 0.003, 0.04);
  tone(s, 0.09, 0.14, NOTE.E6, 0.35, 'square', 0.003, 0.08);
  writeWav(path.join(SFX_DIR, 'coin.wav'), s);
}
{
  // unlock: 解锁/破冰
  const s = silence(0.3);
  tone(s, 0, 0.12, 620, 0.3, 'tri', 0.004, 0.06);
  tone(s, 0.1, 0.16, 930, 0.3, 'sine', 0.004, 0.1);
  writeWav(path.join(SFX_DIR, 'unlock.wav'), s);
}
console.log('SFX done');

// ---------- BGM ----------
// 柔和 pad 和弦 + 简单旋律循环。首页：C-G-Am-F；游戏：F-G-Em-Am 变奏。
function bgm(chords, melody, barSec = 2.0, vol = 0.16) {
  const total = chords.length * barSec;
  const s = silence(total);
  chords.forEach((chord, bi) => {
    const t0 = bi * barSec;
    for (const f of chord) tone(s, t0, barSec * 0.98, f, vol, 'sine', 0.25, 0.6);
    for (const f of chord) tone(s, t0, barSec * 0.98, f * 2, vol * 0.3, 'sine', 0.3, 0.6);
  });
  for (const [beat, f, dur] of melody) {
    tone(s, beat * barSec, dur * barSec * 0.92, f, 0.22, 'tri', 0.02, 0.15);
  }
  return s;
}

{
  const bar = 2.0;
  const chords = [
    [NOTE.C4, NOTE.E4, NOTE.G4],
    [NOTE.G3 + 0, NOTE.B3 + 0, NOTE.D4],
    [NOTE.A3, NOTE.C4, NOTE.E4],
    [NOTE.F3 + 0, NOTE.A3, NOTE.C4],
  ];
  const mel = [
    [0.25, NOTE.E5, 0.4], [0.75, NOTE.G5, 0.4], [1.25, NOTE.C5, 0.6],
    [2.25, NOTE.D5, 0.4], [2.75, NOTE.B4, 0.9],
    [4.25, NOTE.C5, 0.4], [4.75, NOTE.E5, 0.4], [5.25, NOTE.A4, 0.9],
    [6.25, NOTE.A4, 0.4], [6.75, NOTE.C5, 0.5], [7.25, NOTE.F5, 0.6],
  ];
  writeWav(path.join(BGM_DIR, 'bgm_home.wav'), bgm(chords, mel, bar));
}
{
  const bar = 1.8;
  const G3 = 196.0, B3 = 246.94, D4 = 293.66, F3 = 174.61, A3 = 220.0, C4 = 261.63, E4 = 329.63, G4 = 392.0, E3 = 164.81;
  const chords = [
    [F3, A3, C4], [G3, B3, D4], [E3, G3 + 0, B3 + 0], [A3, C4, E4],
    [F3, A3, C4], [G3, B3, D4], [C4, E4, G4], [C4, E4, G4],
  ];
  const mel = [
    [0.25, NOTE.A4, 0.35], [0.7, NOTE.C5, 0.35], [1.15, NOTE.F5, 0.5],
    [2.25, NOTE.B4, 0.35], [2.7, NOTE.D5, 0.8],
    [4.25, NOTE.G4, 0.35], [4.7, NOTE.B4, 0.35], [5.15, NOTE.E5, 0.6],
    [6.25, NOTE.C5, 0.3], [6.6, NOTE.E5, 0.3], [7.0, NOTE.A5, 0.7],
    [8.25, NOTE.A4, 0.35], [8.7, NOTE.C5, 0.35], [9.15, NOTE.F5, 0.5],
    [10.25, NOTE.B4, 0.35], [10.7, NOTE.D5, 0.8],
    [12.25, NOTE.E5, 0.4], [12.75, NOTE.G5, 0.4], [13.25, NOTE.C6, 0.9],
    [14.25, NOTE.G5, 0.4], [14.75, NOTE.E5, 0.9],
  ];
  writeWav(path.join(BGM_DIR, 'bgm_game.wav'), bgm(chords, mel, bar));
}
console.log('BGM done');
console.log('AUDIO ALL DONE');
