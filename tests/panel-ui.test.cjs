/* Optional DOM regression: NODE_PATH=/tmp/denver-panel-ui-tests/node_modules node tests/panel-ui.test.cjs
   Install test-only dependency: npm install --prefix /tmp/denver-panel-ui-tests --no-save jsdom@26.1.0 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const cfg=JSON.parse(fs.readFileSync(path.join(root,'examples/panel-v2/config.example.json')));
const dom=new JSDOM('<!doctype html><body>'+['Ana','Mutfak','Giriş','Odalar','Robot'].map(n=>'<main id="screen-'+n+'" class="screen"></main>').join('')+'<nav><div class="navbar-item"><span class="navbar-label">Ana</span></div></nav></body>',{url:'http://panel.test:4567/dash/#screen-Ana',runScripts:'outside-only'});
const w=dom.window,d=w.document,commands=[];
let sounds=0,rejectCommand=false;
w.HTMLMediaElement.prototype.play=function(){sounds++;return Promise.resolve();};
w.localStorage.setItem('panel-v2-hold-ms','450'); // Migrates the old Fast preference to 250 ms.
w.PANEL_V2_CONFIG=cfg;w.entityListeners={};w.onHaReady=[];w.haSocketReady=true;
const states={};
for(const id of cfg.allLights){states[id]={entity_id:id,state:'off',attributes:{brightness:null,supported_color_modes:['xy','color_temp'],color_mode:'xy',rgb_color:[255,95,170]}};}
for(const id of [cfg.weather,cfg.meeting,cfg.vacuum,cfg.countdown]){states[id]={entity_id:id,state:'off',attributes:{}};}
Object.values(states).forEach(e=>w.entityListeners[e.entity_id]=[]);
w.goFetch=(url,cb)=>cb(null,states[decodeURIComponent(url.split('/states/')[1].split('?')[0])]);
w.haSend=msg=>{commands.push(msg);return rejectCommand?Promise.reject(new Error('test failure')):Promise.resolve({});};
for(const file of ['core.js','panel.js']){w.eval(fs.readFileSync(path.join(root,'examples/panel-v2',file),'utf8'));}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function feed(id,state,attributes){Object.assign(states[id],{state,attributes:{...states[id].attributes,...attributes}});for(const cb of w.entityListeners[id]){cb(state,attributes);}}
function mouse(el,type){el.dispatchEvent(new w.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:0,clientY:0}));}
async function hold(el){mouse(el,'mousedown');await sleep(290);mouse(el,'mouseup');el.click();}
function button(text){return [...d.querySelectorAll('#panel-v2 .pv2-card')].find(e=>e.textContent.includes(text));}
function close(){d.querySelector('.pv2-close').click();}
(async()=>{
 try{
  d.dispatchEvent(new w.Event('DOMContentLoaded'));await sleep(25);
  for(const e of Object.values(states)){feed(e.entity_id,e.state,e.attributes);}await sleep(25);
  assert.equal(d.querySelector('.navbar-label').textContent,'EVİM','visible Home name changes without changing the Ana route');
  const dining=button('Yemek Masası');
  await hold(dining);
  assert.equal(d.querySelector('.pv2-modal').classList.contains('pv2-open'),true,'Fast must open within 290 ms including migration');
  assert.equal(commands.length,0,'opening settings must never turn on a lamp');
  let input=d.querySelector('.pv2-modal input[type=range]');const originalInput=input;
  assert.equal(input.value,'0');
  feed(cfg.lights.dining,'on',{brightness:128,color_mode:'xy',rgb_color:[255,95,170]});await sleep(25);
  assert.equal(input.value,'50','live state must update an open dimmer');
  assert.equal(d.querySelector('.pv2-modal output').textContent,'50%');
  assert.equal(dining.style.backgroundColor,'rgb(85, 58, 86)','tile follows the actual color');
  const pink=[...d.querySelectorAll('.pv2-preset')].find(e=>e.textContent==='Pembe');
  assert.equal(pink.getAttribute('aria-pressed'),'true','live preset ring follows actual HA state');
  mouse(input,'mousedown');input.value='70';feed(cfg.lights.dining,'on',{brightness:64});await sleep(25);
  assert.equal(input.value,'70','incoming state must not fight an active slider drag');
  input.dispatchEvent(new w.Event('touchcancel',{bubbles:true}));
  assert.equal(input.value,'25','canceled drag restores actual state');
  close();await hold(dining);
  input=d.querySelector('.pv2-modal input[type=range]');assert.equal(input,originalInput,'reopening reuses cached menu DOM');
  assert.equal(input.value,'25','cached menu refreshes values');
  const beforeClose=sounds;mouse(d.querySelector('.pv2-close'),'mousedown');mouse(d.querySelector('.pv2-close'),'mouseup');close();
  assert.equal(sounds,beforeClose+1,'close receives one shared feedback sound');
  const beforeBlank=sounds;mouse(d.body,'mousedown');assert.equal(sounds,beforeBlank,'blank background must not sound');
  await hold(dining);
  const blue=[...d.querySelectorAll('.pv2-preset')].find(e=>e.textContent==='Mavi');blue.click();await sleep(25);
  assert.equal(d.querySelector('.pv2-modal').classList.contains('pv2-open'),false,'successful preset automatically closes');
  assert.deepEqual(JSON.parse(JSON.stringify(commands.at(-1).service_data)),{rgb_color:[65,135,255]});
  await hold(dining);rejectCommand=true;
  [...d.querySelectorAll('.pv2-preset')].find(e=>e.textContent==='Pembe').click();await sleep(25);
  assert.equal(d.querySelector('.pv2-modal').classList.contains('pv2-open'),true,'failed preset remains open');
  assert.match(d.getElementById('pv2-notice').textContent,/gerçekleştirilemedi/);
  rejectCommand=false;close();
  feed(cfg.lights.dining,'off',{brightness:null});await sleep(25);
  mouse(dining,'mousedown');mouse(dining,'mouseup');dining.click();await sleep(25);
  assert.deepEqual(JSON.parse(JSON.stringify(commands.at(-1).service_data)),{color_temp_kelvin:2700},'normal panel turn-on restores the configured white without changing brightness');
  // Only the active view is populated, and navigating populates it from the cache.
  assert.equal(d.querySelector('#panel-v2-Giriş .pv2-clock').textContent,'');
  w.location.hash='#screen-Giri%C5%9F';await sleep(25);
  assert.match(d.querySelector('#panel-v2-Giriş .pv2-clock').textContent,/\d\d:\d\d/);
  assert.match(d.querySelector('#panel-v2-Giriş .pv2-controls').textContent,/Antre/);
  console.log('Panel DOM: live brightness/color, drag safety, cached menus, Fast timing, shared sound, preset success/failure, and navigation passed.');
 }finally{w.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
