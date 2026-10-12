import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tools/overhaul-street-owner-boundary-001/fixture.ts'],environment:'node',fileParallelism:false,maxWorkers:1,testTimeout:180000}});

