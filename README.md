# Copy Stripped

An Obsidian plugin that copies the current selection (or the whole note, if
nothing is selected) to the clipboard with **selected Markdown enrichments
stripped out**. Block structure you care about — headings, bullet/numbered
lists, blockquotes, code blocks — is preserved, while inline noise like bold,
italics and links is removed.

Exactly *what* gets stripped is configurable per enrichment in the plugin
settings.

## Defaults

Out of the box it strips **bold, italics, Markdown links, wikilinks and
images**, and keeps everything else. So:

```markdown
# Project notes

Some **bold** and *italic* text with a [link](https://example.com).

- a bullet with [[Another Note|an alias]]
- ![diagram](diagram.png) inline image

> a quote with **emphasis**
```

becomes:

```markdown
# Project notes

Some bold and italic text with a link.

- a bullet with an alias
-  inline image

> a quote with emphasis
```

## Usage

1. Open the command palette (`Cmd/Ctrl+P`).
2. Run **"Copy Stripped: Copy with formatting stripped"**.
3. Optionally bind it to a hotkey in *Settings → Hotkeys*.

If you have text selected, only that is copied; otherwise the whole note is.

## Settings

Each enrichment has its own toggle under *Settings → Copy Stripped*:

- **Inline:** bold, italics, strikethrough, highlights, inline code,
  Markdown links, wikilinks, images, tags.
- **Block structure:** optionally also remove heading markers (`## Title` →
  `Title`) and blockquote markers (`> quote` → `quote`). List bullets and
  numbering are always preserved.
- **Keep fenced code blocks verbatim:** on by default; turn off to also process
  text inside ``` fences.

## Building

```bash
npm install
npm run build      # produces main.js
npm run dev        # watch mode
node test-strip.mjs   # run the transform test suite
```

## Installing into a vault

Copy `manifest.json` and `main.js` into:

```
<your vault>/.obsidian/plugins/copy-stripped/
```

then enable **Copy Stripped** in *Settings → Community plugins*. During
development you can symlink the folder instead and use `npm run dev`.
