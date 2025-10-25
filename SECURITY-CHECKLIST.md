# Security Checklist - Immediate Actions Required

## 🚨 CRITICAL: Secrets Management

### Current State
Your `.env` file contains sensitive credentials and is currently in the repository.

### Immediate Actions Required

1. **Rotate All Credentials** (if `.env` was ever committed)
   ```bash
   # Go to Supabase Dashboard -> Settings -> API
   # Click "Reset Database Password"
   # Generate new anon/service role keys
   ```

2. **Remove `.env` from Git**
   ```bash
   # Stop tracking .env
   git rm --cached .env
   
   # Move to local version
   mv .env .env.local
   ```

3. **Update `.gitignore`**
   Add these lines if not present:
   ```
   .env
   .env.local
   .env.*.local
   ```

4. **Clean Git History** (if secrets were committed)
   ```bash
   # Option 1: BFG Repo-Cleaner (recommended)
   brew install bfg  # or download from https://rtyley.github.io/bfg-repo-cleaner/
   bfg --delete-files .env
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   
   # Option 2: git filter-branch
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```

5. **Force Push** (⚠️ WARNING: Coordinate with team first)
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

6. **Update `.env.local`**
   Copy `.env.example` to `.env.local` and add your NEW rotated credentials:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

## ✅ Electron Security Verification

Run through this checklist to verify all security measures are in place:

### Main Process Security
- [x] `sandbox: true` in BrowserWindow
- [x] `contextIsolation: true` enabled
- [x] `nodeIntegration: false` enforced
- [x] `webSecurity: true` enforced
- [x] `allowRunningInsecureContent: false`
- [x] DevTools disabled in production
- [x] Navigation blocked via `will-navigate`
- [x] New windows blocked via `setWindowOpenHandler`
- [x] IPC handlers registered with Zod validation

### Preload Script Security
- [x] Minimal API surface exposed
- [x] Whitelisted channels only
- [x] TypeScript types for renderer
- [x] No direct Node.js access

### Renderer Security
- [x] Content Security Policy in HTML
- [x] No inline scripts (CSP blocks them)
- [x] External resources whitelisted
- [x] `frame-ancestors 'none'` prevents clickjacking

### Build Configuration
- [x] Auto-updates disabled until code signing ready
- [x] TypeScript files excluded from build
- [x] Source maps excluded from production
- [x] Entitlements configured for macOS

## 📝 Pre-Release Checklist

Before shipping v1.0:

### Security
- [ ] All secrets rotated and removed from git history
- [ ] `.env` never committed to repo
- [ ] CSP tested and doesn't block legitimate resources
- [ ] IPC handlers all have Zod validation
- [ ] Error reporting configured (no sensitive data in logs)

### Testing
- [ ] Tested on Windows 10/11
- [ ] Tested on macOS (Intel + Apple Silicon)
- [ ] Tested on Ubuntu/Debian Linux
- [ ] Verified permissions requested correctly
- [ ] Verified auto-update is disabled

### Documentation
- [ ] Update README with security notes
- [ ] Document `.env.local` setup process
- [ ] Document build/release process
- [ ] Document code signing requirements

### Code Signing (Optional for v1.0, Required for v1.1+)
- [ ] Obtain code signing certificate
  - macOS: Apple Developer ID Application
  - Windows: EV Code Signing Certificate
  - Linux: No signing required
- [ ] Test signing process
- [ ] Configure electron-builder with signing
- [ ] Test auto-update with signed builds

## 🔐 Best Practices Going Forward

1. **Never commit secrets**
   - Use `.env.local` for local development
   - Use CI/CD secrets for production builds
   - Rotate keys if accidentally committed

2. **Review IPC handlers**
   - Every new handler must have Zod validation
   - Minimize what renderer can trigger
   - Audit handlers quarterly

3. **Keep dependencies updated**
   ```bash
   npm audit
   npm update
   ```

4. **Monitor security advisories**
   - GitHub Dependabot alerts
   - Electron security advisories
   - npm security advisories

5. **Regular security audits**
   - Review CSP every release
   - Review IPC surface every release
   - Review entitlements every release

## ⚠️ What NOT to Do

❌ Don't disable sandbox, contextIsolation, or webSecurity
❌ Don't enable nodeIntegration or enableRemoteModule
❌ Don't expose full Electron/Node API to renderer
❌ Don't skip IPC validation
❌ Don't commit secrets or private keys
❌ Don't use unsigned auto-updates in production
❌ Don't allow arbitrary navigation or window creation

## ✅ Current Security Status

Based on the fixes implemented:

| Area | Status | Notes |
|------|--------|-------|
| Electron Security | ✅ Complete | All hardening applied |
| IPC Validation | ✅ Complete | Zod validation in place |
| Navigation Control | ✅ Complete | Blocked external navigation |
| CSP | ✅ Complete | Strict policy in HTML |
| Secrets Management | ⚠️ Action Required | Rotate and remove from git |
| Auto-Updates | ✅ Disabled | Safe for v1.0 release |
| Code Signing | ⏳ Not Started | Required for v1.1+ |

## 📞 Questions?

If you have questions about any of these security measures, review:
- `ELECTRON-SECURITY.md` for detailed explanations
- `electron/preload.ts` for IPC API examples
- `electron/ipc-handlers.ts` for validation examples
