import { Logger } from "./log"
import {request,requestUrl,RequestUrlParam} from "obsidian"
// first just defines method signatures,including arguments and return types.
export interface HostKeyRequest {
    username:string,
    password:string,
}
/**host key returned from the server */
export interface HostKeyResponse {
key:string
}
export interface SyncProtocol {
    host_key(hostKeyRequest:HostKeyRequest):Promise<void>;
    download(hostKeyRequest:HostKeyRequest):void;
    upload(hostKeyRequest:HostKeyRequest):void;
    
    create(hostKeyRequest:HostKeyRequest):void;
    modify(hostKeyRequest:HostKeyRequest):void;
}
export class SyncClient implements SyncProtocol {
    private readonly serverAddress: string;
    public hostKey:string;

  constructor(serverAddress: string) {
    this.serverAddress = serverAddress;
  }
  async host_key(hostKeyRequest: HostKeyRequest) {
    Logger("before request");
      const param:RequestUrlParam={
url:this.serverAddress + "/host_key",
method:"POST",           
body:JSON.stringify(hostKeyRequest),           
headers:{ "Content-Type": "application/json" }           
};  
   try 
   { 
           
const response = await requestUrl(param);           

    if (response.status==200) {
  const hostKeyResponse: HostKeyResponse = await response.json();
  console.log('Host key received: ', hostKeyResponse.key);
} else {
    Logger("other status code");
}
    }
    catch (e) {
        Logger(`request host_key error: ${e}`);
    }

  }
  async download(hostKeyRequest: HostKeyRequest) {
      
  }
  async create(hostKeyRequest: HostKeyRequest){
      
  }
  async upload(hostKeyRequest: HostKeyRequest){
      
  }
  async modify(hostKeyRequest: HostKeyRequest){
      
  }
}