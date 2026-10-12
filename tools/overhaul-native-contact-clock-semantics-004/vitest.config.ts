import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tools/overhaul-native-contact-clock-semantics-004/fixture.ts'],environment:'node',fileParallelism:false,maxWorkers:1,testTimeout:180000}});
