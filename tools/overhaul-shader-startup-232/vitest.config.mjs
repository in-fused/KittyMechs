import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tools/overhaul-shader-startup-232/fixture232.test.ts'],environment:'node',testTimeout:5000,maxWorkers:1}});
