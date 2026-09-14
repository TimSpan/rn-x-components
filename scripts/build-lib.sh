#!/bin/zsh
# ============================================================================
# react-native-x-components npm 包构建脚本
# 产物：.lib-build/（可直接 npm publish）
# 用法：zsh scripts/build-lib.sh [--version 0.1.0]
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="0.1.0"
if [[ "${1:-}" == "--version" ]]; then
  VERSION="${2:?missing version}"
fi

echo "▶ 1/4 清理 .lib-build"
rm -rf .lib-build
mkdir -p .lib-build

echo "▶ 2/4 TypeScript 编译（CJS + d.ts）"
npx tsc -p tsconfig.lib.json

echo "▶ 3/4 生成 package.json / README"
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('npm/package.template.json', 'utf8'));
pkg.version = '$VERSION';
fs.writeFileSync('.lib-build/package.json', JSON.stringify(pkg, null, 2) + '\n');
"
cp npm/README.md .lib-build/README.md
cp npm/AGENTS.md .lib-build/AGENTS.md
cp npm/wechat-qrcode.png .lib-build/wechat-qrcode.png
cp LICENSE .lib-build/LICENSE 2>/dev/null || true

echo "▶ 4/4 产物概览"
echo "   .lib-build/dist/$(ls .lib-build/dist | head -3 | tr '\n' ' ')..."
FILE_COUNT=$(find .lib-build/dist -name '*.js' | wc -l | tr -d ' ')
DTS_COUNT=$(find .lib-build/dist -name '*.d.ts' | wc -l | tr -d ' ')
echo "   JS: $FILE_COUNT 个文件, d.ts: $DTS_COUNT 个文件, 版本: $VERSION"
echo "✅ 完成。发布：cd .lib-build && npm publish"
