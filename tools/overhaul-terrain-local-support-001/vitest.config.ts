import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tools/overhaul-terrain-local-support-001/fixture.ts'], environment: 'node', fileParallelism: false, maxWorkers: 1 } });

