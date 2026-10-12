import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tools/overhaul-rescue-hull-070/rescue-hull.test.ts','tests/overhaul-coop-native.test.ts'],testTimeout:20000}});
