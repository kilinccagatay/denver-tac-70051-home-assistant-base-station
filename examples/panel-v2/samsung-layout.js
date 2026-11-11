/* Samsung screen composition. Model and component behavior lives in the panel. */
(function (root) {
  root.PanelV2SamsungLayout = function (cfg, ui) {
    var makeView = ui.makeView, addCard = ui.addCard, lightControl = ui.lightControl;
    var room = cfg.roomLights || {};
    var controls = makeView('Ana', 'ÇALIŞMA ODAM');
    controls.classList.add('pv2-office-home');
    if (cfg.agenda) {
      controls.classList.add('pv2-with-agenda');
      ui.addAgenda(controls);
      if (cfg.weeklyForecast === true) { ui.addForecast(controls); }
    }
      lightControl(controls,cfg.lights.office,'Oda Lambası','desk');
      if(cfg.robotEnabled!==false){
        addCard(controls,{label:'Ev Işıkları',icon:'bulb',kind:'navigate',destination:'Işıklar'});
        addCard(controls,{label:'Evi Temizle',icon:'robot',kind:'robot',action:true});
      }else{controls.classList.add('pv2-four');controls.classList.add('pv2-office-compact-home');}
      if(cfg.printer){addCard(controls,{label:cfg.printer.label||'3D Yazıcı',icon:'printer',kind:'printer',destination:'Diğer'});}else{addCard(controls,{label:'Ev Işıkları',icon:'bulb',kind:'navigate',destination:'Işıklar'});}
    ui.addLightScreen('Mutfak','MUTFAK','pv2-three',[
      [cfg.lights.counter,'Tezgâh'], [cfg.lights.sink,'Lavabo'], [cfg.lights.dining,'Yemek Masası']
    ]);
    ui.addLightScreen('Giriş','GİRİŞ','pv2-three',[
      [room.entrance,'Antre','corridor'], [cfg.lights.front,'Koridor Ön','corridor'],
      [cfg.lights.rear,'Koridor Arka','corridor']
    ]);
    ui.addLightScreen('Odalar','ODALAR','pv2-four',[
      [cfg.lights.living,'Salon'], [cfg.lights.office,'Çalışma Odası','desk'],
      [cfg.lights.bedroom,'Yatak Odası','bed'], [room.accent,cfg.labels&&cfg.labels[room.accent]||'Ek Aydınlatma']
    ]);
    ui.addRobotScreen();

    var node = ui.node;
      var house=makeView('Işıklar','EV IŞIKLARI');
      if(house){
        house.classList.add('pv2-office-house');
        var groups=node('div','pv2-office-groups');groups.setAttribute('role','tablist');groups.setAttribute('aria-label','Aydınlatma bölümü');house.appendChild(groups);
        var sections=[];
        function lightSection(title,entries){
          var tab=node('button','pv2-office-group',title),grid=node('div','pv2-office-grid');tab.type='button';tab.setAttribute('role','tab');tab.setAttribute('aria-selected',sections.length?'false':'true');grid.setAttribute('role','tabpanel');grid.setAttribute('aria-label',title);grid.setAttribute('data-pv2-screen','Işıklar');grid.hidden=sections.length>0;grid.style.display=sections.length?'none':'';
          entries.forEach(function(e){lightControl(grid,e[0],e[1],e[2]);});groups.appendChild(tab);house.appendChild(grid);sections.push({tab:tab,grid:grid});
          tab.addEventListener('click',function(){sections.forEach(function(s){var selected=s.tab===tab;s.tab.setAttribute('aria-selected',selected?'true':'false');s.grid.hidden=!selected;s.grid.style.display=selected?'':'none';});ui.changed();},false);
        }
        lightSection('Odalar',[[cfg.lights.living,'Salon'],[cfg.lights.bedroom,'Yatak Odası','bed'],[cfg.lights.office,'Çalışma Odası','desk'],[room.accent,'Iris']]);
        lightSection('Mutfak',[[cfg.lights.counter,'Tezgâh','kitchen'],[cfg.lights.sink,'Lavabo','kitchen'],[cfg.lights.dining,'Yemek Masası']]);
        lightSection('Giriş',[[room.entrance,'Antre','corridor'],[cfg.lights.front,'Koridor Ön','corridor'],[cfg.lights.rear,'Koridor Arka','corridor']]);
        lightSection('Toplu',[]);var bulk=sections[sections.length-1].grid;bulk.classList.add('pv2-two');
        addCard(bulk,{label:'Odayı Kapat',ids:[cfg.lights.office,room.accent].filter(Boolean),kind:'roomoff',icon:'moon',action:true});
        addCard(bulk,{label:'Tüm Işıkları Kapat',kind:'alloff',icon:'moon',action:true});
      }
      var other=makeView('Diğer','YAZICI');if(other){other.classList.add('pv2-four');other.parentNode.parentNode.classList.add('pv2-printer-page');if(cfg.printer&&cfg.printer.camera){ui.addPrinterCamera(other);}(cfg.otherControls||[]).forEach(function(o){if(cfg.printer&&cfg.printer.nozzle&&cfg.printer.bed&&(o.entity===cfg.printer.remaining||o.entity===cfg.printer.nozzle)){return;}addCard(other,{label:o.label,entity:o.entity,kind:cfg.printer&&o.entity===cfg.printer.status?'printer-status':o.kind,icon:o.icon||'bulb',action:o.kind==='power'});});if(cfg.printer&&cfg.printer.nozzle&&cfg.printer.bed){ui.addPrinterDetails(other);}}
  };
})(this);
