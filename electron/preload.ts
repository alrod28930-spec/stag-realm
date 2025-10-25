import { contextBridge, ipcRenderer } from 'electron';

// Define allowed IPC channels with strict typing
export const channels = [
  'app:getVersion',
  'app:getPlatform',
  'window:minimize',
  'window:maximize',
  'window:close',
] as const;

type Channel = typeof channels[number];

// Expose minimal, typed API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Send one-way message
  send: (channel: Channel, payload?: unknown) => {
    if (channels.includes(channel)) {
      ipcRenderer.send(channel, payload);
    }
  },
  
  // Invoke and wait for response
  invoke: (channel: Channel, payload?: unknown): Promise<unknown> => {
    if (channels.includes(channel)) {
      return ipcRenderer.invoke(channel, payload);
    }
    return Promise.reject(new Error(`Invalid channel: ${channel}`));
  },
  
  // Listen for messages from main
  on: (channel: Channel, callback: (data: unknown) => void) => {
    if (channels.includes(channel)) {
      const subscription = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
      ipcRenderer.on(channel, subscription);
      
      // Return unsubscribe function
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
    return () => {};
  },
});

// Type definitions for renderer
declare global {
  interface Window {
    electronAPI: {
      send: (channel: Channel, payload?: unknown) => void;
      invoke: (channel: Channel, payload?: unknown) => Promise<unknown>;
      on: (channel: Channel, callback: (data: unknown) => void) => () => void;
    };
  }
}
