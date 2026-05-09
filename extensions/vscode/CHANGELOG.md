# Change Log

All notable changes to the VibeGuard VS Code extension are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-05-09

First public release on the Visual Studio Marketplace.

### Added
- On-save scan (`fast` mode by default; configurable via `vibeguard.scanOnSaveMode`).
- Manual scan command `VibeGuard: Scan File` (always `standard` mode).
- Manual scan command `VibeGuard: Scan Selection` (also wired into the editor
  right-click menu when text is selected).
- VS Code Diagnostics surface with severity → Error / Warning / Information
  mapping derived from the analyzer's `severity` field.
- Findings tree view in the Explorer side bar (`VibeGuard Findings`).
- Settings:
  - `vibeguard.scanOnSave` — toggle save-time scanning (default: on).
  - `vibeguard.scanOnSaveMode` — `fast` | `standard` (default: `fast`).
- Bundled rule catalogue (30 rules across injection / auth / secrets / crypto /
  AI-quality), shared with the VibeGuard CLI and GitHub Action so verdicts stay
  consistent across editor, browser, and CI.

### Notes
- All analysis runs locally. The extension makes no network requests.
- Selection scan, Code Action quick-fix, SARIF export from VS Code, and
  workspace-wide diff scan are tracked for upcoming releases.
