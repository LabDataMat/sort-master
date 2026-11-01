import type { LevelData } from './LevelTypes';
import { OCCLUSION_OVERLAP_RATIO } from '../core/GameConfig';

export interface ValidationIssue {
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * 关卡配置结构校验（纯逻辑）。
 * 注意：结构合法 ≠ 可解。可解性由 SolvabilityChecker 单独验证。
 */
export class LevelValidator {
  static validate(level: LevelData, knownTypes: Set<string>): ValidationResult {
    const issues: ValidationIssue[] = [];
    const add = (code: string, message: string) => issues.push({ code, message });

    if (!level.levelId || level.levelId < 1) add('bad_level_id', `levelId 非法: ${level.levelId}`);
    const positions = level.itemPositions ?? [];
    const itemCount = level.itemCount ?? 0;

    // 数量一致性
    if (positions.length !== itemCount) {
      add('count_mismatch', `itemCount=${itemCount} 与 itemPositions.length=${positions.length} 不一致`);
    }
    if (itemCount % 3 !== 0) add('not_triple', `物品数 ${itemCount} 不是 3 的倍数`);

    // 类型数量约束：每种类型必须是 3 的倍数
    const typeCount = new Map<string, number>();
    for (const p of positions) typeCount.set(p.type, (typeCount.get(p.type) ?? 0) + 1);
    for (const [t, c] of typeCount) {
      if (c % 3 !== 0) add('type_not_triple', `类型 ${t} 数量 ${c} 不是 3 的倍数`);
    }

    // ID 唯一
    const ids = new Set<string>();
    for (const p of positions) {
      if (ids.has(p.id)) add('dup_id', `物品 ID 重复: ${p.id}`);
      ids.add(p.id);
    }

    // 类型在目录中
    for (const p of positions) {
      if (!knownTypes.has(p.type)) add('unknown_type', `未知物品类型: ${p.type}`);
    }

    // 层级合法
    const layerCount = level.layerCount ?? 0;
    for (const p of positions) {
      if (p.layer < 0 || p.layer >= layerCount) add('bad_layer', `${p.id} 层级 ${p.layer} 超出 [0,${layerCount})`);
      if (!p.w || !p.h) add('bad_size', `${p.id} 尺寸非法`);
    }

    // 遮挡关系：显式配置（旧关卡）或几何推导（集中堆叠关卡）
    const relations = level.blockerRelations ?? [];
    const indexOf = new Map<string, number>();
    positions.forEach((p, i) => indexOf.set(p.id, i));

    if (relations.length === 0) {
      if (!level.occlusion?.derivedFromGeometry) {
        add('missing_occlusion', '既没有 blockerRelations 也没有声明 derivedFromGeometry');
      } else {
        const edges = LevelValidator.deriveEdges(positions);
        if (level.occlusion.edgeCount !== edges.length) {
          add('occlusion_count_mismatch', `edgeCount=${level.occlusion.edgeCount} 与实际推导 ${edges.length} 不一致`);
        }
        // 可剥离性：z 序无环 → 必须能逐个剥离全部物品（否则存在永久互相遮挡的死锁）
        const n = positions.length;
        const blocked = new Array(n).fill(0);
        const occludes: number[][] = Array.from({ length: n }, () => []);
        for (const e of edges) {
          const u = indexOf.get(e.upper);
          const l = indexOf.get(e.lower);
          if (u === undefined || l === undefined) continue;
          occludes[u].push(l);
          blocked[l]++;
        }
        const removed = new Array(n).fill(false);
        let left = n;
        for (let step = 0; step < n; step++) {
          let pick = -1;
          for (let i = 0; i < n; i++) {
            if (!removed[i] && blocked[i] === 0) {
              pick = i;
              break;
            }
          }
          if (pick < 0) break;
          removed[pick] = true;
          left--;
          for (const l of occludes[pick]) blocked[l]--;
        }
        if (left > 0) add('occlusion_deadlock', `有 ${left} 件物品永久互相遮挡，无法剥离`);
      }
    }

    for (const e of relations) {
      const up = positions.find((p) => p.id === e.upper);
      const low = positions.find((p) => p.id === e.lower);
      if (!up || !low) {
        add('bad_relation_ref', `遮挡边引用不存在的物品: ${e.upper}->${e.lower}`);
        continue;
      }
      const upAbove = up.layer > low.layer || (up.layer === low.layer && (indexOf.get(up.id) ?? 0) > (indexOf.get(low.id) ?? 0));
      if (!upAbove) add('bad_relation_layer', `遮挡边方向错误（z 序）: ${e.upper}->${e.lower}`);
      // 几何复核
      const overlapX = Math.min(up.x + up.w, low.x + low.w) - Math.max(up.x, low.x);
      const overlapY = Math.min(up.y + up.h, low.y + low.h) - Math.max(up.y, low.y);
      const minW = Math.min(up.w, low.w);
      const minH = Math.min(up.h, low.h);
      if (!(overlapX >= minW * OCCLUSION_OVERLAP_RATIO && overlapY >= minH * OCCLUSION_OVERLAP_RATIO)) {
        add('bad_relation_geometry', `遮挡边与几何不符: ${e.upper}->${e.lower}`);
      }
    }

    // 障碍引用合法
    for (const fid of level.obstacles?.frozenTileIds ?? []) {
      if (!ids.has(fid)) add('bad_frozen_ref', `frozenTileIds 引用不存在: ${fid}`);
    }
    for (const lid of level.obstacles?.lockedTileIds ?? []) {
      if (!ids.has(lid)) add('bad_locked_ref', `lockedTileIds 引用不存在: ${lid}`);
    }

    // 遮挡完整性：配置中的 blockerRelations 必须与几何推导一致（防止漏配/错配）
    // 此处只验证"配置是几何推导的子集 + 无多余"，方向为宽松校验
    // （严格一致性在生成器内完成，这里防御性检查明显缺失）

    // 必须至少存在一个可点击物品（最顶层全部可点）
    const topLayer = Math.max(...positions.map((p) => p.layer), -1);
    const topCount = positions.filter((p) => p.layer === topLayer).length;
    if (topCount === 0) add('no_tiles', '没有物品');

    return { valid: issues.length === 0, issues };
  }

  /**
   * 由几何 + z 序推导遮挡边（与运行时 OcclusionGraph 完全一致）：
   * 层号大者在上；同层时数组靠后者在上。
   */
  static deriveEdges(positions: { id: string; layer: number; x: number; y: number; w: number; h: number }[]): {
    upper: string;
    lower: string;
  }[] {
    const edges: { upper: string; lower: string }[] = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = 0; j < positions.length; j++) {
        if (i === j) continue;
        const a = positions[i];
        const b = positions[j];
        const aAbove = a.layer > b.layer || (a.layer === b.layer && i > j);
        if (!aAbove) continue;
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox >= Math.min(a.w, b.w) * OCCLUSION_OVERLAP_RATIO && oy >= Math.min(a.h, b.h) * OCCLUSION_OVERLAP_RATIO) {
          edges.push({ upper: a.id, lower: b.id });
        }
      }
    }
    return edges;
  }

  /**
   * 发布校验：结构合法 且 已通过真实可解性验证。
   * 未通过验证的关卡不能作为正式关卡发布。
   */
  static isPublishable(level: LevelData, knownTypes: Set<string>): boolean {
    return LevelValidator.validate(level, knownTypes).valid && level.solutionValidation?.verified === true;
  }
}
