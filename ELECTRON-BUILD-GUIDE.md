# Electron Build Guide

## Prerequisites

Before building the desktop app, ensure you have:

1. **Node.js** 18+ installed
2. **Zod** package installed (for IPC validation)
   ```bash
   # Zod should already be in dependencies
   # If not, the AI will install it
   ```
3. **TypeScript** compiler for preload script

## Build Steps

### 1. Compile TypeScript Preload Script

The preload script is written in TypeScript and must be compiled before building:

```bash
# Compile electron TypeScript files
npx tsc --project tsconfig.electron.json

# Or add to package.json scripts:
# "electron:preload": "tsc --project tsconfig.electron.json"
```

This generates:
- `electron/preload.js` (from `electron/preload.ts`)
- `electron/ipc-handlers.js` (from `electron/ipc-handlers.ts`)

### 2. Build the React App

```bash
npm run build
```

This creates the `dist/` folder with the production React app.

### 3. Build the Desktop App

```bash
# Build for current platform
npm run electron:build

# Or platform-specific:
npm run electron:build:win    # Windows
npm run electron:build:mac    # macOS
npm run electron:build:linux  # Linux
```

Output will be in `dist-electron/` folder.

## Development Workflow

### Quick Development Build

```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Compile preload and start Electron
npx tsc --project tsconfig.electron.json && npm run electron
```

### Watch Mode (Recommended)

```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Watch TypeScript compilation
npx tsc --project tsconfig.electron.json --watch

# Terminal 3: Start Electron (will auto-reload via electron-reload)
npm run electron
```

### All-in-One Development (if you add scripts)

Add to `package.json`:
```json
{
  "scripts": {
    "electron:preload": "tsc --project tsconfig.electron.json",
    "electron:preload:watch": "tsc --project tsconfig.electron.json --watch",
    "electron:dev:full": "concurrently \"npm run dev\" \"npm run electron:preload:watch\" \"wait-on http://localhost:5173 && npm run electron\""
  }
}
```

Then just run:
```bash
npm run electron:dev:full
```

## Build Output

### Windows
- `StagAlgo-Setup-{version}-x64.exe` - NSIS installer
- Installs to `C:\Users\{username}\AppData\Local\Programs\StagAlgo`

### macOS
- `StagAlgo-{version}-x64.dmg` - Intel Macs
- `StagAlgo-{version}-arm64.dmg` - Apple Silicon
- Installs to `/Applications/StagAlgo.app`

### Linux
- `StagAlgo-{version}-x64.AppImage` - Universal Linux app
- `StagAlgo-{version}-x64.deb` - Debian/Ubuntu package
- AppImage runs from anywhere, deb installs to `/opt/StagAlgo`

## Troubleshooting

### "Cannot find module 'electron/preload.js'"

**Solution**: Compile the TypeScript preload first:
```bash
npx tsc --project tsconfig.electron.json
```

### "Module not found: zod"

**Solution**: Install zod:
```bash
npm install zod
```

### "CSP blocking resources"

**Issue**: Content Security Policy is too strict.

**Solution**: Update CSP in `index.html` to whitelist necessary domains:
```html
<meta http-equiv="Content-Security-Policy" 
  content="...existing... connect-src 'self' https://your-api.com ...">
```

### "Auto-updater not working"

**Expected**: Auto-updates are disabled for security until code signing is configured.

**To Enable**: See `ELECTRON-SECURITY.md` section 1.3

### Build fails on macOS with "identity not found"

**Solution**: Remove or comment out signing configuration in `electron-builder.config.js`:
```js
mac: {
  // identity: null,  // Uncomment to skip signing
  hardenedRuntime: false,  // Disable for unsigned builds
}
```

### Build fails on Windows with "certificate not found"

**Solution**: Windows builds don't require signing for local builds. If error persists:
```js
win: {
  // Remove certificateFile and certificatePassword
  signingHashAlgorithms: ['sha256'],  // Remove if present
}
```

## Production Checklist

Before shipping to users:

1. ✅ Compile TypeScript preload
2. ✅ Build production React app (`npm run build`)
3. ✅ Test on target platform
4. ✅ Verify permissions requested correctly
5. ✅ Verify CSP doesn't block necessary resources
6. ✅ Verify `.env` secrets are NOT in build
7. ✅ Test install/uninstall process
8. ⏳ Code signing (required for v1.1+)
9. ⏳ Auto-updates (disabled until signing ready)

## Performance Tips

### Reduce Bundle Size

1. **Analyze Bundle**: 
   ```bash
   npm run build -- --analyze
   ```

2. **Exclude Dev Dependencies**: Already configured in `electron-builder.config.js`

3. **Use `asar` Packing**: Enabled by default in electron-builder

### Faster Builds

1. **Use `--dir` for Testing** (skips installer creation):
   ```bash
   npm run electron:pack
   ```

2. **Single Architecture** (during development):
   ```js
   mac: {
     target: [{ target: 'dmg', arch: ['arm64'] }]  // Only Apple Silicon
   }
   ```

3. **Parallel Builds**: Already configured with `compression: 'maximum'`

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build Desktop App

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Compile Electron TypeScript
        run: npx tsc --project tsconfig.electron.json
      
      - name: Build React app
        run: npm run build
      
      - name: Build Electron app
        run: npm run electron:build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist-${{ matrix.os }}
          path: dist-electron/
```

## File Structure

```
project/
├── electron/
│   ├── main.js              # Main process (compiled, ready)
│   ├── preload.ts           # Preload source (needs compilation)
│   ├── preload.js           # Preload compiled (git ignored)
│   ├── ipc-handlers.ts      # IPC handlers source
│   └── ipc-handlers.js      # IPC handlers compiled (git ignored)
├── build/
│   ├── entitlements.mac.plist
│   ├── installer.nsh
│   └── linux-post-install.sh
├── dist/                    # React production build
├── dist-electron/           # Electron installers
├── electron-builder.config.js
├── tsconfig.electron.json   # TypeScript config for Electron
└── package.json
```

## Next Steps

1. Compile preload: `npx tsc --project tsconfig.electron.json`
2. Test in dev: `npm run electron:dev` (after adding script)
3. Build installer: `npm run electron:build`
4. Test installer on target OS
5. Ship to users! 🚀

For security considerations, see `ELECTRON-SECURITY.md`.
