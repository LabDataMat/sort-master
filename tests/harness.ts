/** 极简测试框架：无需外部依赖，输出真实结果与统计。 */

interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
}

export class TestRunner {
  private cases: TestCase[] = [];
  passed = 0;
  failed: { name: string; error: string }[] = [];

  test(name: string, fn: () => void | Promise<void>) {
    this.cases.push({ name, fn });
  }

  async run(): Promise<boolean> {
    for (const c of this.cases) {
      try {
        await c.fn();
        this.passed++;
        console.log(`  PASS  ${c.name}`);
      } catch (e: any) {
        this.failed.push({ name: c.name, error: String(e?.message ?? e) });
        console.log(`  FAIL  ${c.name}\n        ${String(e?.message ?? e)}`);
      }
    }
    return this.failed.length === 0;
  }

  report(suite: string): string {
    return `${suite}: ${this.passed} passed, ${this.failed.length} failed`;
  }
}

export function assert(cond: boolean, msg = 'assert failed') {
  if (!cond) throw new Error(msg);
}

export function assertEq(actual: any, expected: any, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
  }
}
