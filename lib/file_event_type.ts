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
Modify="modify"
// ... more 
}

export interface FileInfo {
  name:string,
 path: string,
      mtime: number,
      ctime: number,
}
export function setFileInfo(file:TFile,oldPath?:string):FileInfo{
  
  const fi= {
    name:file.name,
  path: file.path,
  mtime: file.stat.mtime,
  ctime: file.stat.ctime,
};
return fi;
}
export const FileEventQueue=new Map<fileEventType,FileInfo>();
