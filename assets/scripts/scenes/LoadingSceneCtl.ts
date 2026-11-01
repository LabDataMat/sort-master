import { _decorator, Component, Node, director, ProgressBar, UITransform, Vec3, tween, Label } from 'cc';
import { GameManager } from '../GameManager';
import { AudioManager } from '../systems/audio/AudioManager';
import { createBackground, createLabel, createSprite } from '../ui/UIFactory';
import { PALETTE } from '../core/GameConfig';

const { ccclass } = _decorator;

/** Loading 场景控制器：初始化全局管理器 → 预加载 → 进入首页 */
@ccclass('LoadingSceneCtl')
export class LoadingSceneCtl extends Component {
  private pctLabel: Label | null = null;

  start() {
    createBackground(this.node, 'textures/ui/bg_home');
    // Logo（图片 + 运行时文字兜底）
    const logo = createSprite('textures/ui/logo', { parent: this.node, y: 80, w: 480, h: 190, name: 'logo' });
    createLabel('收纳大作战', { parent: this.node, y: 40, size: 60, color: PALETTE.primaryDark, name: 'logo_text' });
    createLabel('SORT MASTER', { parent: this.node, y: -40, size: 30, color: PALETTE.sageDark });
    tween(logo).repeatForever(
      tween(logo).to(1.2, { position: new Vec3(0, 100, 0) }, { easing: 'sineInOut' }).to(1.2, { position: new Vec3(0, 60, 0) }, { easing: 'sineInOut' })
    ).start();

    this.pctLabel = createLabel('加载中 0%', { parent: this.node, y: -160, size: 28, color: PALETTE.textLight });

    // 初始化
    const gm = GameManager.create();
    gm.audio.attach(director.getScene()!.getChildByPath('Canvas')!);
    let steps = 2;
    const step = () => {
      if (--steps > 0) {
        this.setPct(0.5);
        return;
      }
      this.setPct(1);
      this.scheduleOnce(() => director.loadScene('home'), 0.4);
    };
    gm.audio.loadAll(step);
    gm.loadBalance(step);
    this.setPct(0.2);
  }

  private setPct(p: number) {
    if (this.pctLabel && this.pctLabel.isValid) {
      this.pctLabel.string = `加载中 ${Math.round(p * 100)}%`;
    }
  }
}
