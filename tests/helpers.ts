import type { LevelData, TilePlacement } from '../assets/scripts/level/LevelTypes';
import { OCCLUSION_OVERLAP_RATIO } from '../assets/scripts/core/GameConfig';

/** 构造测试用关卡（遮挡边按与运行时一致的几何规则推导） */
export function makeLevel(tiles: { type: string; layer: number; x: number; y: number; w?: number; h?: number }[], extra: Partial<LevelData> = {}): LevelData {
  const positions: TilePlacement[] = tiles.map((t, i) => ({
    id: `t${i}`,
    type: t.type,
    layer: t.layer,
    x: t.x,
    y: t.y,
    w: t.w ?? 100,
    h: t.h ?? 100,
  }));
  const blockerRelations: { upper: string; lower: string }[] = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = 0; j < positions.length; j++) {
      if (i === j) continue;
      const a = positions[i];
      const b = positions[j];
      if (a.layer <= b.layer) continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox >= Math.min(a.w, b.w) * OCCLUSION_OVERLAP_RATIO && oy >= Math.min(a.h, b.h) * OCCLUSION_OVERLAP_RATIO) {
        blockerRelations.push({ upper: a.id, lower: b.id });
      }
    }
  }
  return {
    levelId: 1,
    name: 'test',
    difficulty: 1,
    difficultyLabel: '测试',
    itemTypes: Array.from(new Set(tiles.map((t) => t.type))),
    itemCount: positions.length,
    layerCount: Math.max(...tiles.map((t) => t.layer)) + 1,
    itemPositions: positions,
    blockerRelations,
    obstacles: { frozenTileIds: [], lockedTileIds: [], lockedUnlockAfterMatches: 2 },
    specialObjectives: { bonusTypes: [] },
    solutionValidation: { verified: true, method: 'test', attempts: 1, verifiedAt: 'test' },
    ...extra,
  };
}
