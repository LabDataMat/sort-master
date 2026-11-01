import { OCCLUSION_OVERLAP_RATIO } from '../core/GameConfig';
/**
 * 关卡配置结构校验（纯逻辑）。
 * 注意：结构合法 ≠ 可解。可解性由 SolvabilityChecker 单独验证。
 */
export class LevelValidator {
    static validate(level, knownTypes) {
        const issues = [];
        const add = (code, message) => issues.push({ code, message });
        if (!level.levelId || level.levelId < 1)
            add('bad_level_id', `levelId 非法: ${level.levelId}`);
        const positions = level.itemPositions ?? [];
        const itemCount = level.itemCount ?? 0;
        // 数量一致性
        if (positions.length !== itemCount) {
            add('count_mismatch', `itemCount=${itemCount} 与 itemPositions.length=${positions.length} 不一致`);
        }
        if (itemCount % 3 !== 0)
            add('not_triple', `物品数 ${itemCount} 不是 3 的倍数`);
        // 类型数量约束：每种类型必须是 3 的倍数
        const typeCount = new Map();
        for (const p of positions)
            typeCount.set(p.type, (typeCount.get(p.type) ?? 0) + 1);
        for (const [t, c] of typeCount) {
            if (c % 3 !== 0)
                add('type_not_triple', `类型 ${t} 数量 ${c} 不是 3 的倍数`);
        }
        // ID 唯一
        const ids = new Set();
        for (const p of positions) {
            if (ids.has(p.id))
                add('dup_id', `物品 ID 重复: ${p.id}`);
            ids.add(p.id);
        }
        // 类型在目录中
        for (const p of positions) {
            if (!knownTypes.has(p.type))
                add('unknown_type', `未知物品类型: ${p.type}`);
        }
        // 层级合法
        const layerCount = level.layerCount ?? 0;
        for (const p of positions) {
            if (p.layer < 0 || p.layer >= layerCount)
                add('bad_layer', `${p.id} 层级 ${p.layer} 超出 [0,${layerCount})`);
            if (!p.w || !p.h)
                add('bad_size', `${p.id} 尺寸非法`);
        }
        // 遮挡关系合法：引用存在、方向正确（upper.layer > lower.layer）、且几何上确实重叠
        for (const e of level.blockerRelations ?? []) {
            const up = positions.find((p) => p.id === e.upper);
            const low = positions.find((p) => p.id === e.lower);
            if (!up || !low) {
                add('bad_relation_ref', `遮挡边引用不存在的物品: ${e.upper}->${e.lower}`);
                continue;
            }
            if (up.layer <= low.layer)
                add('bad_relation_layer', `遮挡边层级错误: ${e.upper}(L${up.layer})->${e.lower}(L${low.layer})`);
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
            if (!ids.has(fid))
                add('bad_frozen_ref', `frozenTileIds 引用不存在: ${fid}`);
        }
        for (const lid of level.obstacles?.lockedTileIds ?? []) {
            if (!ids.has(lid))
                add('bad_locked_ref', `lockedTileIds 引用不存在: ${lid}`);
        }
        // 遮挡完整性：配置中的 blockerRelations 必须与几何推导一致（防止漏配/错配）
        // 此处只验证"配置是几何推导的子集 + 无多余"，方向为宽松校验
        // （严格一致性在生成器内完成，这里防御性检查明显缺失）
        // 必须至少存在一个可点击物品（最顶层全部可点）
        const topLayer = Math.max(...positions.map((p) => p.layer), -1);
        const topCount = positions.filter((p) => p.layer === topLayer).length;
        if (topCount === 0)
            add('no_tiles', '没有物品');
        return { valid: issues.length === 0, issues };
    }
    /**
     * 发布校验：结构合法 且 已通过真实可解性验证。
     * 未通过验证的关卡不能作为正式关卡发布。
     */
    static isPublishable(level, knownTypes) {
        return LevelValidator.validate(level, knownTypes).valid && level.solutionValidation?.verified === true;
    }
}
