import {  TFile } from "obsidian";

export enum fileEventType {
  MODIFY ,
  DELETE ,
  CREATE ,
  RENAME ,
}
/** these are opperations the client should take,something like a commander is giving orders */
export enum fileAction {
  /**  this indicates the client should upload a file to the server */
UPLOAD="upload",
DOWNLOAD="download",
DELETE="delete",
CHUNK="chunk",
MODIFY="modify",
// ... more 
ABSENT="absent",
}

export interface FileInfo {
  name:string,
 path: string,
      mtime: number,
      ctime: number,
      oldpath:string,
}
export async function setFileInfo(file:TFile,ctime:number,mtime:number,oldPath?:string):Promise< FileInfo>{
  
        const exist=await this.app.vault.adapter.exists(file.path);
        if (exist) {
  return   {
    name:file.name,
  path: file.path,
  mtime: mtime,
  ctime: ctime,
  oldpath:oldPath==undefined ? "":oldPath,
};        
        }
console.log(`file not exist whilw setting file info ${file.name}`);
  const fi= {
    name:file.name,
  path: file.path,
  mtime: 0,
  ctime: 0,
  oldpath:oldPath==undefined ? "":oldPath,
};
return fi;
}
// export const FileEventQueue=new MetaInner[];
