# Phase 4: Version Sync & Cleanup

## Context
- Version currently hardcoded in 3 places:
  - `src-tauri/tauri.conf.json` → `version: "0.1.0"`
  - `package.json` → `version: "0.1.0"`
  - `src/components/settings/about-section.tsx` → `APP_VERSION = '0.1.0'`
- `src-tauri/Cargo.toml` also has version field

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Create version bump script and remove hardcoded version from frontend.

## Implementation Steps

### 1. Remove hardcoded version from about-section.tsx
Already handled in Phase 2 — about-section reads from `getVersion()` API.
Just verify no other hardcoded version references exist.

### 2. Create version bump script
**File:** `scripts/bump-version.sh`

Simple script that updates version across all config files:

```bash
#!/bin/bash
# Usage: ./scripts/bump-version.sh 0.2.0

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

# Update package.json
node -e "
const pkg = require('./package.json');
pkg.version = '$VERSION';
require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Update tauri.conf.json
node -e "
const conf = require('./src-tauri/tauri.conf.json');
conf.version = '$VERSION';
require('fs').writeFileSync('src-tauri/tauri.conf.json', JSON.stringify(conf, null, 2) + '\n');
"

# Update Cargo.toml version line
sed -i "s/^version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml

echo "Version bumped to $VERSION"
```

### 3. Add npm script
In root `package.json`:
```json
{
  "scripts": {
    "version:bump": "bash scripts/bump-version.sh"
  }
}
```

### 4. Verify no stale version references
Search codebase for hardcoded `0.1.0` and update or remove.

## Related Code Files
- Create: `scripts/bump-version.sh`
- Modify: `package.json` (add script)
- Verify: no hardcoded version strings remain

## Todo
- [ ] Create bump-version.sh script
- [ ] Add version:bump npm script
- [ ] Search and remove any remaining hardcoded version strings
- [ ] Test: `pnpm version:bump 0.2.0` updates all files
- [ ] Verify git diff shows only version changes

## Success Criteria
- Single command bumps version in all 3 config files
- No hardcoded version in frontend code
- About section reads version from Tauri API at runtime

## Next Steps
- Release workflow: bump version → commit → tag → push tag → CI builds
