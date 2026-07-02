# Changelog

Write notes for upcoming changes under `## Unreleased`. When you run
`npm version`, that heading is stamped with the new version number, and
the release workflow publishes the section as the GitHub release notes.

## 1.0.2

### Fixed

- Copying a selection while in **Reading view** copied the whole note.
  The editor reports no selection in reading mode (the selection lives in
  the rendered preview, not the editor), so the command always took the
  whole-note fallback. It now reads the selection from the rendered
  preview when the note is in reading mode. Note that text selected in
  Reading view is already rendered without Markdown syntax, so the strip
  toggles mostly apply when copying from editing mode or the whole note.

## 1.0.1

- Release tooling: one-command release via `npm version`, idempotent
  re-tagging, CI actions bumped to v5.

## 1.0.0

- Initial release: "Copy with formatting stripped" command with
  configurable per-enrichment toggles.
