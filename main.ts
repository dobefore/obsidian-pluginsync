import { logMessageStore, logStore } from "lib/commonlib/stores";
import { LOG_LEVEL } from "lib/commonlib/types";
import {
  fileAction,
  FileEventQueue,
  fileEventType,
  FileInfo,
  setFileInfo,
} from "lib/file_event_type";
import { LogDisplayModal, Logger } from "lib/log";
import { SampleSettingTab } from "lib/settingtab";
import { HostKeyRequest, PFile, SyncClient } from "lib/syncProtocol";
import {
  App,
  Editor,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  TAbstractFile,
  TFile,
} from "obsidian";
// import sqlite3 from 'sqlite3';
// Remember to rename these classes and interfaces!

interface SyncPluginSettings {
  mySetting: string;
  url: string;
  username: string;
  password: string;
  periodicSync: boolean;
  liveSync: boolean;
  SyncInterval: number;
}

const DEFAULT_SETTINGS: SyncPluginSettings = {
  mySetting: "default",
  url: "",
  username: "",
  password: "",
  periodicSync: false,
  liveSync: false,
  SyncInterval: 0,
};

export default class SyncPlugin extends Plugin {
  settings: SyncPluginSettings;
  client: SyncClient;
  //--> Basic document s
  notifies: {
    [key: string]: { notice: Notice; timer: NodeJS.Timeout; count: number };
  } = {};
  watchedFileEventQueue = [] as string[];
  timer: NodeJS.Timeout;
  getVaultName(): string {
    return this.app.vault.getName();
  }
  // file event watch -re;ated methods
  watchVaultCreate(file: TAbstractFile): void {
    this.appendWatchEvent(fileEventType.CREATE, file);
  }
  watchVaultDelete(file: TAbstractFile): void {
    this.appendWatchEvent(fileEventType.DELETE, file);
  }
  watchVaultRename(file: TAbstractFile, oldPath: string): void {
    this.appendWatchEvent(fileEventType.RENAME, file, oldPath);
  }

