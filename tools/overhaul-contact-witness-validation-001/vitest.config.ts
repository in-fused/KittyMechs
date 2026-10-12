import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tools/overhaul-contact-witness-validation-001/fixture.ts'], environment: 'node', fileParallelism: false, maxWorkers: 1 } });
