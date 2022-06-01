import { Editor, MarkdownView, Plugin, htmlToMarkdown } from "obsidian";

interface PasteFunction {
	(this: HTMLElement, ev: ClipboardEvent): void;
}

export default class SmarterPasting extends Plugin {
	pasteFunction: PasteFunction;

	async onload() {
		console.log("Tasty Pasta Plugin loaded.");

		this.pasteFunction = this.modifyPasting.bind(this); // Listen to paste event

		this.registerEvent(
			this.app.workspace.on("editor-paste", this.pasteFunction)
		);
	}
	async onunload() { console.log("Tasty Pasta Plugin unloaded.") }

	private getEditor(): Editor {
		const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeLeaf) return;
		return activeLeaf.editor;
	}

	async modifyPasting(clipboardEv: ClipboardEvent): Promise<void> {
		const editor = this.getEditor();
		if (!editor) return; // stop if pane isn't markdown editor

		let clipboardText = clipboardEv.clipboardData.getData("text/html");
		if (!clipboardText) return; // e.g. when clipboard contains image

		// prevent normal pasting from occuring --> https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts#L3801
		clipboardEv.stopPropagation();
		clipboardEv.preventDefault();

		// uses Turndown via Obsidian API to emulate the "AutoConvert HTML" setting from normal pasting events
		clipboardText = htmlToMarkdown(clipboardText);

		if (clipboardEv.defaultPrevented) this.clipboardConversions(editor, clipboardText);
	}

	async clipboardConversions(editor: Editor, text: string): Promise<void> {
		const todayISO = new Date()
			.toLocaleString()
			.replace(/(\d{2})\/(\d{2})\/(\d{4}).*/, "$3-$2-$1");

		// DETECT TEXT TYPES
		// ------------------
		// url from any image OR pattern from the line containing username + time
		const isFromDiscord = text.includes("https://cdn.discordapp") || /^## .*? _—_ .*:.*$/m.test(text);

		// TEXT MODIFICATIONS
		// ------------------
		text = text
			.replace (/(?!^)(\S)-\s+(?=\w)/gm, "$1"); // remove leftover hyphens, regex uses hack to treat lookahead as lookaround https://stackoverflow.com/a/43232659

		if (isFromDiscord) {
			console.log ("Discord Content");
			text = text
				.replace(/^## (.*?)(?:!.*?\))? _—_ (.*)/gm, "__$1__ ($2)") // format username + time
				//           (nick)(roleIcon)     (time)

				.replace(/\(Today at.*\)/, `(${todayISO})`) // replace relative w/ absolute date
				.replace(/^$/m, ""); // remove blank lines
		}

		editor.replaceSelection(text);
	}

}
