import { ipcMain, app } from 'electron';
import { z } from 'zod';

// Validation schemas for IPC payloads
const schemas = {
  'app:getVersion': z.void(),
  'app:getPlatform': z.void(),
} as const;

/**
 * Register all IPC handlers with validation
 */
export function registerIPCHandlers() {
  // App version
  ipcMain.handle('app:getVersion', async (_event, payload) => {
    schemas['app:getVersion'].parse(payload);
    return app.getVersion();
  });

  // Platform info
  ipcMain.handle('app:getPlatform', async (_event, payload) => {
    schemas['app:getPlatform'].parse(payload);
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
    };
  });

  console.log('✅ IPC handlers registered with validation');
}

/**
 * Remove all IPC handlers on cleanup
 */
export function unregisterIPCHandlers() {
  ipcMain.removeHandler('app:getVersion');
  ipcMain.removeHandler('app:getPlatform');
  console.log('🧹 IPC handlers unregistered');
}
