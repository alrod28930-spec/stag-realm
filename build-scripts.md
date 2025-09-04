# Build Scripts to Add to package.json

Add these scripts to your package.json for building all platforms:

```json
{
  "scripts": {
    "electron": "electron electron/main.js",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron electron/main.js\"",
    "electron:build": "npm run build && electron-builder",
    "electron:build:win": "npm run build && electron-builder --win",
    "electron:build:mac": "npm run build && electron-builder --mac",
    "electron:build:linux": "npm run build && electron-builder --linux",
    "cap:add:ios": "npx cap add ios",
    "cap:add:android": "npx cap add android",
    "cap:sync": "npx cap sync",
    "cap:run:ios": "npx cap run ios",
    "cap:run:android": "npx cap run android",
    "cap:build:ios": "npm run build && npx cap sync && npx cap build ios",
    "cap:build:android": "npm run build && npx cap sync && npx cap build android"
  }
}
```

And add this electron-builder configuration:

```json
{
  "build": {
    "appId": "com.stagalgo.app",
    "productName": "StagAlgo",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "node_modules/**/*"
    ],
    "mac": {
      "category": "public.app-category.finance",
      "icon": "public/lovable-uploads/aa502076-83e2-4336-bda8-00b2eaac7a75.png"
    },
    "win": {
      "target": "nsis",
      "icon": "public/lovable-uploads/aa502076-83e2-4336-bda8-00b2eaac7a75.png"
    },
    "linux": {
      "target": "AppImage",
      "icon": "public/lovable-uploads/aa502076-83e2-4336-bda8-00b2eaac7a75.png"
    }
  }
}
```