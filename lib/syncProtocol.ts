import { Logger } from "./log";
import { requestUrl, RequestUrlParam,  } from "obsidian";
import { fileAction, FileInfo } from "./file_event_type";
// first just defines method signatures,including arguments and return types.
export interface HostKeyRequest {
  username: string;
  password: string;
}
/**host key returned from the server */
export interface HostKeyResponse {
  key: string;
}
export interface MetaRequest { 
  states:MetaInner[]
}
// export interface MetaRequest {
//   states: FileInfo[];
// }
interface MetaResponse {
  metainner: MetaInner[];
}
export interface MetaInner {
  action: fileAction;
  fileinfo: FileInfo;
}
export interface DownloadRequest {
    filenames: string[],
}
export interface DownloadResponse {
  files: PFile[];
}
// can be used in both download and upload
export interface PFile {
     states:FileInfo,
     content: string,

  // path: string;
  // content: string;
}
export interface UploadRequest {
    files:PFile[] ,
}
// should add a meta method to notify the client that new changes have been made on the server
// side when there are no file events are captured when the timer is triggered.By comparing
// mtime
export interface SyncProtocol {
  host_key(hostKeyRequest: HostKeyRequest): Promise<boolean>;
  download(filenames: string[]): Promise<DownloadResponse | undefined>;
  upload(files: PFile[]): Promise<void>;

  meta(fileinfo: MetaInner[]): Promise<MetaResponse | undefined>;
  modify(hostKeyRequest: HostKeyRequest): Promise<void>;
}
export const syncHeaderName = "obsidian-sync";
export class SyncClient implements SyncProtocol {
  private readonly serverAddress: string;
  public hostKey: string;

  constructor(serverAddress: string) {
    this.serverAddress = serverAddress;
  }
  // /**I would say it is a fill sync,as all files in the vault will be compared to the server. */
  // async startSync(hostKeyRequest: HostKeyRequest, mdFiles: TFile[]) {
  //   const ret = await this.host_key(hostKeyRequest);
  //   if (!ret) {
  //     console.error("user authentication fails");
  //     Logger("user authentication fails");
  //     return;
  //   }
  //   // construct an array of fileinfo from an array of Tfile s.
  //   const fa = mdFiles.map((value) => {
  //     const fileinfo: FileInfo = {
  //       name:value.name,
  //       path: value.path,
  //       mtime: value.stat.mtime,
  //       ctime: value.stat.ctime,
  //       oldPath:""
  //     };
  //     return fileinfo;
  //   });
  //   console.log(`${fa}`);

  //   // run meta
  //   const metaResp = await this.meta(fa);
  //   if (metaResp == undefined) {
  //     Logger("meta request response fails");
  //     return;
  //   }
  //   const toDelete = metaResp.metainner.filter((item) => {
  //     return item.action == fileAction.DELETE;
  //   });
  //   const Others = metaResp.metainner.filter((item) => {
  //     return item.action != fileAction.DELETE;
  //   });
  //   Others.forEach((item) => {
  //     switch (item.action) {
  //       case fileAction.DOWNLOAD:
  //         // make request download
  //         // this will download files from server

  //         break;
  //       case fileAction.UPLOAD:
  //         // make request upload
  //         // this will upload files from server

  //         break;
  //       default:
  //         break;
  //     }
  //   });
  //   // delete operations carries at last.
  //   toDelete.forEach((item) => {
  //     // make request delete.
  //     // this will delete related files from the local or in the case of obsidian,move the files
  //     // to trash.
  //   });
  // }
  async host_key(hostKeyRequest: HostKeyRequest): Promise<boolean> {
    const param: RequestUrlParam = {
      url: this.serverAddress + "/hostKey",
      method: "POST",
      body: JSON.stringify(hostKeyRequest),
      headers: { "Content-Type": "application/json" },
    };
    try {
      const response = await requestUrl(param);

      if (response.status == 200) {
        const hostKeyResponse: HostKeyResponse = await response.json;
        this.hostKey = hostKeyResponse.key;
        Logger(`Host key received: ${hostKeyResponse.key}`);
        return true;
      } else {
        Logger("other status code");
        return false;
      }
    } catch (e) {
      Logger(`request host_key error: ${e}`);
      return false;
    }
  }

  async download(filenames: string[]) {
    const headers = {
      "Content-Type": "application/json","obsidian-sync": JSON.stringify({ k: this.hostKey }),
    };
const body:DownloadRequest={
  filenames:filenames,
};
    const param: RequestUrlParam = {
      url: this.serverAddress + "/download",
      method: "POST",
      body: JSON.stringify(body),
      headers: headers,
    };
    try {
      const response = await requestUrl(param);

      if (response.status == 200) {
        const resp: DownloadResponse = await response.json;
        console.log(`${resp}`);
        return resp;
        // console.log('Host key received: ', hostKeyResponse.key);
      } else {
        Logger("other status code");
      }
    } catch (e) {
      Logger(`request create error: ${e}`);
    }
  }
  async meta(mis: MetaInner[]) {
    console.log("meta is running");
    const headers = {
      "Content-Type": "application/json",
 "obsidian-sync": JSON.stringify({ k: this.hostKey }),
    };
const body:MetaRequest= {
  states:mis,
}
    const param: RequestUrlParam = {
      url: this.serverAddress + "/meta",
      method: "POST",
      body: JSON.stringify(body),
      headers: headers,
    };
    try {
      const response = await requestUrl(param);

      if (response.status == 200) {
        const resp: MetaResponse = await response.json;
        console.log(`meta${resp.metainner.first()?.action}`)
        console.log(`${fileAction.UPLOAD}`)
        return resp;
        // console.log('Host key received: ', hostKeyResponse.key);
      } else {
        Logger("other status code");
      }
    } catch (e) {
      Logger(`request meta error: ${e}`);
    }
    return undefined;
  }
  async upload(files: PFile[]) {
    // construct rtpe File[]
    Logger("upload is running");
    const headers = {
      "Content-Type": "application/json", "obsidian-sync": JSON.stringify({ k: this.hostKey }),
    };
const body:UploadRequest={
  files:files,
}
    const param: RequestUrlParam = {
      url: this.serverAddress + "/upload",
      method: "POST",
      body: JSON.stringify(body),
      headers: headers,
    };
    try {
      const response = await requestUrl(param);

      if (response.status == 200) {
        // const resp: MetaResponse = await response.json();
        // console.log(`${resp}`);
        // return resp;
        // console.log('Host key received: ', hostKeyResponse.key);
      } else {
        Logger("other status code");
      }
    } catch (e) {
      Logger(`request create error: ${e}`);
    }
  }
  async modify(hostKeyRequest: HostKeyRequest) {}
}
