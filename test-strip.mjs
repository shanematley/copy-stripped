// Quick correctness harness: transpile strip.ts on the fly and run cases.
import { execSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

execSync("npx esbuild strip.ts --bundle --format=esm --outfile=strip.test.mjs", { stdio: "inherit" });
const { stripMarkdown, DEFAULT_SETTINGS } = await import("./strip.test.mjs");

let pass = 0, fail = 0;
function eq(name, input, expected, settings = DEFAULT_SETTINGS) {
	const got = stripMarkdown(input, settings);
	if (got === expected) { pass++; }
	else {
		fail++;
		console.log(`FAIL: ${name}`);
		console.log(`  in:  ${JSON.stringify(input)}`);
		console.log(`  exp: ${JSON.stringify(expected)}`);
		console.log(`  got: ${JSON.stringify(got)}`);
	}
}

// --- Defaults: strip bold/italic/links/wikilinks/images; keep structure ---
eq("heading kept", "# Hello world", "# Hello world");
eq("subheading kept", "### A *fancy* heading", "### A fancy heading");
eq("dash bullet kept", "- a bullet", "- a bullet");
eq("star bullet kept", "* a bullet", "* a bullet");
eq("plus bullet kept", "+ a bullet", "+ a bullet");
eq("numbered list kept", "1. first item", "1. first item");
eq("nested bullet kept", "  - nested **bold** item", "  - nested bold item");
eq("blockquote kept", "> a quote", "> a quote");

eq("bold removed", "This is **bold** text", "This is bold text");
eq("underscore bold removed", "This is __bold__ text", "This is bold text");
eq("italic removed", "This is *italic* text", "This is italic text");
eq("underscore italic removed", "This is _italic_ text", "This is italic text");
eq("snake_case preserved", "call my_func_name here", "call my_func_name here");
eq("bold+italic", "A ***big*** word", "A big word");

eq("md link -> text", "See [the docs](https://x.com) now", "See the docs now");
eq("autolink -> url", "Mail <mailto:a@b.com> ok", "Mail a@b.com ok");
eq("wikilink plain", "See [[My Note]] please", "See My Note please");
eq("wikilink alias", "See [[My Note|that note]] please", "See that note please");
eq("image -> alt", "Look ![a cat](cat.png) here", "Look a cat here");
eq("embed removed", "Look ![[diagram.png]] here", "Look here");

eq("bullet with link", "- Visit [site](http://a.b) today", "- Visit site today");
eq("bullet star italic mix", "* an *emphasised* point", "* an emphasised point");

// --- Code protection (default keepCodeBlocks=true, stripInlineCode=false) ---
eq("inline code untouched", "Run `npm **install**` now", "Run `npm **install**` now");
eq("fenced block untouched",
	"```\n**not bold** and *not italic*\n```",
	"```\n**not bold** and *not italic*\n```");
eq("number not eaten", "Step 1 then [go](x) to 2", "Step 1 then go to 2");

// --- Configurable behaviour ---
const stripCode = { ...DEFAULT_SETTINGS, stripInlineCode: true };
eq("inline code stripped when on", "Run `npm i` now", "Run npm i now", stripCode);

const stripHl = { ...DEFAULT_SETTINGS, stripHighlight: true, stripStrikethrough: true };
eq("highlight+strike when on", "==hi== and ~~bye~~", "hi and bye", stripHl);

const stripHead = { ...DEFAULT_SETTINGS, stripHeadingMarkers: true };
eq("heading markers removed when on", "## Title here", "Title here", stripHead);

const stripQuote = { ...DEFAULT_SETTINGS, stripBlockquoteMarkers: true };
eq("blockquote markers removed when on", "> quoted **bold**", "quoted bold", stripQuote);

const stripTags = { ...DEFAULT_SETTINGS, stripTags: true };
eq("tags removed when on", "A #project/active note", "A note", stripTags);
eq("heading not tag-stripped", "# Heading", "# Heading", stripTags);

// --- Regressions from code review ---
// #1 intraword __ is left literal by CommonMark; standalone __x__ is bold.
eq("intraword double-underscore kept", "use foo__bar__baz here", "use foo__bar__baz here");
eq("standalone dunder still bold", "the __init__ method", "the init method");
// #2 link URL containing balanced parens must not truncate.
eq("link paren url", "See [Bar](https://x.org/wiki/Foo_(bar)) ok", "See Bar ok");
// #3 unclosed fence in a selection should still strip, not freeze.
eq("unclosed fence still strips",
	"intro\n```\ncode with **bold** here",
	"intro\n```\ncode with bold here");
eq("closed fence still verbatim",
	"```\n**keep me**\n```",
	"```\n**keep me**\n```");
// #4 embed removal leaves no double space.
eq("embed no gap", "Look ![[diagram.png]] here", "Look here");

// --- Multi-line document ---
eq("full doc",
	"# Title\n\nSome **bold** and *italic* and a [link](http://x).\n\n- bullet one\n- bullet [[two]]\n\n> quote with **emphasis**",
	"# Title\n\nSome bold and italic and a link.\n\n- bullet one\n- bullet two\n\n> quote with emphasis");

rmSync("strip.test.mjs", { force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
