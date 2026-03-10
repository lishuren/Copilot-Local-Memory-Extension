# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Released]

## [1.1.1] - 2026-03-10

### Added

- Extension icon asset and manifest icon metadata.
- Repository, homepage, and issue tracker links in the extension manifest.
- Release checklist guidance in the README.

### Changed

- Clarified custom-agent tool enablement requirements in the docs.
- Clarified why `finish_reason` may be blank in custom-agent flows.
- Simplified the local-memory clear-tool safety wording.
- Replaced user-specific macOS path examples with neutral home-directory paths.

## [1.0.0] - 2026-03-10

### Added

- Initial release of Copilot Local Memory.
- Local logging, querying, recent-history lookup, summary, and clear tools.
- SQLite-backed local storage for Copilot interaction history.