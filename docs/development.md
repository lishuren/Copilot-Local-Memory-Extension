# Copilot Local Memory Developer Guide

This document keeps the repository-focused and extension-development details out of the Marketplace-facing README.

## Develop From Source

1. Clone the repository.
2. Open it in VS Code.
3. Install dependencies:

```bash
npm install
```

4. Build the extension:

```bash
npm run build
```

## Package A VSIX

```bash
npm run package
```

Then install the generated `.vsix` file with either:

- `Extensions: Install from VSIX...`
- `code --install-extension copilot-local-memory-extension-<version>.vsix`

## Run In An Extension Development Host

1. Open the extension repository in VS Code.
2. Run `npm install` and `npm run build` if needed.
3. Press `F5`.
4. In the new Extension Development Host window, open the `sample` folder from this repository.
5. Test the ready-to-use sample agents there.

## Sample Workspace

The sample workspace is the recommended test harness for local-memory behavior.

- Guide: <https://github.com/lishuren/Copilot-Local-Memory-Extension/blob/main/sample/README.md>
- Agents: <https://github.com/lishuren/Copilot-Local-Memory-Extension/tree/main/sample/.github/agents>

## Release Checklist

1. Update the version in `package.json`.
2. Add a changelog entry in `CHANGELOG.md`.
3. Run `npm run build`.
4. Run `npm run package` and test the VSIX when packaging or Marketplace metadata changed.
5. Publish with `vsce publish` or `vsce publish patch|minor|major`.

## Local Database Inspection

The extension stores data in `copilot-local-memory.sqlite` under VS Code global storage.

macOS default path:

```text
~/Library/Application Support/Code/User/globalStorage/shuren-li.copilot-local-memory-extension/copilot-local-memory.sqlite
```

Open it with a SQLite viewer or with `sqlite3`:

```bash
sqlite3 "$HOME/Library/Application Support/Code/User/globalStorage/shuren-li.copilot-local-memory-extension/copilot-local-memory.sqlite"
```

Useful query:

```sql
SELECT * FROM copilot_usage ORDER BY timestamp DESC LIMIT 10;
```

## Notes

- The Marketplace Details page is driven by the root `README.md`.
- Keep repository and release workflows in this document so the root README stays user-facing.