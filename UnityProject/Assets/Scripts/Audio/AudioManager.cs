using System.Collections.Generic;
using UnityEngine;

namespace SortMaster.Audio
{
    /// <summary>
    /// 音频管理：BGM 单声道循环 + SFX 一次性播放。
    /// 资源按需从 Resources 加载并缓存，避免启动时全部载入。
    /// </summary>
    public sealed class AudioManager
    {
        private readonly AudioSource _bgm;
        private readonly AudioSource _sfx;
        private readonly Dictionary<string, AudioClip> _clips = new Dictionary<string, AudioClip>();

        private bool _musicOn;
        private bool _sfxOn;
        private float _volume;
        private string _currentBgm = "";

        public AudioManager(GameObject host)
        {
            _bgm = host.AddComponent<AudioSource>();
            _bgm.loop = true;
            _bgm.playOnAwake = false;

            _sfx = host.AddComponent<AudioSource>();
            _sfx.loop = false;
            _sfx.playOnAwake = false;
        }

        public void Apply(bool musicOn, bool sfxOn, float volume)
        {
            _musicOn = musicOn;
            _sfxOn = sfxOn;
            _volume = Mathf.Clamp01(volume);
            _bgm.mute = !musicOn;
            _bgm.volume = _volume * 0.55f;
            _sfx.mute = !sfxOn;
            _sfx.volume = _volume;
        }

        public void PlayBgm(string name)
        {
            if (_currentBgm == name && _bgm.isPlaying) return;
            var clip = Load(GameConfig.BgmDir + name);
            _currentBgm = name;
            if (clip == null)
            {
                _bgm.Stop();
                return;
            }
            _bgm.clip = clip;
            if (_musicOn) _bgm.Play();
        }

        public void StopBgm()
        {
            _bgm.Stop();
            _currentBgm = "";
        }

        public void PlaySfx(string name)
        {
            if (!_sfxOn) return;
            var clip = Load(GameConfig.SfxDir + name);
            if (clip != null) _sfx.PlayOneShot(clip, _volume);
        }

        private AudioClip Load(string path)
        {
            AudioClip clip;
            if (_clips.TryGetValue(path, out clip)) return clip;
            clip = Resources.Load<AudioClip>(path);
            _clips[path] = clip;
            return clip;
        }
    }
}
