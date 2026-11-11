/* Denver screen composition. Cards use the shared panel component API. */
(function (root) {
  root.PanelV2DenverLayout = function (cfg, ui) {
    var makeView = ui.makeView, addCard = ui.addCard;
    var room = cfg.roomLights || {};
    var controls = makeView('Ana', 'EVİM');
    var corridorIds = [cfg.lights.front, cfg.lights.rear];
    if (room.entrance) { corridorIds.push(room.entrance); }
    addCard(controls,{label:'Mutfak',ids:[cfg.lights.counter,cfg.lights.sink],icon:'kitchen'});
    addCard(controls,{label:'Salon',ids:[cfg.lights.living],icon:'bulb'});
    addCard(controls,{label:'Yemek Masası',ids:[cfg.lights.dining],icon:'bulb'});

    addCard(controls,{label:'Koridor',ids:corridorIds,icon:'corridor'});
    addCard(controls,{label:'Çalışma Odası',ids:[cfg.lights.office],icon:'desk'});
    addCard(controls,{label:'Yatak Odası',ids:[cfg.lights.bedroom],icon:'bed'});
    addCard(controls,{label:'Evi Temizle',icon:'robot',kind:'robot',action:true});
    addCard(controls,{label:'Tüm Işıkları Kapat',icon:'moon',kind:'alloff',action:true});
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
  };
})(this);
