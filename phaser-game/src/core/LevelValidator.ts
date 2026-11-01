import { GameSession } from './GameSession';
import { MATCH_SIZE } from './MatchSystem';
import type { LevelData } from './types';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * 关卡校验：结构合法性 + 真实可解性回放。
 * 回放使用与游戏完全相同的 BoardModel / SlotManager / GameSession。
 */
export function validateLevel(level: LevelData | null | undefined): ValidationResult {
  const errors: string[] = [];

  if (!level) return { ok: false, errors: ['关卡数据为空'] };
  if (!Array.isArray(level.items) || level.items.length === 0) return { ok: false, errors: ['没有物品'] };
  if (level.slotCapacity < 1) errors.push('收纳槽容量非法');
  if (level.itemCount !== level.items.length) errors.push('itemCount 与实际物品数不一致');

  const ids = new Set<string>();
  const counts = new Map<string, number>();
  for (const it of level.items) {
    if (ids.has(it.instanceId)) errors.push(`重复 instanceId：${it.instanceId}`);
    ids.add(it.instanceId);
    counts.set(it.itemId, (counts.get(it.itemId) ?? 0) + 1);
  }
  for (const [itemId, c] of counts) {
    if (c % MATCH_SIZE !== 0) errors.push(`类型 ${itemId} 数量 ${c} 不是 3 的倍数`);
  }
  if (!Array.isArray(level.solution) || level.solution.length === 0) errors.push('缺少可解性回放序列');

  if (errors.length > 0) return { ok: false, errors };

  const session = new GameSession(level);
  for (let i = 0; i < level.solution.length; i++) {
    const id = level.solution[i];
    const r = session.pick(id);
    if (!r.ok) {
      errors.push(`回放第 ${i} 步失败（${id}）：${r.reason}`);
      return { ok: false, errors };
    }
  }

  if (session.state !== 'victory') errors.push(`回放结束未通关，剩余 ${session.board.remaining}`);

  return { ok: errors.length === 0, errors };
}
