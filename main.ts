import {
	App,
	MarkdownView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import { DEFAULT_SETTINGS, StripSettings, stripMarkdown } from "./strip";

export default class CopyStrippedPlugin extends Plugin {
	settings: StripSettings;

	async onload() {
		await this.loadSettings();

		// Registered as a global command (not editorCallback) with an icon so it
		// can be added to the mobile toolbar: that picker only lists commands
		// that report as available when no editor is focused, which excludes
		// editor-scoped commands. We fetch the active editor ourselves instead.
		this.addCommand({
			id: "copy-stripped",
			name: "Copy with formatting stripped",
			icon: "scissors",
			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) {
					new Notice("Copy Stripped: open a note first");
					return;
				}
				this.copyStripped(view);
			},
		});

		this.addSettingTab(new CopyStrippedSettingTab(this.app, this));
	}

	async copyStripped(view: MarkdownView) {
		// Selection if there is one, otherwise the whole note. In reading view
		// the selection lives in the rendered DOM, not the editor — asking the
		// editor there silently returns "" and we'd copy the whole note.
		const selected =
			view.getMode() === "preview"
				? view.contentEl.win.getSelection()?.toString() ?? ""
				: view.editor.getSelection();
		const source = selected.length > 0 ? selected : view.editor.getValue();
		const result = stripMarkdown(source, this.settings);

		try {
			await navigator.clipboard.writeText(result);
			new Notice(
				selected.length > 0
					? "Copied selection (stripped)"
					: "Copied note (stripped)",
			);
		} catch (e) {
			console.error("Copy Stripped: clipboard write failed", e);
			new Notice("Copy Stripped: clipboard write failed");
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

interface ToggleDef {
	key: keyof StripSettings;
	name: string;
	desc: string;
}

const STRIP_TOGGLES: ToggleDef[] = [
	{ key: "stripBold", name: "Strip bold", desc: "**text** / __text__ → text" },
	{ key: "stripItalic", name: "Strip italics", desc: "*text* / _text_ → text" },
	{ key: "stripStrikethrough", name: "Strip strikethrough", desc: "~~text~~ → text" },
	{ key: "stripHighlight", name: "Strip highlights", desc: "==text== → text" },
	{ key: "stripInlineCode", name: "Strip inline code", desc: "`code` → code (removes the backticks)" },
	{ key: "stripMarkdownLinks", name: "Strip Markdown links", desc: "[text](url) → text, and <url> → url" },
	{ key: "stripWikilinks", name: "Strip wikilinks", desc: "[[note|alias]] → alias, [[note]] → note" },
	{ key: "stripImages", name: "Strip images", desc: "![alt](url) → alt, and ![[embed]] → (removed)" },
	{ key: "stripTags", name: "Strip tags", desc: "#tag → (removed). Headings are never affected." },
];

const KEEP_TOGGLES: ToggleDef[] = [
	{ key: "stripHeadingMarkers", name: "Also remove heading markers", desc: "Turn '## Title' into 'Title'. Off = keep headings." },
	{ key: "stripBlockquoteMarkers", name: "Also remove blockquote markers", desc: "Turn '> quote' into 'quote'. Off = keep blockquotes." },
];

class CopyStrippedSettingTab extends PluginSettingTab {
	plugin: CopyStrippedPlugin;

	constructor(app: App, plugin: CopyStrippedPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Inline enrichments").setHeading();
		for (const t of STRIP_TOGGLES) this.addToggle(containerEl, t);

		new Setting(containerEl).setName("Block structure").setHeading();
		containerEl.createEl("p", {
			text: "List bullets and numbering are always preserved. The toggles below control the markers that are kept by default.",
			cls: "setting-item-description",
		});
		for (const t of KEEP_TOGGLES) this.addToggle(containerEl, t);

		new Setting(containerEl)
			.setName("Keep fenced code blocks verbatim")
			.setDesc("When on, ``` code blocks are copied untouched. When off, the fences are removed and inline rules apply to their contents.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.keepCodeBlocks)
					.onChange(async (value) => {
						this.plugin.settings.keepCodeBlocks = value;
						await this.plugin.saveSettings();
					}),
			);
	}

	private addToggle(containerEl: HTMLElement, t: ToggleDef) {
		new Setting(containerEl)
			.setName(t.name)
			.setDesc(t.desc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings[t.key] as boolean)
					.onChange(async (value) => {
						(this.plugin.settings[t.key] as boolean) = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
