import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tools/overhaul-camera-envelope-007/containment.test.ts'],testTimeout:20000,pool:'forks',maxWorkers:1}});
