// Tests locaux simulés : aucun accès à Google, aucun appel réseau réel.
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..', 'apps-script');
const data = {UserPreferences: [], UserMemories: [], CinemaItems: [], ConversationPins: [], Conversations: [{_row:2, conv_id:'c1',user_id:'u1'}]};
let id = 0, request;
const ctx = {
  console, nowIso_: () => new Date().toISOString(), uuid_: () => String(++id),
  asBool_: v => v === true || v === 'true', estimateTokens_: v => String(v || '').length,
  requireAuth_: b => { if (!b.token) throw new Error('UNAUTHORIZED'); return {user:{user_id:b.token}}; },
  rows_: n => data[n].map(x => ({...x})),
  findRow_: (n,k,v) => data[n].find(x => x[k] === v) || null,
  withLock_: fn => fn(), appendRow_: (n,o) => data[n].push({...o,_row:data[n].length+2}),
  updateRow_: (n,r,o) => {data[n][r-2] = {...o};},
  deleteRowsWhere_: (n,p) => {data[n] = data[n].filter(x => !p(x));},
  ok_: o => Object.assign({ok:true},o), fail_: (error,code) => ({ok:false,error,code}),
  UrlFetchApp: {fetch: (url,options) => {request=JSON.parse(options.payload); return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({choices:[{message:{tool_calls:[{function:{name:'memoriser_preference',arguments:JSON.stringify({content:'j’aime les westerns'})}}]}}],usage:{prompt_tokens:10,completion_tokens:4}})};}}
};
vm.createContext(ctx);
for (const file of ['09_Personalization.gs','03_Adapters.gs']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
assert.throws(() => ctx.action_get_preferences({}), /UNAUTHORIZED/);
assert.equal(ctx.action_add_memory({token:'u1',content:'western'}).ok,false);
ctx.action_save_preferences({token:'u1',memory_enabled:true,instructions:'sans spoilers'});
let memory=ctx.action_add_memory({token:'u1',content:'science-fiction'}).memory;
assert(ctx.userContext_('u1').includes('science-fiction'));
assert(!ctx.userContext_('u2').includes('science-fiction'));
assert.equal(ctx.action_update_memory({token:'u2',memory_id:memory.memory_id,content:'autre'}).ok,false);
ctx.action_delete_memory({token:'u2',memory_id:memory.memory_id});
assert.equal(ctx.action_list_memories({token:'u1'}).memories.length,1);
assert.equal(ctx.action_pin_conversation({token:'u2',conv_id:'c1',pinned:true}).ok,false);
assert.equal(ctx.action_pin_conversation({token:'u1',conv_id:'c1',pinned:true}).ok,true);
let item=ctx.action_add_cinema_item({token:'u1',title:'Film',category:'À découvrir'}).item;
ctx.action_delete_cinema_item({token:'u2',item_id:item.item_id});
assert.equal(ctx.action_list_cinema_items({token:'u1'}).items.length,1);
assert.equal(ctx.agentMemoryContext_('u1','J’aime les westerns').allowed,false);
const latest='Retiens que j’aime les westerns';
const result=ctx.openaiCompatible_('https://example.invalid/v1','fake','fake-model',[{role:'user',content:latest}],100,{},ctx.agentMemoryContext_('u1',latest));
assert.equal(request.tools[0].function.name,'memoriser_preference');
assert(result.content.includes('enregistré'));
assert(ctx.action_list_memories({token:'u1'}).memories.some(m=>m.content==='j’aime les westerns'));
assert.equal(ctx.saveAgentMemory_('u1',latest,'western inventé').ok,false);
let nameResult=ctx.memoryNameRequest_('u1',"Je m’appelle Zoé, enregistre mon nom dans ta mémoire",[]);
assert.equal(nameResult.tool_events[0].status,'success');
assert(ctx.userContext_('u1').includes('Zoé'));
let priorName=ctx.memoryNameRequest_('u1',"Enregistre mon prénom dans ta mémoire",[{role:'user',content:"Je m'appelle Amine"}]);
assert.equal(priorName.tool_events[0].status,'success');
assert(ctx.userContext_('u1').includes('Amine'));
assert.equal(ctx.memoryNameRequest_('u1',"Ne mémorise pas mon prénom",[]),null);
let nickname=ctx.memoryNameRequest_('u1','Ajoute mon pseudo à ta mémoire pour les prochaines discussions.',[{role:'user',content:'Pour ce test, mon pseudo est Zorvanix.'}]);
assert.equal(nickname.tool_events[0].status,'success');
assert(ctx.userContext_('u1').includes('Zorvanix'));
let preference=ctx.memoryNameRequest_('u1',"Retiens que j’aime les films noirs",[]);
assert.equal(preference.tool_events[0].status,'success');
assert(ctx.userContext_('u1').includes('films noirs'));
let unclear=ctx.memoryNameRequest_('u1',"Mémorise ceci",[]);
assert.equal(unclear,null);
const jsonCall = (key,value) => ({content:JSON.stringify({tool_call:{name:'set_memory',arguments:{key,value}}})});
let jsonResult=ctx.dispatchAgentJson_(jsonCall('user_name','NEMESIS'),'u1','Ajoute mon nom en mémoire',[{role:'user',content:'Je m’appelle NEMESIS'}]);
assert.equal(jsonResult.tool_events[0].status,'success');
assert(ctx.userContext_('u1').includes('Prénom : NEMESIS'));
assert.equal(ctx.dispatchAgentJson_(jsonCall('user_name','INVENTE'),'u1','Ajoute mon nom en mémoire',[]).tool_events[0].status,'error');
assert.equal(ctx.dispatchAgentJson_(jsonCall('user_name','NEMESIS'),'u1','Bonjour',[{role:'user',content:'NEMESIS'}]).tool_events[0].status,'error');
assert.equal(ctx.dispatchAgentJson_({content:'<dots_function_call>invoke_memory</dots_function_call>'},'u1','Bonjour',[]).tool_events[0].status,'error');
assert(!ctx.dispatchAgentJson_({content:'<dots_function_call>invoke_memory</dots_function_call>'},'u1','Bonjour',[]).content.includes('dots_function_call'));
assert.equal(ctx.dispatchAgentJson_({content:'{\"tool_call\":'},'u1','Bonjour',[]).tool_events[0].status,'error');
assert.equal(ctx.dispatchAgentJson_({content:JSON.stringify({tool_call:{name:'tool_unknown',arguments:{}}})},'u1','Bonjour',[]).tool_events[0].status,'error');
assert.equal(ctx.dispatchAgentJson_({content:'C’est enregistré !'},'u1','Mémorise ceci',[]).tool_events[0].status,'pending');
ctx.action_save_preferences({token:'u1',memory_enabled:false});
const disabled=ctx.memoryNameRequest_('u1',"Je m’appelle Alice, enregistre mon nom dans ta mémoire",[]);
assert.equal(disabled.tool_events[0].status,'disabled');
assert(!ctx.action_list_memories({token:'u1'}).memories.some(m=>m.content.includes('Alice')));
assert(!ctx.userContext_('u1').includes('science-fiction'));
assert.equal(ctx.saveAgentMemory_('u1',latest,'j’aime les westerns').ok,false);
console.log('OK : authentification simulée, isolation, préférences, souvenirs, outil, cinéma et épinglage.');
