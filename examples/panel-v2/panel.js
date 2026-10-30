/* Browser application: ES5, no framework or extra polling. Configuration is injected separately. */
(function () {
  function ready() {
    var cfg = window.PANEL_V2_CONFIG, C = window.PanelV2Core;
    var home = document.getElementById('screen-Ana');
    if (!cfg || !C || !home || document.getElementById('panel-v2')) { return; }
    var cache = {}, versions = {}, cards = [], busy = {}, listeners = window.entityListeners || {};
    var snapshotNeeded = false, connectionGeneration = 0, renderQueued=false,lastConnection=null;
    function activeView(){try{return decodeURIComponent(window.location.hash.replace(/^#screen-/,''))||'Ana';}catch(ignore){return 'Ana';}}
    function scheduleRender(){if(renderQueued){return;}renderQueued=true;setTimeout(function(){renderQueued=false;render();},16);}
    var modalIds = [], modalControls=[],dialogCache={},modalRevision=0,focusBeforeDialog = null, noticeTimer, modal, keyboardInput = false;
    document.addEventListener('keydown',function(ev){if(ev.keyCode===9){keyboardInput=true;document.body.classList.add('pv2-keyboard');}},true);
    function pointerInput(){keyboardInput=false;document.body.classList.remove('pv2-keyboard');}
    document.addEventListener('touchstart',pointerInput,true);
    document.addEventListener('mousedown',pointerInput,true);
    var soundEnabled=true,holdDelay=500,audio=document.createElement('audio'),audioStatus=null;
    audio.preload='auto';audio.volume=1;audio.setAttribute('aria-hidden','true');audio.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
    var soundBase=window.location.protocol+'//'+window.location.hostname+':8123/local/';
    [{src:cfg.clickSoundUrl||soundBase+'panel-click.mp3',type:'audio/mpeg'},{src:cfg.clickSoundWavUrl||soundBase+'panel-click.wav',type:'audio/wav'}].forEach(function(source){var n=document.createElement('source');n.src=source.src;n.type=source.type;audio.appendChild(n);});document.body.appendChild(audio);
    function soundStatus(text){if(audioStatus){setText(audioStatus,text);}}
    audio.addEventListener('playing',function(){soundStatus('Ses oynatıldı. Duyulmuyorsa medya sesini kontrol edin.');},false);
    audio.addEventListener('error',function(){soundStatus('Ses dosyası oynatılamadı. Hata: '+(audio.error?audio.error.code:'bilinmiyor'));},false);
    try{var savedSound=localStorage.getItem('panel-v2-click-sound');if(savedSound==='on'||savedSound==='off'){soundEnabled=savedSound==='on';}var savedDelay=Number(localStorage.getItem('panel-v2-hold-ms'));if(savedDelay===450){savedDelay=250;}else if(savedDelay===650){savedDelay=500;}else if(savedDelay===900){savedDelay=800;}if([250,500,800].indexOf(savedDelay)!==-1){holdDelay=savedDelay;}}catch(ignore){}
    // Decode once; a new lightweight buffer source starts directly on touch-down.
    // The proven HTML media path remains a fallback for older/unsupported engines.
    var fastContext=null,fastBuffer=null,fastFailed=false;
    try{var AudioEngine=window.AudioContext||window.webkitAudioContext;if(AudioEngine){fastContext=new AudioEngine();var raw=atob('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'),bytes=new Uint8Array(raw.length);for(var ai=0;ai<raw.length;ai++){bytes[ai]=raw.charCodeAt(ai);}fastContext.decodeAudioData(bytes.buffer,function(buffer){fastBuffer=buffer;},function(){fastFailed=true;});}}catch(ignore){fastFailed=true;}
    function fastSound(){
      if(!fastContext||!fastBuffer||fastFailed){return false;}
      try{if(fastContext.state==='suspended'&&fastContext.resume){var resuming=fastContext.resume();if(resuming&&resuming.catch){resuming.catch(function(){fastFailed=true;});}}
        var source=fastContext.createBufferSource();source.buffer=fastBuffer;source.connect(fastContext.destination);source.onended=function(){source.disconnect();};if(source.start){source.start(0);}else{source.noteOn(0);}soundStatus('Ses oynatıldı · Hızlı ses');return true;
      }catch(ignore){fastFailed=true;return false;}
    }
    function clickSound(force){if(!soundEnabled&&!force){return;}if(fastSound()){return;}try{try{audio.currentTime=0;}catch(ignore){}var playing=audio.play();if(playing&&playing.catch){playing.catch(function(error){soundStatus(error.name==='NotAllowedError'?'Tarayıcı ses oynatmayı engelledi. Sesi Dene düğmesine dokunun.':'Ses oynatılamadı: '+error.name);});}}catch(ignore){soundStatus('Bu tarayıcı sesi başlatamadı.');}}
    var lastTouchSoundAt=0,lastPointerSoundAt=0,lastPointerControl=null,touchFeedbackActive=false;
    function feedbackControl(target){for(var el=target;el&&el!==document.body;el=el.parentNode){if(el.nodeType!==1){continue;}var tag=el.tagName;if(tag==='BUTTON'||tag==='SELECT'||tag==='INPUT'||tag==='A'||el.classList.contains('navbar-item')){return el.disabled||el.getAttribute('aria-disabled')==='true'?null:el;}}return null;}
    function pressFeedback(ev){var now=new Date().getTime();if(ev.type==='mousedown'&&(ev.button!==0||now-lastTouchSoundAt<800)){return;}if(ev.touches&&ev.touches.length!==1){return;}var el=feedbackControl(ev.target);if(!el){return;}if(ev.touches){lastTouchSoundAt=now;touchFeedbackActive=true;}lastPointerSoundAt=now;lastPointerControl=el;clickSound(el.classList.contains('pv2-sound-test'));}
    document.addEventListener('touchstart',pressFeedback,true);
    document.addEventListener('mousedown',pressFeedback,true);
    document.addEventListener('touchend',function(){if(touchFeedbackActive){lastTouchSoundAt=new Date().getTime();lastPointerSoundAt=lastTouchSoundAt;touchFeedbackActive=false;}},true);
    document.addEventListener('mouseup',function(){lastPointerSoundAt=new Date().getTime();},true);
    document.addEventListener('click',function(ev){if(ev.isTrusted===false){return;}var el=feedbackControl(ev.target);if(!el){return;}if(el===lastPointerControl&&new Date().getTime()-lastPointerSoundAt<1000){return;}clickSound(el.classList.contains('pv2-sound-test'));},true);
    var paths = {
      settings:'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6M8 15v6',
      bulb:'M9 18h6m-5 3h4M8 13a6 6 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3Z',
      kitchen:'M4 3v6m3-6v6m3-6v6M4 7h6M7 9v12M17 3v18m0-18c4 3 4 9 0 9',
      corridor:'M5 21V3h14v18M9 21V7h6v14m-3-8h1',
      bed:'M3 18V9m18 9V9M3 14h18M5 9V6h14v3M3 18v3m18-3v3M5 9h5v5m4-5h5v5',
      desk:'M3 14h18M5 14v7m14-7v7M8 10h8M12 3l4 4H8l4-4Zm0 4v3',
      robot:'M4 13a8 8 0 1 0 16 0 8 8 0 0 0-16 0Zm4 0h8m-6-3h4M8 4l1-2h6l1 2',
      moon:'M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11Z',
      cloud:'M7 18H6a4 4 0 0 1 0-8 6 6 0 0 1 11-2 5 5 0 0 1 1 10H7Z',
      sun:'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4M5.6 18.4l1.4-1.4m10-10 1.4-1.4M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z',
      rain:'M7 15H6a4 4 0 0 1 0-8 6 6 0 0 1 11-2 5 5 0 0 1 1 10H7Zm1 3-1 3m6-3-1 3m6-3-1 3'
    };
    function icon(name) { return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+(paths[name] || paths.bulb)+'"/></svg>'; }
    function node(tag, className, text) { var n = document.createElement(tag); if (className) { n.className = className; } if (text !== undefined) { n.textContent = text; } return n; }
    function setText(n, text) { if (n.textContent !== String(text)) { n.textContent = text; } }
    function get(id) { return cache[id] || {state:'unknown', attributes:{}}; }
    function connection() { return !!window.haSocketReady; }
    function notice(text) { var el = document.getElementById('pv2-notice'); setText(el,text); el.style.display='block'; clearTimeout(noticeTimer); noticeTimer=setTimeout(function(){el.style.display='none';},5000); }
    function call(domain, service, target, data) {
      if (!connection()) { return Promise.reject(new Error('Bağlantı yok')); }
      var msg={type:'call_service',domain:domain,service:service,target:{entity_id:target}};
      if (data) { msg.service_data=data; }
      var request=window.haSend(msg), timeout;
      return new Promise(function(resolve,reject){
        timeout=setTimeout(function(){reject(new Error('İşlem doğrulanamadı'));},8000);
        request.then(function(result){clearTimeout(timeout);resolve(result);},function(error){clearTimeout(timeout);reject(error);});
      });
    }
    function perform(key, domain, service, ids, data, onSuccess) {
      if (busy[key]) { return; }
      busy[key]=true; scheduleRender();
      call(domain,service,ids,data).then(function(){busy[key]=false;scheduleRender();if(onSuccess){onSuccess();}},function(){busy[key]=false;scheduleRender();notice('İşlem gerçekleştirilemedi. Bağlantıyı kontrol edin.');});
    }
    function supported(ids) { return ids.filter(function(id){return C.available(get(id));}); }
    function toggle(ids) {
      var g=C.group(ids,cache), active=supported(ids);
      if (!active.length) { notice('Lambaya ulaşılamıyor.'); return; }
      if(g.service==='turn_on'){turnOn(active,ids.join(','));}else{perform(ids.join(','),'light','turn_off',active);}
    }
    function turnOn(ids,key){
      var targets=ids.map(function(id){return {id:id,data:C.defaultLightData(get(id),cfg.defaultLightStates&&cfg.defaultLightStates[id])};});
      if(!targets.some(function(t){return !!t.data;})){perform(key,'light','turn_on',ids);return;}
      if(busy[key]){return;}busy[key]=true;scheduleRender();
      Promise.all(targets.map(function(t){return call('light','turn_on',t.id,t.data).then(function(){return true;},function(){return false;});})).then(function(results){busy[key]=false;scheduleRender();if(results.some(function(ok){return !ok;})){notice('Bazı lambalar açılamadı. Bağlantıyı kontrol edin.');}});
    }
    function addCard(parent, options, legacy) {
      var b=node('button','pv2-card'+(options.action?' pv2-action':'')+(legacy?' pv2-legacy-light':'')); b.type='button';
      b.innerHTML=icon(options.icon);
      var text=node('span','pv2-card-text'), label=node('span','pv2-card-label',options.label), state=node('span','pv2-card-state','Yükleniyor…');
      text.appendChild(label);text.appendChild(state);b.appendChild(text);parent.appendChild(b);
      var item={button:b,label:label,status:state,options:options,icon:b.querySelector('svg'),view:parent.getAttribute('data-pv2-screen')};cards.push(item);
      C.bindPress(b,function(){
        if (b.disabled) { return; }
        if (options.kind==='robot') { var robot=C.robot(get(cfg.vacuum)); if(robot.service){perform('robot','vacuum',robot.service,cfg.vacuum);} }
        else if(options.kind==='alloff'){toggleCountdown();}
        else if(options.kind&&options.kind.indexOf('vacuum-')===0){var action=C.robotControl(get(cfg.vacuum),options.kind.slice(7));if(action.service){perform('vacuum','vacuum',action.service,cfg.vacuum);}}
        else{toggle(options.ids);}
      },options.ids?function(){openDialog(options.label,options.ids);}:null,null,function(){return holdDelay;});
      return item;
    }
    var navLabels=document.querySelectorAll('.navbar-label');for(var ni=0;ni<navLabels.length;ni++){if(navLabels[ni].textContent.trim().toLowerCase()==='ana'){setText(navLabels[ni],'EVİM');}}
    document.body.classList.add('panel-v2');
    var views=[],robotStatus=null;
    function makeView(name,title){
      var screen=document.getElementById('screen-'+name);if(!screen){return null;}screen.classList.add('pv2-screen');
      var root=node('div','pv2-panel');root.id=name==='Ana'?'panel-v2':'panel-v2-'+name;
      var top=node('div','pv2-top');top.appendChild(node('span','pv2-brand',title));
      var status=node('span','pv2-connection','Bağlanıyor');top.appendChild(status);root.appendChild(top);
      var body=node('div','pv2-body'),overview=node('div','pv2-overview'),controls=node('div','pv2-controls');controls.setAttribute('data-pv2-screen',name);
      var clock=node('div','pv2-clock'),date=node('div','pv2-date'),weekday=node('div','pv2-date');overview.appendChild(clock);overview.appendChild(date);overview.appendChild(weekday);
      var weather=node('div','pv2-weather'),weatherMain=node('div','pv2-weather-main'),weatherIcon=node('span'),temperature=node('span','pv2-temperature','--°'),condition=node('div','pv2-condition','Yükleniyor…');weatherMain.appendChild(weatherIcon);weatherMain.appendChild(temperature);weather.appendChild(weatherMain);weather.appendChild(condition);overview.appendChild(weather);
      var meeting=node('div','pv2-meeting');meeting.innerHTML='<span class="pv2-meeting-dot"></span>Toplantı';overview.appendChild(meeting);
      var trigger=node('button','pv2-settings-trigger');trigger.type='button';trigger.innerHTML=icon('settings');trigger.setAttribute('aria-label','Panel Ayarları');trigger.title='Panel Ayarları';trigger.addEventListener('click',function(){openPanelSettings();},false);overview.appendChild(trigger);
      body.appendChild(overview);body.appendChild(controls);root.appendChild(body);screen.appendChild(root);
      views.push({name:name,status:status,clock:clock,date:date,weekday:weekday,temperature:temperature,condition:condition,weatherIcon:weatherIcon,previousWeatherIcon:'',meeting:meeting});return controls;
    }
    var controls=makeView('Ana','EVİM');
    addCard(controls,{label:'Mutfak',ids:[cfg.lights.counter,cfg.lights.sink],icon:'kitchen'});
    addCard(controls,{label:'Salon',ids:[cfg.lights.living],icon:'bulb'});
    addCard(controls,{label:'Yemek Masası',ids:[cfg.lights.dining],icon:'bulb'});
    var corridorIds=[cfg.lights.front,cfg.lights.rear];if(cfg.roomLights&&cfg.roomLights.entrance){corridorIds.push(cfg.roomLights.entrance);}
    addCard(controls,{label:'Koridor',ids:corridorIds,icon:'corridor'});
    addCard(controls,{label:'Çalışma Odası',ids:[cfg.lights.office],icon:'desk'});
    addCard(controls,{label:'Yatak Odası',ids:[cfg.lights.bedroom],icon:'bed'});
    addCard(controls,{label:'Evi Temizle',icon:'robot',kind:'robot',action:true});
    addCard(controls,{label:'Tüm Işıkları Kapat',icon:'moon',kind:'alloff',action:true});
    function lightControl(parent,id,label,iconName){if(parent&&id){addCard(parent,{label:label,ids:[id],icon:iconName||'bulb'});}}
    var kitchen=makeView('Mutfak','MUTFAK');if(kitchen){kitchen.classList.add('pv2-three');lightControl(kitchen,cfg.lights.counter,'Tezgâh');lightControl(kitchen,cfg.lights.sink,'Lavabo');lightControl(kitchen,cfg.lights.dining,'Yemek Masası');}
    var room=cfg.roomLights||{},entrance=makeView('Giriş','GİRİŞ');if(entrance){entrance.classList.add('pv2-three');lightControl(entrance,room.entrance,'Antre','corridor');lightControl(entrance,cfg.lights.front,'Koridor Ön','corridor');lightControl(entrance,cfg.lights.rear,'Koridor Arka','corridor');}
    var rooms=makeView('Odalar','ODALAR');if(rooms){rooms.classList.add('pv2-four');lightControl(rooms,cfg.lights.living,'Salon');lightControl(rooms,cfg.lights.office,'Çalışma Odası','desk');lightControl(rooms,cfg.lights.bedroom,'Yatak Odası','bed');lightControl(rooms,room.accent,cfg.labels&&cfg.labels[room.accent]||'Ek Aydınlatma');}
    var robotControls=makeView('Robot','ROBOT');if(robotControls){robotControls.classList.add('pv2-robot-controls');var summary=node('div','pv2-robot-summary');summary.innerHTML=icon('robot');robotStatus=node('span','','Yükleniyor…');summary.appendChild(robotStatus);robotControls.appendChild(summary);['start','pause','dock'].forEach(function(kind){addCard(robotControls,{label:'Robot',icon:'robot',kind:'vacuum-'+kind,action:true});});}
    var errorNotice=node('div');errorNotice.id='pv2-notice';errorNotice.setAttribute('role','status');document.body.appendChild(errorNotice);
    function toggleCountdown(){
      if(!C.available(get(cfg.countdown))){notice('Geri sayım servisine ulaşılamıyor.');return;}
      perform('countdown','script',get(cfg.countdown).state==='on'?'turn_off':'turn_on',cfg.countdown);
    }
    modal=node('div','pv2-modal');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','pv2-dialog-title');
    var dialog=node('div','pv2-dialog'), header=node('div','pv2-dialog-header'), dialogTitle=node('h2');dialogTitle.id='pv2-dialog-title';
    var close=node('button','pv2-close','×');close.type='button';close.setAttribute('aria-label','Pencereyi kapat');close.title='Pencereyi kapat';
    var sound=node('button','pv2-sound');sound.type='button';
    function soundLabel(){setText(sound,'Ses: '+(soundEnabled?'Açık':'Kapalı'));sound.setAttribute('aria-pressed',soundEnabled?'true':'false');sound.title='Düğme tıklama sesi';}
    soundLabel();sound.addEventListener('click',function(){soundEnabled=!soundEnabled;try{localStorage.setItem('panel-v2-click-sound',soundEnabled?'on':'off');}catch(ignore){}soundLabel();if(soundEnabled){clickSound(true);}},false);
    header.appendChild(dialogTitle);header.appendChild(close);dialog.appendChild(header);
    var settings=node('div');dialog.appendChild(settings);modal.appendChild(dialog);document.body.appendChild(modal);
    close.addEventListener('click',closeDialog,false);
    modal.addEventListener('click',function(ev){if(ev.target===modal){closeDialog();}},false);
    modal.addEventListener('keydown',function(ev){
      if(ev.keyCode===27){closeDialog();ev.preventDefault();}
      if(ev.keyCode===9){var focusable=dialog.querySelectorAll('button:not(:disabled),input:not(:disabled)');var first=focusable[0],last=focusable[focusable.length-1];if(ev.shiftKey&&document.activeElement===first){last.focus();ev.preventDefault();}else if(!ev.shiftKey&&document.activeElement===last){first.focus();ev.preventDefault();}}
    },false);
    // Prevent HoaryDash's swipe navigation from consuming sliders/long presses.
    modal.addEventListener('touchstart',function(ev){ev.stopPropagation();},false);
    modal.addEventListener('touchmove',function(ev){ev.stopPropagation();},false);
    modal.addEventListener('touchend',function(ev){ev.stopPropagation();},false);
    function closeDialog(){modalRevision++;var wasOpen=modal.classList.contains('pv2-open');modal.classList.remove('pv2-open');modalIds=[];modalControls=[];if(wasOpen&&focusBeforeDialog&&document.body.contains(focusBeforeDialog)){if(keyboardInput){focusBeforeDialog.focus();}else if(document.activeElement&&document.activeElement.blur){document.activeElement.blur();}}}
    function openDialog(title, ids){
      modalRevision++;focusBeforeDialog=document.activeElement;modalIds=ids.slice(0);setText(dialogTitle,title);settings.innerHTML='';
      var key=ids.join('|'),signature='';for(var si=0;si<ids.length;si++){var state=get(ids[si]);signature+=String(C.available(state))+JSON.stringify(C.capabilities(state));}
      var page=dialogCache[key];if(!page||page.signature!==signature){page={content:node('div'),controls:[],signature:signature};modalControls=[];for(var di=0;di<ids.length;di++){buildSettings(ids[di],ids.length>1,page.content);}page.controls=modalControls;dialogCache[key]=page;}else{modalControls=page.controls;}
      for(var ci=0;ci<modalControls.length;ci++){modalControls[ci].editing=false;}settings.appendChild(page.content);syncDialog();modal.classList.add('pv2-open');close.focus();
    }
    function openPanelSettings(){
      modalRevision++;focusBeforeDialog=document.activeElement;modalIds=[];modalControls=[];setText(dialogTitle,'Panel Ayarları');settings.innerHTML='';
      function preference(title,hint,control){var row=node('div','pv2-preference'),description=node('div');description.appendChild(node('h3','',title));description.appendChild(node('p','pv2-dialog-hint',hint));row.appendChild(description);row.appendChild(control);settings.appendChild(row);}
      var audioActions=node('div','pv2-audio-actions'),testAudio=node('button','pv2-sound pv2-sound-test','Sesi Dene');testAudio.type='button';audioActions.appendChild(sound);audioActions.appendChild(testAudio);preference('Tıklama sesi','Hafif dokunma sesi. Tabletin medya sesi açık olmalı.',audioActions);audioStatus=node('p','pv2-dialog-hint');audioStatus.setAttribute('role','status');settings.appendChild(audioStatus);
      var delays=node('div','pv2-delay-options');
      [{label:'Hızlı',ms:250},{label:'Normal',ms:500},{label:'Uzun',ms:800}].forEach(function(p){var b=node('button','pv2-delay',p.label);b.type='button';b.setAttribute('aria-pressed',holdDelay===p.ms?'true':'false');b.addEventListener('click',function(){holdDelay=p.ms;try{localStorage.setItem('panel-v2-hold-ms',String(holdDelay));}catch(ignore){}var all=delays.querySelectorAll('button');for(var i=0;i<all.length;i++){all[i].setAttribute('aria-pressed',all[i]===b?'true':'false');}},false);delays.appendChild(b);});
      preference('Uzun basma','Lamba ayarlarının açılma süresi. Pil simgesini etkilemez.',delays);
      var actions=node('div','pv2-settings-actions'),clean=node('button','','Ekranı Temizle'),reload=node('button','','Sayfayı Yenile');clean.type=reload.type='button';
      clean.addEventListener('click',function(){closeDialog();cleanScreen();},false);
      reload.addEventListener('click',function(){window.location.reload();},false);
      actions.appendChild(clean);actions.appendChild(reload);settings.appendChild(actions);settings.appendChild(node('p','pv2-dialog-hint','Temizlik modu panel dokunmalarını 20 saniye engeller. Tercihler bu cihazda saklanır.'));
      modal.classList.add('pv2-open');close.focus();
    }
    function cleanScreen(){
      var cover=node('div','pv2-cleaning'),title=node('h2','','Ekranı silebilirsiniz'),remaining=node('div','pv2-cleaning-seconds'),hint=node('p','','Panel dokunmaları geçici olarak kilitli.');cover.appendChild(title);cover.appendChild(remaining);cover.appendChild(hint);cover.setAttribute('role','status');cover.tabIndex=-1;document.body.appendChild(cover);cover.focus();
      function block(ev){ev.preventDefault();ev.stopPropagation();}
      ['touchstart','touchmove','touchend','click','contextmenu','keydown'].forEach(function(name){cover.addEventListener(name,block,false);});
      var deadline=new Date().getTime()+20000,timer;
      function tick(){var left=Math.max(0,Math.ceil((deadline-new Date().getTime())/1000));setText(remaining,String(left));if(left===0){clearInterval(timer);if(cover.parentNode){cover.parentNode.removeChild(cover);}}}
      timer=setInterval(tick,250);tick();
    }
    function buildSettings(id, showName, container){
      var entry=get(id), a=entry.attributes, cap=C.capabilities(entry), section=node('section','pv2-light-settings');
      if(showName){section.appendChild(node('h3','',cfg.labels && cfg.labels[id] || a.friendly_name || 'Lamba'));}
      if(!C.available(entry)){section.appendChild(node('p','pv2-dialog-hint','Bu lambaya şu anda ulaşılamıyor.'));container.appendChild(section);return;}
      var control={id:id,input:null,output:null,presets:[],editing:false};modalControls.push(control);
      if(cap.dim){
        var row=node('div','pv2-setting-row'),label=node('label','','Parlaklık'),input=node('input'),output=node('output');
        var brightness=C.brightness(entry);input.type='range';input.min='0';input.max='100';input.step='1';input.value=String(brightness.value);input.setAttribute('aria-label',(cfg.labels&&cfg.labels[id]||'Lamba')+' parlaklık');
        input.id='pv2-dim-'+id.replace(/\./g,'-');label.htmlFor=input.id;output.textContent=brightness.label;
        control.input=input;control.output=output;
        input.addEventListener('mousedown',function(){control.editing=true;},false);input.addEventListener('touchstart',function(){control.editing=true;},false);
        input.addEventListener('touchcancel',function(){control.editing=false;syncDialog();},false);
        input.addEventListener('mouseup',function(){control.editing=false;},false);input.addEventListener('touchend',function(){control.editing=false;},false);
        input.addEventListener('input',function(){setText(output,input.value+'%');},false);
        input.addEventListener('change',function(){control.editing=false;var value=Number(input.value);if(value===0){perform('dim:'+id,'light','turn_off',id);}else{perform('dim:'+id,'light','turn_on',id,{brightness_pct:value});}},false);
        row.appendChild(label);row.appendChild(input);row.appendChild(output);section.appendChild(row);
      }
      if(cap.temperature){
        var temps=node('div','pv2-presets');section.appendChild(node('h3','pv2-presets-title','Beyaz tonları'));
        [{label:'Sıcak',k:2700,color:'#ffd18b'},{label:'Doğal',k:4000,color:'#fff0d9'},{label:'Soğuk',k:6500,color:'#dcecff'}].forEach(function(p){
          var k=Math.max(cap.min,Math.min(cap.max,p.k));
          var b=preset(p.label,p.color);b.setAttribute('aria-label',p.label+' beyaz');control.presets.push({button:b,kelvin:k});
          b.addEventListener('click',function(){selectPreset(temps,b);applyPreset(id,{color_temp_kelvin:k});},false);temps.appendChild(b);
        });section.appendChild(temps);
      }
      if(cap.rgb){
        var colors=node('div','pv2-presets');section.appendChild(node('h3','pv2-presets-title','Renkler'));
        [{label:'Kırmızı',rgb:[255,55,55],color:'#ff5555'},{label:'Amber',rgb:[255,165,45],color:'#ffb64d'},{label:'Yeşil',rgb:[65,220,110],color:'#51d984'},{label:'Mavi',rgb:[65,135,255],color:'#679dff'},{label:'Mor',rgb:[175,85,255],color:'#b278fa'},{label:'Pembe',rgb:[255,95,170],color:'#ff7db4'}].forEach(function(p){
          var b=preset(p.label,p.color);control.presets.push({button:b,rgb:p.rgb});b.addEventListener('click',function(){selectPreset(colors,b);applyPreset(id,{rgb_color:p.rgb});},false);colors.appendChild(b);
        });section.appendChild(colors);
      }
      if(!cap.dim&&!cap.temperature&&!cap.rgb){section.appendChild(node('p','pv2-dialog-hint','Bu lamba yalnızca aç/kapat destekliyor.'));}
      container.appendChild(section);
    }
    function applyPreset(id,data){var revision=modalRevision;perform('color:'+id,'light','turn_on',id,data,function(){if(modalRevision===revision){closeDialog();}});}
    function syncDialog(){
      for(var mi=0;mi<modalControls.length;mi++){var control=modalControls[mi],entry=get(control.id),available=connection()&&C.available(entry);
        if(control.input){control.input.disabled=!available;if(!control.editing&&!busy['dim:'+control.id]){var brightness=C.brightness(entry);control.input.value=String(brightness.value);setText(control.output,brightness.label);}}
        for(var pi=0;pi<control.presets.length;pi++){var p=control.presets[pi],selected=C.presetSelected(entry,p);p.button.disabled=!available||!!busy['color:'+control.id];if(!busy['color:'+control.id]){p.button.classList.toggle('pv2-selected',selected);p.button.setAttribute('aria-pressed',selected?'true':'false');}}
      }
    }
    function preset(label,color){var b=node('button','pv2-preset');b.type='button';b.setAttribute('aria-pressed','false');var dot=node('span','pv2-swatch');dot.style.backgroundColor=color;b.appendChild(dot);b.appendChild(document.createTextNode(label));return b;}
    function selectPreset(parent,button){var all=parent.parentNode.querySelectorAll('.pv2-preset');for(var i=0;i<all.length;i++){all[i].classList.remove('pv2-selected');all[i].setAttribute('aria-pressed','false');}button.classList.add('pv2-selected');button.setAttribute('aria-pressed','true');}
    function drawCard(item){
      var o=item.options,b=item.button,label=o.label,detail='',on=false,unavailable=false,key=o.ids?o.ids.join(','):o.kind,disabled=!connection();
      if(o.kind&&o.kind.indexOf('vacuum-')===0){var action=C.robotControl(get(cfg.vacuum),o.kind.slice(7));label=action.label;detail=action.detail;disabled=disabled||!action.service||!!busy.robot;unavailable=!C.available(get(cfg.vacuum));key='vacuum';}
      else if(o.kind==='robot'){var robot=C.robot(get(cfg.vacuum));label=robot.label;detail=robot.detail;on=get(cfg.vacuum).state==='cleaning';disabled=disabled||!robot.service||!!busy.vacuum;unavailable=!C.available(get(cfg.vacuum));}
      else if(o.kind==='alloff'){
        var remaining=C.remaining(get(cfg.countdown),new Date().getTime());
        if(get(cfg.countdown).state==='on'){label=remaining===null?'Geri Sayım':C.timeLabel(remaining);detail='İptal için dokun';on=true;}
        else{detail='1 dakika sonra kapat';}
        disabled=disabled||!C.available(get(cfg.countdown));key='countdown';
        b.classList.toggle('pv2-counting',on);
      }else{
        var group=C.group(o.ids,cache);on=group.on>0;unavailable=group.ready===0;
        if(unavailable){detail='Bağlantı yok';}
        else if(group.total===1){detail=on?'Açık':'Kapalı';}
        else{detail=group.on?group.on+'/'+group.total+' açık':'Kapalı';if(group.ready<group.total){detail+=' · eksik bağlantı';}}
        disabled=disabled||unavailable;
      }
      var tint=o.ids&&o.ids.length===1?C.lightTint(get(o.ids[0])):null;
      b.style.backgroundColor=tint?tint.background:'';b.style.borderColor=tint?tint.border:'';if(item.icon){item.icon.style.color=tint?tint.foreground:'';}item.status.style.color=tint?tint.foreground:'';
      b.disabled=disabled||!!busy[key];b.classList.toggle('pv2-on',on);b.classList.toggle('pv2-unavailable',unavailable);
      b.classList.toggle('pv2-pending',!!busy[key]);b.setAttribute('aria-busy',busy[key]?'true':'false');
      setText(item.label,label);setText(item.status,!connection()?'Bağlantı yok':detail);
      b.setAttribute('aria-label',label+' · '+detail);if(o.ids){b.setAttribute('aria-pressed',on?'true':'false');b.title='Dokun: aç/kapat · Uzun bas: lamba ayarları';}
    }
    var conditions={'clear-night':'Açık gece','cloudy':'Bulutlu','exceptional':'Olağan dışı','fog':'Sisli','hail':'Dolu','lightning':'Şimşekli','lightning-rainy':'Gök gürültülü','partlycloudy':'Parçalı bulutlu','pouring':'Sağanak','rainy':'Yağmurlu','snowy':'Karlı','snowy-rainy':'Karla karışık','sunny':'Güneşli','windy':'Rüzgârlı','windy-variant':'Rüzgârlı'};
    function updateMeeting(v){var entry=get(cfg.meeting),age=new Date().getTime()/1000-Number(entry.attributes.last_report_epoch||0);v.meeting.classList.toggle('pv2-active',v.name==='Ana'&&connection()&&entry.state==='on'&&age>=-5&&age<40);}
    function render(){
      syncDialog();var active=activeView();
      for(var i=0;i<cards.length;i++){if(cards[i].view===active){drawCard(cards[i]);}}
      var entry=get(cfg.weather),t=entry.attributes.temperature,valid=C.available(entry)&&t!==null&&t!==undefined&&t!==''&&isFinite(Number(t));
      var weatherName=entry.state==='sunny'?'sun':entry.state==='clear-night'?'moon':(/rain|pouring|hail|snow/.test(entry.state)?'rain':'cloud');
      for(var vi=0;vi<views.length;vi++){var v=views[vi];if(v.name!==active){continue;}
        setText(v.status,connection()?'● Home Assistant':'○ Bağlantı yok');v.status.title=connection()?'Home Assistant bağlantısı açık':'Home Assistant bağlantısı kesildi';v.status.setAttribute('aria-label',v.status.title);v.status.style.color=connection()?'#9fd8c2':'#ffb4b4';
        setText(v.temperature,valid?String(Math.round(Number(t)*10)/10).replace('.',',')+'°':'--°');setText(v.condition,!connection()?'Bağlantı yok':(C.available(entry)?conditions[entry.state]||'Hava durumu':'Veri yok'));
        if(weatherName!==v.previousWeatherIcon){v.weatherIcon.innerHTML=icon(weatherName);v.previousWeatherIcon=weatherName;}
        updateMeeting(v);
      }
      if(robotStatus&&active==='Robot'){var names={docked:'İstasyonda',cleaning:'Temizlik yapıyor',paused:'Duraklatıldı',returning:'İstasyona dönüyor',idle:'Temizliğe hazır',error:'Robot hata bildiriyor'};setText(robotStatus,!connection()?'Bağlantı yok':names[get(cfg.vacuum).state]||'Robota ulaşılamıyor');}
    }
    // HoaryDash's warming pool can replay an older initial snapshot. On each
    // connection, reconcile only our small entity set once (two requests at a
    // time), after that initial event. Newer WS changes win over in-flight REST.
    function reconcileSnapshot(generation) {
      snapshotNeeded = false;
      var ids = cfg.allLights.concat(cfg.extraLights || [], [cfg.weather,cfg.vacuum,cfg.countdown,cfg.meeting]);
      var unique = [], index = 0;
      ids.forEach(function(id){if(unique.indexOf(id)===-1 && listeners[id]){unique.push(id);}});
      function next(){
        if(generation!==connectionGeneration || !connection() || index>=unique.length){return;}
        var id=unique[index++], version=versions[id] || 0;
        window.goFetch('/api/proxy/api/states/'+encodeURIComponent(id)+'?panel_snapshot='+new Date().getTime(),function(error,entry){
          if(!error && generation===connectionGeneration && (versions[id]||0)===version && entry && entry.entity_id===id){
            cache[id]={state:entry.state,attributes:entry.attributes || {}};scheduleRender();
          }
          next();
        });
      }
      next();next();
    }
    function connectionReady(){
      var generation=++connectionGeneration;snapshotNeeded=true;
      setTimeout(function(){if(snapshotNeeded && generation===connectionGeneration){reconcileSnapshot(generation);}},1000);
    }
    window.onHaReady.push(connectionReady);
    if(connection()){connectionReady();}
    // Cache compact changes once, then deliver complete states to every old/new widget.
    // Old adjustable widgets otherwise throw on attribute-only/state-only updates.
    for(var eid in listeners){if(Object.prototype.hasOwnProperty.call(listeners,eid)){
      (function(id, callbacks){var old=callbacks.slice(0);callbacks.length=0;cache[id]={state:'unknown',attributes:{}};
        callbacks.push(function(state,attrs){versions[id]=(versions[id]||0)+1;cache[id]=C.merge(get(id),state,attrs||{});scheduleRender();if(snapshotNeeded){snapshotNeeded=false;var generation=connectionGeneration;setTimeout(function(){if(generation===connectionGeneration){reconcileSnapshot(generation);}},0);}for(var i=0;i<old.length;i++){if(old[i]){try{old[i](cache[id].state,cache[id].attributes);}catch(ignore){/* Isolate legacy widget failures. */}}}});
      })(eid,listeners[eid]);
    }}
    var days=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
    function clockTick(){var now=new Date(),active=activeView();function pad(n){return ('0'+n).slice(-2);}for(var vi=0;vi<views.length;vi++){var v=views[vi];if(v.name!==active){continue;}setText(v.clock,pad(now.getHours())+':'+pad(now.getMinutes()));setText(v.date,pad(now.getDate())+'.'+pad(now.getMonth()+1)+'.'+now.getFullYear());setText(v.weekday,days[now.getDay()]);updateMeeting(v);}if(active==='Ana'&&get(cfg.countdown).state==='on'){for(var ci=0;ci<cards.length;ci++){if(cards[ci].options.kind==='alloff'){drawCard(cards[ci]);break;}}}if(lastConnection!==connection()){lastConnection=connection();scheduleRender();}}
    function navigated(){closeDialog();clockTick();render();}
    window.addEventListener('hashchange',navigated,false);
    window.addEventListener('screen-navigate',navigated,false);
    document.addEventListener('visibilitychange',function(){if(document.hidden){closeDialog();}},false);
    clockTick();render();setInterval(clockTick,1000);
    clearTimeout(window.panelV2LoadingTimer);document.documentElement.classList.remove('pv2-loading');
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',ready,false);}else{ready();}
})();
