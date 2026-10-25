#!/usr/bin/env node
/**
 * Exports the web build for hosting under a subpath (default /lovevox) into dist-web/.
 * Cross-platform (PowerShell and bash): sets LINGUA_WEB_BASE_URL, read by app.config.js.
 * Usage: npm run export:web [-- /other-subpath]
 */
const { spawnSync } = require('child_process');

const baseUrl = process.argv[2] ?? '/lovevox';
const result = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', 'dist-web', '--clear'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, LINGUA_WEB_BASE_URL: baseUrl },
});
process.exit(result.status ?? 1);
