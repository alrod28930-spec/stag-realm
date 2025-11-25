const path = require('path');

module.exports = {
  appId: 'com.stagalgo.trading-platform',
  productName: 'StagAlgo',
  copyright: 'Copyright © 2024 StagAlgo',
  
  directories: {
    output: 'dist-electron',
    buildResources: 'build'
  },

  files: [
    'dist/**/*',
    'electron/**/*',
    '!electron/**/*.ts',
    'node_modules/**/*',
    '!node_modules/**/*.{md,txt}',
    '!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}',
    '!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}',
    '!**/node_modules/*.d.ts',
    '!**/node_modules/.bin',
    '!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}',
    '!.editorconfig',
    '!**/._*',
    '!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}',
    '!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}',
    '!**/{appveyor.yml,.travis.yml,circle.yml}',
    '!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}'
  ],

  extraResources: [
    {
      from: 'public/lovable-uploads',
      to: 'icons'
    }
  ],

  // macOS configuration
  mac: {
    category: 'public.app-category.finance',
    icon: 'public/lovable-uploads/aa502076-83e2-4336-bda8-00b2eaac7a75.png',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      }
    ]
  },

  dmg: {
    title: '${productName} ${version}',
    artifactName: '${productName}-${version}-${arch}.${ext}',
    background: 'build/dmg-background.png',
    contents: [
      {
        x: 130,
        y: 220
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications'
      }
    ]
  },

  // Windows configuration
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    icon: 'public/lovable-uploads/aa502076-83e2-4336-bda8-00b2eaac7a75.png',
    publisherName: 'StagAlgo Inc',
    requestedExecutionLevel: 'asInvoker'
  },

  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'StagAlgo',
    include: 'build/installer.nsh',
    artifactName: '${productName}-Setup-${version}-${arch}.${ext}',
    // Custom installer script for permissions
    script: 'build/installer.nsh'
  },

  // Linux configuration  
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      }
    ],
    icon: 'public/lovable-uploads/aa502076-83e2-4336-bda8-00b2eaac7a75.png',
    category: 'Office',
    desktop: {
      Name: 'StagAlgo',
      Comment: 'Professional Trading Platform',
      Keywords: 'trading;finance;stocks;crypto;algorithms;'
    }
  },

  appImage: {
    artifactName: '${productName}-${version}-${arch}.${ext}'
  },

  deb: {
    artifactName: '${productName}-${version}-${arch}.${ext}',
    depends: ['libnss3', 'libatk-bridge2.0-0', 'libdrm2', 'libxkbcommon0', 'libgtk-3-0'],
    priority: 'optional',
    afterInstall: 'build/linux-post-install.sh'
  },

  // Publish configuration (for auto-updates)
  publish: [
    {
      provider: 'github',
      owner: 'stagalgo',
      repo: 'desktop-releases'
    }
  ],

  // Compression settings
  compression: 'maximum',
  
  // Auto-update configuration
  autoUpdater: {
    provider: 'github',
    owner: 'stagalgo',
    repo: 'desktop-releases'
  }
};