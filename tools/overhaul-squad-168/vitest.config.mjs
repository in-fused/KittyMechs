import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tools/overhaul-squad-168/placement.test.ts'],maxWorkers:1,testTimeout:20000,hookTimeout:20000}});
