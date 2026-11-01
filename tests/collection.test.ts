import { TestRunner, assert, assertEq } from './harness';
import { CollectionManager } from '../assets/scripts/collection/CollectionManager';
import { COLLECTIBLES, SERIES_ORDER, RARITIES, MILESTONES, collectiblesOfSeries, rarityAllowedAt } from '../assets/scripts/collection/CollectionData';

export const collectionTests = new TestRunner();

const fs = require('fs');
const path = require('path');

collectionTests.test('收藏品数据：48 件 / 4 系列各 12 件 / 唯一 ID', () => {
  assertEq(COLLECTIBLES.length, 48, '总数 48');
  assertEq(new Set(COLLECTIBLES.map((c) => c.id)).size, 48, 'ID 唯一');
  for (const s of SERIES_ORDER) {
    assertEq(collectiblesOfSeries(s).length, 12, `${s} 系列 12 件`);
  }
});

collectionTests.test('收藏品数据：四种稀有度齐备且描述/名称完整', () => {
  for (const r of Object.keys(RARITIES)) {
    assert(COLLECTIBLES.some((c) => c.rarity === r), `缺少稀有度 ${r}`);
  }
  for (const c of COLLECTIBLES) {
    assert(c.name.length >= 2, `${c.id} 名称缺失`);
    assert(c.desc.length >= 6, `${c.id} 描述过短`);
  }
});

collectionTests.test('收藏品素材文件全部存在', () => {
  const dir = path.join(__dirname, '..', '..', 'assets', 'resources', 'textures', 'collect');
  const missing = COLLECTIBLES.filter((c) => !fs.existsSync(path.join(dir, `${c.id}.png`)));
  assertEq(missing.length, 0, `缺素材: ${missing.slice(0, 5).map((m) => m.id).join(',')}`);
});

collectionTests.test('首次通关必定获得一件新收藏品', () => {
  const cm = new CollectionManager(CollectionManager.emptyState());
  const r = cm.resolveLevelReward(1)!;
  assert(!!r, '有奖励');
  assert(r.isNew, '首次为新收藏品');
  assertEq(cm.ownedCount, 1);
  assert(!!cm.state.owned[r.def.id], '已入库并记录时间');
});

collectionTests.test('重复获得同款 -> 转化为碎片', () => {
  const cm = new CollectionManager(CollectionManager.emptyState());
  const id = COLLECTIBLES[0].id;
  const r1 = cm.grant(id);
  assert(!!r1 && r1.isNew, '首次获得');
  const r2 = cm.grant(id);
  assert(!!r2 && !r2.isNew, '重复');
  assertEq(r2!.fragmentsGained, RARITIES[COLLECTIBLES[0].rarity].fragmentValue, '碎片按稀有度');
  assertEq(cm.fragments, RARITIES[COLLECTIBLES[0].rarity].fragmentValue);
  assertEq(cm.ownedCount, 1, '不会重复计数');
});

collectionTests.test('稀有度随关卡进度放开', () => {
  assert(rarityAllowedAt(1, 'common'));
  assert(!rarityAllowedAt(1, 'rare'), '第 1 关不出稀有');
  assert(rarityAllowedAt(6, 'rare'));
  assert(!rarityAllowedAt(6, 'epic'));
  assert(rarityAllowedAt(16, 'epic'));
  assert(!rarityAllowedAt(16, 'legendary'));
  assert(rarityAllowedAt(31, 'legendary'));
});

collectionTests.test('低关卡奖励只出普通稀有度（里程碑除外）', () => {
  const cm = new CollectionManager(CollectionManager.emptyState());
  for (const lv of [1, 2, 3, 4]) {
    const r = cm.resolveLevelReward(lv)!;
    assertEq(r.def.rarity, 'common', `L${lv} 只出普通，实际 ${r.def.rarity}`);
  }
  // L5 是里程碑：必定发放指定传说收藏品（公平性设计）
  const m = cm.resolveLevelReward(5)!;
  assertEq(m.def.id, MILESTONES[5]);
});

collectionTests.test('里程碑关卡必定获得指定收藏品', () => {
  const cm = new CollectionManager(CollectionManager.emptyState());
  const r = cm.resolveLevelReward(5)!;
  assertEq(r.def.id, MILESTONES[5], 'L5 里程碑');
  assertEq(r.def.rarity, 'legendary');
});

collectionTests.test('奖励确定性：同关卡同状态结果一致（非随机）', () => {
  const a = new CollectionManager(CollectionManager.emptyState());
  const b = new CollectionManager(CollectionManager.emptyState());
  const ra = a.resolveLevelReward(7)!;
  const rb = b.resolveLevelReward(7)!;
  assertEq(ra.def.id, rb.def.id, '相同状态结果一致');
});

collectionTests.test('碎片兑换：不足拒绝 / 成功扣费 / 已拥有拒绝', () => {
  const cm = new CollectionManager(CollectionManager.emptyState());
  const target = collectiblesOfSeries('dessert')[0];
  const cost = RARITIES[target.rarity].exchangeCost;
  assertEq(cm.canExchange(target.id).ok, false, '碎片不足');
  cm.addFragments(cost + 10);
  const r = cm.exchange(target.id);
  assert(!!r && r.isNew, '兑换成功');
  assertEq(cm.fragments, 10, '扣除兑换成本');
  assertEq(cm.canExchange(target.id).ok, false, '已拥有不能重复兑换');
});

collectionTests.test('集齐系列 -> 记录完成并触发主题解锁回调', () => {
  let unlocked: string | null = null;
  const cm = new CollectionManager(CollectionManager.emptyState(), (s) => (unlocked = s));
  for (const c of collectiblesOfSeries('fruit')) cm.grant(c.id);
  assertEq(cm.seriesProgress('fruit').owned, 12);
  assert(cm.seriesProgress('fruit').complete);
  assertEq(unlocked, 'fruit', '触发系列完成');
  assert(cm.isThemeUnlocked('fruit'));
  assertEq(cm.state.seriesCompleted.length, 1);
});

collectionTests.test('系列进度与总进度计算', () => {
  const cm = new CollectionManager(CollectionManager.emptyState());
  cm.grant(COLLECTIBLES[0].id);
  cm.grant(COLLECTIBLES[1].id);
  assertEq(cm.seriesProgress('dessert').owned, 2);
  assertEq(cm.seriesProgress('dessert').percent, 17);
  assertEq(cm.overallPercent, Math.round((2 / 48) * 100));
});

collectionTests.test('全部收藏后通关奖励转为碎片（不空手）', () => {
  const cm = new CollectionManager(CollectionManager.emptyState());
  for (const c of COLLECTIBLES) cm.grant(c.id);
  const before = cm.fragments;
  const r = cm.resolveLevelReward(40)!;
  assert(!!r && !r.isNew, '重复转碎片');
  assert(cm.fragments > before, '碎片增加');
});

collectionTests.test('兑换建议返回可负担的最低稀有度未拥有收藏品', () => {
  const cm = new CollectionManager(CollectionManager.emptyState());
  cm.addFragments(1000);
  const sug = cm.suggestExchange();
  assert(!!sug, '有建议');
  const def = COLLECTIBLES.find((c) => c.id === sug!.id)!;
  assertEq(def.rarity, 'common', '优先普通');
});
