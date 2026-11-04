/* Browser application: ES5, no framework; bounded read-only data recovery. Configuration is injected separately. */
(function () {
  function ready() {
    var cfg = window.PANEL_V2_CONFIG, C = window.PanelV2Core;
    var officeProfile=!!cfg&&cfg.profile==='office';
    var preferencePrefix=officeProfile?'panel-office-':'panel-v2-';
    var home = document.getElementById('screen-Ana');
    if (!cfg || !C || !home || document.getElementById('panel-v2')) { return; }
    var cache = {}, versions = {}, cards = [], busy = {}, listeners = window.entityListeners || {};
    var printerCamera=null,powerDialogState=null,printerStartup=null,printerDetails=null,printerShutdown=null;
    var snapshotNeeded = false, connectionGeneration = 0, renderQueued=false,lastConnection=null;
    function navigateScreen(name){
      var screens=document.querySelectorAll('.screen');
      for(var i=0;i<screens.length;i++){if(screens[i].id==='screen-'+name){
        if(typeof window.navigateTo==='function'){window.navigateTo(i);}else{window.location.hash='#screen-'+encodeURIComponent(name);}
        return;
      }}
    }
    function activeView(){try{return decodeURIComponent(window.location.hash.replace(/^#screen-/,''))||'Ana';}catch(ignore){return 'Ana';}}
    function scheduleRender(){if(renderQueued){return;}renderQueued=true;setTimeout(function(){renderQueued=false;render();},16);}
    var modalIds = [], modalControls=[],dialogCache={},modalRevision=0,focusBeforeDialog = null, noticeTimer, modal, keyboardInput = false;
    document.addEventListener('keydown',function(ev){if(ev.keyCode===9){keyboardInput=true;document.body.classList.add('pv2-keyboard');}},true);
    function pointerInput(){keyboardInput=false;document.body.classList.remove('pv2-keyboard');}
    document.addEventListener('touchstart',pointerInput,true);
    document.addEventListener('mousedown',pointerInput,true);
    var soundEnabled=true,holdDelay=500,audio=document.createElement('audio'),audioStatus=null,audioTestFeedback=false;
    audio.preload='auto';audio.volume=1;audio.setAttribute('aria-hidden','true');audio.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
    var soundBase=window.location.protocol+'//'+window.location.hostname+':8123/local/';
    [{src:cfg.clickSoundUrl||soundBase+'panel-click.mp3',type:'audio/mpeg'},{src:cfg.clickSoundWavUrl||soundBase+'panel-click.wav',type:'audio/wav'}].forEach(function(source){var n=document.createElement('source');n.src=source.src;n.type=source.type;audio.appendChild(n);});document.body.appendChild(audio);
    function soundStatus(text){if(audioStatus){setText(audioStatus,text);}}
    audio.addEventListener('playing',function(){if(audioTestFeedback){soundStatus('Ses denemesi oynatıldı. Medya sesini kontrol edin.');}},false);
    audio.addEventListener('error',function(){soundStatus('Ses dosyası oynatılamadı. Hata: '+(audio.error?audio.error.code:'bilinmiyor'));},false);
    try{var savedSound=localStorage.getItem(preferencePrefix+'click-sound');if(savedSound==='on'||savedSound==='off'){soundEnabled=savedSound==='on';}var savedDelay=Number(localStorage.getItem(preferencePrefix+'hold-ms'));if(savedDelay===450){savedDelay=250;}else if(savedDelay===650){savedDelay=500;}else if(savedDelay===900){savedDelay=800;}if([250,500,800].indexOf(savedDelay)!==-1){holdDelay=savedDelay;}}catch(ignore){}
    // Decode once; a new lightweight buffer source starts directly on touch-down.
    // The proven HTML media path remains a fallback for older/unsupported engines.
    var fastContext=null,fastBuffer=null,fastFailed=false;
    try{var AudioEngine=window.AudioContext||window.webkitAudioContext;if(AudioEngine){fastContext=new AudioEngine();var raw=atob('UklGRnoKAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YVYKAAAAAGcAdwHTAgcEtgS3BBwEGgPsAawARP93/Q77APic9I3xue8C8PLyg/gAAC0Ijw/XFDYXmRaUEykPYArqBewBBv6R+RH0ju3J5i7hcd4K4Kjm1/EAAL0OdBtQI8MlWSN+HQYWjQ4FCIYCfP0S+LrxkOqD4x/eFdys3jvm9PEAAPANYBmRINQimSAzG08UbA1mB1QCrv2w+NbyO+y75cHg4N5D4TzoDPMAANsMZxcJHh4gEB4VGbsSYAzSBiUC3f1C+dzzxe3G5y/jdOGn4xXqDvQAANsLlRWzG58duhsiF0YRagtKBvsBB/7I+c70MO+o6W3l1OPb5cnr/PQAAO8K5xOMGVEbkhlVFe4PhwrNBdMBL/5E+q31fvBl637nBebk51zt1/UAABUKWxKPFzEZlRetE7EOtQlaBa8BU/62+nr2s/H/7GbpCujE6c/uofYAAEwJ7hC6FTwXvxUlEowN9AjvBI0BdP4f+zj30PJ57ijr5+l/6yXwXPcAAJMInQ8JFG0VDhS8EH8MQgiNBG4Bk/6B++f31vPW78fsn+sX7WHxCPgAAOgHZg57EsMTfxJvD4YLnQcyBFIBr/7a+4j4yfQY8UbuNe2P7oTyp/gAAEsHRw0LETkSDxE7DqEKBgffAzgByv4t/B35qPVB8qfvq+7r75DzOfkAALoGPwy3D84Quw8gDc0JegaSAx8B4v55/Kb5dvZT8+zwBPAr8Yj0wPkAADQGSwt+DoAPgg4bDAoJ+QVLAwkB+P6//CT6NPdP9BjyQvFS8mz1PPoAALgFagpeDUsOYQ0qC1YIggUJA/QADf8A/Zn64/c49S3zaPJi8z/2r/oAAEYFmwlUDC8NVwxLCrAHFAXMAuEAIP88/QX7hfgO9iz0dvNe9AH3GfsAAN0E3AheCygMYQt+CRcHrwSVAtAAMf9z/Wj7GvnU9hj1cPRF9bT3e/sAAHwEKwh8CjYLfgrBCIoGUgRhAr8AQf+m/cP7o/mL9/H1VvUb9ln41fsAACMEiQerCVcKrgkTCAcG/AMyArEAUP/V/Rj8Ivoz+Ln2K/bg9vL4KPwAANED8wbrCIkJ7QhyB48FrAMGAqMAXv8A/mb8l/rP+HL37vaW9375dPwAAIUDaAY5CMsIOwjeBiEFYwPeAZYAav8o/q38Avte+Rz4o/c9+AD6u/wAAD8D6QWVBxwIlwdVBrsEIAO5AYoAdv9M/u/8Zvvi+bn4SfjY+Hf6/PwAAP4CcwX+BnsHAAfXBVwE4gKWAYAAgf9u/i39wftc+kr54/hm+eb6OP0AAMICBgVzBuYGdQZjBQYEqAJ3AXYAi/+O/mX9FvzM+tD5cfnq+Uv7cP0AAIsCogTzBVwG9AX4BLUDcwJaAWwAlP+q/pn9ZPw0+0v68/lj+qn7o/0AAFkCRgR8Bd4FfgWVBGwDQgI/AWQAnP/F/sn9rPyT+736bPrT+v/70v0AACoC8QMPBWkFEAU5BCcDFQImAVwApP/e/vX97vzr+yb72/o6+0/8/f0AAP8BogOqBP0EqwTlA+kC7AEPAVUAq//0/h7+K/09/Ib7QfuZ+5n8Jf4AANcBWgNNBJoETgSYA68CxgH6AE4Asv8J/0P+ZP2I/N/7oPvx+9z8Sv4AALIBFwP4Az4E+QNQA3kCogHmAEgAuP8c/2b+mP3N/DL89/tB/Bv9bP4AAJEB2gKpA+oDqgMOA0gCggHUAEMAvv8u/4b+yP0N/X38R/yM/FX9jP4AAHEBoQJgA5wDYQPRAhoCZAHEAD0Aw/8+/6P+9P1H/cP8kfzR/Ir9qf4AAFUBbQIdA1QDHQOZAvEBSAG1ADkAyP9O/77+Hf5+/QT91vwQ/bv9w/4AADoBPALfAhID3wJlAsoBLgGmADQAzP9b/9f+Qv6w/T/9Ff1L/ej93P4AACIBEAKlAtQCpgI2AqYBFwGaADAA0P9o/+7+Zf7e/Xb9T/2B/RL+8/4AAAsB5wFxApwCcQIKAoUBAQGOACwA1P90/wT/hf4I/qn9hf2y/Tj+CP8AAPYAwQFAAmgCQQLhAWcB7QCCACkA1/9//xf/ov4v/tf9tv3g/Vz+G/8AAOMAngETAjgCFAK8AUsB2wB4ACYA2/+J/yr/vv5U/gL+5P0L/nz+Lf8AANEAfgHqAQwC6gGZATEBygBvACMA3v+S/zr/1/51/ir+Dv4y/pv+Pf8AAMEAYAHEAeMBxAF5ARoBugBmACAA4P+b/0r/7v6U/k/+Nf5W/rb+Tf8AALIARQGhAb4BoQFcAQQBqwBeAB0A4/+j/1j/A/+w/nD+WP53/tD+W/8AAKQAKwGAAZsBgQFBAe8AngBXABsA5f+q/2X/F//K/o/+ef6V/uj+Z/8AAJcAFAFiAXsBYwEoAd0AkgBQABkA5/+x/3H/Kf/i/qz+mP6y/v7+c/8AAIwA/gBHAV0BRwERAcwAhgBKABcA6f+3/3z/Ov/5/sf+tP7M/hL/fv8AAIEA6wAtAUIBLgH7ALwAfABEABUA6/+9/4f/Sf8N/9/+zv7k/iT/iP8AAHcA2AAWASkBFgHoAK0AcgA/ABMA7f/C/5D/WP8g//b+5f76/jX/kv8AAG0AxwAAARIBAAHWAKAAaQA6ABIA7v/H/5n/Zf8x/wr/+/4O/0X/mv8AAGUAuADsAP0A7ADFAJMAYQA1ABAA8P/L/6H/cf9C/x3/EP8h/1T/ov8AAF0AqgDaAOkA2gC2AIgAWQAxAA8A8f/P/6j/fP9Q/y//I/8y/2H/qv8AAFYAnADJANcAyQCoAH0AUgAtAA4A8v/T/6//hv9e/z//NP9D/27/sP8AAE8AkAC5AMYAuQCbAHMATAAqAA0A8//X/7X/kP9r/07/RP9R/3n/t/8AAEkAhQCrALcAqwCOAGoARgAmAAwA9P/a/7v/mf92/1z/Uv9f/4T/vP8AAEMAewCdAKgAngCDAGIAQQAjAAsA9f/d/8H/of+B/2n/YP9r/43/wv8AAD4AcQCRAJsAkQB5AFoAPAAhAAoA9v/g/8b/qP+L/3X/bP93/5b/x/8AADkAaACGAI8AhgBwAFMANwAeAAkA9//i/8r/r/+U/4D/eP+C/5//y/8AADUAYAB7AIQAewBnAE0AMwAcAAgA+P/l/87/tf+d/4r/g/+M/6b/z/8AADAAWAByAHoAcgBfAEcALwAZAAgA+P/n/9L/u/+k/5P/jP+V/63/0/8AAC0AUgBpAHAAaQBXAEEAKwAXAAcA+f/p/9b/wf+s/5v/lf+d/7T/1/8AACkASwBhAGcAYQBRADwAKAAWAAYA+v/r/9n/xv+y/6P/nv+l/7r/2v8AACYARQBZAF8AWQBKADcAJAAUAAYA+v/s/9z/yv+4/6v/pf+s/7//3f8AACMAQABSAFgAUgBFADMAIgASAAUA+//u/9//zv++/7H/rP+z/8T/4P8AACAAOwBMAFEATAA/AC8AHwARAAUA+//v/+L/0v/D/7f/s/+5/8n/4v8AAB4ANgBGAEsARgA6ACsAHAAPAAUA+//x/+T/1v/I/73/uf++/83/5f8='),bytes=new Uint8Array(raw.length);for(var ai=0;ai<raw.length;ai++){bytes[ai]=raw.charCodeAt(ai);}fastContext.decodeAudioData(bytes.buffer,function(buffer){fastBuffer=buffer;},function(){fastFailed=true;});}}catch(ignore){fastFailed=true;}
    function fastSound(){
      if(!fastContext||!fastBuffer||fastFailed){return false;}
      try{if(fastContext.state==='suspended'&&fastContext.resume){var resuming=fastContext.resume();if(resuming&&resuming.catch){resuming.catch(function(){fastFailed=true;});}}
        var source=fastContext.createBufferSource();source.buffer=fastBuffer;source.connect(fastContext.destination);source.onended=function(){source.disconnect();};if(source.start){source.start(0);}else{source.noteOn(0);}if(audioTestFeedback){soundStatus('Ses denemesi oynatıldı.');}return true;
      }catch(ignore){fastFailed=true;return false;}
    }
    function clickSound(force){audioTestFeedback=!!force;if(!soundEnabled&&!force){return;}if(fastSound()){return;}try{try{audio.currentTime=0;}catch(ignore){}var playing=audio.play();if(playing&&playing.catch){playing.catch(function(error){soundStatus(error.name==='NotAllowedError'?'Tarayıcı ses oynatmayı engelledi. Sesi Dene düğmesine dokunun.':'Ses oynatılamadı: '+error.name);});}}catch(ignore){soundStatus('Bu tarayıcı sesi başlatamadı.');}}
    var lastTouchSoundAt=0,lastPointerSoundAt=0,lastPointerControl=null,touchFeedbackActive=false;
    function feedbackControl(target){for(var el=target;el&&el!==document.body;el=el.parentNode){if(el.nodeType!==1){continue;}var tag=el.tagName;if(tag==='BUTTON'||tag==='SELECT'||tag==='INPUT'||tag==='A'||el.classList.contains('navbar-item')){return el.disabled||el.getAttribute('aria-disabled')==='true'?null:el;}}return null;}
    function pressFeedback(ev){var now=new Date().getTime();if(ev.type==='mousedown'&&(ev.button!==0||now-lastTouchSoundAt<800)){return;}if(ev.touches&&ev.touches.length!==1){return;}var el=feedbackControl(ev.target);if(!el){return;}if(ev.touches){lastTouchSoundAt=now;touchFeedbackActive=true;}lastPointerSoundAt=now;lastPointerControl=el;clickSound(el.classList.contains('pv2-sound-test'));}
    document.addEventListener('touchstart',pressFeedback,true);
    document.addEventListener('mousedown',pressFeedback,true);
    document.addEventListener('touchend',function(){if(touchFeedbackActive){lastTouchSoundAt=new Date().getTime();lastPointerSoundAt=lastTouchSoundAt;touchFeedbackActive=false;}},true);
    document.addEventListener('mouseup',function(){lastPointerSoundAt=new Date().getTime();},true);
    document.addEventListener('click',function(ev){if(ev.isTrusted===false){return;}var el=feedbackControl(ev.target);if(!el){return;}if(el===lastPointerControl&&new Date().getTime()-lastPointerSoundAt<1000){return;}clickSound(el.classList.contains('pv2-sound-test'));},true);
    var paths = {
      pause:'M6 4h4v16H6V4Zm8 0h4v16h-4V4Z',
      play:'M8 4l12 8-12 8V4Z',
      droplet:'M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12Z',
      home:'M3 11l9-8 9 8M5 10v11h14V10M10 21v-7h4v7',
      clock:'M12 7v5l3 2M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0',
      nozzle:'M6 3h12v8l-4 5v4h-4v-4l-4-5V3Zm0 5h12',
      bed:'M3 14h18v6H3v-6Zm3-9v5m6-7v7m6-5v5',
      plug:'M8 3v5m8-5v5M6 8h12v3a6 6 0 0 1-12 0V8Zm6 9v4',
      thermometer:'M10 14.8V5a2 2 0 0 1 4 0v9.8a4 4 0 1 1-4 0ZM12 9v9',
      printer:'M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6Zm11-3h1',
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
    // Keep signs, symbols and units together so the visible reading centers as one.
    function setQuantity(el,value,unit,leadingIcon){
      var number=el.querySelector('.pv2-number'),suffix=el.querySelector('.pv2-unit'),quantity=number?number.parentNode:null;
      if(!number){el.textContent='';quantity=node('span','pv2-quantity');number=node('span','pv2-number');suffix=node('span','pv2-unit');quantity.appendChild(number);quantity.appendChild(suffix);el.appendChild(quantity);}
      if(leadingIcon&&leadingIcon.parentNode!==quantity){leadingIcon.classList.add('pv2-quantity-icon');quantity.insertBefore(leadingIcon,number);}
      setText(number,value);setText(suffix,unit);
    }
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
    function stopPrinterStartup(){if(!printerStartup){return;}clearTimeout(printerStartup.timer);clearTimeout(printerStartup.expiry);printerStartup=null;scheduleRender();}
    function checkPrinterStartup(){
      var pending=printerStartup;if(!pending||pending.inFlight||!connection()){return;}pending.inFlight=true;
      window.goFetch('/api/proxy/api/states/'+encodeURIComponent(cfg.printer.status)+'?panel_startup='+new Date().getTime(),function(error,entry){
        if(printerStartup!==pending){return;}pending.inFlight=false;
        var fresh=entry&&Date.parse(entry.last_updated||entry.last_changed||'')>=pending.since;
        if(!error&&fresh&&C.available(entry)&&['idle','running','printing','prepare','pause','paused','slicing','finish'].indexOf(entry.state)!==-1){cache[cfg.printer.status]={state:entry.state,attributes:entry.attributes||{}};stopPrinterStartup();return;}
        clearTimeout(pending.timer);pending.timer=setTimeout(checkPrinterStartup,2000);
      });
    }
    function startPrinterStartup(){stopPrinterStartup();var pending={since:new Date().getTime(),inFlight:false,timer:null,expiry:null};printerStartup=pending;pending.timer=setTimeout(checkPrinterStartup,500);pending.expiry=setTimeout(function(){if(printerStartup===pending){stopPrinterStartup();}},120000);scheduleRender();}
    function stopPrinterShutdown(){if(!printerShutdown){return;}clearTimeout(printerShutdown.expiry);printerShutdown=null;scheduleRender();}
    function syncPrinterPower(state){
      if(!cfg.printer||!cfg.printer.power){return;}
      if(state==='off'){stopPrinterShutdown();if(printerStartup&&printerStartup.powerSeenOn){stopPrinterStartup();}}
      else if(state==='on'&&printerStartup){printerStartup.powerSeenOn=true;}
    }
    function startPrinterShutdown(){
      stopPrinterStartup();stopPrinterShutdown();var pending={expiry:null};printerShutdown=pending;
      pending.expiry=setTimeout(function(){if(printerShutdown===pending){stopPrinterShutdown();readPowerState();}},10000);scheduleRender();
    }
    function printerDataReady(){return !!cfg.printer&&connection()&&!printerStartup&&!printerShutdown&&!printerOffline()&&(!cfg.printer.power||get(cfg.printer.power).state==='on');}
    function printerDisplayState(state){
      var p=cfg.printer||{};
      if(state.state!=='failed'||!p.stage||!p.printError||!p.hmsErrors){return state.state;}
      var stage=get(p.stage),error=get(p.printError),hms=get(p.hmsErrors);
      // A stopped job can retain FAILED after cancellation. Only confirmed idle
      // plus both cleared fault signals may return to Ready; unknown stays failed.
      return C.available(stage)&&stage.state==='idle'&&C.available(error)&&error.state==='off'&&C.available(hms)&&hms.state==='off'?'idle':'failed';
    }
    var printerFailureAttempt=0,printerFailurePending=false;
    function requestPrinterFailureState(){
      var p=cfg.printer||{},now=new Date().getTime();
      if(!officeProfile||!connection()||printerFailurePending||!p.stage||!p.printError||!p.hmsErrors||get(p.status).state!=='failed'||printerDisplayState(get(p.status))==='idle'||printerStartup||printerShutdown||(p.power&&get(p.power).state!=='on')||now-printerFailureAttempt<10000){return;}
      printerFailureAttempt=now;printerFailurePending=true;
      var ids=[p.status,p.stage,p.printError,p.hmsErrors],generation=connectionGeneration,expected={},results={},index=0,done=0,valid=true,expired=false;
      ids.forEach(function(id){expected[id]=versions[id]||0;});
      var timeout=setTimeout(function(){expired=true;printerFailurePending=false;},15000);
      function next(){
        if(expired||index>=ids.length){return;}var id=ids[index++];
        window.goFetch('/api/proxy/api/states/'+encodeURIComponent(id)+'?panel_failure='+now,function(error,entry){
          if(expired){return;}if(error||!entry||entry.entity_id!==id){valid=false;}else{results[id]=entry;}
          done++;
          if(done===ids.length){
            clearTimeout(timeout);printerFailurePending=false;
            if(valid&&connection()&&generation===connectionGeneration&&ids.every(function(eid){return (versions[eid]||0)===expected[eid];})){
              ids.forEach(function(eid){var e=results[eid];cache[eid]={state:e.state,attributes:e.attributes||{}};});scheduleRender();
            }
          }else{next();}
        });
      }
      next();next();
    }
    function printerStatusLabel(state){
      if(!connection()){return 'Bağlantı yok';}
      if(printerShutdown){return 'Kapatılıyor…';}
      if(printerStartup){return 'Açılıyor…';}
      if(cfg.printer&&cfg.printer.power&&get(cfg.printer.power).state==='off'){return 'Kapalı';}
      if(cfg.printer&&cfg.printer.power&&['on','off'].indexOf(get(cfg.printer.power).state)===-1){return 'Güç durumu bilinmiyor';}
      var names={offline:'Çevrimdışı',idle:'Hazır',running:'Yazdırılıyor',printing:'Yazdırılıyor',prepare:'Hazırlanıyor',pause:'Duraklatıldı',paused:'Duraklatıldı',slicing:'Hazırlanıyor',finish:'Tamamlandı',finished:'Tamamlandı',failed:'Baskı hatası'};
      return names[printerDisplayState(state)]||'Veri bekleniyor';
    }
    function readPowerState(callback){
      var id=cfg.printer&&cfg.printer.power;if(!id||!connection()){if(callback){callback(new Error('Bağlantı yok'));}return;}
      var version=versions[id]||0;
      window.goFetch('/api/proxy/api/states/'+encodeURIComponent(id)+'?panel_power='+new Date().getTime(),function(error,entry){
        if(!error&&entry&&entry.entity_id===id){if((versions[id]||0)===version){cache[id]={state:entry.state,attributes:entry.attributes||{}};syncPrinterPower(entry.state);if(printerStartup&&entry.state==='off'&&new Date().getTime()-printerStartup.since>2500){stopPrinterStartup();}scheduleRender();}if(callback){callback(null,get(id));}}
        else if(callback){callback(error||new Error('Durum okunamadı'));}
      });
    }
    var powerCheckPending=false;
    function printerPowerAction(){
      if(powerCheckPending){return;}powerCheckPending=true;
      readPowerState(function(error,state){powerCheckPending=false;if(error||!C.available(state)){notice('Yazıcı prizinin durumu doğrulanamadı.');return;}
        if(state.state==='off'){startPrinterStartup();perform('power:'+cfg.printer.power,'switch','turn_on',cfg.printer.power);}else if(state.state==='on'){openPowerDialog({label:'Yazıcıyı kapat?',entity:cfg.printer.power,printer:true});}
      });
    }
    function perform(key, domain, service, ids, data, onSuccess) {
      if (busy[key]) { return; }
      busy[key]=true;if(domain==='switch'&&cfg.printer&&ids===cfg.printer.power&&service==='turn_off'){startPrinterShutdown();} scheduleRender();
      if(domain==='switch'&&cfg.printer&&ids===cfg.printer.power){setTimeout(function(){readPowerState();},350);setTimeout(function(){readPowerState();},1500);setTimeout(function(){readPowerState();},3500);}
      call(domain,service,ids,data).then(function(){busy[key]=false;scheduleRender();if(onSuccess){onSuccess();}},function(){busy[key]=false;if(domain==='switch'&&cfg.printer&&ids===cfg.printer.power&&service==='turn_off'){stopPrinterShutdown();}if(domain==='switch'&&cfg.printer&&ids===cfg.printer.power&&service==='turn_on'){stopPrinterStartup();}scheduleRender();notice('İşlem gerçekleştirilemedi. Bağlantıyı kontrol edin.');});
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
      var b=node('button','pv2-card'+(options.action?' pv2-action':'')+(legacy?' pv2-legacy-light':'')); b.type='button';if(options.kind==='sensor'){b.classList.add('pv2-readonly');}if(options.kind==='sensor'&&cfg.printer&&options.entity===cfg.printer.progress){b.classList.add('pv2-print-progress-card');var progressFill=node('span','pv2-card-progress-fill');progressFill.setAttribute('aria-hidden','true');b.appendChild(progressFill);b.setAttribute('role','progressbar');b.setAttribute('aria-valuemin','0');b.setAttribute('aria-valuemax','100');}
      if(b.classList.contains('pv2-print-progress-card')){var cardIcon=node('span','pv2-card-icon');cardIcon.innerHTML=icon(options.icon);b.appendChild(cardIcon);}else{b.innerHTML=icon(options.icon);}
      var text=node('span','pv2-card-text'), label=node('span','pv2-card-label',options.label), state=node('span','pv2-card-state','Yükleniyor…');
      text.appendChild(label);text.appendChild(state);b.appendChild(text);if(options.kind==='printer'){b.classList.add('pv2-printer-summary');var track=node('span','pv2-print-track'),fill=node('span','pv2-print-fill');track.setAttribute('aria-hidden','true');track.appendChild(fill);text.appendChild(track);var summaryPercent=node('span','pv2-summary-percent');summaryPercent.setAttribute('aria-hidden','true');b.appendChild(summaryPercent);var summaryRemaining=node('span','pv2-summary-remaining');summaryRemaining.style.display='none';summaryRemaining.setAttribute('aria-hidden','true');summaryRemaining.appendChild(node('span','pv2-summary-remaining-label','Kalan:'));summaryRemaining.appendChild(node('span','pv2-summary-remaining-value'));b.appendChild(summaryRemaining);}parent.appendChild(b);
      var item={tapTimer:null,button:b,label:label,status:state,options:options,icon:b.querySelector('svg'),view:parent.getAttribute('data-pv2-screen')};cards.push(item);
      function printerPress(){if(!cfg.printer||!cfg.printer.power){if(options.kind==='printer'){navigateScreen(options.destination||'Diğer');}return;}if(item.tapTimer!==null){clearTimeout(item.tapTimer);item.tapTimer=null;printerPowerAction();return;}item.tapTimer=setTimeout(function(){item.tapTimer=null;if(options.kind==='printer'){navigateScreen(options.destination||'Diğer');}},350);}
      C.bindPress(b,function(){
        if (b.disabled) { return; }
        if (options.kind==='robot') { var robot=C.robot(get(cfg.vacuum)); if(robot.service){perform('robot','vacuum',robot.service,cfg.vacuum);} }
        else if(options.kind==='alloff'){toggleCountdown();}
        else if(options.kind==='roomoff'){var targets=supported(options.ids);if(targets.length){perform(options.ids.join(','),'light','turn_off',targets);}}
        else if(options.kind==='printer'||options.kind==='printer-status'){printerPress();}
        else if(options.kind==='navigate'){navigateScreen(options.destination||'Diğer');}
        else if(options.kind==='power'){if(options.confirmOffOnly&&get(options.entity).state==='off'){perform('power:'+options.entity,'switch','turn_on',options.entity);}else{openPowerDialog(options);}}
        else if(options.kind&&options.kind.indexOf('vacuum-')===0){var action=C.robotControl(get(cfg.vacuum),options.kind.slice(7));if(action.service){perform('vacuum','vacuum',action.service,cfg.vacuum);}}
        else{toggle(options.ids);}
      },options.ids?function(){openDialog(options.label,options.ids);}:null,null,function(){return holdDelay;});
      return item;
    }
    var navLabels=document.querySelectorAll('.navbar-label');for(var ni=0;ni<navLabels.length;ni++){if(navLabels[ni].textContent.trim().toLowerCase()==='ana'){setText(navLabels[ni],officeProfile?'ODAM':'EVİM');}else if(officeProfile&&navLabels[ni].textContent.trim().toLowerCase()==='diğer'){setText(navLabels[ni],'YAZICI');}}
    document.body.classList.add('panel-v2');if(officeProfile){document.body.classList.add('panel-v2-office');if(cfg.nativeBatteryBadge===false){document.body.classList.add('pv2-no-battery');}}
    var views=[],robotStatus=null;
    function makeView(name,title){
      var screen=document.getElementById('screen-'+name);if(!screen){return null;}screen.classList.add('pv2-screen');
      var root=node('div','pv2-panel');root.id=name==='Ana'?'panel-v2':'panel-v2-'+name;
      var top=node('div','pv2-top');top.appendChild(node('span','pv2-brand',title));
      var indoorValue=null,humidityValue=null,feelsValue=null;
      var status=node('span','pv2-connection','Bağlanıyor');top.appendChild(status);root.appendChild(top);
      var body=node('div','pv2-body'),overview=node('div','pv2-overview'),controls=node('div','pv2-controls');controls.setAttribute('data-pv2-screen',name);
      var clock=node('div','pv2-clock'),date=node('div','pv2-date'),weekday=node('div','pv2-date');overview.appendChild(clock);overview.appendChild(date);overview.appendChild(weekday);
      var weather=node('div','pv2-weather'),weatherMain=node('div','pv2-weather-main'),weatherIcon=node('span'),temperature=node('span','pv2-temperature','--°'),condition=node('div','pv2-condition','Yükleniyor…');
      if(cfg.indoorTemperature){
        weather.classList.add('pv2-weather-pair');weatherIcon.className='pv2-weather-reading-icon';
        var outside=node('div','pv2-weather-reading'),inside=node('div','pv2-weather-reading pv2-indoor-reading'),house=node('span','pv2-weather-reading-icon');house.innerHTML=icon('home');indoorValue=node('span','pv2-temperature pv2-indoor-temperature','—°');inside.setAttribute('role','group');inside.title=cfg.indoorLabel||'Ev içi sıcaklık';outside.setAttribute('role','group');outside.setAttribute('aria-label','Dışarı hava durumu');outside.appendChild(weatherIcon);outside.appendChild(temperature);outside.appendChild(condition);inside.appendChild(house);inside.appendChild(indoorValue);
        if(cfg.indoorHumidity){var caption=node('div','pv2-condition pv2-indoor-caption'),humidity=node('span','pv2-indoor-humidity'),humidityIcon=node('span');humidityIcon.innerHTML=icon('droplet');humidityValue=node('span','pv2-indoor-humidity-value','—%');humidity.appendChild(humidityIcon);humidity.appendChild(humidityValue);humidity.title='Ev içi nem';caption.appendChild(node('span','pv2-indoor-caption-label','Ev içi'));caption.appendChild(humidity);inside.appendChild(caption);}else{inside.appendChild(node('div','pv2-condition','Ev içi'));}
        weatherMain.appendChild(outside);weatherMain.appendChild(inside);
      }else{weatherMain.appendChild(weatherIcon);weatherMain.appendChild(temperature);}
      weather.appendChild(weatherMain);if(!cfg.indoorTemperature){weather.appendChild(condition);}
      if(cfg.outdoorFeelsLike){overview.classList.add('pv2-overview-with-feels');weather.classList.add('pv2-with-feels');var feels=node('div','pv2-feels-like');var feelsIcon=node('span','pv2-feels-icon');feelsIcon.innerHTML=icon('thermometer');feels.appendChild(feelsIcon);feelsValue=node('span','pv2-feels-value','—');feels.appendChild(feelsValue);feels.title='Dışarı hissedilen sıcaklık';if(cfg.indoorTemperature){outside.appendChild(feels);if(humidityValue){var indoorSecondary=node('div','pv2-indoor-secondary');indoorSecondary.appendChild(humidityValue.parentNode);inside.appendChild(indoorSecondary);}}else{weather.appendChild(feels);}}
      overview.appendChild(weather);
      var meeting=node('div','pv2-meeting');meeting.innerHTML='<span class="pv2-meeting-dot"></span>Toplantı';overview.appendChild(meeting);
      var trigger=node('button','pv2-settings-trigger');trigger.type='button';trigger.innerHTML=icon('settings');trigger.setAttribute('aria-label','Panel Ayarları');trigger.title='Panel Ayarları';trigger.addEventListener('click',function(){openPanelSettings();},false);overview.appendChild(trigger);
      body.appendChild(overview);body.appendChild(controls);root.appendChild(body);screen.appendChild(root);
      views.push({name:name,status:status,indoor:indoorValue,humidity:humidityValue,humidityIcon:humidityIcon,feels:feelsValue,feelsIcon:feelsIcon,clock:clock,date:date,weekday:weekday,temperature:temperature,condition:condition,weatherIcon:weatherIcon,previousWeatherIcon:'',meeting:meeting});return controls;
    }
    var agendaBox=null,agendaHeading=null,agendaList=null,agendaSignature=null,agendaSelected=0,agendaBaseDay=null,agendaManual=false;
    var forecastBox=null,forecastList=null,forecastNote=null,forecastRows=[],forecastAt=0,forecastAttempt=0,forecastPending=false,forecastSignature='';
    var weatherStoreKey=preferencePrefix+'weather-cache-v1:'+cfg.weather+':'+(cfg.outdoorFeelsLike||''),weatherMemory={weather:null,feels:null},weatherSeen={},weatherDay='';
    function saveWeather(){try{localStorage.setItem(weatherStoreKey,JSON.stringify({version:1,weather:weatherMemory.weather,feels:weatherMemory.feels,forecast:forecastRows,forecastAt:forecastAt}));}catch(ignore){}}
    try{var storedWeather=JSON.parse(localStorage.getItem(weatherStoreKey)||'null');if(storedWeather&&storedWeather.version===1){weatherMemory={weather:storedWeather.weather,feels:storedWeather.feels};if(Object.prototype.toString.call(storedWeather.forecast)==='[object Array]'&&storedWeather.forecast.length<=14){forecastRows=storedWeather.forecast;forecastAt=Number(storedWeather.forecastAt)||0;}}}catch(ignore){}
    function weatherObservation(entry,kind,now){
      if(!connection()||!C.available(entry)){return null;}
      var value=kind==='weather'?entry.attributes.temperature:entry.state;
      if(value===null||value===undefined||value===''||!isFinite(Number(value))){return null;}
      if(weatherSeen[kind]&&weatherSeen[kind].entry===entry){return weatherSeen[kind].sample;}
      var stamp=Number(entry.attributes.time),sample={value:Number(value),condition:kind==='weather'?entry.state:'',at:isFinite(stamp)&&stamp>0?stamp*1000:now};
      weatherSeen[kind]={entry:entry,sample:sample};
      if(C.weatherReading(sample,null,[],0,now,kind==='feels').source==='live'&&(!weatherMemory[kind]||sample.at>=weatherMemory[kind].at)){weatherMemory[kind]=sample;saveWeather();}
      return sample;
    }

    var room=cfg.roomLights||{};
    var controls=makeView('Ana',officeProfile?'ÇALIŞMA ODAM':'EVİM');
    var corridorIds=[cfg.lights.front,cfg.lights.rear];if(room.entrance){corridorIds.push(room.entrance);}
    if(officeProfile){
      controls.classList.add('pv2-office-home');
      if(cfg.agenda){
        controls.classList.add('pv2-with-agenda');
        agendaBox=node('section','pv2-agenda');agendaBox.setAttribute('aria-label','İş takvimi');
        // This is read-only kiosk content. Legacy Crosswalk can crash in its
        // native text-selection menu after a touch hold; do not enter that path.
        ['touchstart','selectstart','contextmenu'].forEach(function(name){agendaBox.addEventListener(name,function(ev){ev.preventDefault();},false);});
        agendaHeading=node('div','pv2-agenda-heading');agendaHeading.setAttribute('role','tablist');agendaHeading.setAttribute('aria-label','Takvim günü');agendaList=node('div','pv2-agenda-list');
        agendaBox.appendChild(agendaHeading);agendaBox.appendChild(agendaList);controls.appendChild(agendaBox);
      }
      if(cfg.weeklyForecast===true&&cfg.agenda){
        forecastBox=node('section','pv2-forecast');forecastBox.setAttribute('aria-label',(cfg.forecastDays===5?'Beş':'Yedi')+' günlük hava tahmini');
        var forecastHeader=node('div','pv2-forecast-header');forecastHeader.appendChild(node('h2','',(cfg.forecastDays===5?'5':'7')+' GÜNLÜK HAVA'));
        forecastNote=node('span','pv2-forecast-note','Yükleniyor…');forecastHeader.appendChild(forecastNote);
        forecastList=node('div','pv2-forecast-days');forecastBox.appendChild(forecastHeader);forecastBox.appendChild(forecastList);controls.appendChild(forecastBox);
        ['touchstart','selectstart','contextmenu'].forEach(function(name){forecastBox.addEventListener(name,function(ev){ev.preventDefault();},false);});
      }
      lightControl(controls,cfg.lights.office,'Oda Lambası','desk');
      if(cfg.robotEnabled!==false){
        addCard(controls,{label:'Ev Işıkları',icon:'bulb',kind:'navigate',destination:'Işıklar'});
        addCard(controls,{label:'Evi Temizle',icon:'robot',kind:'robot',action:true});
      }else{controls.classList.add('pv2-four');controls.classList.add('pv2-office-compact-home');}
      if(cfg.printer){addCard(controls,{label:cfg.printer.label||'3D Yazıcı',icon:'printer',kind:'printer',destination:'Diğer'});}else{addCard(controls,{label:'Ev Işıkları',icon:'bulb',kind:'navigate',destination:'Işıklar'});}
    }else{
    addCard(controls,{label:'Mutfak',ids:[cfg.lights.counter,cfg.lights.sink],icon:'kitchen'});
    addCard(controls,{label:'Salon',ids:[cfg.lights.living],icon:'bulb'});
    addCard(controls,{label:'Yemek Masası',ids:[cfg.lights.dining],icon:'bulb'});

    addCard(controls,{label:'Koridor',ids:corridorIds,icon:'corridor'});
    addCard(controls,{label:'Çalışma Odası',ids:[cfg.lights.office],icon:'desk'});
    addCard(controls,{label:'Yatak Odası',ids:[cfg.lights.bedroom],icon:'bed'});
    addCard(controls,{label:'Evi Temizle',icon:'robot',kind:'robot',action:true});
    addCard(controls,{label:'Tüm Işıkları Kapat',icon:'moon',kind:'alloff',action:true});
    }
    function lightControl(parent,id,label,iconName){if(parent&&id){addCard(parent,{label:label,ids:[id],icon:iconName||'bulb'});}}
    var kitchen=makeView('Mutfak','MUTFAK');if(kitchen){kitchen.classList.add('pv2-three');lightControl(kitchen,cfg.lights.counter,'Tezgâh');lightControl(kitchen,cfg.lights.sink,'Lavabo');lightControl(kitchen,cfg.lights.dining,'Yemek Masası');}
    var entrance=makeView('Giriş','GİRİŞ');if(entrance){entrance.classList.add('pv2-three');lightControl(entrance,room.entrance,'Antre','corridor');lightControl(entrance,cfg.lights.front,'Koridor Ön','corridor');lightControl(entrance,cfg.lights.rear,'Koridor Arka','corridor');}
    var rooms=makeView('Odalar','ODALAR');if(rooms){rooms.classList.add('pv2-four');lightControl(rooms,cfg.lights.living,'Salon');lightControl(rooms,cfg.lights.office,'Çalışma Odası','desk');lightControl(rooms,cfg.lights.bedroom,'Yatak Odası','bed');lightControl(rooms,room.accent,cfg.labels&&cfg.labels[room.accent]||'Ek Aydınlatma');}
    var robotControls=makeView('Robot','ROBOT');if(robotControls){robotControls.classList.add('pv2-robot-controls');var summary=node('div','pv2-robot-summary');summary.innerHTML=icon('robot');robotStatus=node('span','','Yükleniyor…');summary.appendChild(robotStatus);robotControls.appendChild(summary);['start','pause','dock'].forEach(function(kind){addCard(robotControls,{label:'Robot',icon:'robot',kind:'vacuum-'+kind,action:true});});}
    if(officeProfile){
      var house=makeView('Işıklar','EV IŞIKLARI');
      if(house){
        house.classList.add('pv2-office-house');
        var groups=node('div','pv2-office-groups');groups.setAttribute('role','tablist');groups.setAttribute('aria-label','Aydınlatma bölümü');house.appendChild(groups);
        var sections=[];
        function lightSection(title,entries){
          var tab=node('button','pv2-office-group',title),grid=node('div','pv2-office-grid');tab.type='button';tab.setAttribute('role','tab');tab.setAttribute('aria-selected',sections.length?'false':'true');grid.setAttribute('role','tabpanel');grid.setAttribute('aria-label',title);grid.setAttribute('data-pv2-screen','Işıklar');grid.hidden=sections.length>0;grid.style.display=sections.length?'none':'';
          entries.forEach(function(e){lightControl(grid,e[0],e[1],e[2]);});groups.appendChild(tab);house.appendChild(grid);sections.push({tab:tab,grid:grid});
          tab.addEventListener('click',function(){sections.forEach(function(s){var selected=s.tab===tab;s.tab.setAttribute('aria-selected',selected?'true':'false');s.grid.hidden=!selected;s.grid.style.display=selected?'':'none';});scheduleRender();},false);
        }
        lightSection('Odalar',[[cfg.lights.living,'Salon'],[cfg.lights.bedroom,'Yatak Odası','bed'],[cfg.lights.office,'Çalışma Odası','desk'],[room.accent,'Iris']]);
        lightSection('Mutfak',[[cfg.lights.counter,'Tezgâh','kitchen'],[cfg.lights.sink,'Lavabo','kitchen'],[cfg.lights.dining,'Yemek Masası']]);
        lightSection('Giriş',[[room.entrance,'Antre','corridor'],[cfg.lights.front,'Koridor Ön','corridor'],[cfg.lights.rear,'Koridor Arka','corridor']]);
        lightSection('Toplu',[]);var bulk=sections[sections.length-1].grid;bulk.classList.add('pv2-two');
        addCard(bulk,{label:'Odayı Kapat',ids:[cfg.lights.office,room.accent].filter(Boolean),kind:'roomoff',icon:'moon',action:true});
        addCard(bulk,{label:'Tüm Işıkları Kapat',kind:'alloff',icon:'moon',action:true});
      }
      var other=makeView('Diğer','YAZICI');if(other){other.classList.add('pv2-four');other.parentNode.parentNode.classList.add('pv2-printer-page');if(cfg.printer&&cfg.printer.camera){buildPrinterCamera(other);}(cfg.otherControls||[]).forEach(function(o){if(cfg.printer&&cfg.printer.nozzle&&cfg.printer.bed&&(o.entity===cfg.printer.remaining||o.entity===cfg.printer.nozzle)){return;}addCard(other,{label:o.label,entity:o.entity,kind:cfg.printer&&o.entity===cfg.printer.status?'printer-status':o.kind,icon:o.icon||'bulb',action:o.kind==='power'});});if(cfg.printer&&cfg.printer.nozzle&&cfg.printer.bed){buildPrinterDetails(other);}}
    }
    function buildPrinterDetails(parent){
      parent.classList.add('pv2-printer-detail-layout');var telemetry=node('div','pv2-printer-telemetry');
      var entries=[{entity:cfg.printer.remaining,label:'Kalan süre',icon:'clock',unit:' dk'},{entity:cfg.printer.nozzle,label:'Nozul sıcaklığı',icon:'nozzle',unit:'°'},{entity:cfg.printer.bed,label:'Tabla sıcaklığı',icon:'bed',unit:'°'}];
      entries.forEach(function(e){var item=node('div','pv2-printer-reading'),symbol=node('span','pv2-printer-reading-icon'+(e.icon==='bed'?' pv2-bed-reading-icon':'')),value=node('span','pv2-printer-reading-value','—');symbol.setAttribute('aria-hidden','true');symbol.innerHTML=e.icon==='bed'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h18v6H3z M6 11c-2-3 2-4 0-7 M12 11c-2-3 2-4 0-7 M18 11c-2-3 2-4 0-7"/></svg>':icon(e.icon);item.appendChild(symbol);item.appendChild(value);item.title=e.label;telemetry.appendChild(item);e.value=value;e.item=item;});parent.appendChild(telemetry);
      var panel=node('section','pv2-printer-filaments'),heading=node('div','pv2-filament-heading'),caption=node('span'),grid=node('div','pv2-filament-grid');var grouped=(cfg.printer.filaments||[]).some(function(slot){return !!slot.group;});if(grouped){panel.classList.add('pv2-filament-grouped');}heading.appendChild(node('span','',grouped?'':'Filamentler'));heading.appendChild(caption);panel.appendChild(heading);panel.appendChild(grid);parent.appendChild(panel);printerDetails={entries:entries,caption:caption,heading:heading,grouped:grouped,grid:grid,signature:''};
    }
    function filamentColor(value){var color=String(value||'');return /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color)&&color.slice(7).toLowerCase()!=='00'?color.slice(0,7):'#667487';}
    function renderPrinterDetails(){
      var details=printerDetails;if(!details||activeView()!=='Diğer'){return;}var online=printerDataReady();
      details.entries.forEach(function(e,index){var state=get(e.entity),value=Number(state.state),valid=online&&C.available(state)&&state.state!==''&&isFinite(value);if(index===0){if(state.attributes.unit_of_measurement==='h'){value*=60;}else if(state.attributes.unit_of_measurement==='s'){value/=60;}}var text='—';if(valid){if(index===0){if(printerJobActive()&&value>=0){text=value>0?Math.ceil(value)+' dk':'<1 dk';}}else{text=Math.round(value)+e.unit;}}setText(e.value,text);var readable=index===0&&online&&!printerJobActive()?'Baskı yok':text;e.item.setAttribute('aria-label',e.label+': '+readable);});
      setText(details.caption,online?'':'Son bilinen');details.heading.style.display=details.grouped&&online?'none':'';
      var slots=(cfg.printer.filaments||[]).map(function(slot){var entry=get(slot.entity),a=entry.attributes;return {label:slot.label,group:slot.group||'Filamentler',type:a.type||entry.state,color:a.color,active:!!a.active,empty:!!a.empty,available:C.available(entry)};}),signature=JSON.stringify([online,slots]);
      if(details.signature===signature){return;}details.signature=signature;details.grid.innerHTML='';var count=0;
      var groups=[];slots.forEach(function(slot){if(groups.indexOf(slot.group)===-1){groups.push(slot.group);}});
      groups.forEach(function(name){var members=slots.filter(function(slot){return slot.group===name;}),target=details.grid;
        if(details.grouped){var section=node('div','pv2-filament-device'),title=node('div','pv2-filament-device-title',name),row=node('div','pv2-filament-device-slots');var weight=members.length===1?1.25:members.length;section.style.webkitFlex=String(weight);section.style.flex=String(weight);section.appendChild(title);section.appendChild(row);details.grid.appendChild(section);target=row;}
        members.forEach(function(slot){var missingType=['','?','unknown','unavailable','empty','none','n/a','null','-','--'].indexOf(String(slot.type||'').toLowerCase())!==-1,noInfo=!slot.available||slot.empty||typeof slot.type!=='string'||missingType,active=online&&slot.active&&!noInfo;count++;var chip=node('div','pv2-filament'+(active?' pv2-filament-active':'')+(noInfo?' pv2-filament-empty-slot':'')),swatch=node('span','pv2-filament-color'),material=node('span','pv2-filament-type',noInfo?'—':slot.type),label=node('span','pv2-filament-slot',slot.label);chip.style.width=(100/members.length)+'%';if(!noInfo){swatch.style.backgroundColor=filamentColor(slot.color);}swatch.setAttribute('aria-hidden','true');chip.title=name+' · '+slot.label+' · '+(noInfo?(slot.empty?'Boş':'Bilgi yok'):slot.type)+(active?' · Kullanılıyor':'');chip.setAttribute('aria-label',chip.title);chip.appendChild(swatch);chip.appendChild(material);chip.appendChild(label);target.appendChild(chip);});
      });
      if(!count){details.grid.appendChild(node('span','pv2-filament-empty','Filament bilgisi yok'));}
    }
    function buildPrinterCamera(metrics){
      metrics.classList.add('pv2-printer-metrics');
      var box=node('section','pv2-printer-camera'),head=node('div','pv2-camera-header'),title=node('span','','Yazıcı Kamerası'),toggle=node('button','pv2-sound pv2-camera-toggle'),viewport=node('div','pv2-camera-viewport'),image=node('img'),status=node('p','pv2-camera-status','Kamera bekleniyor…');
      toggle.type='button';toggle.innerHTML=icon('pause');toggle.setAttribute('aria-label','Kamera görüntüsünü duraklat');toggle.title='Kamera görüntüsünü duraklat';image.alt='Yazıcının kamera görüntüsü';image.style.display='none';status.setAttribute('role','status');head.appendChild(title);head.appendChild(toggle);box.appendChild(head);viewport.appendChild(image);viewport.appendChild(status);box.appendChild(viewport);metrics.parentNode.appendChild(box);
      printerCamera={box:box,image:image,status:status,toggle:toggle,enabled:true,active:false,timer:null,generation:0};
      toggle.addEventListener('click',function(){printerCamera.enabled=!printerCamera.enabled;toggle.innerHTML=icon(printerCamera.enabled?'pause':'play');var label=printerCamera.enabled?'Kamera görüntüsünü duraklat':'Kamera görüntüsünü göster';toggle.setAttribute('aria-label',label);toggle.title=label;syncPrinterCamera();},false);
    }
    function cameraStatus(text,loading){var c=printerCamera;if(!c){return;}setText(c.status,text);c.status.classList.toggle('pv2-camera-loading',!!loading);c.status.setAttribute('aria-label',text);}
    function stopPrinterCamera(){
      var c=printerCamera;if(!c){return;}if(c.active){c.active=false;c.generation++;clearTimeout(c.timer);c.timer=null;c.image.onload=c.image.onerror=null;c.image.removeAttribute('src');}c.image.style.display='none';c.status.classList.remove('pv2-camera-loading');
    }
    function printerOffline(){return !!cfg.printer&&(!C.available(get(cfg.printer.status))||get(cfg.printer.status).state==='offline');}
    function syncPrinterCamera(){
      var c=printerCamera;if(!c){return;}
      if(activeView()!=='Diğer'||document.hidden||!c.enabled||!connection()||printerShutdown||printerStartup||(cfg.printer.power&&get(cfg.printer.power).state!=='on')||printerOffline()||!C.available(get(cfg.printer.camera))){
        stopPrinterCamera();cameraStatus(!c.enabled?'Görüntü duraklatıldı':!connection()?'Home Assistant bağlantısı yok':printerShutdown?'Yazıcı kapatılıyor…':printerStartup?'Yazıcı açılıyor…':cfg.printer.power&&get(cfg.printer.power).state==='off'?'Yazıcı kapalı':printerOffline()?'Yazıcı çevrimdışı':'Kameradan görüntü bekleniyor…',activeView()==='Diğer'&&!document.hidden&&c.enabled&&connection()&&!(cfg.printer.power&&get(cfg.printer.power).state!=='on')&&!printerOffline());c.status.style.display='';return;
      }
      if(c.active){return;}cameraStatus('Kamera görüntüsü yükleniyor',true);c.status.style.display='';c.active=true;c.generation++;requestPrinterFrame(c.generation);
    }
    function requestPrinterFrame(generation){
      var c=printerCamera;if(!c||!c.active||c.generation!==generation){return;}
      c.image.onload=function(){if(!c.active||c.generation!==generation){return;}c.image.style.display='';c.status.style.display='none';c.status.classList.remove('pv2-camera-loading');c.timer=setTimeout(function(){requestPrinterFrame(generation);},2000);};
      c.image.onerror=function(){if(!c.active||c.generation!==generation){return;}c.image.style.display='none';c.status.style.display='';cameraStatus('Kamera görüntüsü alınamadı · tekrar denenecek',false);c.timer=setTimeout(function(){requestPrinterFrame(generation);},10000);};
      c.image.src='/api/proxy/api/camera_proxy/'+encodeURIComponent(cfg.printer.camera)+'?panel_frame='+new Date().getTime();
    }
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
    soundLabel();sound.addEventListener('click',function(){soundEnabled=!soundEnabled;try{localStorage.setItem(preferencePrefix+'click-sound',soundEnabled?'on':'off');}catch(ignore){}soundLabel();if(soundEnabled){clickSound(true);}},false);
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
    function closeDialog(){powerDialogState=null;modalRevision++;var wasOpen=modal.classList.contains('pv2-open');modal.classList.remove('pv2-open');modalIds=[];modalControls=[];if(wasOpen&&focusBeforeDialog&&document.body.contains(focusBeforeDialog)){if(keyboardInput){focusBeforeDialog.focus();}else if(document.activeElement&&document.activeElement.blur){document.activeElement.blur();}}}
    function openDialog(title, ids){
      modalRevision++;focusBeforeDialog=document.activeElement;modalIds=ids.slice(0);powerDialogState=null;setText(dialogTitle,title);dialog.classList.remove('pv2-power-dialog');settings.innerHTML='';
      var key=ids.join('|'),signature='';for(var si=0;si<ids.length;si++){var state=get(ids[si]);signature+=String(C.available(state))+JSON.stringify(C.capabilities(state));}
      var page=dialogCache[key];if(!page||page.signature!==signature){page={content:node('div'),controls:[],signature:signature};modalControls=[];for(var di=0;di<ids.length;di++){buildSettings(ids[di],ids.length>1,page.content);}page.controls=modalControls;dialogCache[key]=page;}else{modalControls=page.controls;}
      for(var ci=0;ci<modalControls.length;ci++){modalControls[ci].editing=false;}settings.appendChild(page.content);syncDialog();modal.classList.add('pv2-open');close.focus();
    }
    function printerJobActive(){return !!cfg.printer&&['running','printing','prepare','pause','paused','slicing'].indexOf(get(cfg.printer.status).state)!==-1;}
    function syncPowerDialog(){var p=powerDialogState;if(!p){return;}if(p.printer&&C.available(get(p.entity))&&((get(p.entity).state==='on')!==p.willOff)){closeDialog();return;}var needs=p.printer&&p.willOff&&printerJobActive();p.row.style.display=needs?'':'none';if(!needs){p.check.checked=false;}p.confirm.disabled=needs&&!p.check.checked;}
    function openPowerDialog(o){
      modalRevision++;focusBeforeDialog=document.activeElement;modalIds=[];modalControls=[];settings.innerHTML='';dialog.classList.add('pv2-power-dialog');
      var willOff=get(o.entity).state==='on';setText(dialogTitle,o.printer?'Yazıcıyı kapat?':o.label);
      var symbol=node('div','pv2-power-symbol');symbol.innerHTML=icon('plug');symbol.setAttribute('aria-hidden','true');settings.appendChild(symbol);
      settings.appendChild(node('p','pv2-power-message',willOff?(o.printer?'Yazıcının elektrik beslemesi kesilecek.':'Cihazın elektrik beslemesi kesilecek.'):'Cihazın elektrik beslemesi açılacak.'));
      settings.appendChild(node('p','pv2-dialog-hint',willOff?'Baskının ve soğutmanın tamamlandığından emin olun.':'Devam etmek için onaylayın.'));
      var actions=node('div','pv2-power-actions'),cancel=node('button','pv2-sound pv2-power-cancel','Vazgeç'),confirm=node('button','pv2-sound pv2-power-confirm',willOff?'Gücü Kapat':'Gücü Aç');cancel.type=confirm.type='button';actions.appendChild(cancel);actions.appendChild(confirm);settings.appendChild(actions);
      var acknowledgement=node('label','pv2-power-ack'),check=node('input');check.type='checkbox';acknowledgement.appendChild(check);acknowledgement.appendChild(node('span','','Devam eden işi yarıda keserek kapatmayı onaylıyorum.'));settings.insertBefore(acknowledgement,actions);
      powerDialogState={entity:o.entity,printer:!!o.printer,willOff:willOff,row:acknowledgement,check:check,confirm:confirm};check.addEventListener('change',syncPowerDialog,false);syncPowerDialog();
      cancel.addEventListener('click',closeDialog,false);
      confirm.addEventListener('click',function(){if(o.printer&&willOff&&printerJobActive()&&!check.checked){syncPowerDialog();return;}if(!connection()||!C.available(get(o.entity))){notice('Cihaza ulaşılamıyor.');return;}if((get(o.entity).state==='on')!==willOff){closeDialog();notice('Cihazın durumu değişti. Lütfen yeniden kontrol edin.');return;}perform('power:'+o.entity,'switch',willOff?'turn_off':'turn_on',o.entity,null,closeDialog);},false);
      modal.classList.add('pv2-open');cancel.focus();
    }
    function openPanelSettings(){
      modalRevision++;focusBeforeDialog=document.activeElement;modalIds=[];modalControls=[];powerDialogState=null;setText(dialogTitle,'Panel Ayarları');dialog.classList.remove('pv2-power-dialog');settings.innerHTML='';
      function preference(title,hint,control){var row=node('div','pv2-preference'),description=node('div');description.appendChild(node('h3','',title));var hintNode=node('p','pv2-dialog-hint',hint);description.appendChild(hintNode);row.appendChild(description);row.appendChild(control);settings.appendChild(row);return hintNode;}
      var audioActions=node('div','pv2-audio-actions'),testAudio=node('button','pv2-sound pv2-sound-test','Sesi Dene');testAudio.type='button';audioActions.appendChild(sound);audioActions.appendChild(testAudio);audioStatus=preference('Tıklama sesi','Hafif dokunma sesi. Tabletin medya sesi açık olmalı.',audioActions);audioStatus.classList.add('pv2-audio-status');audioStatus.setAttribute('role','status');
      var delays=node('div','pv2-delay-options');
      [{label:'Hızlı',ms:250},{label:'Normal',ms:500},{label:'Uzun',ms:800}].forEach(function(p){var b=node('button','pv2-delay',p.label);b.type='button';b.setAttribute('aria-pressed',holdDelay===p.ms?'true':'false');b.addEventListener('click',function(){holdDelay=p.ms;try{localStorage.setItem(preferencePrefix+'hold-ms',String(holdDelay));}catch(ignore){}var all=delays.querySelectorAll('button');for(var i=0;i<all.length;i++){all[i].setAttribute('aria-pressed',all[i]===b?'true':'false');}},false);delays.appendChild(b);});
      preference('Uzun basma','Lamba ayarlarının açılma süresi. Pil simgesini etkilemez.',delays);
      if(officeProfile){var navKeys=node('button','pv2-sound','Alt Tuşlar');navKeys.type='button';navKeys.addEventListener('click',function(){window.location.href='officepanel://navigation';},false);preference('Fiziksel tuşlar','Samsung uygulamasında Ana Ekran, Geri ve Son Uygulamalar kilidini yönetin.',navKeys);}
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
      if(o.kind==='navigate'){detail='Odalar · Mutfak · Giriş';disabled=false;}
      else if(o.kind==='printer'){
        var printer=cfg.printer||{},state=get(printer.status),progress=get(printer.progress),remaining=get(printer.remaining),value=Number(progress.state),minutes=Number(remaining.state);
        var timeUnit=remaining.attributes.unit_of_measurement;if(timeUnit==='h'){minutes*=60;}else if(timeUnit==='s'){minutes/=60;}
        var printerOnline=printerDataReady();
        var printing=printerOnline&&['running','printing','prepare','paused','pause','slicing'].indexOf(state.state)!==-1;
        var printerNames={offline:'Çevrimdışı',idle:'Hazır',running:'Yazdırılıyor',printing:'Yazdırılıyor',prepare:'Hazırlanıyor',paused:'Duraklatıldı',pause:'Duraklatıldı',finish:'Tamamlandı',finished:'Tamamlandı',failed:'Baskı hatası'};
        label=printer.label||'3D Yazıcı';disabled=false;on=printing;
        detail=!connection()?'Bağlantı yok':printerStatusLabel(state);
        var validProgress=C.available(progress)&&progress.state!==''&&isFinite(value)&&value>=0&&value<=100;
        if(printing&&validProgress&&!officeProfile){detail+=' · '+Math.round(value)+'%';}
        var validRemaining=C.available(remaining)&&remaining.state!==''&&isFinite(minutes)&&minutes>=0;
        if(printing&&validRemaining&&!officeProfile){detail+=' · '+(minutes>0?Math.ceil(minutes):'<1')+' dk';}
        var bar=b.querySelector('.pv2-print-track');if(bar){bar.style.display=printing&&validProgress&&!(officeProfile&&cfg.agenda)?'block':'none';bar.firstChild.style.width=(printing&&validProgress?value:0)+'%';}
        var summaryPercentNode=b.querySelector('.pv2-summary-percent'),showPercent=officeProfile&&printing&&validProgress;
        if(summaryPercentNode){setText(summaryPercentNode,showPercent?Math.round(value)+'%':'');summaryPercentNode.style.display=showPercent?'block':'none';}
        var summaryRemainingNode=b.querySelector('.pv2-summary-remaining'),showRemaining=officeProfile&&printing&&validRemaining,remainingText=showRemaining?(minutes>0?Math.ceil(minutes):'<1')+'dk':'';
        if(summaryRemainingNode){setText(summaryRemainingNode.lastChild,remainingText);summaryRemainingNode.style.display=showRemaining?'block':'none';}
        b.setAttribute('data-printer-remaining',showRemaining?(minutes>0?Math.ceil(minutes):'<1')+' dk':'');
        b.classList.toggle('pv2-has-summary-footer',showPercent||showRemaining);
        b.classList.toggle('pv2-has-percent',showPercent);
        var displayState=printerDisplayState(state);
        var accent=!connection()?'offline':printerShutdown?'off':printerStartup?'starting':printer.power&&get(printer.power).state==='off'?'off':!printerOnline?'offline':['failed','error'].indexOf(displayState)!==-1?'error':['pause','paused'].indexOf(displayState)!==-1?'paused':['prepare','slicing'].indexOf(displayState)!==-1?'starting':['running','printing'].indexOf(displayState)!==-1?'printing':['finish','finished'].indexOf(displayState)!==-1?'done':displayState==='idle'?'ready':'offline';
        ['off','offline','ready','starting','printing','paused','error','done'].forEach(function(name){b.classList.toggle('pv2-printer-state-'+name,accent===name);});
        b.setAttribute('data-printer-progress',showPercent?String(Math.round(value)):'');
      }
      else if(o.kind==='printer-status'){
        var printerState=get(o.entity),printerPower=cfg.printer&&cfg.printer.power?get(cfg.printer.power):null;
        var statusLabels={offline:'Çevrimdışı',idle:'Hazır',running:'Yazdırılıyor',prepare:'Hazırlanıyor',pause:'Duraklatıldı',finish:'Tamamlandı',failed:'Baskı hatası'};
        detail=printerStatusLabel(printerState);
        disabled=disabled||!printerPower||!C.available(printerPower);key='power:'+(cfg.printer&&cfg.printer.power);on=printerDataReady()&&printerJobActive();
      }
      else if(o.kind==='power'||o.kind==='sensor'){
        var device=get(o.entity);unavailable=!C.available(device);if(o.kind==='sensor'&&cfg.printer&&[cfg.printer.progress,cfg.printer.remaining,cfg.printer.nozzle,cfg.printer.bed].indexOf(o.entity)!==-1&&(!printerDataReady()||o.entity===cfg.printer.progress&&!printerJobActive())){unavailable=true;}key='power:'+o.entity;on=device.state==='on';
        if(unavailable){detail=cfg.printer&&[cfg.printer.progress,cfg.printer.remaining,cfg.printer.nozzle,cfg.printer.bed].indexOf(o.entity)!==-1?'—':'Veri yok';}else if(o.kind==='power'){detail=on?'Güç açık':'Güç kapalı';}else{var statusNames={offline:'Çevrimdışı',idle:'Hazır',running:'Yazdırılıyor',pause:'Duraklatıldı',finish:'Tamamlandı',failed:'Hata'};detail=statusNames[device.state]||device.state;var unit=device.attributes.unit_of_measurement;if(unit){detail+=' '+({min:'dk',h:'sa',s:'sn'}[unit]||unit);}}
        if(cfg.printer&&o.entity===cfg.printer.progress){var fill=b.querySelector('.pv2-card-progress-fill'),percent=Number(device.state),validPercent=!unavailable&&device.state!==''&&isFinite(percent)&&percent>=0&&percent<=100;if(fill){fill.style.width=(validPercent?percent:0)+'%';}if(validPercent){b.setAttribute('aria-valuenow',String(percent));}else{b.removeAttribute('aria-valuenow');}}
        disabled=disabled||unavailable||o.kind==='sensor';
      }
      else if(o.kind&&o.kind.indexOf('vacuum-')===0){var action=C.robotControl(get(cfg.vacuum),o.kind.slice(7));label=action.label;detail=action.detail;disabled=disabled||!action.service||!!busy.robot;unavailable=!C.available(get(cfg.vacuum));key='vacuum';}
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
      b.setAttribute('aria-label',label+' · '+detail+(o.kind==='printer'&&b.getAttribute('data-printer-progress')?' · Baskı '+b.getAttribute('data-printer-progress')+'%':'')+(o.kind==='printer'&&b.getAttribute('data-printer-remaining')?' · Kalan süre '+b.getAttribute('data-printer-remaining'):''));if(o.ids){b.setAttribute('aria-pressed',on?'true':'false');b.title=o.kind==='roomoff'?'Dokun: oda ışıklarını kapat':'Dokun: aç/kapat · Uzun bas: lamba ayarları';}
    }
    var conditions={'clear-night':'Açık gece','cloudy':'Bulutlu','exceptional':'Olağan dışı','fog':'Sisli','hail':'Dolu','lightning':'Şimşekli','lightning-rainy':'Gök gürültülü','partlycloudy':'Parçalı bulutlu','pouring':'Sağanak','rainy':'Yağmurlu','snowy':'Karlı','snowy-rainy':'Karla karışık','sunny':'Güneşli','windy':'Rüzgârlı','windy-variant':'Rüzgârlı'};
    function upcomingAgendaEvents(day,now){
      var all=day&&Object.prototype.toString.call(day.events)==='[object Array]'?day.events:[],items=[];
      for(var i=0;i<all.length;i++){var e=all[i];if(e&&typeof e.title==='string'&&isFinite(e.start)&&isFinite(e.end)&&Number(e.end)>now&&Number(e.start)<Number(e.end)){items.push(e);}}
      items.sort(function(x,y){return Number(x.start)-Number(y.start);});return items;
    }
    function automaticAgendaDay(days,now){
      for(var i=0;i<days.length;i++){if(upcomingAgendaEvents(days[i],now).length){return i;}}
      return 0;
    }
    function renderAgenda(){
      if(!agendaBox){return;}
      var now=new Date().getTime()/1000,entry=get(cfg.agenda),a=entry.attributes||{},fresh=connection()&&C.available(entry)&&Number(a.valid_until)>now&&Number(a.valid_until)<=now+100;
      var supplied=Object.prototype.toString.call(a.days)==='[object Array]'?a.days:[],days=supplied.length===3?supplied:[{day_start:a.day_start,events:a.events}],base=Number(a.day_start);
      if(agendaBaseDay!==base){agendaBaseDay=base;agendaSelected=0;agendaManual=false;}
      if(agendaSelected>=days.length){agendaSelected=0;agendaManual=false;}
      if(fresh&&!agendaManual){agendaSelected=automaticAgendaDay(days,now);}
      var selected=days[agendaSelected]||{},items=fresh?upcomingAgendaEvents(selected,now):[],day=Number(selected.day_start),d=new Date(day*1000),weekdays=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'],today=new Date(),sameDay=d.getFullYear()===today.getFullYear()&&d.getMonth()===today.getMonth()&&d.getDate()===today.getDate();
      var signature=JSON.stringify([fresh,days.map(function(v){return v.day_start;}),agendaSelected,items.map(function(e){return [e.title,e.start,e.end,Number(e.start)<=now];})]);if(signature===agendaSignature){return;}agendaSignature=signature;
      while(agendaHeading.firstChild){agendaHeading.removeChild(agendaHeading.firstChild);}
      for(var di=0;di<days.length;di++){
        (function(index){var date=new Date(Number(days[index].day_start)*1000),isToday=date.getFullYear()===today.getFullYear()&&date.getMonth()===today.getMonth()&&date.getDate()===today.getDate(),label=isToday?'Bugün':weekdays[date.getDay()]||'Takvim',tab=node('button','pv2-agenda-day',label);tab.type='button';tab.setAttribute('role','tab');tab.setAttribute('aria-selected',index===agendaSelected?'true':'false');tab.setAttribute('aria-controls','pv2-agenda-events');tab.disabled=!fresh;C.bindPress(tab,function(){if(!fresh){return;}agendaSelected=index;agendaManual=true;agendaSignature=null;renderAgenda();},null);agendaHeading.appendChild(tab);})(di);
      }
      agendaList.id='pv2-agenda-events';agendaList.setAttribute('role','tabpanel');agendaList.setAttribute('aria-label',fresh?(sameDay?'Bugün':weekdays[d.getDay()]):'Takvim');
      while(agendaList.firstChild){agendaList.removeChild(agendaList.firstChild);}
      if(!fresh||!items.length){agendaList.appendChild(node('p','pv2-agenda-empty',!fresh?'Takvim güncellenemiyor':sameDay?'Bugün başka toplantı yok':'Bu iş günü için toplantı yok'));return;}
      var limit=agendaBox.clientHeight>=160?3:2;
      for(var aj=0;aj<Math.min(items.length,limit);aj++){
        var event=items[aj],row=node('div','pv2-agenda-event'),times=node('span','pv2-agenda-time'),title=node('span','pv2-agenda-title',event.title.slice(0,160));
        function timeText(epoch){var t=new Date(Number(epoch)*1000);return ('0'+t.getHours()).slice(-2)+':'+('0'+t.getMinutes()).slice(-2);}
        setText(times,timeText(event.start)+'–'+timeText(event.end));row.classList.toggle('pv2-agenda-current',Number(event.start)<=now);row.appendChild(times);row.appendChild(title);agendaList.appendChild(row);
      }
      if(items.length>limit){agendaList.setAttribute('aria-label',agendaList.getAttribute('aria-label')+' · '+(items.length-limit)+' toplantı daha');}
    }
    function forecastIcon(condition){
      var sun='<circle cx="12" cy="12" r="4" fill="#f6cb73" stroke="#f6cb73"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" stroke="#f6cb73"/>',cloud='<path d="M6 17a4 4 0 0 1 0-8 6 6 0 0 1 11-1 5 5 0 0 1 1 10H6" fill="#acc9df" stroke="#cce2f2"/>';
      var content=cloud;
      if(condition==='sunny'){content=sun;}else if(condition==='partlycloudy'){content='<g transform="translate(-2 -3) scale(.8)">'+sun+'</g>'+cloud;}
      else if(condition==='clear-night'){content='<path d="M19 15A8 8 0 0 1 9 4a8 8 0 1 0 10 11" fill="#d5d9f5" stroke="#e8eaff"/>';}
      else if(/lightning/.test(condition)){content=cloud+'<path d="m13 13-4 6h4l-2 4 7-7h-5l2-3" fill="#f6cb73" stroke="#f6cb73"/>';}
      else if(/snow/.test(condition)){content=cloud+'<path d="M6 21h2m-1-1v2m5-1h2m-1-1v2m5-1h2m-1-1v2" stroke="#d4edff"/>';}
      else if(/rain|pouring|hail/.test(condition)){content=cloud+'<path d="m7 20-1 3m7-3-1 3m7-3-1 3" stroke="#7ec9ff"/>';}
      else if(condition==='fog'){content=cloud+'<path d="M3 20h18M6 23h12" stroke="#a7c4da"/>';}
      else if(/windy/.test(condition)){content='<path d="M2 8h15a3 3 0 1 0-3-3M2 13h18M2 18h12a3 3 0 1 1-3 3" stroke="#b9dde9"/>';}
      else if(!condition||!conditions[condition]){content='<path d="M8 12h8" stroke="#8b9bad"/>';}
      return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+content+'</svg>';
    }
    function renderForecast(){
      if(!forecastBox){return;}
      var now=new Date().getTime(),fresh=connection()&&forecastAt>0&&now-forecastAt<3600000,usable=forecastAt>0&&forecastAt<=now+300000&&now-forecastAt<=604800000,rows=C.forecastDays(usable?forecastRows:[],now,cfg.forecastDays),count=0;
      for(var i=0;i<rows.length;i++){if(rows[i].high!==null){count++;}}
      var note=usable&&!fresh?'En yüksek / en düşük':!connection()?'Bağlantı yok':!fresh?(forecastPending?'Yükleniyor…':'Tahmin alınamadı'):count<rows.length?'Eksik günler: —':'En yüksek / en düşük';
      var signature=JSON.stringify([fresh,rows,note]);if(signature===forecastSignature){return;}forecastSignature=signature;setText(forecastNote,note);
      while(forecastList.firstChild){forecastList.removeChild(forecastList.firstChild);}
      var labels=['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
      for(var j=0;j<rows.length;j++){
        var day=rows[j],cell=node('div','pv2-forecast-day'+(j===0?' pv2-forecast-today':'')),symbol=node('span','pv2-forecast-icon'),high=day.high===null?'—':day.high+'°',low=day.low===null?'—':day.low+'°';
        cell.style.width=(100/rows.length)+'%';cell.appendChild(node('span','pv2-forecast-weekday',j===0?'Bugün':labels[day.day]));symbol.innerHTML=forecastIcon(day.condition);cell.appendChild(symbol);cell.appendChild(node('span','pv2-forecast-high',high));cell.appendChild(node('span','pv2-forecast-low',low));
        cell.setAttribute('aria-label',(j===0?'Bugün':labels[day.day])+': '+(day.high===null?'Tahmin yok':(conditions[day.condition]||'Hava tahmini')+', en yüksek '+high+', en düşük '+low));forecastList.appendChild(cell);
      }
    }
    function requestForecast(){
      if(!cfg.weather||forecastPending||!connection()||document.hidden||activeView()!=='Ana'){return;}
      var now=new Date().getTime();if(now-forecastAttempt<60000||forecastAt&&now>=forecastAt&&now-forecastAt<1800000){return;}
      forecastAttempt=now;forecastPending=true;renderForecast();
      var xhr=new XMLHttpRequest(),finished=false;
      function finish(ok){if(finished){return;}finished=true;forecastPending=false;if(ok){try{var body=JSON.parse(xhr.responseText),entry=body.service_response&&body.service_response[cfg.weather];if(entry&&Object.prototype.toString.call(entry.forecast)==='[object Array]'&&entry.forecast.length){forecastRows=entry.forecast.slice(0,14).map(function(row){return {datetime:row.datetime,condition:row.condition,temperature:row.temperature,templow:row.templow,apparent_temperature:row.apparent_temperature};});forecastAt=new Date().getTime();saveWeather();}}catch(ignore){}}renderForecast();scheduleRender();}
      xhr.open('POST','/api/proxy/api/services/weather/get_forecasts?return_response',true);xhr.setRequestHeader('Content-Type','application/json');xhr.timeout=15000;
      xhr.onload=function(){finish(xhr.status>=200&&xhr.status<300);};xhr.onerror=xhr.ontimeout=xhr.onabort=function(){finish(false);};xhr.send(JSON.stringify({entity_id:cfg.weather,type:'daily'}));
    }
    var feelsAttempt=new Date().getTime(),feelsPending=false;
    // Recover a missed attribute update without polling the weather provider or
    // rebuilding every widget. Both panels read the same single HA sensor.
    function requestFeelsLike(){
      var now=new Date().getTime();if(!cfg.outdoorFeelsLike||!connection()||feelsPending||now-feelsAttempt<60000){return;}
      feelsAttempt=now;feelsPending=true;var generation=connectionGeneration,version=versions[cfg.outdoorFeelsLike]||0,expired=false;
      var timeout=setTimeout(function(){expired=true;feelsPending=false;scheduleRender();},15000);
      window.goFetch('/api/proxy/api/states/'+encodeURIComponent(cfg.outdoorFeelsLike)+'?panel_feels='+now,function(error,entry){
        if(expired){return;}clearTimeout(timeout);feelsPending=false;
        if(!error&&connection()&&generation===connectionGeneration&&entry&&entry.entity_id===cfg.outdoorFeelsLike){
          var incoming=Number((entry.attributes||{}).time)||0,current=Number(get(cfg.outdoorFeelsLike).attributes.time)||0;
          if((!C.available(entry)&&(versions[cfg.outdoorFeelsLike]||0)===version)||(C.available(entry)&&incoming>=current)){cache[cfg.outdoorFeelsLike]={state:entry.state,attributes:entry.attributes||{}};}
        }
        scheduleRender();
      });
    }
    function updateMeeting(v){var entry=get(cfg.meeting),age=new Date().getTime()/1000-Number(entry.attributes.last_report_epoch||0);v.meeting.classList.toggle('pv2-active',v.name==='Ana'&&connection()&&entry.state==='on'&&age>=-5&&age<40);}
    function render(){
      renderAgenda();renderForecast();syncDialog();syncPowerDialog();syncPrinterCamera();renderPrinterDetails();var active=activeView();
      for(var i=0;i<cards.length;i++){if(cards[i].view===active){drawCard(cards[i]);}}
      var nowWeather=new Date().getTime(),entry=get(cfg.weather),currentWeather=weatherObservation(entry,'weather',nowWeather),currentFeels=weatherObservation(get(cfg.outdoorFeelsLike),'feels',nowWeather);
      var shownWeather=C.weatherReading(currentWeather,weatherMemory.weather,forecastRows,forecastAt,nowWeather,false),shownFeels=C.weatherReading(currentFeels,weatherMemory.feels,forecastRows,forecastAt,nowWeather,true),t=shownWeather.value,valid=t!==null;
      var weatherName=shownWeather.condition==='sunny'?'sun':shownWeather.condition==='clear-night'?'moon':(/rain|pouring|hail|snow/.test(shownWeather.condition)?'rain':'cloud');
      for(var vi=0;vi<views.length;vi++){var v=views[vi];if(v.name!==active){continue;}
        setText(v.status,connection()?'● Home Assistant':'○ Bağlantı yok');v.status.title=connection()?'Home Assistant bağlantısı açık':'Home Assistant bağlantısı kesildi';v.status.setAttribute('aria-label',v.status.title);v.status.style.color=connection()?'#9fd8c2':'#ffb4b4';
        if(v.indoor){var inside=get(cfg.indoorTemperature),insideValue=inside.state,insideValid=connection()&&C.available(inside)&&insideValue!==''&&isFinite(Number(insideValue));setQuantity(v.indoor,insideValid?String(Math.round(Number(insideValue)*10)/10).replace('.',','):'—','°');v.indoor.parentNode.setAttribute('aria-label',(cfg.indoorLabel||'Ev içi sıcaklık')+': '+(insideValid?insideValue+' '+(inside.attributes.unit_of_measurement||'°C'):'veri yok'));}
        if(v.humidity){var humidityEntry=get(cfg.indoorHumidity),humidityNumber=Number(humidityEntry.state),humidityValid=connection()&&C.available(humidityEntry)&&humidityEntry.state!==''&&isFinite(humidityNumber)&&humidityNumber>=0&&humidityNumber<=100;setQuantity(v.humidity,humidityValid?String(Math.round(humidityNumber*10)/10).replace('.',','):'—','%',v.humidityIcon);v.humidity.parentNode.setAttribute('aria-label','Ev içi nem: '+(humidityValid?humidityNumber+'%':'veri yok'));}
        if(v.feels){var feltValid=shownFeels.value!==null;setQuantity(v.feels,feltValid?String(Math.round(shownFeels.value*10)/10).replace('.',','):'—',feltValid?'°':'',v.feelsIcon);v.feels.parentNode.setAttribute('aria-label','Dışarı hissedilen sıcaklık: '+(feltValid?shownFeels.value+' °C':'veri yok')+(shownFeels.source==='last'?' · Son bilinen':shownFeels.source==='forecast'?' · Günlük tahmin':''));v.feels.parentNode.title=shownFeels.source==='last'?'Bugünün son bilinen hissedilen sıcaklığı':shownFeels.source==='forecast'?'Bugünün tahmini hissedilen sıcaklığı':'Dışarı hissedilen sıcaklık';}
        setQuantity(v.temperature,valid?String(Math.round(Number(t)*10)/10).replace('.',','):'--','°');setText(v.condition,valid?(conditions[shownWeather.condition]||'Hava durumu'):!connection()?'Bağlantı yok':'Veri yok');
        v.temperature.parentNode.title=shownWeather.source==='forecast'?'Bugünün tahmini en yüksek sıcaklığı':shownWeather.source==='last'?'Bugünün son bilinen sıcaklığı':'Dış sıcaklık';

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
      var ids = cfg.allLights.concat(cfg.extraLights || [], [cfg.weather,cfg.vacuum,cfg.countdown,cfg.meeting].concat(cfg.agenda?[cfg.agenda]:[],cfg.indoorTemperature?[cfg.indoorTemperature]:[],cfg.indoorHumidity?[cfg.indoorHumidity]:[],cfg.outdoorFeelsLike?[cfg.outdoorFeelsLike]:[]),(cfg.otherControls||[]).map(function(o){return o.entity;}),cfg.printer?[cfg.printer.status,cfg.printer.progress,cfg.printer.remaining].concat(cfg.printer.power?[cfg.printer.power]:[],cfg.printer.camera?[cfg.printer.camera]:[],cfg.printer.nozzle?[cfg.printer.nozzle]:[],cfg.printer.bed?[cfg.printer.bed]:[],cfg.printer.stage?[cfg.printer.stage]:[],cfg.printer.printError?[cfg.printer.printError]:[],cfg.printer.hmsErrors?[cfg.printer.hmsErrors]:[],(cfg.printer.filaments||[]).map(function(s){return s.entity;})):[]);
      var unique = [], index = 0;
      ids.forEach(function(id){if(unique.indexOf(id)===-1 && listeners[id]){unique.push(id);}});
      function next(){
        if(generation!==connectionGeneration || !connection() || index>=unique.length){return;}
        var id=unique[index++], version=versions[id] || 0;
        window.goFetch('/api/proxy/api/states/'+encodeURIComponent(id)+'?panel_snapshot='+new Date().getTime(),function(error,entry){
          if(!error && generation===connectionGeneration && (versions[id]||0)===version && entry && entry.entity_id===id){
            cache[id]={state:entry.state,attributes:entry.attributes || {}};if(cfg.printer&&id===cfg.printer.power){syncPrinterPower(entry.state);}scheduleRender();
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
        callbacks.push(function(state,attrs){versions[id]=(versions[id]||0)+1;cache[id]=C.merge(get(id),state,attrs||{});if(cfg.printer&&id===cfg.printer.power&&state!==undefined){syncPrinterPower(state);}if(printerStartup&&cfg.printer&&id===cfg.printer.status&&state!==undefined){checkPrinterStartup();}scheduleRender();if(snapshotNeeded){snapshotNeeded=false;var generation=connectionGeneration;setTimeout(function(){if(generation===connectionGeneration){reconcileSnapshot(generation);}},0);}for(var i=0;i<old.length;i++){if(old[i]){try{old[i](cache[id].state,cache[id].attributes);}catch(ignore){/* Isolate legacy widget failures. */}}}});
      })(eid,listeners[eid]);
    }}
    var days=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
    function clockTick(){var weatherMinute=Math.floor(new Date().getTime()/60000);if(weatherDay!==weatherMinute){weatherDay=weatherMinute;scheduleRender();}requestPrinterFailureState();requestFeelsLike();renderAgenda();renderForecast();requestForecast();var now=new Date(),active=activeView();function pad(n){return ('0'+n).slice(-2);}for(var vi=0;vi<views.length;vi++){var v=views[vi];if(v.name!==active){continue;}setText(v.clock,pad(now.getHours())+':'+pad(now.getMinutes()));setText(v.date,pad(now.getDate())+'.'+pad(now.getMonth()+1)+'.'+now.getFullYear());setText(v.weekday,days[now.getDay()]);updateMeeting(v);}if(get(cfg.countdown).state==='on'){for(var ci=0;ci<cards.length;ci++){if(cards[ci].view===active&&cards[ci].options.kind==='alloff'){drawCard(cards[ci]);}}}if(lastConnection!==connection()){lastConnection=connection();scheduleRender();}}
    function navigated(){for(var pi=0;pi<cards.length;pi++){if(cards[pi].tapTimer!==null){clearTimeout(cards[pi].tapTimer);cards[pi].tapTimer=null;}}closeDialog();clockTick();render();}
    window.addEventListener('hashchange',navigated,false);
    window.addEventListener('screen-navigate',navigated,false);
    function resetAgendaDay(){agendaSelected=0;agendaManual=false;agendaSignature=null;renderAgenda();}
    window.addEventListener('panel-display-dark',function(){
      resetAgendaDay();
      if(officeProfile){closeDialog();if(activeView()!=='Ana'){navigateScreen('Ana');}syncPrinterCamera();}
    },false);
    document.addEventListener('visibilitychange',function(){if(document.hidden){resetAgendaDay();closeDialog();}syncPrinterCamera();},false);
    clockTick();render();setInterval(clockTick,1000);
    clearTimeout(window.panelV2LoadingTimer);document.documentElement.classList.remove('pv2-loading');
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',ready,false);}else{ready();}
})();
