/* HoaryDash transport and entity state, shared by both panel profiles. */
(function (root) {
  function create(host, core, config, onChange) {
    var cache = Object.create(null);
    var versions = Object.create(null);
    var listeners = host.entityListeners || {};
    var generation = 0;
    var snapshotNeeded = false;

    function get(id) {
      return cache[id] || {state: 'unknown', attributes: {}};
    }

    function update(id, entry) {
      cache[id] = {state: entry.state, attributes: entry.attributes || {}};
    }

    function version(id) {
      return versions[id] || 0;
    }

    function connected() {
      return !!host.haSocketReady;
    }

    function fetchState(id, reason, timestamp, done) {
      host.goFetch('/api/proxy/api/states/' + encodeURIComponent(id) + '?panel_' + reason + '=' + timestamp, done);
    }

    function fetchForecast(id, done) {
      var xhr = new host.XMLHttpRequest();
      xhr.open('POST', '/api/proxy/api/services/weather/get_forecasts?return_response', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.timeout = 15000;
      xhr.onload = function () {
        var entry;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            var body = JSON.parse(xhr.responseText);
            entry = body.service_response && body.service_response[id];
          } catch (ignore) {}
        }
        done(entry && entry.forecast);
      };
      xhr.onerror = xhr.ontimeout = xhr.onabort = function () { done(null); };
      xhr.send(JSON.stringify({entity_id: id, type: 'daily'}));
    }

    function cameraFrame(id, timestamp) {
      return '/api/proxy/api/camera_proxy/' + encodeURIComponent(id) + '?panel_frame=' + timestamp;
    }

    function call(domain, service, target, data) {
      if (!connected()) { return host.Promise.reject(new Error('Bağlantı yok')); }
      var message = {type: 'call_service', domain: domain, service: service, target: {entity_id: target}};
      if (data) { message.service_data = data; }
      return new host.Promise(function (resolve, reject) {
        var timeout = host.setTimeout(function () { reject(new Error('İşlem doğrulanamadı')); }, 8000);
        try {
          host.haSend(message).then(function (result) {
            host.clearTimeout(timeout);
            resolve(result);
          }, function (error) {
            host.clearTimeout(timeout);
            reject(error);
          });
        } catch (error) {
          host.clearTimeout(timeout);
          reject(error);
        }
      });
    }

    function snapshotIds() {
      var ids = config.allLights.concat(config.extraLights || []);
      ['weather', 'vacuum', 'countdown', 'meeting', 'agenda', 'indoorTemperature',
        'indoorHumidity', 'outdoorFeelsLike'].forEach(function (field) { ids.push(config[field]); });
      (config.otherControls || []).forEach(function (control) { ids.push(control.entity); });
      var printer = config.printer;
      if (printer) {
        ['status', 'progress', 'remaining', 'power', 'camera', 'nozzle', 'bed',
          'stage', 'printError', 'hmsErrors'].forEach(function (field) { ids.push(printer[field]); });
        (printer.filaments || []).forEach(function (slot) { ids.push(slot.entity); });
      }
      return ids.filter(function (id, index) {
        return id && listeners[id] && ids.indexOf(id) === index;
      });
    }

    // Recover from HoaryDash's warmed snapshot. Newer WebSocket events win.
    function reconcile(expectedGeneration) {
      snapshotNeeded = false;
      var ids = snapshotIds();
      var index = 0;
      function next() {
        if (expectedGeneration !== generation || !connected() || index >= ids.length) { return; }
        var id = ids[index++];
        var expectedVersion = version(id);
        fetchState(id, 'snapshot', new host.Date().getTime(), function (error, entry) {
          if (!error && expectedGeneration === generation && version(id) === expectedVersion &&
              entry && entry.entity_id === id) {
            update(id, entry);
            onChange(id, entry.state, false);
          }
          next();
        });
      }
      next();
      next();
    }

    function connectionReady() {
      var expectedGeneration = ++generation;
      snapshotNeeded = true;
      host.setTimeout(function () {
        if (snapshotNeeded && expectedGeneration === generation) { reconcile(expectedGeneration); }
      }, 1000);
    }

    function start() {
      host.onHaReady.push(connectionReady);
      if (connected()) { connectionReady(); }
      Object.keys(listeners).forEach(function (id) {
        var callbacks = listeners[id];
        var legacy = callbacks.slice();
        callbacks.length = 0;
        callbacks.push(function (state, attributes) {
          versions[id] = version(id) + 1;
          cache[id] = core.merge(get(id), state, attributes || {});
          onChange(id, state, true);
          if (snapshotNeeded) {
            snapshotNeeded = false;
            var expectedGeneration = generation;
            host.setTimeout(function () {
              if (expectedGeneration === generation) { reconcile(expectedGeneration); }
            }, 0);
          }
          legacy.forEach(function (callback) {
            if (callback) {
              try { callback(cache[id].state, cache[id].attributes); } catch (ignore) {}
            }
          });
        });
      });
    }

    return {
      start: start, get: get, update: update, version: version, connected: connected,
      generation: function () { return generation; },
      call: call, fetchState: fetchState, fetchForecast: fetchForecast, cameraFrame: cameraFrame
    };
  }
  root.PanelV2HomeAssistant = {create: create};
})(this);
