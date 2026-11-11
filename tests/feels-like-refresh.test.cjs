/* No live HA or household requests: exercise recovery after a missed event. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),cfg=JSON.parse(fs.readFileSync(path.join(root,'examples/panel-v2/config.example.json')));
cfg.outdoorFeelsLike='sensor.example_feels';
const dom=new JSDOM('<body><main class="screen" id="screen-Ana"></main></body>',{url:'http://panel.test/dash/#screen-Ana',runScripts:'outside-only'});
const w=dom.window,d=w.document;let now=1800000000000,tick,reads=0;
const RealDate=Date;w.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};
w.setInterval=fn=>{tick=fn;return 1;};w.HTMLMediaElement.prototype.play=()=>Promise.resolve();
w.PANEL_V2_CONFIG=cfg;w.entityListeners={[cfg.outdoorFeelsLike]:[]};w.onHaReady=[];w.haSocketReady=true;
let api={entity_id:cfg.outdoorFeelsLike,state:'1.3',attributes:{time:now/1000-1900}};
w.goFetch=(url,cb)=>{reads++;cb(null,api);};w.haSend=()=>{throw Error('No household actions permitted');};
for(const f of ['core.js','home-assistant.js','controls.js','weather.js','denver-layout.js','samsung-layout.js','panel.js'])w.eval(fs.readFileSync(path.join(root,'examples/panel-v2',f),'utf8'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
 d.dispatchEvent(new w.Event('DOMContentLoaded'));await sleep(25);
 for(const cb of w.entityListeners[cfg.outdoorFeelsLike])cb(api.state,api.attributes);
 await sleep(40);const baseline=reads;
 assert.equal(d.querySelector('.pv2-feels-value').textContent,'—');
 api={entity_id:cfg.outdoorFeelsLike,state:'4.4',attributes:{time:now/1000}};
 now+=59999;tick();await sleep(20);assert.equal(reads,baseline,'no per-second network polling');
 now+=1;tick();await sleep(25);assert.equal(reads,baseline+1);assert.equal(d.querySelector('.pv2-feels-value').textContent,'4,4°','fresh HA snapshot recovers without a websocket event');
 tick();tick();assert.equal(reads,baseline+1,'one request per minute');
 for(const value of ['0','-3.1']){now+=60000;api={entity_id:cfg.outdoorFeelsLike,state:value,attributes:{time:now/1000}};tick();await sleep(25);assert.equal(d.querySelector('.pv2-feels-value').textContent,value.replace('.',',')+'°');}
 now+=60000;api={entity_id:cfg.outdoorFeelsLike,state:'99',attributes:{time:now/1000-300}};tick();await sleep(25);assert.equal(d.querySelector('.pv2-feels-value').textContent,'-3,1°','older sample cannot replace a newer cached sample');
 now+=60000;api={entity_id:cfg.outdoorFeelsLike,state:'unavailable',attributes:{}};tick();await sleep(25);assert.equal(d.querySelector('.pv2-feels-value').textContent,'-3,1°','unavailable retains today’s last known value');
 const beforeDisconnect=reads;w.haSocketReady=false;now+=60000;tick();await sleep(25);assert.equal(reads,beforeDisconnect);assert.equal(d.querySelector('.pv2-feels-value').textContent,'-3,1°');
 console.log('Feels-like recovery: missed event, minute throttle, zero/negative, stale response and disconnect passed.');
}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
