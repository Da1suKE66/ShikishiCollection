import {defineConfig, devices} from "@playwright/test";
import {mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

const phone = devices["iPhone 15 Pro Max"];
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  timeout: 60_000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  outputDir: ".publication/browser-results",
  use: {baseURL: "http://127.0.0.1:5194", trace: "retain-on-failure"},
  projects: [
    {name: "desktop", use: {browserName: "chromium", viewport: {width: 1440, height: 900}}},
    {name: "desktop-small", use: {browserName: "chromium", viewport: {width: 1280, height: 800}}},
    {name: "desktop-wide", use: {browserName: "chromium", viewport: {width: 1920, height: 1080}}},
    {name: "tablet", use: {browserName: "webkit", viewport: {width: 768, height: 1024}, hasTouch: true}},
    // The default device viewport reserves space for Safari's browser bars.
    {name: "iphone-15-pro-max", use: {...phone}},
    {name: "iphone-fullscreen", use: {...phone, viewport: {width: 430, height: 932}}},
    {name: "iphone-landscape", use: {...phone, viewport: {width: 932, height: 350}, screen: {width: 932, height: 430}}},
  ],
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:5194/api/library",
    reuseExistingServer: false,
    env: {HOST: "127.0.0.1", PORT: "5194", DATA_DIR: mkdtempSync(join(tmpdir(), "shikishi-browser-"))},
  },
});
