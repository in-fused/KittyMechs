import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tools/overhaul-coop-177/current-occupancy.test.mjs'],maxWorkers:1,testTimeout:20000}});
