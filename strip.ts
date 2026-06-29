// Pure text-transform logic, kept separate from the Obsidian API so it is
// trivial to reason about (and unit-test) on its own.

export interface StripSettings {
	stripBold: boolean;
	stripItalic: boolean;
	stripStrikethrough: boolean;
	stripHighlight: boolean;
	stripInlineCode: boolean;
	stripMarkdownLinks: boolean;
	stripWikilinks: boolean;
	stripImages: boolean;
	stripTags: boolean;
	stripHeadingMarkers: boolean;
	stripBlockquoteMarkers: boolean;
	keepCodeBlocks: boolean;
}

export const DEFAULT_SETTINGS: StripSettings = {
	// Defaults match the original request: strip inline emphasis + links,
	// keep block structure (headings, lists, quotes, code blocks).
	stripBold: true,
	stripItalic: true,
	stripStrikethrough: false,
	stripHighlight: false,
	stripInlineCode: false,
	stripMarkdownLinks: true,
	stripWikilinks: true,
	stripImages: true,
	stripTags: false,
	stripHeadingMarkers: false,
	stripBlockquoteMarkers: false,
	keepCodeBlocks: true,
};

const FENCE_RE = /^\s*(`{3,}|~{3,})/;

// Leading block-level prefix: indentation, blockquote markers, then an
// optional single list marker, then an optional heading marker. We pull this
// off each line before touching inline markup so that, e.g., a "* " bullet is
// never read as the start of an italic span.
const PREFIX_RE = /^(\s*(?:>\s?)*)((?:[-*+]\s+|\d+[.)]\s+)?)(#{1,6}\s+)?/;

// U+0000 cannot appear in an Obsidian note, so it makes a collision-proof
// placeholder fence (a bare " 5 " could match real numbers in the text).
const SENTINEL = String.fromCharCode(0);
const ph = (i: number): string => SENTINEL + i + SENTINEL;
const PH_RE = /\u0000(\d+)\u0000/g;

/**
 * Strip the configured Markdown enrichments from `text`.
 *
 * Block structure (headings, list bullets, blockquotes, fenced code) is
 * preserved unless its corresponding "strip marker" toggle is on. Inline
 * emphasis and links are removed per the settings, leaving their inner text.
 */
export function stripMarkdown(text: string, s: StripSettings): string {
	const lines = text.split("\n");
	// Classify every line up front. Only *closed* fenced blocks count as code;
	// an unclosed fence (common when the selection starts or ends mid-block)
	// is treated as ordinary text and still stripped, rather than disabling
	// stripping for the entire remainder of the selection.
	const kind = classifyFences(lines);
	const out: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (kind[i] === "fence") {
			if (s.keepCodeBlocks) out.push(line); // else: drop the fence delimiter
			continue;
		}
		if (kind[i] === "code") {
			out.push(s.keepCodeBlocks ? line : stripInline(line, s));
			continue;
		}
		out.push(stripBlockAwareLine(line, s));
	}

	return out.join("\n");
}

type LineKind = "fence" | "code" | "text";

// Pair up fence delimiters. Lines belonging to a matched (opened *and* closed)
// fenced block are marked "fence" (the delimiters) or "code" (the body); every
// other line — including an unclosed trailing fence and its contents — is "text".
function classifyFences(lines: string[]): LineKind[] {
	const kind: LineKind[] = new Array(lines.length).fill("text");
	let openChar: string | null = null;
	let openIdx = -1;

	for (let i = 0; i < lines.length; i++) {
		const m = lines[i].match(FENCE_RE);
		if (!m) continue;
		const ch = m[1][0]; // ` or ~
		if (openChar === null) {
			openChar = ch;
			openIdx = i;
		} else if (openChar === ch) {
			kind[openIdx] = "fence";
			kind[i] = "fence";
			for (let j = openIdx + 1; j < i; j++) kind[j] = "code";
			openChar = null;
		}
		// A different fence char while one is open is just body content.
	}

	return kind;
}

function stripBlockAwareLine(line: string, s: StripSettings): string {
	const m = line.match(PREFIX_RE);
	let prefix = m ? m[0] : "";
	const body = m ? line.slice(prefix.length) : line;

	const quoteMarker = m ? m[1] : "";
	const headingMarker = m ? m[3] : "";

	// Optionally demote the block markers themselves. List markers are always
	// preserved when present — removing them would collapse the very list
	// structure the feature exists to keep.
	if (headingMarker && s.stripHeadingMarkers) {
		prefix = prefix.slice(0, prefix.length - headingMarker.length);
	}
	if (quoteMarker && s.stripBlockquoteMarkers) {
		prefix = prefix.slice(quoteMarker.length);
	}

	return prefix + stripInline(body, s);
}

function stripInline(text: string, s: StripSettings): string {
	// Protect inline code spans first so their contents aren't altered by the
	// other passes (and so emphasis chars inside code never trip us up).
	const codeSpans: string[] = [];
	let work = text.replace(/(`+)(?:[^`]|[^`].*?[^`])\1(?!`)/g, (full) => {
		if (s.stripInlineCode) return full.replace(/^`+|`+$/g, "");
		codeSpans.push(full);
		return ph(codeSpans.length - 1);
	});

	// Images before links (image syntax is a superset of link syntax).
	if (s.stripImages) {
		work = work.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
		// Consume one preceding space so removing an embed doesn't leave a gap.
		work = work.replace(/ ?!\[\[[^\]]*\]\]/g, "");
	}
	if (s.stripMarkdownLinks) {
		// Allow one level of balanced parens in the URL (e.g. Wikipedia links)
		// so the destination isn't truncated at the first ")".
		work = work.replace(/\[([^\]]+)\]\((?:[^()]|\([^()]*\))*\)/g, "$1");
		work = work.replace(/<mailto:([^>]+)>/g, "$1"); // drop the scheme noise
		work = work.replace(/<(https?:[^>]+)>/g, "$1");
	}
	if (s.stripWikilinks) {
		// [[target|alias]] -> alias ; [[target]] -> target
		work = work.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2");
		work = work.replace(/\[\[([^\]]+)\]\]/g, "$1");
	}
	if (s.stripBold) {
		work = work.replace(/\*\*([^*]+?)\*\*/g, "$1");
		// Underscore strong only at word boundaries: CommonMark leaves intraword
		// __ literal (e.g. foo__bar__baz), so we must not strip those.
		work = work.replace(/(^|[^\w])__([^_]+?)__(?=$|[^\w])/g, "$1$2");
	}
	if (s.stripItalic) {
		work = work.replace(/\*([^*\s][^*]*?)\*/g, "$1");
		// Underscore italics only at word boundaries (avoids snake_case names).
		work = work.replace(/(^|[^\w])_([^_]+?)_(?=$|[^\w])/g, "$1$2");
	}
	if (s.stripStrikethrough) {
		work = work.replace(/~~([^~]+?)~~/g, "$1");
	}
	if (s.stripHighlight) {
		work = work.replace(/==([^=]+?)==/g, "$1");
	}
	if (s.stripTags) {
		// #tag including nested slashes; leaves bare "#" and headings untouched.
		// Consume the preceding whitespace too so removal doesn't leave a gap.
		work = work.replace(/(^|\s)#[A-Za-z0-9_][\w/-]*/g, "");
		work = work.replace(/^ +/, ""); // tidy a tag that began the line body
	}

	// Restore protected inline code spans.
	work = work.replace(PH_RE, (_full, i: string) => codeSpans[Number(i)]);
	return work;
}
