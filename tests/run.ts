/** 测试入口：运行全部测试套件，输出真实统计，非零退出码表示失败。 */
import { coreTests } from './core.test';
import { matchTests } from './match.test';
import { economyTests } from './economy.test';
import { adTests } from './ads.test';
import { levelTests } from './levels.test';
import { levelgenTests } from './levelgen.test';
import { collectionTests } from './collection.test';
import { progressTests } from './progress.test';
import { previewTests } from './preview.e2e';

async function main() {
  console.log('=== 收纳大作战 核心逻辑测试（连续匹配规则） ===\n');
  let ok = true;
  ok = (await matchTests.run()) && ok;
  ok = (await coreTests.run()) && ok;
  ok = (await economyTests.run()) && ok;
  ok = (await adTests.run()) && ok;
  ok = (await collectionTests.run()) && ok;
  ok = (await progressTests.run()) && ok;
  ok = (await levelgenTests.run()) && ok;
  ok = (await levelTests.run()) && ok;
  ok = (await previewTests.run()) && ok;
  const totalPassed = matchTests.passed + coreTests.passed + economyTests.passed + adTests.passed + collectionTests.passed + progressTests.passed + levelgenTests.passed + levelTests.passed + previewTests.passed;
  const totalFailed = matchTests.failed.length + coreTests.failed.length + economyTests.failed.length + adTests.failed.length + collectionTests.failed.length + progressTests.failed.length + levelgenTests.failed.length + levelTests.failed.length + previewTests.failed.length;
  console.log('\n=== 汇总 ===');
  console.log(matchTests.report('连续匹配   '));
  console.log(coreTests.report('核心玩法   '));
  console.log(economyTests.report('经济/存档  '));
  console.log(adTests.report('广告(Mock) '));
  console.log(collectionTests.report('收藏品     '));
  console.log(progressTests.report('成长/任务  '));
  console.log(levelgenTests.report('布局生成   '));
  console.log(levelTests.report('关卡       '));
  console.log(previewTests.report('预览E2E    '));
  console.log(`总计: ${totalPassed} 通过, ${totalFailed} 失败`);
  process.exit(ok ? 0 : 1);
}

main();
