import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'tests/browser',timeout:90000,fullyParallel:false,workers:1,use:{baseURL:process.env.GAME_URL??'http://localhost:5173',viewport:{width:1440,height:900},headless:true,channel:'msedge',screenshot:'only-on-failure',trace:'retain-on-failure'},reporter:'list'});
