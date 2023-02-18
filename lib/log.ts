// about log display ui widget
// when the button show log is clicked,a new window will be opened,
// and the log will be displayed in the new window.
import { LogEntry, logStore } from "./commonlib/stores";
import { LOG_LEVEL } from "./commonlib/types";
import SyncPlugin from "../main";
import { App,Modal } from "obsidian";
import { logMessageStore } from "./commonlib/stores";
// import { escapeStringToHTML } from "./lib/src/strbin";

/**  It seems Modal gives you ability to create and show a window */
export class LogDisplayModal extends Modal {
    plugin: SyncPlugin;
    logEl: HTMLDivElement;
    unsubscribe: () => void;
    constructor(app: App, plugin: SyncPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.empty();
        contentEl.createEl("h2", { text: "Sync Status" });
        const div = contentEl.createDiv("id");
        // add scc style
        div.addClass("op-scrollable");
        div.addClass("op-pre");
        this.logEl = div;
    
        this.unsubscribe = logMessageStore.observe((e) => {
            let msg = "";
            for (const v of e) {
                msg += v + "<br>";
            }
            this.logEl.innerHTML = msg;
        })
        logMessageStore.invalidate();
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        if (this.unsubscribe) this.unsubscribe();
    }

 
}

export function Logger(message: any, level?: LOG_LEVEL, key?: string): void {
    const entry = { message, level, key } as LogEntry;
    logStore.push(entry)
}
logStore.intercept(e => e.slice(Math.min(e.length - 200, 0)));


