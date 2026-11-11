/* Browser application: ES5, no framework; bounded read-only data recovery. Configuration is injected separately. */
(function () {
  function ready() {
    var cfg = window.PANEL_V2_CONFIG, C = window.PanelV2Core;
    var officeProfile=!!cfg&&cfg.profile==='office';
    var preferencePrefix=officeProfile?'panel-office-':'panel-v2-';
    var home = document.getElementById('screen-Ana');
    if (!cfg || !C || !home || document.getElementById('panel-v2')) { return; }
    var cards = [];
    var printerCamera=null,powerDialogState=null,printerDetails=null;
    var renderQueued=false,lastConnection=null;
    var ha = window.PanelV2HomeAssistant.create(window, C, cfg, entityChanged);
    var get = ha.get, connection = ha.connected;
    function startTimer(callback, delay) { return window.setTimeout(callback, delay); }
    function stopTimer(timer) { window.clearTimeout(timer); }
    var controlsModel = window.PanelV2Controls.create(C, cfg, ha, {
      now: function () { return new Date().getTime(); },
      all: function (requests) { return Promise.all(requests); },
      changed: scheduleRender,
      setTimeout: startTimer,
      clearTimeout: stopTimer,
      notice: function (code) {
        notice({
          commandFailed: 'İşlem gerçekleştirilemedi. Bağlantıyı kontrol edin.',
          lightUnavailable: 'Lambaya ulaşılamıyor.',
          someLightsFailed: 'Bazı lambalar açılamadı. Bağlantıyı kontrol edin.',
          countdownUnavailable: 'Geri sayım servisine ulaşılamıyor.'
        }[code]);
      }
    });
    var agendaModel = officeProfile && cfg.agenda ? window.PanelV2Agenda.create(C, ha, cfg.agenda) : null;
    var printerModel = cfg.printer && window.PanelV2Printer ? window.PanelV2Printer.create(C, ha, cfg.printer, {
      now: function () { return new Date().getTime(); },
      setTimeout: startTimer,
      clearTimeout: stopTimer,
      changed: scheduleRender,
      perform: controlsModel.perform,
      powerUnavailable: function () { notice('Yazıcı prizinin durumu doğrulanamadı.'); },
      confirmPower: function (id) { openPowerDialog({label:'Yazıcıyı kapat?',entity:id,printer:true}); }
    }) : null;
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
    function notice(text) { var el = document.getElementById('pv2-notice'); setText(el,text); el.style.display='block'; clearTimeout(noticeTimer); noticeTimer=setTimeout(function(){el.style.display='none';},5000); }
    function perform(key, domain, service, ids, data, onSuccess) {
      if (printerModel && domain === 'switch' && ids === cfg.printer.power) {
        printerModel.performPower(service, onSuccess);
      } else {
        controlsModel.perform(key, domain, service, ids, data, onSuccess);
      }
    }
    function printerStatusLabel(code) {
      var names = {
        disconnected:'Bağlantı yok', 'shutting-down':'Kapatılıyor…', starting:'Açılıyor…',
        off:'Kapalı', 'power-unknown':'Güç durumu bilinmiyor', offline:'Çevrimdışı', idle:'Hazır',
        running:'Yazdırılıyor', printing:'Yazdırılıyor', prepare:'Hazırlanıyor', pause:'Duraklatıldı',
        paused:'Duraklatıldı', slicing:'Hazırlanıyor', finish:'Tamamlandı', finished:'Tamamlandı', failed:'Baskı hatası'
      };
      return names[code] || 'Veri bekleniyor';
    }
    var quickDim = null;
    function closeQuickDim() {
      if (!quickDim) { return; }
      if (quickDim.parentNode) { quickDim.parentNode.removeChild(quickDim); }
      quickDim = null;
    }
    function openQuickDim(title, ids, x, y) {
      if (!connection()) { return; }
      var targets = controlsModel.dimmableLights(ids);
      if (!targets.length) { return; }
      closeQuickDim();
      var initial = controlsModel.groupBrightness(targets), value = initial;
      var popup = node('div','pv2-quick-dim');
      var heading = node('div','pv2-quick-dim-heading');
      var output = node('span','pv2-quick-dim-value');
      var track = node('div','pv2-quick-dim-track');
      var fill = node('div','pv2-quick-dim-fill');
      heading.appendChild(node('span','',title));
      heading.appendChild(output);
      track.appendChild(fill);
      popup.appendChild(heading);
      popup.appendChild(track);
      popup.setAttribute('aria-hidden','true');
      document.body.appendChild(popup);
      quickDim = popup;
      var width = popup.offsetWidth, height = popup.offsetHeight;
      var startTrack = track.getBoundingClientRect(), startPopup = popup.getBoundingClientRect();
      var anchor = startTrack.left-startPopup.left+startTrack.width*initial/100;
      popup.style.left = Math.max(8, Math.min(window.innerWidth-width-8, x-anchor))+'px';
      popup.style.top = Math.max(8, Math.min(window.innerHeight-height-8, y-height+22))+'px';
      var trackBounds = track.getBoundingClientRect();
      function draw() { fill.style.width=value+'%';setText(output,value+'%'); }
      draw();
      return {
        move:function(currentX){
          if(quickDim!==popup||!connection()){return;}
          var delta=currentX-x;
          if(Math.abs(delta)<5&&value===initial){return;}
          var travel=trackBounds.width?Math.max(12,delta<0?x-trackBounds.left:trackBounds.right-x):150;
          var range=delta<0?initial:100-initial;
          var next=Math.max(0,Math.min(100,Math.round(initial+delta/travel*range)));
          if(next===value){return;}
          value=next;
          draw();
          controlsModel.setGroupBrightness(targets,value);
        },
        end:function(){if(quickDim===popup){closeQuickDim();}}
      };
    }
    function addCard(parent, options, legacy) {
      var b=node('button','pv2-card'+(options.action?' pv2-action':'')+(legacy?' pv2-legacy-light':'')); b.type='button';if(options.kind==='sensor'){b.classList.add('pv2-readonly');}if(options.kind==='sensor'&&cfg.printer&&options.entity===cfg.printer.progress){b.classList.add('pv2-print-progress-card');var progressFill=node('span','pv2-card-progress-fill');progressFill.setAttribute('aria-hidden','true');b.appendChild(progressFill);b.setAttribute('role','progressbar');b.setAttribute('aria-valuemin','0');b.setAttribute('aria-valuemax','100');}
      if(b.classList.contains('pv2-print-progress-card')){var cardIcon=node('span','pv2-card-icon');cardIcon.innerHTML=icon(options.icon);b.appendChild(cardIcon);}else{b.innerHTML=icon(options.icon);}
      var text=node('span','pv2-card-text'), label=node('span','pv2-card-label',options.label), state=node('span','pv2-card-state','Yükleniyor…');
      text.appendChild(label);text.appendChild(state);b.appendChild(text);if(options.kind==='printer'){b.classList.add('pv2-printer-summary');var track=node('span','pv2-print-track'),fill=node('span','pv2-print-fill');track.setAttribute('aria-hidden','true');track.appendChild(fill);text.appendChild(track);var summaryPercent=node('span','pv2-summary-percent');summaryPercent.setAttribute('aria-hidden','true');b.appendChild(summaryPercent);var summaryRemaining=node('span','pv2-summary-remaining');summaryRemaining.style.display='none';summaryRemaining.setAttribute('aria-hidden','true');summaryRemaining.appendChild(node('span','pv2-summary-remaining-label','Kalan:'));summaryRemaining.appendChild(node('span','pv2-summary-remaining-value'));b.appendChild(summaryRemaining);}parent.appendChild(b);
      var lightCard=!!options.ids;
      var roomOff=options.kind==='roomoff';
      var settingsLabel=roomOff?'Oda ışıkları':options.label;
      var singleLight=lightCard&&!roomOff&&options.ids.length===1?options.ids[0]:null;
      var lightFill=null;
      if(singleLight){
        lightFill=node('span','pv2-light-fill');
        lightFill.setAttribute('aria-hidden','true');
        b.insertBefore(lightFill,b.firstChild);
      }
      var item={tapTimer:null,button:b,label:label,status:state,options:options,lightId:singleLight,lightFill:lightFill,icon:b.querySelector('svg'),view:parent.getAttribute('data-pv2-screen')};cards.push(item);
      function printerPress(){if(!cfg.printer||!cfg.printer.power){if(options.kind==='printer'){navigateScreen(options.destination||'Diğer');}return;}if(item.tapTimer!==null){clearTimeout(item.tapTimer);item.tapTimer=null;printerModel.checkPower();return;}item.tapTimer=setTimeout(function(){item.tapTimer=null;if(options.kind==='printer'){navigateScreen(options.destination||'Diğer');}},350);}
      function cancelTap(){
        if(item.tapTimer!==null){clearTimeout(item.tapTimer);item.tapTimer=null;}
      }
      function lightPress(){
        if(item.tapTimer!==null){
          cancelTap();
          openDialog(settingsLabel,options.ids);
          return;
        }
        item.tapTimer=setTimeout(function(){
          item.tapTimer=null;
          if(!b.disabled&&connection()){
            if(roomOff){controlsModel.turnLightsOff(options.ids);}
            else{controlsModel.toggleLights(options.ids);}
          }
        },300);
      }
      C.bindPress(b,function(){
        if (b.disabled) { return; }
        if (options.kind==='robot') { controlsModel.controlRobot(); }
        else if(options.kind==='alloff'){controlsModel.toggleCountdown();}
        else if(options.kind==='printer'||options.kind==='printer-status'){printerPress();}
        else if(options.kind==='navigate'){navigateScreen(options.destination||'Diğer');}
        else if(options.kind==='power'){if(options.confirmOffOnly&&get(options.entity).state==='off'){perform('power:'+options.entity,'switch','turn_on',options.entity);}else{openPowerDialog(options);}}
        else if(options.kind&&options.kind.indexOf('vacuum-')===0){controlsModel.controlRobot(options.kind.slice(7));}
        else if(lightCard){lightPress();}
        else{controlsModel.toggleLights(options.ids);}
      },options.ids?function(x,y){
        cancelTap();
        if(b.disabled){return;}
        if(lightCard){return openQuickDim(settingsLabel,options.ids,x,y);}
        openDialog(settingsLabel,options.ids);
      }:null,null,function(){return holdDelay;});
      if(lightCard){
        b.addEventListener('keydown',function(ev){
          if(ev.keyCode===32&&ev.shiftKey){
            ev.preventDefault();
            cancelTap();
            openDialog(settingsLabel,options.ids);
          }
        },false);
      }
      return item;
    }
    var navLabels=document.querySelectorAll('.navbar-label');for(var ni=0;ni<navLabels.length;ni++){if(navLabels[ni].textContent.trim().toLowerCase()==='ana'){setText(navLabels[ni],officeProfile?'ODAM':'EVİM');}else if(officeProfile&&navLabels[ni].textContent.trim().toLowerCase()==='diğer'){setText(navLabels[ni],'YAZICI');}}
    document.body.classList.add('panel-v2');if(officeProfile){document.body.classList.add('panel-v2-office');if(cfg.nativeBatteryBadge===false){document.body.classList.add('pv2-no-battery');}}
    if(cfg.themeStyle==='tessera'){document.body.classList.add('pv2-tessera');}
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
    var agendaBox=null,agendaHeading=null,agendaList=null,agendaSignature=null;
    var forecastBox=null,forecastList=null,forecastNote=null,forecastSignature='';
    var weather = window.PanelV2Weather.create(C, cfg, {
      now: function () { return new Date().getTime(); },
      connected: connection,
      get: get,
      generation: ha.generation,
      version: ha.version,
      update: ha.update,
      load: function (key) { return localStorage.getItem(key); },
      save: function (key, value) { localStorage.setItem(key, value); },
      fetchForecast: ha.fetchForecast,
      fetchState: function (id, now, done) { ha.fetchState(id, 'feels', now, done); },
      forecastChanged: renderForecast,
      changed: scheduleRender,
      setTimeout: startTimer,
      clearTimeout: stopTimer
    }, preferencePrefix);

    function lightControl(parent,id,label,iconName){if(parent&&id){addCard(parent,{label:label,ids:[id],icon:iconName||'bulb'});}}
    function addLightScreen(name,title,gridClass,entries){
      var screen=makeView(name,title);
      if(!screen){return;}
      screen.classList.add(gridClass);
      entries.forEach(function(entry){lightControl(screen,entry[0],entry[1],entry[2]);});
    }
    function addRobotScreen(){
      var screen=makeView('Robot','ROBOT');
      if(!screen){return;}
      screen.classList.add('pv2-robot-controls');
      var summary=node('div','pv2-robot-summary');
      summary.innerHTML=icon('robot');
      robotStatus=node('span','','Yükleniyor…');
      summary.appendChild(robotStatus);
      screen.appendChild(summary);
      ['start','pause','dock'].forEach(function(kind){
        addCard(screen,{label:'Robot',icon:'robot',kind:'vacuum-'+kind,action:true});
      });
    }
    function addAgenda(controls){
        agendaBox=node('section','pv2-agenda');agendaBox.setAttribute('aria-label','İş takvimi');
        // This is read-only kiosk content. Legacy Crosswalk can crash in its
        // native text-selection menu after a touch hold; do not enter that path.
        ['touchstart','selectstart','contextmenu'].forEach(function(name){agendaBox.addEventListener(name,function(ev){ev.preventDefault();},false);});
        agendaHeading=node('div','pv2-agenda-heading');agendaHeading.setAttribute('role','tablist');agendaHeading.setAttribute('aria-label','Takvim günü');agendaList=node('div','pv2-agenda-list');
        agendaBox.appendChild(agendaHeading);agendaBox.appendChild(agendaList);controls.appendChild(agendaBox);
    }
    function addForecast(controls){
        forecastBox=node('section','pv2-forecast');forecastBox.setAttribute('aria-label',(cfg.forecastDays===5?'Beş':'Yedi')+' günlük hava tahmini');
        var forecastHeader=node('div','pv2-forecast-header');forecastHeader.appendChild(node('h2','',(cfg.forecastDays===5?'5':'7')+' GÜNLÜK HAVA'));
        forecastNote=node('span','pv2-forecast-note','Yükleniyor…');forecastHeader.appendChild(forecastNote);
        forecastList=node('div','pv2-forecast-days');forecastBox.appendChild(forecastHeader);forecastBox.appendChild(forecastList);controls.appendChild(forecastBox);
        ['touchstart','selectstart','contextmenu'].forEach(function(name){forecastBox.addEventListener(name,function(ev){ev.preventDefault();},false);});
    }
    var layout=officeProfile?window.PanelV2SamsungLayout:window.PanelV2DenverLayout;
    layout(cfg,{
      makeView:makeView,addCard:addCard,lightControl:lightControl,node:node,changed:scheduleRender,
      addLightScreen:addLightScreen,addRobotScreen:addRobotScreen,addAgenda:addAgenda,addForecast:addForecast,
      addPrinterCamera:buildPrinterCamera,addPrinterDetails:buildPrinterDetails
    });
    function buildPrinterDetails(parent){
      parent.classList.add('pv2-printer-detail-layout');var telemetry=node('div','pv2-printer-telemetry');
      var entries=[{entity:cfg.printer.remaining,label:'Kalan süre',icon:'clock',unit:' dk'},{entity:cfg.printer.nozzle,label:'Nozul sıcaklığı',icon:'nozzle',unit:'°'},{entity:cfg.printer.bed,label:'Tabla sıcaklığı',icon:'bed',unit:'°'}];
      entries.forEach(function(e){var item=node('div','pv2-printer-reading'),symbol=node('span','pv2-printer-reading-icon'+(e.icon==='bed'?' pv2-bed-reading-icon':'')),value=node('span','pv2-printer-reading-value','—');symbol.setAttribute('aria-hidden','true');symbol.innerHTML=e.icon==='bed'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h18v6H3z M6 11c-2-3 2-4 0-7 M12 11c-2-3 2-4 0-7 M18 11c-2-3 2-4 0-7"/></svg>':icon(e.icon);item.appendChild(symbol);item.appendChild(value);item.title=e.label;telemetry.appendChild(item);e.value=value;e.item=item;});parent.appendChild(telemetry);
      var panel=node('section','pv2-printer-filaments'),heading=node('div','pv2-filament-heading'),caption=node('span'),grid=node('div','pv2-filament-grid');var grouped=(cfg.printer.filaments||[]).some(function(slot){return !!slot.group;});if(grouped){panel.classList.add('pv2-filament-grouped');}heading.appendChild(node('span','',grouped?'':'Filamentler'));heading.appendChild(caption);panel.appendChild(heading);panel.appendChild(grid);parent.appendChild(panel);printerDetails={entries:entries,caption:caption,heading:heading,grouped:grouped,grid:grid,signature:''};
    }
    function filamentColor(value){var color=String(value||'');return /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color)&&color.slice(7).toLowerCase()!=='00'?color.slice(0,7):'#667487';}
    function renderPrinterDetails(){
      var details=printerDetails;if(!details||activeView()!=='Diğer'){return;}var online=printerModel.ready();
      details.entries.forEach(function(e,index){
        var reading=printerModel.reading(e.entity,index===0),value=reading.value,text='—';
        if(value!==null){text=index===0?(value>0?Math.ceil(value)+' dk':'<1 dk'):Math.round(value)+e.unit;}
        setText(e.value,text);
        e.item.setAttribute('aria-label',e.label+': '+(index===0&&reading.idle?'Baskı yok':text));
      });
      setText(details.caption,online?'':'Son bilinen');details.heading.style.display=details.grouped&&online?'none':'';
      var slots=printerModel.filaments(),signature=JSON.stringify([online,slots]);
      if(details.signature===signature){return;}details.signature=signature;details.grid.innerHTML='';var count=0;
      var groups=[];slots.forEach(function(slot){if(groups.indexOf(slot.group)===-1){groups.push(slot.group);}});
      groups.forEach(function(name){var members=slots.filter(function(slot){return slot.group===name;}),target=details.grid;
        if(details.grouped){var section=node('div','pv2-filament-device'),title=node('div','pv2-filament-device-title',name),row=node('div','pv2-filament-device-slots');var weight=members.length===1?1.25:members.length;section.style.webkitFlex=String(weight);section.style.flex=String(weight);section.appendChild(title);section.appendChild(row);details.grid.appendChild(section);target=row;}
        members.forEach(function(slot){var noInfo=slot.noInfo,active=slot.active;count++;var chip=node('div','pv2-filament'+(active?' pv2-filament-active':'')+(noInfo?' pv2-filament-empty-slot':'')),swatch=node('span','pv2-filament-color'),material=node('span','pv2-filament-type',noInfo?'—':slot.type),label=node('span','pv2-filament-slot',slot.label);chip.style.width=(100/members.length)+'%';if(!noInfo){swatch.style.backgroundColor=filamentColor(slot.color);}swatch.setAttribute('aria-hidden','true');chip.title=name+' · '+slot.label+' · '+(noInfo?(slot.empty?'Boş':'Bilgi yok'):slot.type)+(active?' · Kullanılıyor':'');chip.setAttribute('aria-label',chip.title);chip.appendChild(swatch);chip.appendChild(material);chip.appendChild(label);target.appendChild(chip);});
      });
      if(!count){details.grid.appendChild(node('span','pv2-filament-empty','Filament bilgisi yok'));}
    }
    function buildPrinterCamera(metrics){
      metrics.classList.add('pv2-printer-metrics');
      var box=node('section','pv2-printer-camera'),head=node('div','pv2-camera-header'),title=node('span','','Yazıcı Kamerası'),toggle=node('button','pv2-sound pv2-camera-toggle'),viewport=node('div','pv2-camera-viewport'),image=node('img'),status=node('p','pv2-camera-status','Kamera bekleniyor…');
      toggle.type='button';toggle.innerHTML=icon('pause');toggle.setAttribute('aria-label','Kamera görüntüsünü duraklat');toggle.title='Kamera görüntüsünü duraklat';image.alt='Yazıcının kamera görüntüsü';image.style.display='none';status.setAttribute('role','status');head.appendChild(title);head.appendChild(toggle);box.appendChild(head);viewport.appendChild(image);viewport.appendChild(status);box.appendChild(viewport);metrics.parentNode.appendChild(box);
      var camera = window.PanelV2PrinterCamera.create({
        setTimeout: startTimer,
        clearTimeout: stopTimer,
        load: function (done) {
          image.onload=function(){done(true);};
          image.onerror=function(){done(false);};
          image.src=ha.cameraFrame(cfg.printer.camera,new Date().getTime());
        },
        clear: function () {
          image.onload=image.onerror=null;
          image.removeAttribute('src');
        },
        display: function (state, loading) {
          if (state==='frame') {
            image.style.display='';
            status.style.display='none';
            status.classList.remove('pv2-camera-loading');
            return;
          }
          var labels={
            paused:'Görüntü duraklatıldı',disconnected:'Home Assistant bağlantısı yok',
            'shutting-down':'Yazıcı kapatılıyor…',starting:'Yazıcı açılıyor…',off:'Yazıcı kapalı',
            offline:'Yazıcı çevrimdışı',waiting:'Kameradan görüntü bekleniyor…',
            loading:'Kamera görüntüsü yükleniyor',retry:'Kamera görüntüsü alınamadı · tekrar denenecek'
          };
          image.style.display='none';
          status.style.display='';
          setText(status,labels[state]);
          status.classList.toggle('pv2-camera-loading',loading);
          status.setAttribute('aria-label',labels[state]);
        }
      });
      printerCamera=camera;
      toggle.addEventListener('click',function(){
        var enabled=camera.toggle();
        toggle.innerHTML=icon(enabled?'pause':'play');
        var label=enabled?'Kamera görüntüsünü duraklat':'Kamera görüntüsünü göster';
        toggle.setAttribute('aria-label',label);toggle.title=label;syncPrinterCamera();
      },false);
    }
    function syncPrinterCamera(){
      if(printerCamera){printerCamera.sync(activeView()==='Diğer'&&!document.hidden,printerModel.camera());}
    }
    var errorNotice=node('div');errorNotice.id='pv2-notice';errorNotice.setAttribute('role','status');document.body.appendChild(errorNotice);
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
      if(ev.keyCode===9){var focusable=Array.prototype.filter.call(dialog.querySelectorAll('button:not(:disabled),input:not(:disabled)'),function(el){return el.getClientRects().length>0;});var first=focusable[0],last=focusable[focusable.length-1];if(ev.shiftKey&&document.activeElement===first){last.focus();ev.preventDefault();}else if(!ev.shiftKey&&document.activeElement===last){first.focus();ev.preventDefault();}}
    },false);
    // Prevent HoaryDash's swipe navigation from consuming sliders/long presses.
    modal.addEventListener('touchstart',function(ev){ev.stopPropagation();},false);
    modal.addEventListener('touchmove',function(ev){ev.stopPropagation();},false);
    modal.addEventListener('touchend',function(ev){ev.stopPropagation();},false);
    function closeDialog(){powerDialogState=null;modalRevision++;var wasOpen=modal.classList.contains('pv2-open');modal.classList.remove('pv2-open');modalIds=[];modalControls=[];if(wasOpen&&focusBeforeDialog&&document.body.contains(focusBeforeDialog)){if(keyboardInput){focusBeforeDialog.focus();}else if(document.activeElement&&document.activeElement.blur){document.activeElement.blur();}}}
    function lightName(id, index) {
      var names={counter:'Tezgâh',sink:'Lavabo',front:'Koridor Ön',rear:'Koridor Arka',office:'Çalışma Odası',living:'Salon',dining:'Yemek Masası',bedroom:'Yatak Odası'};
      var keys=Object.keys(names);
      for(var i=0;i<keys.length;i++){if(cfg.lights[keys[i]]===id){return cfg.labels&&cfg.labels[id]||names[keys[i]];}}
      return cfg.labels&&cfg.labels[id]||controlsModel.lightSettings(id).name||'Lamba '+(index+1);
    }
    function buildLightMenu(container, ids) {
      if(ids.length===1){buildSettings(ids[0],container);return;}
      var tabs=node('div','pv2-light-tabs'), panels=[];
      tabs.setAttribute('role','tablist');
      tabs.setAttribute('aria-label','Gruptaki lambalar');
      container.appendChild(tabs);
      function select(index){
        panels.forEach(function(item, i){
          var selected=i===index;
          item.button.setAttribute('aria-selected',selected?'true':'false');
          item.panel.hidden=!selected;
        });
      }
      ids.forEach(function(id,index){
        var label=lightName(id,index), button=node('button','pv2-light-tab',label), panel=node('div');
        button.type='button';
        button.setAttribute('role','tab');
        panel.setAttribute('role','tabpanel');
        panel.setAttribute('aria-label',label);
        button.addEventListener('click',function(){select(index);},false);
        tabs.appendChild(button);
        container.appendChild(panel);
        panels.push({button:button,panel:panel});
        buildSettings(id,panel);
      });
      select(0);
    }
    function openDialog(title, ids){
      modalRevision++;focusBeforeDialog=document.activeElement;modalIds=ids.slice(0);powerDialogState=null;setText(dialogTitle,title);dialog.classList.remove('pv2-power-dialog');dialog.classList.add('pv2-light-dialog');settings.innerHTML='';
      var key=ids.join('|'),signature='';for(var si=0;si<ids.length;si++){var state=get(ids[si]);signature+=String(C.available(state))+JSON.stringify(C.capabilities(state));}
      var page=dialogCache[key];if(!page||page.signature!==signature){page={content:node('div'),controls:[],signature:signature};modalControls=[];buildLightMenu(page.content,ids);page.controls=modalControls;dialogCache[key]=page;}else{modalControls=page.controls;}
      for(var ci=0;ci<modalControls.length;ci++){modalControls[ci].editing=false;}settings.appendChild(page.content);syncDialog();modal.classList.add('pv2-open');close.focus();
    }
    function powerDialogStatus(dialogState) {
      if(dialogState.printer){return printerModel.powerDialog(dialogState.entity,dialogState.willOff);}
      var entry=get(dialogState.entity),available=C.available(entry);
      return {available:available,changed:available&&((entry.state==='on')!==dialogState.willOff),needsAcknowledgement:false};
    }
    function syncPowerDialog(){
      var p=powerDialogState;if(!p){return;}
      var state=powerDialogStatus(p);
      if(p.printer&&state.changed){closeDialog();return;}
      p.row.style.display=state.needsAcknowledgement?'':'none';
      if(!state.needsAcknowledgement){p.check.checked=false;}
      p.confirm.disabled=state.needsAcknowledgement&&!p.check.checked;
    }
    function openPowerDialog(o){
      modalRevision++;focusBeforeDialog=document.activeElement;modalIds=[];modalControls=[];settings.innerHTML='';dialog.classList.remove('pv2-light-dialog');dialog.classList.add('pv2-power-dialog');
      var willOff=get(o.entity).state==='on';setText(dialogTitle,o.printer?'Yazıcıyı kapat?':o.label);
      var symbol=node('div','pv2-power-symbol');symbol.innerHTML=icon('plug');symbol.setAttribute('aria-hidden','true');settings.appendChild(symbol);
      settings.appendChild(node('p','pv2-power-message',willOff?(o.printer?'Yazıcının elektrik beslemesi kesilecek.':'Cihazın elektrik beslemesi kesilecek.'):'Cihazın elektrik beslemesi açılacak.'));
      settings.appendChild(node('p','pv2-dialog-hint',willOff?'Baskının ve soğutmanın tamamlandığından emin olun.':'Devam etmek için onaylayın.'));
      var actions=node('div','pv2-power-actions'),cancel=node('button','pv2-sound pv2-power-cancel','Vazgeç'),confirm=node('button','pv2-sound pv2-power-confirm',willOff?'Gücü Kapat':'Gücü Aç');cancel.type=confirm.type='button';actions.appendChild(cancel);actions.appendChild(confirm);settings.appendChild(actions);
      var acknowledgement=node('label','pv2-power-ack'),check=node('input');check.type='checkbox';acknowledgement.appendChild(check);acknowledgement.appendChild(node('span','','Devam eden işi yarıda keserek kapatmayı onaylıyorum.'));settings.insertBefore(acknowledgement,actions);
      powerDialogState={entity:o.entity,printer:!!o.printer,willOff:willOff,row:acknowledgement,check:check,confirm:confirm};check.addEventListener('change',syncPowerDialog,false);syncPowerDialog();
      cancel.addEventListener('click',closeDialog,false);
      confirm.addEventListener('click',function(){
        var state=powerDialogStatus({entity:o.entity,printer:!!o.printer,willOff:willOff});
        if(state.needsAcknowledgement&&!check.checked){syncPowerDialog();return;}
        if(!connection()||!state.available){notice('Cihaza ulaşılamıyor.');return;}
        if(state.changed){closeDialog();notice('Cihazın durumu değişti. Lütfen yeniden kontrol edin.');return;}
        perform('power:'+o.entity,'switch',willOff?'turn_off':'turn_on',o.entity,null,closeDialog);
      },false);
      modal.classList.add('pv2-open');cancel.focus();
    }
    function openPanelSettings(){
      modalRevision++;focusBeforeDialog=document.activeElement;modalIds=[];modalControls=[];powerDialogState=null;setText(dialogTitle,'Panel Ayarları');dialog.classList.remove('pv2-power-dialog');dialog.classList.remove('pv2-light-dialog');settings.innerHTML='';
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
    function buildSettings(id, container){
      var light=controlsModel.lightSettings(id), cap=light.capabilities, section=node('section','pv2-light-settings');
      if(!light.available){section.appendChild(node('p','pv2-dialog-hint','Bu lambaya şu anda ulaşılamıyor.'));container.appendChild(section);return;}
      var control={id:id,input:null,output:null,presets:[],editing:false};modalControls.push(control);
      if(cap.dim){
        var row=node('div','pv2-setting-row'),track=node('div','pv2-slider-track'),rail=node('div','pv2-slider-rail'),fill=node('span','pv2-slider-fill'),label=node('label','','Parlaklık'),input=node('input'),output=node('output');
        var brightness=light.brightness;input.type='range';input.min='0';input.max='100';input.step='1';input.value=String(brightness.value);input.setAttribute('aria-label',(cfg.labels&&cfg.labels[id]||'Lamba')+' parlaklık');
        input.id='pv2-dim-'+id.replace(/\./g,'-');label.htmlFor=input.id;output.textContent=brightness.label;
        control.input=input;control.output=output;control.fill=fill;fill.style.width=brightness.value+'%';
        input.addEventListener('mousedown',function(){control.editing=true;},false);input.addEventListener('touchstart',function(){control.editing=true;},false);
        input.addEventListener('touchcancel',function(){control.editing=false;syncDialog();},false);
        input.addEventListener('mouseup',function(){control.editing=false;},false);input.addEventListener('touchend',function(){control.editing=false;},false);
        input.addEventListener('input',function(){setText(output,input.value+'%');fill.style.width=input.value+'%';controlsModel.setBrightness(id,Number(input.value));},false);
        input.addEventListener('change',function(){control.editing=false;controlsModel.setBrightness(id,Number(input.value));},false);
        rail.appendChild(fill);track.appendChild(rail);track.appendChild(input);row.appendChild(label);row.appendChild(output);row.appendChild(track);section.appendChild(row);
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
    function applyPreset(id,data){var revision=modalRevision;controlsModel.setColor(id,data,function(){if(modalRevision===revision){closeDialog();}});}
    function syncDialog(){
      for(var mi=0;mi<modalControls.length;mi++){var control=modalControls[mi],light=controlsModel.lightSettings(control.id),available=connection()&&light.available;
        if(control.input){control.input.disabled=!available;if(!control.editing){var brightness=light.brightness;control.input.value=String(brightness.value);control.fill.style.width=brightness.value+'%';setText(control.output,brightness.label);}}
        for(var pi=0;pi<control.presets.length;pi++){var p=control.presets[pi],selected=light.selected(p);p.button.disabled=!available||controlsModel.isBusy('color:'+control.id);if(!controlsModel.isBusy('color:'+control.id)){p.button.classList.toggle('pv2-selected',selected);p.button.setAttribute('aria-pressed',selected?'true':'false');}}
      }
    }
    function preset(label,color){var b=node('button','pv2-preset');b.type='button';b.setAttribute('aria-pressed','false');var dot=node('span','pv2-swatch');dot.style.backgroundColor=color;b.appendChild(dot);b.appendChild(document.createTextNode(label));return b;}
    function selectPreset(parent,button){var all=parent.parentNode.querySelectorAll('.pv2-preset');for(var i=0;i<all.length;i++){all[i].classList.remove('pv2-selected');all[i].setAttribute('aria-pressed','false');}button.classList.add('pv2-selected');button.setAttribute('aria-pressed','true');}
    function drawCard(item){
      var o=item.options,b=item.button,label=o.label,detail='',on=false,unavailable=false,key=o.ids?o.ids.join(','):o.kind,disabled=!connection();
      if(o.kind==='navigate'){detail='Odalar · Mutfak · Giriş';disabled=false;}
      else if(o.kind==='printer'){
        var summary=printerModel.summary(),printing=summary.printing,value=summary.progress,minutes=summary.remaining;
        var validProgress=value!==null,validRemaining=minutes!==null;
        label=cfg.printer.label||'3D Yazıcı';disabled=false;on=printing;
        detail=printerStatusLabel(summary.status);
        if(printing&&validProgress&&!officeProfile){detail+=' · '+Math.round(value)+'%';}
        if(printing&&validRemaining&&!officeProfile){detail+=' · '+(minutes>0?Math.ceil(minutes):'<1')+' dk';}
        var bar=b.querySelector('.pv2-print-track');if(bar){bar.style.display=printing&&validProgress&&!(officeProfile&&cfg.agenda)?'block':'none';bar.firstChild.style.width=(printing&&validProgress?value:0)+'%';}
        var summaryPercentNode=b.querySelector('.pv2-summary-percent'),showPercent=officeProfile&&printing&&validProgress;
        if(summaryPercentNode){setText(summaryPercentNode,showPercent?Math.round(value)+'%':'');summaryPercentNode.style.display=showPercent?'block':'none';}
        var summaryRemainingNode=b.querySelector('.pv2-summary-remaining'),showRemaining=officeProfile&&printing&&validRemaining,remainingText=showRemaining?(minutes>0?Math.ceil(minutes):'<1')+'dk':'';
        if(summaryRemainingNode){setText(summaryRemainingNode.lastChild,remainingText);summaryRemainingNode.style.display=showRemaining?'block':'none';}
        b.setAttribute('data-printer-remaining',showRemaining?(minutes>0?Math.ceil(minutes):'<1')+' dk':'');
        b.classList.toggle('pv2-has-summary-footer',showPercent||showRemaining);
        b.classList.toggle('pv2-has-percent',showPercent);
        var accent=summary.accent;
        ['off','offline','ready','starting','printing','paused','error','done'].forEach(function(name){b.classList.toggle('pv2-printer-state-'+name,accent===name);});
        b.setAttribute('data-printer-progress',showPercent?String(Math.round(value)):'');
      }
      else if(o.kind==='printer-status'){
        var printerState=get(o.entity),printerPower=cfg.printer&&cfg.printer.power?get(cfg.printer.power):null;
        detail=printerStatusLabel(printerModel.status(printerState));
        disabled=disabled||!printerPower||!C.available(printerPower);key='power:'+(cfg.printer&&cfg.printer.power);on=printerModel.ready()&&printerModel.jobActive();
      }
      else if(o.kind==='power'||o.kind==='sensor'){
        var device=get(o.entity);unavailable=!C.available(device);if(o.kind==='sensor'&&cfg.printer&&printerModel.telemetry(o.entity)&&(!printerModel.ready()||o.entity===cfg.printer.progress&&!printerModel.jobActive())){unavailable=true;}key='power:'+o.entity;on=device.state==='on';
        if(unavailable){detail=cfg.printer&&printerModel.telemetry(o.entity)?'—':'Veri yok';}else if(o.kind==='power'){detail=on?'Güç açık':'Güç kapalı';}else{var statusNames={offline:'Çevrimdışı',idle:'Hazır',running:'Yazdırılıyor',pause:'Duraklatıldı',finish:'Tamamlandı',failed:'Hata'};detail=statusNames[device.state]||device.state;var unit=device.attributes.unit_of_measurement;if(unit){detail+=' '+({min:'dk',h:'sa',s:'sn'}[unit]||unit);}}
        if(cfg.printer&&o.entity===cfg.printer.progress){var fill=b.querySelector('.pv2-card-progress-fill'),percent=Number(device.state),validPercent=!unavailable&&device.state!==''&&isFinite(percent)&&percent>=0&&percent<=100;if(fill){fill.style.width=(validPercent?percent:0)+'%';}if(validPercent){b.setAttribute('aria-valuenow',String(percent));}else{b.removeAttribute('aria-valuenow');}}
        disabled=disabled||unavailable||o.kind==='sensor';
      }
      else if(o.kind&&o.kind.indexOf('vacuum-')===0){var action=controlsModel.robot(o.kind.slice(7));label=action.label;detail=action.detail;disabled=disabled||!action.service||controlsModel.isBusy('robot');unavailable=!action.available;key='vacuum';}
      else if(o.kind==='robot'){var robot=controlsModel.robot();label=robot.label;detail=robot.detail;on=robot.state==='cleaning';disabled=disabled||!robot.service||controlsModel.isBusy('vacuum');unavailable=!robot.available;}
      else if(o.kind==='alloff'){
        var countdown=controlsModel.countdown(new Date().getTime()),remaining=countdown.remaining;
        if(countdown.active){label=remaining===null?'Geri Sayım':C.timeLabel(remaining);detail='İptal için dokun';on=true;}
        else{detail='1 dakika sonra kapat';}
        disabled=disabled||!countdown.available;key='countdown';
        b.classList.toggle('pv2-counting',on);
      }else{
        var group=controlsModel.lightGroup(o.ids);on=group.on>0;unavailable=group.ready===0;
        if(unavailable){detail='Bağlantı yok';}
        else if(group.total===1){detail=on?'Açık':'Kapalı';}
        else{detail=group.on?group.on+'/'+group.total+' açık':'Kapalı';if(group.ready<group.total){detail+=' · eksik bağlantı';}}
        disabled=disabled||unavailable;
      }
      var tint=o.ids&&o.ids.length===1?C.lightTint(get(o.ids[0])):null;
      var level=null, dimmable=false;
      if(item.lightFill){
        var entry=get(item.lightId),brightness=C.brightness(entry);
        dimmable=C.capabilities(entry).dim;
        if(connection()&&on&&dimmable&&brightness.label!=='—'){level=brightness.value;}
        b.classList.toggle('pv2-light-level',level!==null);
        item.lightFill.style.width=(level===null?0:level)+'%';
        item.lightFill.style.backgroundColor=level!==null&&tint?tint.background:'';
        if(level!==null&&level<100){detail+=' · '+level+'%';}
      }
      b.style.backgroundColor=tint&&level===null?tint.background:'';b.style.borderColor=tint?tint.border:'';if(item.icon){item.icon.style.color=tint?tint.foreground:'';}item.status.style.color=tint?tint.foreground:'';
      b.disabled=disabled||controlsModel.isBusy(key);b.classList.toggle('pv2-on',on);b.classList.toggle('pv2-unavailable',unavailable);
      b.classList.toggle('pv2-pending',controlsModel.isBusy(key));b.setAttribute('aria-busy',controlsModel.isBusy(key)?'true':'false');
      setText(item.label,label);setText(item.status,!connection()?'Bağlantı yok':detail);
      b.setAttribute('aria-label',label+' · '+detail+(o.kind==='printer'&&b.getAttribute('data-printer-progress')?' · Baskı '+b.getAttribute('data-printer-progress')+'%':'')+(o.kind==='printer'&&b.getAttribute('data-printer-remaining')?' · Kalan süre '+b.getAttribute('data-printer-remaining'):''));if(o.ids){b.setAttribute('aria-pressed',on?'true':'false');b.title=(o.kind==='roomoff'?'Dokun: oda ışıklarını kapat':'Dokun: aç/kapat')+' · Basılı tut ve sürükle: parlaklık · Çift dokun: lamba ayarları';}
    }
    var conditions={'clear-night':'Açık gece','cloudy':'Bulutlu','exceptional':'Olağan dışı','fog':'Sisli','hail':'Dolu','lightning':'Şimşekli','lightning-rainy':'Gök gürültülü','partlycloudy':'Parçalı bulutlu','pouring':'Sağanak','rainy':'Yağmurlu','snowy':'Karlı','snowy-rainy':'Karla karışık','sunny':'Güneşli','windy':'Rüzgârlı','windy-variant':'Rüzgârlı'};
    function renderAgenda(){
      if(!agendaBox){return;}
      var state=agendaModel.read(new Date().getTime()/1000),fresh=state.fresh,days=state.days,items=state.events;
      var d=new Date(Number(days[state.selected])*1000),weekdays=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'],today=new Date(),sameDay=d.getFullYear()===today.getFullYear()&&d.getMonth()===today.getMonth()&&d.getDate()===today.getDate();
      var signature=JSON.stringify(state);if(signature===agendaSignature){return;}agendaSignature=signature;
      while(agendaHeading.firstChild){agendaHeading.removeChild(agendaHeading.firstChild);}
      for(var di=0;di<days.length;di++){
        (function(index){var date=new Date(Number(days[index])*1000),isToday=date.getFullYear()===today.getFullYear()&&date.getMonth()===today.getMonth()&&date.getDate()===today.getDate(),label=isToday?'Bugün':weekdays[date.getDay()]||'Takvim',tab=node('button','pv2-agenda-day',label);tab.type='button';tab.setAttribute('role','tab');tab.setAttribute('aria-selected',index===state.selected?'true':'false');tab.setAttribute('aria-controls','pv2-agenda-events');tab.disabled=!fresh;C.bindPress(tab,function(){agendaModel.select(index,new Date().getTime()/1000);agendaSignature=null;renderAgenda();},null);agendaHeading.appendChild(tab);})(di);
      }
      agendaList.id='pv2-agenda-events';agendaList.setAttribute('role','tabpanel');agendaList.setAttribute('aria-label',fresh?(sameDay?'Bugün':weekdays[d.getDay()]):'Takvim');
      while(agendaList.firstChild){agendaList.removeChild(agendaList.firstChild);}
      if(!fresh||!items.length){agendaList.appendChild(node('p','pv2-agenda-empty',!fresh?'Takvim güncellenemiyor':sameDay?'Bugün başka toplantı yok':'Bu iş günü için toplantı yok'));return;}
      var limit=agendaBox.clientHeight>=160?3:2;
      for(var aj=0;aj<Math.min(items.length,limit);aj++){
        var event=items[aj],row=node('div','pv2-agenda-event'),times=node('span','pv2-agenda-time'),title=node('span','pv2-agenda-title',event.title.slice(0,160));
        function timeText(epoch){var t=new Date(Number(epoch)*1000);return ('0'+t.getHours()).slice(-2)+':'+('0'+t.getMinutes()).slice(-2);}
        setText(times,timeText(event.start)+'–'+timeText(event.end));row.classList.toggle('pv2-agenda-current',event.current);row.appendChild(times);row.appendChild(title);agendaList.appendChild(row);
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
      var forecast=weather.forecast(),fresh=forecast.fresh,usable=forecast.usable,rows=forecast.rows;
      var note=usable&&!fresh?'En yüksek / en düşük':!connection()?'Bağlantı yok':!fresh?(forecast.pending?'Yükleniyor…':'Tahmin alınamadı'):forecast.incomplete?'Eksik günler: —':'En yüksek / en düşük';
      var signature=JSON.stringify([fresh,rows,note]);if(signature===forecastSignature){return;}forecastSignature=signature;setText(forecastNote,note);
      while(forecastList.firstChild){forecastList.removeChild(forecastList.firstChild);}
      var labels=['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
      for(var j=0;j<rows.length;j++){
        var day=rows[j],cell=node('div','pv2-forecast-day'+(j===0?' pv2-forecast-today':'')),symbol=node('span','pv2-forecast-icon'),high=day.high===null?'—':day.high+'°',low=day.low===null?'—':day.low+'°';
        cell.style.width=(100/rows.length)+'%';cell.appendChild(node('span','pv2-forecast-weekday',j===0?'Bugün':labels[day.day]));symbol.innerHTML=forecastIcon(day.condition);cell.appendChild(symbol);cell.appendChild(node('span','pv2-forecast-high',high));cell.appendChild(node('span','pv2-forecast-low',low));
        cell.setAttribute('aria-label',(j===0?'Bugün':labels[day.day])+': '+(day.high===null?'Tahmin yok':(conditions[day.condition]||'Hava tahmini')+', en yüksek '+high+', en düşük '+low));forecastList.appendChild(cell);
      }
    }
    function updateMeeting(v){var entry=get(cfg.meeting),age=new Date().getTime()/1000-Number(entry.attributes.last_report_epoch||0);v.meeting.classList.toggle('pv2-active',v.name==='Ana'&&connection()&&entry.state==='on'&&age>=-5&&age<40);}
    function render(){
      renderAgenda();renderForecast();syncDialog();syncPowerDialog();syncPrinterCamera();renderPrinterDetails();var active=activeView();
      for(var i=0;i<cards.length;i++){if(cards[i].view===active){drawCard(cards[i]);}}
      var readings=weather.readings(),shownWeather=readings.outdoor,shownFeels=readings.feels,t=shownWeather.value,valid=t!==null;
      var weatherName=shownWeather.condition==='sunny'?'sun':shownWeather.condition==='clear-night'?'moon':(/rain|pouring|hail|snow/.test(shownWeather.condition)?'rain':'cloud');
      for(var vi=0;vi<views.length;vi++){var v=views[vi];if(v.name!==active){continue;}
        setText(v.status,connection()?'● Home Assistant':'○ Bağlantı yok');v.status.title=connection()?'Home Assistant bağlantısı açık':'Home Assistant bağlantısı kesildi';v.status.setAttribute('aria-label',v.status.title);v.status.style.color=connection()?'#9fd8c2':'#ffb4b4';
        if(v.indoor){var inside=readings.indoor,insideValue=inside.raw,insideValid=inside.value!==null;setQuantity(v.indoor,insideValid?String(Math.round(inside.value*10)/10).replace('.',','):'—','°');v.indoor.parentNode.setAttribute('aria-label',(cfg.indoorLabel||'Ev içi sıcaklık')+': '+(insideValid?insideValue+' '+inside.unit:'veri yok'));}
        if(v.humidity){var humidityNumber=readings.humidity.value,humidityValid=humidityNumber!==null;setQuantity(v.humidity,humidityValid?String(Math.round(humidityNumber*10)/10).replace('.',','):'—','%',v.humidityIcon);v.humidity.parentNode.setAttribute('aria-label','Ev içi nem: '+(humidityValid?humidityNumber+'%':'veri yok'));}
        if(v.feels){var feltValid=shownFeels.value!==null;setQuantity(v.feels,feltValid?String(Math.round(shownFeels.value*10)/10).replace('.',','):'—',feltValid?'°':'',v.feelsIcon);v.feels.parentNode.setAttribute('aria-label','Dışarı hissedilen sıcaklık: '+(feltValid?shownFeels.value+' °C':'veri yok')+(shownFeels.source==='last'?' · Son bilinen':shownFeels.source==='forecast'?' · Günlük tahmin':''));v.feels.parentNode.title=shownFeels.source==='last'?'Bugünün son bilinen hissedilen sıcaklığı':shownFeels.source==='forecast'?'Bugünün tahmini hissedilen sıcaklığı':'Dışarı hissedilen sıcaklık';}
        setQuantity(v.temperature,valid?String(Math.round(Number(t)*10)/10).replace('.',','):'--','°');setText(v.condition,valid?(conditions[shownWeather.condition]||'Hava durumu'):!connection()?'Bağlantı yok':'Veri yok');
        v.temperature.parentNode.title=shownWeather.source==='forecast'?'Bugünün tahmini en yüksek sıcaklığı':shownWeather.source==='last'?'Bugünün son bilinen sıcaklığı':'Dış sıcaklık';

        if(weatherName!==v.previousWeatherIcon){v.weatherIcon.innerHTML=icon(weatherName);v.previousWeatherIcon=weatherName;}
        updateMeeting(v);
      }
      if(robotStatus&&active==='Robot'){var names={docked:'İstasyonda',cleaning:'Temizlik yapıyor',paused:'Duraklatıldı',returning:'İstasyona dönüyor',idle:'Temizliğe hazır',error:'Robot hata bildiriyor'};setText(robotStatus,!connection()?'Bağlantı yok':names[get(cfg.vacuum).state]||'Robota ulaşılamıyor');}
    }
    function entityChanged(id, state, fromSocket) {
      controlsModel.brightnessChanged(id);
      if (printerModel) { printerModel.entityChanged(id, state, fromSocket); }
      scheduleRender();
    }
    ha.start();
    var days=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
    function clockTick(){weather.tick(!document.hidden&&activeView()==='Ana');if(officeProfile&&printerModel){printerModel.tick();}renderAgenda();renderForecast();var now=new Date(),active=activeView();function pad(n){return ('0'+n).slice(-2);}for(var vi=0;vi<views.length;vi++){var v=views[vi];if(v.name!==active){continue;}setText(v.clock,pad(now.getHours())+':'+pad(now.getMinutes()));setText(v.date,pad(now.getDate())+'.'+pad(now.getMonth()+1)+'.'+now.getFullYear());setText(v.weekday,days[now.getDay()]);updateMeeting(v);}if(controlsModel.countdown(now.getTime()).active){for(var ci=0;ci<cards.length;ci++){if(cards[ci].view===active&&cards[ci].options.kind==='alloff'){drawCard(cards[ci]);}}}if(lastConnection!==connection()){lastConnection=connection();scheduleRender();}}
    function navigated(){closeQuickDim();for(var pi=0;pi<cards.length;pi++){if(cards[pi].tapTimer!==null){clearTimeout(cards[pi].tapTimer);cards[pi].tapTimer=null;}}closeDialog();clockTick();render();}
    window.addEventListener('hashchange',navigated,false);
    window.addEventListener('screen-navigate',navigated,false);
    function resetAgendaDay(){if(agendaModel){agendaModel.reset();agendaSignature=null;renderAgenda();}}
    window.addEventListener('panel-display-dark',function(){
      closeQuickDim();resetAgendaDay();
      if(officeProfile){closeDialog();if(activeView()!=='Ana'){navigateScreen('Ana');}syncPrinterCamera();}
    },false);
    document.addEventListener('visibilitychange',function(){if(document.hidden){closeQuickDim();resetAgendaDay();closeDialog();}syncPrinterCamera();},false);
    clockTick();render();setInterval(clockTick,1000);
    clearTimeout(window.panelV2LoadingTimer);document.documentElement.classList.remove('pv2-loading');
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',ready,false);}else{ready();}
})();
