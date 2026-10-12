import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tools/overhaul-coop-159/fire-order.test.mjs'],testTimeout:20000}});
