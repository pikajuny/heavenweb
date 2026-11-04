const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
let admin=false, writes=0, rows=[['작성일','제목','내용','공개','작성자'],['2026-11-04','public','body',true,'원작성구단'],['2026-11-04','draft','secret',false,'']];
const sheet={getDataRange:()=>({getValues:()=>rows.map(r=>r.slice())}),getLastRow:()=>rows.length,
 getRange:(r,c)=>({setValue:v=>{writes++;while(rows.length<r)rows.push([]);rows[r-1][c-1]=v;}})};
const ctx={Date,SS_ID:'s',SHEET:{NOTICE:'[공지]',USER_DB:'유저DB'},requireAdminSession_:()=>{if(!admin)throw Error('권한 없음');return 'admin@example.com';},
 SpreadsheetApp:{openById:()=>({getSheetByName:name=>name==='유저DB'?{getDataRange:()=>({getValues:()=>[['이메일','구단명'],[' ADMIN@example.com ','관리구단']]})}:sheet})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
 Utilities:{formatDate:d=>d.toISOString().slice(0,10)}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../../gas/Code_Lounge.js'),'utf8'),ctx);
assert.equal(typeof ctx.adminSaveNotice,'function');
assert.throws(()=>ctx.adminSaveNotice('bad',null,{title:'x',body:'x',published:true}),/권한/);
assert.throws(()=>ctx.adminGetNotices('bad'),/권한/);assert.equal(writes,0);
assert.equal(ctx.getNotices().data.length,1);
admin=true;assert.equal(ctx.adminGetNotices('token').data.length,2);
let original=ctx.adminGetNotices('token').data.find(n=>n.id===2);
assert.equal(ctx.adminSaveNotice('token',2,{title:'edited',body:'new\nbody',published:false},original.revision).success,true);
assert.equal(rows[1][4],'원작성구단','editing preserves original author');assert.equal(rows[1][1],'edited');assert.equal(rows[1][3],false);assert.equal(ctx.getNotices().data.length,0);
let count=writes;
assert.throws(()=>ctx.adminSaveNotice('token',2,{title:'stale',body:'x',published:true},original.revision),/변경|다시/);assert.equal(writes,count);
assert.equal(ctx.adminSaveNotice('token',null,{title:'new',body:'contents',published:true,author:'위조작성자'}).success,true);
assert.equal(rows[3][4],'관리구단','author comes from authenticated email and user DB');assert.equal(ctx.getNotices().data[0].author,'관리구단');assert.equal(rows.length,4);assert.equal(rows[3][1],'new');
assert.throws(()=>ctx.adminSaveNotice('token',null,{title:' ',body:'x',published:true}),/제목/);
assert.throws(()=>ctx.adminSaveNotice('token',null,{title:'x',body:'x',published:'true'}),/공개/);
rows[1][3]=true;
const beforeFailure=ctx.adminGetNotices('token').data.find(n=>n.id===2);
const originalRange=sheet.getRange;
sheet.getRange=(r,c)=>({setValue:value=>{
 if(c===3)throw Error('sheet write failed');
 originalRange(r,c).setValue(value);
 if(c===2)assert.ok(!JSON.stringify(ctx.getNotices()).includes('private edit'), 'intermediate reads cannot expose private edits');
}});
assert.throws(()=>ctx.adminSaveNotice('token',2,{title:'private edit',body:'private body',published:false},beforeFailure.revision),/write failed/);
assert.equal(rows[1][3],false,'partial save is kept private');
sheet.getRange=originalRange;
ctx.adminSaveNotice('token',null,{title:'=FORMULA()',body:'=1+1',published:false});
assert.equal(rows.at(-1)[1],"'=FORMULA()");
assert.equal(rows.at(-1)[2],"'=1+1");
console.log('Notice editor authorization and conflict handling passed');

const source=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
const nodes=new Map();const el=id=>{if(!nodes.has(id))nodes.set(id,{style:{},value:'',textContent:'',innerHTML:'',checked:false,open:false,focus(){},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(id);};
let saveFailed=false,sent;
const ui={document:{getElementById:el},escapeHtml:String,showErr:(id,msg)=>{el(id).textContent=msg;},
 LoungeAdmin:{call:async(action,args)=>{
   if(action==='getAdminStatus')return{success:true,isAdmin:true};
   if(action==='adminGetNotices')return{success:true,data:[{id:2,title:'draft',body:'text',published:false,revision:'r1',date:'2026-11-04'}]};
   if(action==='adminSaveNotice'){sent=args;if(saveFailed)throw Error('conflict');return{success:true,id:2};}
 }}};
vm.createContext(ui);vm.runInContext(source.slice(source.indexOf('const LoungeNotices = {'),source.indexOf('const LoungeAdmin = {'))+';globalThis.notices=LoungeNotices;',ui);
(async()=>{
 await ui.notices.manage();assert.equal(ui.notices._adminMode,true);
 ui.notices.edit();assert.equal(el('notice-editor-title').value,'draft');assert.equal(el('notice-editor-public').checked,false);
 el('notice-editor-title').value='changed';saveFailed=true;await ui.notices.save();
 assert.equal(el('notice-editor').open,true);assert.equal(el('notice-editor-title').value,'changed');assert.equal(sent[2],'r1');
 assert.equal(el('notice-save').disabled,false);assert.equal(el('notice-editor-error').textContent,'conflict');
 saveFailed=false;await ui.notices.save();assert.equal(el('notice-editor').open,false);
 ui.notices.edit(true);assert.equal(el('notice-editor-title').value,'');assert.equal(el('notice-editor-public').checked,false);
 console.log('Notice editor draft loading and save error recovery passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
