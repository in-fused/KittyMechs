import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tools/overhaul-coop-151/planner.test.mjs'],testTimeout:20000}});
