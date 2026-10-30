/* ES5 state/command rules shared by the panel and regression tests. */
(function (root) {
  var api = {};
  api.available = function (e) { return !!e && typeof e.state === 'string' && e.state !== '' && e.state !== 'unknown' && e.state !== 'unavailable'; };
  api.merge = function (old, state, attributes) {
    var next = {state: state === undefined ? old.state : state, attributes: {}}, k;
    for (k in old.attributes) { if (Object.prototype.hasOwnProperty.call(old.attributes, k)) { next.attributes[k] = old.attributes[k]; } }
    for (k in attributes) { if (Object.prototype.hasOwnProperty.call(attributes, k)) { next.attributes[k] = attributes[k]; } }
    return next;
  };
  api.group = function (ids, cache) {
    var on = 0, ready = 0;
    for (var i = 0; i < ids.length; i++) {
      if (api.available(cache[ids[i]])) { ready++; if (cache[ids[i]].state === 'on') { on++; } }
    }
    return {on: on, ready: ready, total: ids.length, service: on ? 'turn_off' : 'turn_on'};
  };
  api.capabilities = function (e) {
    var a = e.attributes || {}, modes = a.supported_color_modes || [];
    function has(v) { return modes.indexOf(v) !== -1; }
    return {dim: modes.length ? !(modes.length === 1 && has('onoff')) : !!(a.supported_features & 1),
      temperature: has('color_temp'), rgb: has('xy') || has('hs') || has('rgb') || has('rgbw') || has('rgbww'),
      min: a.min_color_temp_kelvin || (a.max_mireds ? Math.round(1000000 / a.max_mireds) : 2200),
      max: a.max_color_temp_kelvin || (a.min_mireds ? Math.round(1000000 / a.min_mireds) : 6500)};
  };
  api.brightness = function(e){
    if(e.state==='off'){return {value:0,label:'0%'};}
    var b=e.attributes.brightness;
    if(b===undefined||b===null||!isFinite(Number(b))){return {value:0,label:'—'};}
    var value=Math.max(0,Math.min(100,Math.round(Number(b)/255*100)));
    return {value:value,label:value+'%'};
  };
  api.robot = function (e) {
    if (!api.available(e)) { return {label: 'Robot', detail: 'Bağlantı yok', service: null}; }
    if (e.state === 'cleaning' || e.state === 'paused') { return {label: 'Temizliği Durdur', detail: 'İstasyona gönder', service: 'return_to_base'}; }
    if (e.state === 'returning') { return {label: 'Robot Dönüyor', detail: 'İstasyona dönüyor', service: null}; }
    if (e.state === 'error') { return {label: 'Robot', detail: 'Hata · Robot sekmesine bak', service: null}; }
    return {label: 'Evi Temizle', detail: e.state === 'docked' ? 'İstasyonda' : 'Temizliğe hazır', service: 'start'};
  };
  api.robotControl = function(e,kind){
    var labels={start:'Evi Temizle',pause:'Duraklat',dock:'İstasyona Dön'},result={label:labels[kind],detail:'',service:null};
    if(!api.available(e)){result.detail='Bağlantı yok';return result;}
    var state=e.state,features=e.attributes.supported_features||0;
    if(state==='error'){result.detail='Robot hata bildiriyor';return result;}
    if(kind==='start'){result.service=(features&8192)&&state!=='cleaning'&&state!=='returning'?'start':null;result.detail=state==='cleaning'?'Temizlik sürüyor':'Temizliği başlat';}
    if(kind==='pause'){result.label=state==='paused'?'Devam Et':'Duraklat';result.service=state==='paused'&&(features&8192)?'start':state==='cleaning'&&(features&4)?'pause':null;result.detail=state==='paused'?'Temizliğe devam et':'Temizliğe ara ver';}
    if(kind==='dock'){result.service=(features&16)&&state!=='docked'&&state!=='returning'?'return_to_base':null;result.detail=state==='docked'?'Zaten istasyonda':state==='returning'?'İstasyona dönüyor':'Temizliği bitir ve geri dön';}
    return result;
  };
  api.timeLabel = function (seconds) { return ('0' + Math.floor(seconds / 60)).slice(-2) + ':' + ('0' + (seconds % 60)).slice(-2); };
  api.remaining = function (e, now) {
    if (!e || e.state !== 'on') { return null; }
    var start = Date.parse(e.attributes.last_triggered || '');
    return isFinite(start) ? Math.max(0, Math.min(60, Math.ceil((start + 60000 - now) / 1000))) : null;
  };
  api.bindPress = function (el, shortPress, longPress, scheduler, holdDelay, pressStart) {
    var timer = null, held = false, startX = 0, startY = 0, touchAt = 0, started = false, suppressClickUntil = 0;
    scheduler = scheduler || {set: function (fn, ms) { return setTimeout(fn, ms); }, clear: function (id) { clearTimeout(id); }, now: function () { return new Date().getTime(); }};
    function cancel() { if (timer !== null) { scheduler.clear(timer); timer = null; } }
    function start(ev) {
      if (ev.type === 'mousedown' && (scheduler.now() - touchAt < 800 || ev.button !== 0)) { return; }
      if (ev.touches && ev.touches.length !== 1) { cancel(); held=true;started=false;return; }
      if (ev.touches) { touchAt = scheduler.now(); }
      held = false;started = true;
      if(pressStart){pressStart();}
      var p = ev.touches ? ev.touches[0] : ev; startX = p.clientX; startY = p.clientY;
      cancel();
      if (longPress) { timer = scheduler.set(function () { timer = null; held = true; longPress(); }, holdDelay ? holdDelay() : 650); }
    }
    el.addEventListener('mousedown', start, false);
    el.addEventListener('touchstart', start, false);
    el.addEventListener('touchmove', function (ev) { var p = ev.touches[0]; if (!p || Math.abs(p.clientX - startX) > 12 || Math.abs(p.clientY - startY) > 12) { cancel(); held = true; } }, false);
    el.addEventListener('touchend', function(ev){cancel();touchAt=scheduler.now();suppressClickUntil=touchAt+800;ev.preventDefault();var act=started&&!held;started=false;held=false;if(act){shortPress();}},false);
    el.addEventListener('touchcancel', function () { cancel();touchAt=scheduler.now();suppressClickUntil=touchAt+800;held=false;started=false; }, false);
    el.addEventListener('mouseup', cancel, false);
    el.addEventListener('mouseleave', cancel, false);
    el.addEventListener('contextmenu', function (ev) { ev.preventDefault(); }, false);
    el.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); cancel(); if(scheduler.now()<suppressClickUntil){return;} if (!held) { if(!started&&pressStart){pressStart();} shortPress(); } held = false;started = false; }, false);
    el.addEventListener('keydown', function (ev) { if (ev.keyCode === 27) { cancel(); held = false; } }, false);
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; } else { root.PanelV2Core = api; }
})(this);
