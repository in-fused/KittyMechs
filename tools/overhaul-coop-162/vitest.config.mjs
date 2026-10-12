import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tools/overhaul-coop-162/arrival.test.mjs'],testTimeout:20000}});
