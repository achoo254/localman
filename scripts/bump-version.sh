#!/bin/bash
# Bump version across all config files.
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
