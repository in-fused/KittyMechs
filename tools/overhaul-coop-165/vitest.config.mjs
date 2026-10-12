import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tools/overhaul-coop-165/planner.test.mjs'],maxWorkers:1}});
