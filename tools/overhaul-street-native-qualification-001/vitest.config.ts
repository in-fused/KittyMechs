import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tools/overhaul-street-native-qualification-001/fixture.ts'],environment:'node',fileParallelism:false,maxWorkers:1,testTimeout:180000}});
