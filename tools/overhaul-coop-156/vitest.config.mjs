import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tools/overhaul-coop-156/feedback.test.mjs'],testTimeout:20000}});
