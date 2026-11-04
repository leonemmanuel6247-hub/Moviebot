// Tests de routage et de vision simulés ; aucun fournisseur réel n'est appelé.
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const models=[{provider:'groq',model_id:'qwen/qwen3.8-27b',enabled:true,supports_vision:true,output_max:4096},{provider:'groq',model_id:'other',enabled:true,output_max:1024},{provider:'openrouter',model_id:'fallback',enabled:true,output_max:1024},{provider:'nvidia',model_id:'third',enabled:true,output_max:1024}];
let calls=[], behavior={};
const c={console,rows_:n=>n==='Models'?models:[],asBool_:x=>!!x,asNum_:(x,d)=>Number(x)||d,setting_:()=> 'openrouter',settingNum_:(_,d)=>d,nowIso_:()=>new Date().toISOString(),updateRow_:()=>{}};
vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../apps-script/03_Adapters.gs'),'utf8'),c);
c.pickKeys_=p=>[{api_key:'test',provider:p}]; c.markKeySuccess_=()=>{};c.markKeyError_=()=>{};
c.callProvider_=o=>{calls.push(o);if(behavior[o.model]){const e=new Error('offline');e.status=behavior[o.model];throw e;}return {content:'ok',provider:o.provider,model:o.model};};
const messages=[{role:'system',content:'rules'},{role:'user',content:'bonjour'}];
let r=c.tryProviders_('groq','qwen/qwen3.8-27b',messages,2048,'balanced');assert.equal(r.model,'qwen/qwen3.8-27b');assert.equal(calls.length,1);
calls=[];behavior={'qwen/qwen3.8-27b':429,'other':503};r=c.tryProviders_('groq','qwen/qwen3.8-27b',messages,2048,'balanced');assert.equal(r.model,'fallback');assert.deepEqual(calls.map(x=>x.model),['qwen/qwen3.8-27b','other','fallback']);
calls=[];behavior={};r=c.tryProviders_('groq','qwen/qwen3.8-27b',messages,2048,'balanced',null,'data:image/png;base64,aGVsbG8=');assert.equal(calls[0].messages[1].content[1].type,'image_url');assert.equal(messages[1].content,'bonjour');
calls=[];behavior={'qwen/qwen3.8-27b':429};assert.throws(()=>c.tryProviders_('groq','qwen/qwen3.8-27b',messages,2048,'balanced',null,'data:image/png;base64,aGVsbG8='),/vision compatible/);assert.equal(calls.length,1);
console.log('OK : priorité Qwen, repli multi-fournisseurs, quota et protection vision.');
