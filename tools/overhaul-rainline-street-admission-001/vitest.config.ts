import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tools/overhaul-rainline-street-admission-001/native-check.ts'],environment:'node',fileParallelism:false,maxWorkers:1}});
