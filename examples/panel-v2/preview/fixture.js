/* Local preview transport. Requests and commands stay in the synthetic store. */
(function (host) {
  var cfg = host.PANEL_V2_CONFIG;
  var scenario = host.previewScenario;
  var now = new Date();
  var epoch = Math.floor(now.getTime() / 1000);
  var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var entries = {};
  var listeners = host.entityListeners = {};
  var screens = document.querySelectorAll('.screen');
  var tabs = document.querySelectorAll('.navbar-item');
  var printing = scenario === 'printing';
  var adapter = host.PanelV2HomeAssistant.create;

  function set(id, state, attributes) {
    if (id) { entries[id] = {entity_id: id, state: state, attributes: attributes || {}}; }
  }

  cfg.allLights.forEach(function (id, index) {
    set(id, index % 3 === 0 ? 'on' : 'off', {
      brightness: 150, supported_color_modes: ['color_temp', 'rgb'],
      min_color_temp_kelvin: 2200, max_color_temp_kelvin: 6500
    });
  });
  set(cfg.weather, scenario === 'missing-weather' ? 'unavailable' : 'cloudy', {temperature: 4.8, time: epoch});
  set(cfg.outdoorFeelsLike, scenario === 'missing-weather' ? 'unavailable' : '3', {time: epoch});
  set(cfg.indoorTemperature, '21.5', {unit_of_measurement: '°C'});
  set(cfg.indoorHumidity, '36', {unit_of_measurement: '%'});
  set(cfg.meeting, 'off');
  set(cfg.vacuum, 'docked', {supported_features: 8192 + 4 + 16});
  set(cfg.countdown, 'off');

  var days = [];
  for (var index = 0; index < 3; index++) {
    var date = new Date(midnight);
    date.setDate(date.getDate() + index);
    var start = Math.floor(date.getTime() / 1000);
    days.push({day_start: start, events: []});
  }
  if (scenario !== 'empty-agenda') {
    days[0].events.push({
      title: scenario === 'long-title' ?
        'Tasarım ekibi haftalık değerlendirmesi ve sonraki teslimlerin planlanması' : 'Tasarım değerlendirmesi',
      start: epoch + 900, end: epoch + 2700
    });
  }
  set(cfg.agenda, 'on', {valid_until: epoch + 90, day_start: days[0].day_start, days: days});

  var printer = cfg.printer;
  if (printer) {
    set(printer.status, printing ? 'running' : 'idle');
    set(printer.power, 'on');
    set(printer.progress, printing ? '42' : '0');
    set(printer.remaining, printing ? '28' : '0', {unit_of_measurement: 'min'});
    set(printer.camera, 'idle');
    set(printer.nozzle, printing ? '220' : '24');
    set(printer.bed, printing ? '55' : '25');
    var colors = ['#627744', '#e23b3b', '#ba9743', '#181818', '#75c451'];
    printer.filaments.forEach(function (slot, index) {
      set(slot.entity, 'PLA', {type: 'PLA', color: colors[index], active: printing && index === 1});
    });
  }

  host.onHaReady = [];
  host.haSocketReady = scenario !== 'offline' && scenario !== 'loading';
  Object.keys(entries).forEach(function (id) { listeners[id] = []; });

  function publish(id) {
    var entry = entries[id];
    listeners[id].forEach(function (callback) { callback(entry.state, entry.attributes); });
  }

  host.goFetch = function (url, done) {
    var id = decodeURIComponent(url.split('?')[0].split('/').pop());
    setTimeout(function () { done(!entries[id], entries[id]); }, 0);
  };

  host.haSend = function (message) {
    var ids = Array.isArray(message.target.entity_id) ? message.target.entity_id : [message.target.entity_id];
    ids.forEach(function (id) {
      var entry = entries[id];
      if (!entry) { return; }
      if (message.service === 'turn_on' || message.service === 'turn_off') {
        entry.state = message.service === 'turn_on' ? 'on' : 'off';
      }
      if (id === cfg.countdown && entry.state === 'on') { entry.attributes.last_triggered = new Date().toISOString(); }
      if (id === cfg.vacuum) {
        entry.state = {start: 'cleaning', pause: 'paused', return_to_base: 'returning'}[message.service] || entry.state;
      }
      if (message.service_data && message.service_data.brightness_pct) {
        entry.attributes.brightness = Math.round(message.service_data.brightness_pct * 2.55);
      }
      publish(id);
    });
    return Promise.resolve();
  };

  host.PanelV2HomeAssistant.create = function () {
    var ha = adapter.apply(null, arguments);
    ha.fetchForecast = function (id, done) {
      var rows = [];
      if (scenario !== 'missing-weather') {
        for (var index = 0; index < 7; index++) {
          var day = new Date(midnight);
          day.setDate(day.getDate() + index);
          rows.push({datetime: day.toISOString(), condition: index % 2 ? 'sunny' : 'cloudy', temperature: 5 + index, templow: 2 - index});
        }
      }
      setTimeout(function () { done(rows); }, 0);
    };
    ha.cameraFrame = function () {
      var sample = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#202b3b"/><path d="M100 270l125-105h190l125 105z" fill="#56647a"/><text x="320" y="125" text-anchor="middle" font-family="Arial" font-size="22" fill="#e0e7f0">Örnek kamera karesi</text></svg>';
      return 'data:image/svg+xml,' + encodeURIComponent(sample);
    };
    return ha;
  };

  // Give each scenario an isolated cache even when preview pages share an origin.
  var values = {};
  Object.defineProperty(host, 'localStorage', {value: {
    getItem: function (key) { return values[key] || null; },
    setItem: function (key, value) { values[key] = value; }
  }});

  host.navigateTo = function (index) {
    for (var i = 0; i < screens.length; i++) {
      screens[i].hidden = index !== i;
      tabs[i].classList.toggle('active', index === i);
    }
    host.location.hash = '#screen-' + encodeURIComponent(screens[index].id.slice(7));
  };
  Array.prototype.forEach.call(tabs, function (tab, index) {
    tab.addEventListener('click', function () { host.navigateTo(index); });
  });
  host.navigateTo(0);

  if (cfg.nativeBatteryBadge !== false) {
    var badge = document.createElement('span');
    badge.className = 'preview-battery';
    badge.textContent = '100%';
    document.body.appendChild(badge);
  }

  if (scenario === 'loading') {
    document.documentElement.classList.add('pv2-loading');
    host.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () { document.documentElement.classList.add('pv2-loading'); }, 0);
      setTimeout(function () {
        document.documentElement.classList.remove('pv2-loading');
        host.haSocketReady = true;
        host.onHaReady.forEach(function (ready) { ready(); });
        Object.keys(entries).forEach(publish);
      }, 1800);
    });
  }
  host.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      if (host.haSocketReady) { Object.keys(entries).forEach(publish); }
    }, 0);
  });
})(window);
