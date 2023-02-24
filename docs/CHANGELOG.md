this file keeps track of how the plugin is made.
It is tiresome and confused by the storm of information or words.Maybe it's better to arrange
 information in chronical order.To escape the difficult part,I switch to the server side,but the client part must be done before starting the server.

Fix issue about accessing undefined property inside this.app.vault.on("rename",this.method).use
sytax ()=>{}.

Work on sync method `create`.To construct a http request,headers:path(not include vault name),mtime,ctime,hostKey.body:empty. put those header values in a header key-value pair.the key name  maybe called `obsidian-sync`.In order to be compatible with other method,headers may also include oldPath(in rename).

Work on sync method `rename`.To construct a http request,headers:path(not include vault name),mtime,ctime,hostKey.body:empty. put those header values in a header key-value pair.the key name  maybe called `obsidian-sync`.In order to be compatible with other method,headers may also include oldPath(in rename).
 

Start a timer.When time is on,start sync.

add a queue to store file event info pushed by file event watcher. A map to wrapper the queue,the key is file event name.

maintain a map its key is the filename,value is event.
when the obsidian first open,value is empty.
first scan all files,send their file stats to the server via meta.on thte server,if server data
is empty ,mark the file stats with create,this means the server wants the client to upload all files to it.
If server has the file that client does not,e.g. delete by client,the server tries to send the file 
A rename event can be considered as a file created and a file deleted on the server.

If split sync into two part,one is when the vault is launched,the other is by setting timer.But when vault sync fails,then the timer-way should be synced incompletely.It seems both way need to
send file stats of all files to the server.So both these two sceniories should use the same sync logic.
what the client does is send file stats .Server determines which file should be upload or download ,or modify.

the sync conditions:
Send file stats info via meta.file info from both sides will be compared.
A file does not exist on the server but does on the client is considered as added/created on client. 
A file does not exist on the client but does on the server is considered as delete on client.
A file exists both on the client and on the server,marked as modify 

SO A client request a renamed file would be like : the server search the records to get the latest record of the file of old name.However,this record is marked deleted by previous client
sync.Current request can go on as if the file has not been deleted,but the server will send a delete order to the current client to ask the client to delete the file of old name and download the file of new name.

fill in the sync protocol method startSync,this is intended to be a full sync.By "full sync" I mean file stats of all files will be uploaded and handled.

---
Work on meta method

input argument:file stats of all files.they wil be sent to be compared on the server.
receive argument:an array of interface {file action,filename}

In order to access this.app,move code from startSync to this.sync in the scope of pluginSyncPugin.

---
Provided meta resposnse has been recrive ,then how can I determine file pointer(TabstractFile) just by a filename? 

Luckily An array of All files is instantiated in the begining .I can retrieve what I need.

---
Work on delete 

no sending requests to server,require clients to move files to trash.

---
Work on method download

decide that what request body the client should send and what reponse body the server should send back.
Send a bunch of filenames to server,in return,server sends back file entities including path
and content.

--- 
Work on method upload 
client should send file contents with their paths.This time I use file name to get its corresponding Tfile type.

--- 
As for the condition in which two files exists both in server and in client,this need to split
filr into chunks and compare.It needs to wait for the server side  finishes implementation of methods upload,download,meta.

---
adj$ust some request parameters in client method upload and download to be the same as server. yy

to UploadRequesst:add interface FileInfo. Done

Now test already methods.
Now I create a flle add.md before sync.delete server db.retry.no such table content.It seems that rusqlite only create one table meta,leave content alone.use method execute_batch when sql statements separated by ;

The process seems going smoothly,but no data saved to db on server.By debugging,server reveive 
UploadRequesst { files: [] }.but in meta a file sure is marked Upload.I change request structs in case they are not equal.It seems the server not send correct meta info back,so cause trouble in subswquent actions. 
It turns out to be the problem of enum type comparision.string is set after type.

# UI widgets
## log window 
First I want to add some UI widgets.
1. A console area for logging text OK
this I may directly copy code from livesync,I think I should install this plugin
So I add a log button in the left bar ,by clicking it log window will pop up.

It seems creating a log window is easy,but binding some events to it is difficult.
Then How can I log message in this console area? I ask chatgpt how can I put messages 
in log window when file modify event is captured?It gives seemingly correct answers,so I
apply its code in my plugin,but there is a problem. Only when log window is open(open method is triggered) can messages appear. I mean it is necessary to put method `open` and `appendmessage`
in a scope(inside a method).Or else the messages in other event handler will not be show.

I must resort to livesync.It appears I have to pull submodule .From the code in store.ts It 
maintains a global buffer where we can put log message.And When open method in log display is
triggered,the contents of buffer will be taken out and printed. I prepare to use all the code 
for the logging part.I copy files stores.ts ,store.ts and types.ts,yet some errors need to be
fixed. It's weird that these store.ts files both in origin and my plugin are the same,but error
appears,I try to leave it there and find whther it continue to compile.

look at how livesync hanles show log window when the icon is clicked.Learned we can add custom
Icon by using function addIcon in method `onload`.
Luckily,After copy more code that seems to launch a global buffer notifies,log part finally works.
## status bar on the right corner
???
## create widgets about syncing modes
these widgets belongs to settings tab.

