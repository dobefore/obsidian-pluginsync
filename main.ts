import { logMessageStore, logStore } from 'lib/commonlib/stores';
import { LOG_LEVEL } from 'lib/commonlib/types';
import { fileEventType } from 'lib/file_event_type';
import { LogDisplayModal, Logger } from 'lib/log';
import { SampleSettingTab } from 'lib/settingtab';
import { HostKeyRequest, SyncClient } from 'lib/syncProtocol';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile } from 'obsidian';
// import sqlite3 from 'sqlite3';
// Remember to rename these classes and interfaces!

interface SyncPluginSettings {
	mySetting: string;
	url:string;
	username:string;
	password:string;
	periodicSync:boolean;
	liveSync:boolean;
	SyncInterval:number;
}

const DEFAULT_SETTINGS: SyncPluginSettings = {
	mySetting: 'default',
	url: '',
	username: '',
	password: '',
	periodicSync: false,
	liveSync: false,
	SyncInterval:0

}

export default class SyncPlugin extends Plugin {
	settings: SyncPluginSettings;
	client:SyncClient;
	//--> Basic document s
    notifies: { [key: string]: { notice: Notice; timer: NodeJS.Timeout; count: number } } = {};
	watchedFileEventQueue = [] as string[];
	getVaultName(): string {
        return this.app.vault.getName() ;
    }
	// file event watch -re;ated methods 
	    watchVaultCreate(file: TAbstractFile,) :void {

this.appendWatchEvent(fileEventType.CREATE,file);
		}    
    watchVaultDelete(file: TAbstractFile,) :void {

this.appendWatchEvent(fileEventType.DELETE,file);
    }
    watchVaultRename(file: TAbstractFile,oldPath:string) :void {

this.appendWatchEvent(fileEventType.RENAME,file,oldPath);
    }
	
    watchVaultModify(file: TAbstractFile,) :void {
		new Notice(`${this.settings.SyncInterval}`);
			Logger(`${this.settings.SyncInterval.toString()}`);

		this.appendWatchEvent(fileEventType.MODIFY,file);
    }
/**  check whether the live sync mode is enabled,if so stop appending events to queue*/ 
  appendWatchEvent(type: fileEventType, file: TAbstractFile,oldPath?:string) :void {
		this.watchedFileEventQueue.push(`first queue ${file.path} `);

}
// file event watch -re;ated methods ends here

// eslint-disable-next-line require-await
    async addLog(message: any, level: LOG_LEVEL = LOG_LEVEL.INFO, key = "") {
        // if (level == LOG_LEVEL.DEBUG && !isDebug) {
        //     return;
        // }
        // if (level < LOG_LEVEL.INFO && this.settings && this.settings.lessInformationInLog) {
        //     return;
        // }
        // if (this.settings && !this.settings.showVerboseLog && level == LOG_LEVEL.VERBOSE) {
        //     return;
        // }
        const vaultName = this.getVaultName();
        const timestamp = new Date().toLocaleString();
        const messageContent = typeof message == "string" ? message : message instanceof Error ? `${message.name}:${message.message}` : JSON.stringify(message, null, 2);
        const newMessage = timestamp + "->" + messageContent;

        console.log(vaultName + ":" + newMessage);
        logMessageStore.apply(e => [...e, newMessage].slice(-100));
        // this.setStatusBarText(null, messageContent.substring(0, 30));

        if (level >= LOG_LEVEL.NOTICE) {
            if (!key) key = messageContent;
            if (key in this.notifies) {
                // @ts-ignore
                const isShown = this.notifies[key].notice.noticeEl?.isShown()
                if (!isShown) {
                    this.notifies[key].notice = new Notice(messageContent, 0);
                }
                clearTimeout(this.notifies[key].timer);
                if (key == messageContent) {
                    this.notifies[key].count++;
                    this.notifies[key].notice.setMessage(`(${this.notifies[key].count}):${messageContent}`);
                } else {
                    this.notifies[key].notice.setMessage(`${messageContent}`);
                }

                this.notifies[key].timer = setTimeout(() => {
                    const notify = this.notifies[key].notice;
                    delete this.notifies[key];
                    try {
                        notify.hide();
                    } catch (ex) {
                        // NO OP
                    }
                }, 5000);
            } else {
                const notify = new Notice(messageContent, 0);
                this.notifies[key] = {
                    count: 0,
                    notice: notify,
                    timer: setTimeout(() => {
                        delete this.notifies[key];
                        notify.hide();
                    }, 5000),
                };
            }
        }
    }
  registerFileWatchEvents() {
	Logger("register file watch event");
        this.registerEvent(this.app.vault.on("modify", this.watchVaultModify));
        this.registerEvent(this.app.vault.on("delete", this.watchVaultDelete));
        this.registerEvent(this.app.vault.on("rename", this.watchVaultRename));
        this.registerEvent(this.app.vault.on("create",this.watchVaultCreate));
    }
	async onload() {
		    logStore.subscribe(e => this.addLog(e.message, e.level, e.key));
        Logger("loading plugin");
		await this.loadSettings();
 this.client=new SyncClient(this.settings.url);
const credentials:HostKeyRequest={
	username:this.settings.username,
	password:this.settings.password,
};
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
            new LogDisplayModal(this.app, this).open();
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

// begin to watch file events after obsidian layout is ready
			this.app.workspace.onLayoutReady(async () => {
				// make request host_kry to authenticate user
		await	this.client.host_key(credentials);
            this.registerFileWatchEvents(); 
		})

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check  returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this  will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this  will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
		// await	this.client.host_key(credentials);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

