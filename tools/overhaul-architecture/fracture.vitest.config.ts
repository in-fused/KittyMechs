import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tests/overhaul-fracture.candidate.ts'],testTimeout:20000}});