Sync modes are listed [syncing mode](#the-timing-of-syncing).
1. create widget for setting time interval
2. create widget for enable live sync
These two are mutual exclusive(this is not yet inplemented).
It seems It only load settings on load.If you modify some settings,It won't work until  obsidian is reloaded.This needs improvement.

We can add undo features that save files to db before syncing against the server. 
# build the plugin from top to low.

## http server part(rust backend).

## the plugin file watcher
Obsidian will raise events when notes are created or modified.Then the plugin catches
these events and reflect these changes to in-memory sqlite.  
I decide not to use sqlite database,just use queue to record file events.
### A queue to store file event items
How to created a file watcher linked with onload of syncplugin?
Look at the livesync,It uses registerEvent mehod to register file events.When a specific 
event is triggered,then some method will be called.I adopt it.When this method is called,
what does it do?It appends this event along with file metadata(e.g. file object,old path...) into a queue waiting to be consumed in making sync
request.

I create an enum for file events called fileEventType.create four handler method to receive 4
different events like watchvaultdelete...,I wish I could include these methods in a separate 
ts file.
Do an experiment,define a queue in sode class SyncPlugin,append something into the queue
in a function which is not defined in the class SyncPlugin.Unfortunately it is impossible,as this queue is just one property of the the interface,the functions needs to be defined inside the interface in roder to use that queue.So I move the file event functions into the Interface
as methods.
It seems I should create a global variable which acts as a queue. Use an array is sufficient.
### How can I have the queue popped out?
What have I done?I test the queue of string,check whether it pops out elements,It fails to produce a value,Logger with it does't work. 
in which A same method is used to append events into
queue.This method is called appendWatchEvent.
### the timing of syncing
1. When the vault layout is ready
2. set interval
3. live(nearly real-time) syncing
Create a file event item to store every file info like file object,old path...

## http client part(inclued in the plugin)
Q1: When I finish log window ui widget,I ask Is it necessary to maintain a in-memory sqlite
database?
Maybe I should list all possible file/notes operations.After that,I can give out corresponding
feedback?And how can I respond to these events?
Maybe I can maintain a channel (queue from livesync),so when sync is activated,consume channel.
A queue/stack contains event name,file object,old path(delete,rename),new path(rename).
1. When I create a note/file with `create` event being triggered,use upload method
2. When I delete a note/file with `delete` event being triggered,
3. When I modify a note/file(I open an existing note and add words) with `modify` event being triggered,

4. When I rename a note/file with `rename` event being triggered,

Q2: how to determine which side the file is newer,the server or the client?
get mtime(modify time) both from the server and the client.And convert to number type like 234
3433232,then compare whoch is bigger,the bigger ,the newer.
### where to put sync requests
When obsidian vault layout is ready,hostkey method should be called to authenticate user.

When a file event is catched,send requests to server if on live sync mode.sync code resides in file watch event methods

When on periodic sync mode,sync code resides in setInterval method.get batch events from queue
### make http requests
request urls (names are borrowed from Anki sync protocol)
The following request methods just receive json data which has been preprocessed to suit
every method's need. Client will use in-memory SQLite.
#### Problems when make requests
I wonder where to find the output of the console.log(),It is similiar to press F12 in browser.In ondifian,ctrl+shift+I.It helps me a lot.
1. when I first implemented and tested host_key method,It seems blocking all the process which 
follows it.I tried to put await host_key(,,,) in the end of the code block of onload().It never
returns back though It did send a request(this means the server did receive the request). 

I take advice from chatgpt which says it may throw errors before execute code that follows
the fetch method.It is right,It is broken,so the entire plugin seems to exit.I use try/catch block ,then the error info emerges.

It shows me the msg TypeError: Failed to fetch.So It appears I have ued the fetch from js instead of from obsidian API.reason:body type mismatch.
I switch to the method of obsidian method.This time it throw error "status 404 error",it's strange that just status will cause cause thte plugin to break.

In case the code will be lost,I push them to github.
#### /hostkey
for user authentication.client just sends username and password.After sucessful verification,
the server will send back hostkey(hash of the user info) to client.
What dpes the client do with the hostkey?look at the source ocde of anki/rslib.It uses host key
to anthenticate user (check whether the host key exists in server database)
Is it possible to add session key?For now I do not see its values.
#### /upload 
When files are newly created in clients,then upload these files
#### /download
when a file in server but not in server,then download this file 
#### /chunk
chunk struct/class should include:filename,chunk data,chunk hash,chunk numbers.

when the file exists both in client and the server,When the note file is modified instead of 
being removed.While it is called,client sends chunks to the server,
possible situations:
1. client send chunk numbers and hash to the server,server generate its own chunk numbers and  hash.Then server does the diff work.
If one chunk is different and client is newer than server, client will override server

I try to grasp the idea from the chunk method in Anki,but I fail to learn anything.
I ask chatgpt how to [identify differences between versions of a file using file chunks](#identify-differences-between-versions-of-a-file-using-file-chunks).


#### /applaychunk
#### 
#### /finish

how to comapre two revisions of the same file?
I see in livesync plugin that it split a file into many chunks and compute crc32 as the key of 
each chunk.But I don't know what does it mean.

# Aside
## identify differences between versions of a file using file chunks
1. Choose a tool or library that can split a file into chunks and generate hash values for each chunk. You can use a library like crypto in Node.js or hashlib in Python to generate the hash values.

2. Split the file into chunks of a fixed size or using some other strategy that suits your needs.

3. Generate hash values for each chunk.

4. Store the hash values for each chunk along with the chunk number and any other metadata you need. You can use a database or some other storage mechanism to store this information.

5. Repeat steps 2-4 for each version of the file that you want to compare.

6. Use a diff algorithm to compare the sets of hash values for each version. There are various diff algorithms available, such as the Myers diff algorithm, the Hunt-McIlroy algorithm, and the Wagner-Fischer algorithm. These algorithms typically highlight the differences between the two sets of hash values, such as which chunks have been added, deleted, or modified.

7. Use the diff results to merge the changes between the two versions of the file as needed.