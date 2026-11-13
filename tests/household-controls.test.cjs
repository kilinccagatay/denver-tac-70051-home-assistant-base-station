const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

test('household actions keep their targets and fresh socket state wins over snapshot reads', async () => {
  const light = 'light.desk';
  const other = 'light.hall';
  const vacuum = 'vacuum.robot';
  const countdown = 'script.all_lights_off';
  const now = Date.parse('2026-11-11T15:00:00Z');
  const timers = [];
  const reads = [];
  const sent = [];
  const legacy = [];
  const host = vm.createContext({
    Date, Promise, haSocketReady: true, onHaReady: [],
    entityListeners: {
      [light]: [(state, attrs) => legacy.push([state, attrs.brightness])],
      [other]: [], [vacuum]: [], [countdown]: []
    },
    setTimeout: (fn, delay) => timers.push({fn, delay}),
    clearTimeout: () => {},
    goFetch: (url, done) => reads.push({url, done}),
    haSend: (command) => {
      sent.push(JSON.parse(JSON.stringify(command)));
      return Promise.resolve();
    }
  });
  const assets = path.join(__dirname, '../examples/panel-v2');
  for (const file of ['core.js', 'home-assistant.js', 'controls.js']) {
    vm.runInContext(fs.readFileSync(path.join(assets, file), 'utf8'), host);
  }
  const config = {
    allLights: [light, other], vacuum, countdown,
    defaultLightStates: {[light]: {color_temp_kelvin: 2700}}
  };
  const ha = host.PanelV2HomeAssistant.create(host, host.PanelV2Core, config, () => {});
  const controls = host.PanelV2Controls.create(host.PanelV2Core, config, ha, {
    now: () => now, all: Promise.all.bind(Promise), changed: () => {},
    notice: (message) => assert.fail(message)
  });
  ha.start();
  const state = (id, value, attrs) => host.entityListeners[id][0](value, attrs);
  state(light, 'off', {supported_color_modes: ['color_temp']});
  timers.find((timer) => timer.delay === 0).fn();
  assert.equal(reads.length, 2);
  state(light, 'on', {brightness: 128});
  reads[0].done(null, {entity_id: light, state: 'off', attributes: {}});
  state(light, undefined, {brightness: 129});
  assert.deepEqual(legacy.at(-1), ['on', 129]);
  assert.equal(ha.get(light).state, 'on');

  state(other, 'unavailable', {});
  state(vacuum, 'cleaning', {supported_features: 20});
  state(countdown, 'on', {last_triggered: new Date(now - 30000).toISOString()});
  controls.toggleLights([light, other]);
  controls.toggleLights([light, other]);
  controls.controlRobot('pause');
  controls.toggleCountdown();
  assert.equal(controls.countdown(now).remaining, 30);
  assert.deepEqual(sent.map(({domain, service, target}) => [domain, service, target.entity_id]), [
    ['light', 'turn_off', [light]], ['vacuum', 'pause', vacuum], ['script', 'turn_off', countdown]
  ]);
  await new Promise(setImmediate);

  state(light, 'off', {});
  controls.toggleLights([light, other]);
  assert.deepEqual(sent.at(-1), {
    type: 'call_service', domain: 'light', service: 'turn_on',
    target: {entity_id: light}, service_data: {color_temp_kelvin: 2700}
  });
});

test('room clean uses allowlisted segment only, rejects busy/offline states and deduplicates',async()=>{
 const host=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'../examples/panel-v2/controls.js'),'utf8'),host);
 let state='docked',connected=true;const calls=[];
 const controls=host.PanelV2Controls.create({}, {vacuum:'vacuum.example',robotRooms:[{id:23}]}, {get:()=>({state}),connected:()=>connected,call:(...args)=>{calls.push(args);return Promise.resolve();}}, {changed:()=>{},notice:()=>{}});
 controls.cleanRobotRoom(99);assert.equal(calls.length,0);
 for(state of ['cleaning','paused','returning','unknown','unavailable'])controls.cleanRobotRoom(23);
 assert.equal(calls.length,0);state='docked';connected=false;controls.cleanRobotRoom(23);assert.equal(calls.length,0);
 connected=true;controls.cleanRobotRoom(23);controls.cleanRobotRoom(23);assert.equal(calls.length,1);
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),['vacuum','send_command','vacuum.example',{command:'app_segment_clean',params:[{segments:[23],repeat:1}]}]);
 await new Promise(setImmediate);
});

test('mop preparation remains cancellable when vacuum still reports docked',async()=>{
 const host=vm.createContext({});for(const f of ['core.js','controls.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../examples/panel-v2',f),'utf8'),host);
 let active='on';const calls=[];const states={vacuum:{state:'docked',attributes:{supported_features:30524}},phase:{state:'washing_the_mop',attributes:{}}};
 const ha={get:id=>id==='active'?{state:active,attributes:{}}:states[id],connected:()=>true,call:(...args)=>{calls.push(args);return Promise.resolve();}};
 const model=host.PanelV2Controls.create(host.PanelV2Core,{vacuum:'vacuum',robotActive:'active',robotStatus:'phase',robotRooms:[{id:23}]},ha,{changed:()=>{},notice:()=>{}});
 assert.equal(model.robot('dock').service,'return_to_base');assert.equal(model.robot('start').service,null);assert.equal(model.robot().active,true);assert.equal(model.robot().phase,'washing_the_mop');
 model.cleanRobotRoom(23);assert.equal(calls.length,0);
 model.controlRobot('dock');assert.equal(calls[0][1],'return_to_base');await new Promise(setImmediate);
 active='off';assert.equal(model.robot('dock').service,null);assert.equal(model.robot('start').service,'start');
});