  watchVaultModify(file: TAbstractFile): void {
    this.appendWatchEvent(fileEventType.MODIFY, file);
  }
  /**  check whether the live sync mode is enabled,if so stop appending events to queue*/
  appendWatchEvent(
    type: fileEventType,
    file: TAbstractFile,
    oldPath?: string
  ): void {
    FileEventQueue.set(type, setFileInfo(file as TFile, oldPath));
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
    const messageContent =
      typeof message == "string"
        ? message
        : message instanceof Error
        ? `${message.name}:${message.message}`
        : JSON.stringify(message, null, 2);
    const newMessage = timestamp + "->" + messageContent;

    console.log(vaultName + ":" + newMessage);
    logMessageStore.apply((e) => [...e, newMessage].slice(-100));
    // this.setStatusBarText(null, messageContent.substring(0, 30));

    if (level >= LOG_LEVEL.NOTICE) {
      if (!key) key = messageContent;
      if (key in this.notifies) {
        // @ts-ignore
        const isShown = this.notifies[key].notice.noticeEl?.isShown();
        if (!isShown) {
          this.notifies[key].notice = new Notice(messageContent, 0);
        }
        clearTimeout(this.notifies[key].timer);
        if (key == messageContent) {
          this.notifies[key].count++;
          this.notifies[key].notice.setMessage(
            `(${this.notifies[key].count}):${messageContent}`
          );
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
    // It's weird anyway.If I directly put this.watchVaultDelete in this.app.vault.on()
    // and I want to access property this.settings inside watchVaultDelete,It will
    // throw errors that show me undefined property. So do it the following way
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        console.log(`${this.settings.SyncInterval}`);
        this.watchVaultModify(file);
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        console.log(`${this.settings.SyncInterval}`);
        this.watchVaultDelete(file);
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        console.log(`${this.settings.SyncInterval}`);

        this.watchVaultRename(file, oldPath);
      })
    );
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        console.log(`${this.settings.SyncInterval}`);

        this.watchVaultCreate(file);
      })
    );
  }
  async sync() {
    console.log("time is on,sync now");
    const credentials: HostKeyRequest = {
      username: this.settings.username,
      password: this.settings.password,
    };
    // get fuke stats
    const mdFiles = this.app.vault.getMarkdownFiles();
    // I prepare to put all methods in starSync,nut some methods need to access this,app.
    // await	this.client.startSync(credentials,mdfiles);
    const ret = await this.client.host_key(credentials);
    if (!ret) {
      console.error("user authentication fails");
      Logger("user authentication fails");
      return;
    }
    // construct an array of fileinfo from an array of Tfile s.
    const fa = mdFiles.map((value) => {
      const fileinfo: FileInfo = {
        name: value.name,
        path: value.path,
        mtime: value.stat.mtime,
        ctime: value.stat.ctime,
      };
      return fileinfo;
    });

    // run meta
    const metaResp = await this.client.meta(fa);
    if (metaResp == undefined) {
      Logger("meta request response fails");
      return;
    }

    const toDelete = metaResp.metainner.filter((item) => {
       item.action === fileAction.DELETE
    });
    const toDownload = metaResp.metainner.filter((item) => {
       item.action === fileAction.DOWNLOAD
    });
    const toUpload = metaResp.metainner.filter((item) =>{ 
     return item.action=== fileAction.UPLOAD;});
    // make request download
    // this will download files from server
    const fnames = toDownload.map((item) => {
      return item.fileinfo.name;
    });
    if (fnames.length != 0) {
      const downloadResponse = await this.client.download(fnames);
      if (downloadResponse != undefined) {
      downloadResponse.files.forEach(async (item) => {
        await this.app.vault.adapter.write(item.states.path, item.content);
      });
    }
  }
    // make request uploadexportP
    // this will upload files from server

    //get Tfile types according to file name
    const uploadFiles: PFile[] = [];
    for (const item of toUpload) {
    const md=this.app.vault.getAbstractFileByPath(item.fileinfo.path) ;
    if(md==null)
    {
      console.log("null")
      continue;
    }
   const mdd=md as TFile;
 const states: FileInfo = {
          name: mdd.name,
          path: mdd.path,
          mtime: mdd .stat.mtime,
          ctime: mdd.stat.ctime,
        };
        const file: PFile = {
          states: states,
          content: await this.app.vault.adapter.read(md.path),
        };
        uploadFiles.push(file);
    }
if (uploadFiles.length!=0) {
  
    await this.client.upload(uploadFiles);
}

    // delete operations carries at last.
    toDelete.forEach(async (item) => {
      // do not make http delete,as the server has already carries the delete operation by mark the
      // corresponding file deleted.
      // this will delete related files from the local or in the case of obsidian,move the files
      // to trash.
      const filep = mdFiles.find((itemin) => {
        return itemin.name == item.fileinfo.name;
      });
      if (filep == undefined) {
        return;
      }
      // broadly that fileo is undefined is not possible
      await this.app.vault.trash(filep, false);
    });
  }
  async startSyncTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(async () => {
      await this.sync();
    }, this.settings.SyncInterval);
  }
  async onload() {
    logStore.subscribe((e) => this.addLog(e.message, e.level, e.key));
    Logger("loading plugin");
    await this.loadSettings();
    this.client = new SyncClient(this.settings.url);

    // This creates an icon in the left ribbon.
    const ribbonIconEl = this.addRibbonIcon(
      "dice",
      "Sample Plugin",
      (evt: MouseEvent) => {
        // Called when the user clicks the icon.
        new LogDisplayModal(this.app, this).open();
      }
    );
    // Perform additional things with the ribbon
    ribbonIconEl.addClass("my-plugin-ribbon-class");

    // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
    const statusBarItemEl = this.addStatusBarItem();
    statusBarItemEl.setText("Status Bar Text");

    // begin to watch file events after obsidian layout is ready
    this.app.workspace.onLayoutReady(async () => {
      // make request host_kry to authenticate user
      this.registerFileWatchEvents();
    });
    if (this.settings.periodicSync) {
      await this.startSyncTimer();
    }
    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: "open-sample-modal-simple",
      name: "Open sample modal (simple)",
      callback: () => {
        new SampleModal(this.app).open();
      },
    });
    // This adds an editor command that can perform some operation on the current editor instance
    this.addCommand({
      id: "sample-editor-command",
      name: "Sample editor command",
      editorCallback: (editor: Editor, view: MarkdownView) => {
        console.log(editor.getSelection());
        editor.replaceSelection("Sample Editor Command");
      },
    });
    // This adds a complex command that can check whether the current state of the app allows execution of the command
    this.addCommand({
      id: "open-sample-modal-complex",
      name: "Open sample modal (complex)",
      checkCallback: (checking: boolean) => {
        // Conditions to check
        const markdownView =
          this.app.workspace.getActiveViewOfType(MarkdownView);
        if (markdownView) {
          // If checking is true, we're simply "checking" if the command can be run.
          // If checking is false, then we want to actually perform the operation.
          if (!checking) {
            new SampleModal(this.app).open();
          }

          // This command will only show up in Command Palette when the check  returns true
          return true;
        }
      },
    });

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new SampleSettingTab(this.app, this));

    // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
    // Using this  will automatically remove the event listener when this plugin is disabled.
    this.registerDomEvent(document, "click", (evt: MouseEvent) => {
      console.log("click", evt);
    });

    // When registering intervals, this  will automatically clear the interval when the plugin is disabled.
    this.registerInterval(
      window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
    );
    // await	this.client.host_key(credentials);
  }

  onunload() {
    console.log("Unloading SyncClient plugin");
    clearInterval(this.timer);
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
    const { contentEl } = this;
    contentEl.setText("Woah!");
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
