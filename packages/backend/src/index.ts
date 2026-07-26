/**
 * Universal File Toolkit — Server Entry Point
 */

import 'dotenv/config';
import { buildApp } from './app.js';
import { getConfig } from '@uft/shared';

async function main() {
  const config = getConfig();
  const app = await buildApp();

  try {
    await app.listen({ port: config.server.port, host: config.server.host });
    app.log.info(`🚀 Universal File Toolkit API running on http://localhost:${config.server.port}`);
    app.log.info(`📚 API Docs available at http://localhost:${config.server.port}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
