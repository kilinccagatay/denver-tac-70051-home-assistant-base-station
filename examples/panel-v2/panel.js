/* Browser application: ES5, no framework or extra polling. Configuration is injected separately. */
(function () {
  function ready() {
    var cfg = window.PANEL_V2_CONFIG, C = window.PanelV2Core;
    var home = document.getElementById('screen-Ana');
    if (!cfg || !C || !home || document.getElementById('panel-v2')) { return; }
    var cache = {}, versions = {}, cards = [], busy = {}, listeners = window.entityListeners || {};
    var snapshotNeeded = false, connectionGeneration = 0;
    var modalIds = [], focusBeforeDialog = null, noticeTimer, modal;
    var paths = {
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
    function perform(key, domain, service, ids, data) {
      if (busy[key]) { return; }
      busy[key]=true; render();
      call(domain,service,ids,data).then(function(){busy[key]=false;render();},function(){busy[key]=false;render();notice('İşlem gerçekleştirilemedi. Bağlantıyı kontrol edin.');});
    }
    function supported(ids) { return ids.filter(function(id){return C.available(get(id));}); }
    function toggle(ids) {
      var g=C.group(ids,cache), active=supported(ids);
      if (!active.length) { notice('Lambaya ulaşılamıyor.'); return; }
      perform(ids.join(','),'light',g.service,active);
    }
    function addCard(parent, options, legacy) {
      var b=node('button','pv2-card'+(options.action?' pv2-action':'')+(legacy?' pv2-legacy-light':'')); b.type='button';
      b.innerHTML=icon(options.icon);
      var text=node('span','pv2-card-text'), label=node('span','pv2-card-label',options.label), state=node('span','pv2-card-state','Yükleniyor…');
      text.appendChild(label);text.appendChild(state);b.appendChild(text);parent.appendChild(b);
      var item={button:b,label:label,status:state,options:options};cards.push(item);
      C.bindPress(b,function(){
        if (b.disabled) { return; }
        if (options.kind==='robot') { var robot=C.robot(get(cfg.vacuum)); if(robot.service){perform('robot','vacuum',robot.service,cfg.vacuum);} }
        else if(options.kind==='alloff'){toggleCountdown();}
        else if(options.kind==='kitchen'){perform('kitchen','light','turn_off',supported(options.ids));}
        else{toggle(options.ids);}
      },options.ids && options.kind!=='kitchen'?function(){openDialog(options.label,options.ids);}:null);
      return item;
    }
    document.body.classList.add('panel-v2');
    var root=node('div');root.id='panel-v2';
    var top=node('div','pv2-top');top.appendChild(node('span','pv2-brand','EVİM'));
    var status=node('span','pv2-connection','Bağlanıyor');top.appendChild(status);root.appendChild(top);
    var body=node('div','pv2-body'), overview=node('div','pv2-overview'), controls=node('div','pv2-controls');
    var clock=node('div','pv2-clock'), date=node('div','pv2-date'), weekday=node('div','pv2-date');
    overview.appendChild(clock);overview.appendChild(date);overview.appendChild(weekday);
    var weather=node('div','pv2-weather'), weatherMain=node('div','pv2-weather-main'), weatherIcon=node('span'), temperature=node('span','pv2-temperature','--°'), condition=node('div','pv2-condition','Yükleniyor…');
    weatherMain.appendChild(weatherIcon);weatherMain.appendChild(temperature);weather.appendChild(weatherMain);weather.appendChild(condition);overview.appendChild(weather);
    var meeting=node('div','pv2-meeting');meeting.innerHTML='<span class="pv2-meeting-dot"></span>Toplantı';overview.appendChild(meeting);
    body.appendChild(overview);body.appendChild(controls);root.appendChild(body);home.appendChild(root);
    addCard(controls,{label:'Mutfak Kapat',ids:[cfg.lights.counter,cfg.lights.sink],icon:'kitchen',kind:'kitchen',action:true});
    addCard(controls,{label:'Salon',ids:[cfg.lights.living],icon:'bulb'});
    addCard(controls,{label:'Yemek Masası',ids:[cfg.lights.dining],icon:'bulb'});
    addCard(controls,{label:'Koridor',ids:[cfg.lights.front,cfg.lights.rear],icon:'corridor'});
    addCard(controls,{label:'Çalışma Odası',ids:[cfg.lights.office],icon:'desk'});
    addCard(controls,{label:'Yatak Odası',ids:[cfg.lights.bedroom],icon:'bed'});
    addCard(controls,{label:'Robot Başlat',icon:'robot',kind:'robot',action:true});
    addCard(controls,{label:'Tüm Işıkları Kapat',icon:'moon',kind:'alloff',action:true});
    var banner=node('button');banner.id='pv2-countdown';banner.type='button';banner.setAttribute('aria-live','polite');document.body.appendChild(banner);
    banner.addEventListener('click',function(){if(get(cfg.countdown).state==='on'){toggleCountdown();}},false);
    var errorNotice=node('div');errorNotice.id='pv2-notice';errorNotice.setAttribute('role','status');document.body.appendChild(errorNotice);
    function toggleCountdown(){
      if(!C.available(get(cfg.countdown))){notice('Geri sayım servisine ulaşılamıyor.');return;}
      perform('countdown','script',get(cfg.countdown).state==='on'?'turn_off':'turn_on',cfg.countdown);
    }
    // Replace only light cards, preserving printer power, robot commands, and native battery overlay.
    var lightIds=cfg.allLights.slice(0);
    var extra=cfg.extraLights || [];
    for(var ex=0;ex<extra.length;ex++){if(lightIds.indexOf(extra[ex])===-1){lightIds.push(extra[ex]);}}
    for(var li=0;li<lightIds.length;li++){
      var id=lightIds[li], wrappers=document.querySelectorAll('[id^="'+id.replace('.','-')+'-"]');
      for(var wi=0;wi<wrappers.length;wi++){
        var wrapper=wrappers[wi];
        if(home.contains(wrapper)){continue;}
        var oldLabel=wrapper.querySelector('.entity-label');
        if(!oldLabel){continue;}
        wrapper.classList.add('pv2-legacy-host');
        var friendly=cfg.labels && cfg.labels[id] || oldLabel.textContent.trim();
        addCard(wrapper,{label:friendly,ids:[id],icon:'bulb'},true);
      }
    }
    modal=node('div','pv2-modal');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','pv2-dialog-title');
    var dialog=node('div','pv2-dialog'), header=node('div','pv2-dialog-header'), dialogTitle=node('h2');dialogTitle.id='pv2-dialog-title';
    var close=node('button','pv2-close','Kapat');close.type='button';header.appendChild(dialogTitle);header.appendChild(close);dialog.appendChild(header);
    var settings=node('div');dialog.appendChild(settings);dialog.appendChild(node('p','pv2-dialog-hint','Parlaklığı ayarlayın veya bir renk seçin.'));modal.appendChild(dialog);document.body.appendChild(modal);
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
    function closeDialog(){modal.classList.remove('pv2-open');modalIds=[];if(focusBeforeDialog && document.body.contains(focusBeforeDialog)){focusBeforeDialog.focus();}}
    function openDialog(title, ids){
      focusBeforeDialog=document.activeElement;modalIds=ids.slice(0);setText(dialogTitle,title);settings.innerHTML='';
      for(var di=0;di<ids.length;di++){buildSettings(ids[di],ids.length>1);}
      modal.classList.add('pv2-open');close.focus();
    }
    function buildSettings(id, showName){
      var entry=get(id), a=entry.attributes, cap=C.capabilities(entry), section=node('section','pv2-light-settings');
      if(showName){section.appendChild(node('h3','',cfg.labels && cfg.labels[id] || a.friendly_name || 'Lamba'));}
      if(!C.available(entry)){section.appendChild(node('p','pv2-dialog-hint','Bu lambaya şu anda ulaşılamıyor.'));settings.appendChild(section);return;}
      if(cap.dim){
        var row=node('div','pv2-setting-row'),label=node('label','','Parlaklık'),input=node('input'),output=node('output');
        input.type='range';input.min='1';input.max='100';input.step='1';input.value=String(Math.max(1,Math.round((a.brightness===undefined||a.brightness===null?255:a.brightness)/255*100)));input.setAttribute('aria-label',(cfg.labels&&cfg.labels[id]||'Lamba')+' parlaklık');
        input.id='pv2-dim-'+id.replace(/\./g,'-');label.htmlFor=input.id;output.textContent=input.value+'%';
        input.addEventListener('input',function(){setText(output,input.value+'%');},false);
        input.addEventListener('change',function(){perform('dim:'+id,'light','turn_on',id,{brightness_pct:Number(input.value)});},false);
        row.appendChild(label);row.appendChild(input);row.appendChild(output);section.appendChild(row);
      }
      if(cap.temperature){
        var temps=node('div','pv2-presets');
        [{label:'Sıcak',k:2700,color:'#ffd18b'},{label:'Doğal',k:4000,color:'#fff0d9'},{label:'Soğuk',k:6500,color:'#dcecff'}].forEach(function(p){
          var k=Math.max(cap.min,Math.min(cap.max,p.k));
          var b=preset(p.label,p.color);b.setAttribute('aria-label',p.label+' beyaz');
          b.addEventListener('click',function(){selectPreset(temps,b);perform('color:'+id,'light','turn_on',id,{color_temp_kelvin:k});},false);temps.appendChild(b);
        });section.appendChild(temps);
      }
      if(cap.rgb){
        var colors=node('div','pv2-presets');
        [{label:'Kırmızı',rgb:[255,55,55],color:'#ff5555'},{label:'Amber',rgb:[255,165,45],color:'#ffb64d'},{label:'Yeşil',rgb:[65,220,110],color:'#51d984'},{label:'Mavi',rgb:[65,135,255],color:'#679dff'}].forEach(function(p){
          var b=preset(p.label,p.color);b.addEventListener('click',function(){selectPreset(colors,b);perform('color:'+id,'light','turn_on',id,{rgb_color:p.rgb});},false);colors.appendChild(b);
        });section.appendChild(colors);
      }
      if(!cap.dim&&!cap.temperature&&!cap.rgb){section.appendChild(node('p','pv2-dialog-hint','Bu lamba yalnızca aç/kapat destekliyor.'));}
      settings.appendChild(section);
    }
    function preset(label,color){var b=node('button','pv2-preset');b.type='button';var dot=node('span','pv2-swatch');dot.style.backgroundColor=color;b.appendChild(dot);b.appendChild(document.createTextNode(label));return b;}
    function selectPreset(parent,button){var all=parent.querySelectorAll('button');for(var i=0;i<all.length;i++){all[i].classList.remove('pv2-selected');all[i].setAttribute('aria-pressed','false');}button.classList.add('pv2-selected');button.setAttribute('aria-pressed','true');}
    function drawCard(item){
      var o=item.options,b=item.button,label=o.label,detail='',on=false,unavailable=false,key=o.ids?o.ids.join(','):o.kind,disabled=!connection();
      if(o.kind==='robot'){var robot=C.robot(get(cfg.vacuum));label=robot.label;detail=robot.detail;on=get(cfg.vacuum).state==='cleaning';disabled=disabled||!robot.service;unavailable=!C.available(get(cfg.vacuum));}
      else if(o.kind==='alloff'){
        var remaining=C.remaining(get(cfg.countdown),new Date().getTime());
        if(get(cfg.countdown).state==='on'){label=remaining===null?'Geri Sayım':C.timeLabel(remaining);detail='İptal için dokun';on=true;}
        else{detail='1 dakika sonra kapat';}
        disabled=disabled||!C.available(get(cfg.countdown));key='countdown';
        b.classList.toggle('pv2-counting',on);
      }else{
        var group=C.group(o.ids,cache);on=group.on>0;unavailable=group.ready===0;
        if(unavailable){detail='Bağlantı yok';}else if(o.kind==='kitchen'){detail=on?'Tezgâh ve Lavabo':'Mutfak kapalı';}
        else if(group.total===1){detail=on?'Açık':'Kapalı';}
        else{detail=group.on?group.on+'/'+group.total+' açık':'Kapalı';if(group.ready<group.total){detail+=' · eksik bağlantı';}}
        disabled=disabled||unavailable;if(o.kind==='kitchen'){key='kitchen';}
      }
      b.disabled=disabled||!!busy[key];b.classList.toggle('pv2-on',on);b.classList.toggle('pv2-unavailable',unavailable);
      setText(item.label,label);setText(item.status,busy[key]?'Gönderiliyor…':(!connection()?'Bağlantı yok':detail));
      b.setAttribute('aria-label',label+' · '+detail);if(o.ids&&o.kind!=='kitchen'){b.setAttribute('aria-pressed',on?'true':'false');b.title='Dokun: aç/kapat · Uzun bas: lamba ayarları';}
    }
    var conditions={'clear-night':'Açık gece','cloudy':'Bulutlu','exceptional':'Olağan dışı','fog':'Sisli','hail':'Dolu','lightning':'Şimşekli','lightning-rainy':'Gök gürültülü','partlycloudy':'Parçalı bulutlu','pouring':'Sağanak','rainy':'Yağmurlu','snowy':'Karlı','snowy-rainy':'Karla karışık','sunny':'Güneşli','windy':'Rüzgârlı','windy-variant':'Rüzgârlı'};
    var previousWeatherIcon='';
    function render(){
      setText(status,connection()?'● Bağlı':'○ Bağlantı yok');status.style.color=connection()?'#9fd8c2':'#ffb4b4';
      for(var i=0;i<cards.length;i++){drawCard(cards[i]);}
      var entry=get(cfg.weather), t=entry.attributes.temperature;
      var valid=C.available(entry)&&t!==null&&t!==undefined&&t!==''&&isFinite(Number(t));
      setText(temperature,valid?String(Math.round(Number(t)*10)/10).replace('.',',')+'°':'--°');
      setText(condition,!connection()?'Bağlantı yok':(C.available(entry)?conditions[entry.state]||'Hava durumu':'Veri yok'));
      var weatherName=entry.state==='sunny'?'sun':entry.state==='clear-night'?'moon':(/rain|pouring|hail|snow/.test(entry.state)?'rain':'cloud');
      if(weatherName!==previousWeatherIcon){weatherIcon.innerHTML=icon(weatherName);previousWeatherIcon=weatherName;}
      var callState=get(cfg.meeting), age=new Date().getTime()/1000-Number(callState.attributes.last_report_epoch||0);
      meeting.classList.toggle('pv2-active',connection()&&callState.state==='on'&&age>=-5&&age<40);
      var running=get(cfg.countdown).state==='on',seconds=C.remaining(get(cfg.countdown),new Date().getTime());
      banner.style.display=running?'block':'none';banner.disabled=!connection()||!!busy.countdown;
      if(running){setText(banner,'Işıklar '+(seconds===null?'geri sayım sonunda':C.timeLabel(seconds)+' sonra')+' kapanacak · İptal'+(!connection()?' · Bağlantı yok':''));}
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
            cache[id]={state:entry.state,attributes:entry.attributes || {}};render();
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
        callbacks.push(function(state,attrs){versions[id]=(versions[id]||0)+1;cache[id]=C.merge(get(id),state,attrs||{});render();if(snapshotNeeded){snapshotNeeded=false;var generation=connectionGeneration;setTimeout(function(){if(generation===connectionGeneration){reconcileSnapshot(generation);}},0);}for(var i=0;i<old.length;i++){if(old[i]){try{old[i](cache[id].state,cache[id].attributes);}catch(ignore){/* Isolate legacy widget failures. */}}}});
      })(eid,listeners[eid]);
    }}
    var days=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
    function clockTick(){var now=new Date();function pad(n){return ('0'+n).slice(-2);}setText(clock,pad(now.getHours())+':'+pad(now.getMinutes()));setText(date,pad(now.getDate())+'.'+pad(now.getMonth()+1)+'.'+now.getFullYear());setText(weekday,days[now.getDay()]);render();}
    window.addEventListener('hashchange',closeDialog,false);
    window.addEventListener('screen-navigate',closeDialog,false);
    document.addEventListener('visibilitychange',function(){if(document.hidden){closeDialog();}},false);
    clockTick();setInterval(clockTick,1000);
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',ready,false);}else{ready();}
})();
