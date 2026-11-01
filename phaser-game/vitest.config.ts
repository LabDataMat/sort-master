import { defineConfig } from 'vitest/config';

export default defineConfig({
  // 沙箱环境下系统临时目录可能不可写，缓存固定到项目内
  cacheDir: 'node_modules/.vite',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    reporters: 'default',
    // 避免并行 worker 争用同一缓存目录导致收集失败
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
