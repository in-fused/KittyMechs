import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tools/overhaul-shader-variant-240/fixture240.test.ts'],environment:'node',testTimeout:5000,maxWorkers:1}});
