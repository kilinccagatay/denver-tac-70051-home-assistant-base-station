/* Read-only fixture: reproduce a missed post-cancel fault-clear event. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),cfg=JSON.parse(fs.readFileSync(path.join(root,'examples/panel-v2/config.example.json')));
cfg.profile='office';cfg.printer={status:'sensor.status',stage:'sensor.stage',printError:'binary_sensor.error',hmsErrors:'binary_sensor.hms',power:'switch.power',progress:'sensor.progress',remaining:'sensor.remaining'};
const dom=new JSDOM('<body><main class="screen" id="screen-Ana"></main><main class="screen" id="screen-Işıklar"></main><main class="screen" id="screen-Diğer"></main></body>',{url:'http://panel.test/office/#screen-Ana',runScripts:'outside-only'});
const w=dom.window,d=w.document;let now=1800000000000,tick,reads=0,queued=null;
const RealDate=Date;w.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}};
w.setInterval=fn=>{tick=fn;return 1;};w.HTMLMediaElement.prototype.play=()=>Promise.resolve();w.PANEL_V2_CONFIG=cfg;w.entityListeners={};w.onHaReady=[];w.haSocketReady=true;
const states={};for(const [key,state] of Object.entries({status:'failed',stage:'idle',printError:'on',hmsErrors:'off',power:'on',progress:'70',remaining:'12'})){const id=cfg.printer[key];states[id]={entity_id:id,state,attributes:{}};w.entityListeners[id]=[];}
w.goFetch=(url,cb)=>{const id=decodeURIComponent(url.split('/states/')[1].split('?')[0]);if(url.includes('panel_failure')){reads++;if(queued){queued.push(()=>cb(null,structuredClone(states[id])));return;}}cb(null,structuredClone(states[id]));};w.haSend=()=>{throw Error('No household actuation permitted');};
for(const f of ['core.js','home-assistant.js','controls.js','weather.js','printer.js','printer-camera.js','denver-layout.js','samsung-layout.js','panel.js'])w.eval(fs.readFileSync(path.join(root,'examples/panel-v2',f),'utf8'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function event(key,state){const id=cfg.printer[key];for(const cb of w.entityListeners[id])cb(state,{});}
(async()=>{try{
 d.dispatchEvent(new w.Event('DOMContentLoaded'));await sleep(30);
 for(const id of Object.keys(states))for(const cb of w.entityListeners[id])cb(states[id].state,{});
 await sleep(30);const card=d.querySelector('.pv2-printer-summary');assert.match(card.textContent,/Baskı hatası/);
 tick();await sleep(20);assert.equal(reads,4);assert.match(card.textContent,/Baskı hatası/,'a real current fault remains visible');
 // HA clears the fault, but no WebSocket callback reaches the panel.
 states[cfg.printer.printError].state='off';now+=9999;tick();await sleep(20);assert.equal(reads,4);
 now++;tick();await sleep(25);assert.equal(reads,8);assert.match(card.textContent,/Hazır/,'REST revalidation repairs the missed clear event');
 now+=60000;tick();assert.equal(reads,8,'ready state stops all extra failure reads');
 // A late old failure snapshot must never overwrite a newer live job.
 states[cfg.printer.printError].state='on';event('printError','on');await sleep(20);queued=[];tick();assert.equal(queued.length,2,'at most two reads in flight');
 event('status','running');while(queued.length)queued.shift()();await sleep(25);assert.match(card.textContent,/Yazdırılıyor/,'newer live state wins over an in-flight failure batch');
 console.log('Printer recovery: missed clear, real fault retention, 10s throttle, stop-on-ready, two-read limit and live-state race passed.');
}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
