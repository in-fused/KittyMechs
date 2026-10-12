import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tests/overhaul-bonded-material.candidate.ts'],testTimeout:20000}});
