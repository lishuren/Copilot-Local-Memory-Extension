#!/bin/bash
# Rebuild and package the Copilot Local Memory extension
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"
EXT_DIR="$ROOT_DIR"
VSCE_BIN="$EXT_DIR/node_modules/.bin/vsce"
TMP_DIR="$(mktemp -d "$ROOT_DIR/.copilot-local-memory-package.XXXXXX")"

cleanup() {
	rm -rf "$TMP_DIR"
}

trap cleanup EXIT

echo "Preparing isolated package workspace..."
rsync -a \
	--exclude 'node_modules' \
	--exclude '*.vsix' \
	--exclude '.DS_Store' \
	--exclude '.git' \
	--exclude '.vscode' \
	--exclude '.vscode-test' \
	"$EXT_DIR/" "$TMP_DIR/"

cd "$TMP_DIR"

echo "Installing local extension dependencies..."
npm install --workspaces=false

echo "Compiling TypeScript..."
npm run compile

echo "Packaging VSIX..."
"$VSCE_BIN" package --allow-missing-repository

cp ./*.vsix "$EXT_DIR/"

echo "Build and package complete. VSIX file is in $EXT_DIR."