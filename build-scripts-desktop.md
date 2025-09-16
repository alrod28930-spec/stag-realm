# Desktop Build Scripts and Configuration

## Package.json Scripts to Add

Add these scripts to package.json for desktop app building:

```json
{
  "scripts": {
    "electron": "electron electron/main.js",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron electron/main.js\"",
    "electron:build": "npm run build && electron-builder --config electron-builder.config.js",
    "electron:build:win": "npm run build && electron-builder --config electron-builder.config.js --win",
    "electron:build:mac": "npm run build && electron-builder --config electron-builder.config.js --mac", 
    "electron:build:linux": "npm run build && electron-builder --config electron-builder.config.js --linux",
    "electron:pack": "npm run build && electron-builder --dir",
    "electron:dist": "npm run build && electron-builder --publish=never"
  }
}
```

## Build Configuration Files Created

1. **electron-builder.config.js** - Main electron-builder configuration with platform-specific settings
2. **build/entitlements.mac.plist** - macOS entitlements for microphone, camera, and network access
3. **build/installer.nsh** - Windows NSIS installer script with permission requests
4. **build/linux-post-install.sh** - Linux post-installation script for permissions and desktop integration

## Features Included

### Windows Installer
- Custom NSIS installer with permission dialogs
- Firewall exception setup
- Registry keys for microphone access
- Desktop shortcut creation
- Optional Windows startup integration

### macOS App
- Code signing entitlements for audio/video access
- DMG installer with custom background
- Gatekeeper compatibility
- Universal builds (Intel + Apple Silicon)

### Linux App
- AppImage and DEB packages
- Audio group permissions
- PulseAudio configuration
- Desktop integration (.desktop files)
- MIME type registration

## Build Requirements

1. **All Platforms:**
   - Node.js 16+
   - electron and electron-builder packages

2. **Windows:**
   - Windows 10+ (for building Windows apps)
   - Visual Studio Build Tools (optional, for native modules)

3. **macOS:**
   - macOS 10.15+ with Xcode
   - Apple Developer account (for code signing)

4. **Linux:**
   - Any Linux distribution
   - Standard build tools (gcc, make)

## Building the Desktop App

1. **Development:**
   ```bash
   npm run electron:dev
   ```

2. **Build for Current Platform:**
   ```bash
   npm run electron:build
   ```

3. **Build for Specific Platforms:**
   ```bash
   npm run electron:build:win    # Windows
   npm run electron:build:mac    # macOS
   npm run electron:build:linux  # Linux
   ```

4. **Pack (no installer):**
   ```bash
   npm run electron:pack
   ```

## Distribution

Built installers will be in the `dist-electron/` directory:

- **Windows:** `StagAlgo-Setup-{version}-x64.exe`
- **macOS:** `StagAlgo-{version}-{arch}.dmg`
- **Linux:** `StagAlgo-{version}-x64.AppImage` and `StagAlgo-{version}-x64.deb`

## Auto-Updates

The configuration includes GitHub-based auto-updates. Set up a releases repository and configure the publish settings in electron-builder.config.js.

## Permissions Requested

The installer automatically requests these permissions:

- **Microphone access** - For voice trading commands
- **Speaker access** - For audio alerts and notifications  
- **Network access** - For market data and API connections
- **File system access** - For configuration and data storage
- **Notifications** - For trading alerts and system messages

Users can grant or deny these permissions during installation.