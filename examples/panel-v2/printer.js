/* Printer state, telemetry and power transitions. No DOM dependencies. */
(function (root) {
  function create(C, ha, config, io) {
    var get = ha.get;
    var connection = ha.connected;
    var printerStartup = null;
    var printerShutdown = null;
    var printerFailureAttempt = 0;
    var printerFailurePending = false;
    var powerCheckPending = false;

    function stopPrinterStartup() {
      if (!printerStartup) { return; }
      io.clearTimeout(printerStartup.timer);
      io.clearTimeout(printerStartup.expiry);
      printerStartup = null;
      io.changed();
    }

    function checkPrinterStartup() {
      var pending = printerStartup;
      if (!pending || pending.inFlight || !connection()) { return; }
      pending.inFlight = true;
      ha.fetchState(config.status, 'startup', io.now(), function (error, entry) {
        if (printerStartup !== pending) { return; }
        pending.inFlight = false;
        var fresh = entry && Date.parse(entry.last_updated || entry.last_changed || '') >= pending.since;
        var readyStates = ['idle', 'running', 'printing', 'prepare', 'pause', 'paused', 'slicing', 'finish'];
        if (!error && fresh && C.available(entry) && readyStates.indexOf(entry.state) !== -1) {
          ha.update(config.status, entry);
          stopPrinterStartup();
          return;
        }
        io.clearTimeout(pending.timer);
        pending.timer = io.setTimeout(checkPrinterStartup, 2000);
      });
    }

    function startPrinterStartup() {
      stopPrinterStartup();
      var pending = {since: io.now(), inFlight: false, timer: null, expiry: null};
      printerStartup = pending;
      pending.timer = io.setTimeout(checkPrinterStartup, 500);
      pending.expiry = io.setTimeout(function () {
        if (printerStartup === pending) { stopPrinterStartup(); }
      }, 120000);
      io.changed();
    }

    function stopPrinterShutdown() {
      if (!printerShutdown) { return; }
      io.clearTimeout(printerShutdown.expiry);
      printerShutdown = null;
      io.changed();
    }

    function syncPrinterPower(state) {
      if (!config.power) { return; }
      if (state === 'off') {
        stopPrinterShutdown();
        if (printerStartup && printerStartup.powerSeenOn) { stopPrinterStartup(); }
      } else if (state === 'on' && printerStartup) {
        printerStartup.powerSeenOn = true;
      }
    }

    function startPrinterShutdown() {
      stopPrinterStartup();
      stopPrinterShutdown();
      var pending = {expiry: null};
      printerShutdown = pending;
      pending.expiry = io.setTimeout(function () {
        if (printerShutdown === pending) {
          stopPrinterShutdown();
          readPowerState();
        }
      }, 10000);
      io.changed();
    }

    function printerDataReady() {
      return connection() && !printerStartup && !printerShutdown && !printerOffline() &&
        (!config.power || get(config.power).state === 'on');
    }

    function printerDisplayState(state) {
      if (state.state !== 'failed' || !config.stage || !config.printError || !config.hmsErrors) {
        return state.state;
      }
      var stage = get(config.stage);
      var error = get(config.printError);
      var hms = get(config.hmsErrors);
      // Cancellation can retain FAILED until idle and both fault clears are confirmed.
      return C.available(stage) && stage.state === 'idle' && C.available(error) && error.state === 'off' &&
        C.available(hms) && hms.state === 'off' ? 'idle' : 'failed';
    }

    function requestPrinterFailureState() {
      var now = io.now();
      if (!connection() || printerFailurePending || !config.stage || !config.printError || !config.hmsErrors ||
          printerDisplayState(get(config.status)) !== 'failed' || printerStartup || printerShutdown ||
          (config.power && get(config.power).state !== 'on') || now - printerFailureAttempt < 10000) { return; }

      printerFailureAttempt = now;
      printerFailurePending = true;
      var ids = [config.status, config.stage, config.printError, config.hmsErrors];
      var generation = ha.generation();
      var expected = {};
      var results = {};
      var index = 0;
      var completed = 0;
      var valid = true;
      var expired = false;
      ids.forEach(function (id) { expected[id] = ha.version(id); });
      var timeout = io.setTimeout(function () {
        expired = true;
        printerFailurePending = false;
      }, 15000);

      function next() {
        if (expired || index >= ids.length) { return; }
        var id = ids[index++];
        ha.fetchState(id, 'failure', now, function (error, entry) {
          if (expired) { return; }
          if (error || !entry || entry.entity_id !== id) { valid = false; }
          else { results[id] = entry; }
          completed++;
          if (completed < ids.length) {
            next();
            return;
          }
          io.clearTimeout(timeout);
          printerFailurePending = false;
          if (valid && connection() && generation === ha.generation() &&
              ids.every(function (entity) { return ha.version(entity) === expected[entity]; })) {
            ids.forEach(function (entity) { ha.update(entity, results[entity]); });
            io.changed();
          }
        });
      }
      next();
      next();
    }

    function status(state) {
      if (!connection()) { return 'disconnected'; }
      if (printerShutdown) { return 'shutting-down'; }
      if (printerStartup) { return 'starting'; }
      if (config.power) {
        var power = get(config.power).state;
        if (power === 'off') { return 'off'; }
        if (power !== 'on') { return 'power-unknown'; }
      }
      return printerDisplayState(state);
    }
    function readPowerState(callback) {
      var id = config.power;
      if (!id || !connection()) {
        if (callback) { callback(new Error('Bağlantı yok')); }
        return;
      }
      var version = ha.version(id);
      ha.fetchState(id, 'power', io.now(), function (error, entry) {
        if (error || !entry || entry.entity_id !== id) {
          if (callback) { callback(error || new Error('Durum okunamadı')); }
          return;
        }
        if (ha.version(id) === version) {
          ha.update(id, entry);
          syncPrinterPower(entry.state);
          if (printerStartup && entry.state === 'off' && io.now() - printerStartup.since > 2500) {
            stopPrinterStartup();
          }
          io.changed();
        }
        if (callback) { callback(null, get(id)); }
      });
    }

    function printerPowerAction() {
      if (powerCheckPending) { return; }
      powerCheckPending = true;
      readPowerState(function (error, state) {
        powerCheckPending = false;
        if (error || !C.available(state)) {
          io.powerUnavailable();
          return;
        }
        if (state.state === 'off') {
          startPrinterStartup();
          performPower('turn_on');
        } else if (state.state === 'on') {
          io.confirmPower(config.power);
        }
      });
    }

    function performPower(service, onSuccess) {
      io.perform('power:' + config.power, 'switch', service, config.power, null, onSuccess, function () {
        if (service === 'turn_off') { startPrinterShutdown(); }
        [350, 1500, 3500].forEach(function (delay) {
          io.setTimeout(function () { readPowerState(); }, delay);
        });
      }, function () {
        if (service === 'turn_off') { stopPrinterShutdown(); }
        if (service === 'turn_on') { stopPrinterStartup(); }
      });
    }

    function printerOffline() {
      var entry = get(config.status);
      return !C.available(entry) || entry.state === 'offline';
    }

    function jobActive() {
      return ['running', 'printing', 'prepare', 'pause', 'paused', 'slicing'].indexOf(get(config.status).state) !== -1;
    }

    function entityChanged(id, state, fromSocket) {
      if (id === config.power && (!fromSocket || state !== undefined)) { syncPrinterPower(state); }
      if (fromSocket && printerStartup && id === config.status && state !== undefined) { checkPrinterStartup(); }
    }

    function powerDialog(id, willOff) {
      var entry = get(id);
      var available = C.available(entry);
      return {
        available: available,
        changed: available && (entry.state === 'on') !== willOff,
        needsAcknowledgement: willOff && jobActive()
      };
    }

    function number(id, minutes) {
      var entry = get(id);
      var value = Number(entry.state);
      if (!C.available(entry) || entry.state === '' || !isFinite(value)) { return null; }
      if (minutes && entry.attributes.unit_of_measurement === 'h') { return value * 60; }
      if (minutes && entry.attributes.unit_of_measurement === 's') { return value / 60; }
      return value;
    }

    function summary() {
      var online = printerDataReady();
      var printing = online && jobActive();
      var progress = number(config.progress);
      var remaining = number(config.remaining, true);
      var current = status(get(config.status));
      var display = printerDisplayState(get(config.status));
      var accent = 'offline';
      if (connection()) {
        if (current === 'off' || current === 'shutting-down') { accent = 'off'; }
        else if (printerStartup) { accent = 'starting'; }
        else if (online) {
          accent = {
            failed: 'error', error: 'error', pause: 'paused', paused: 'paused',
            prepare: 'starting', slicing: 'starting', running: 'printing', printing: 'printing',
            finish: 'done', finished: 'done', idle: 'ready'
          }[display] || 'offline';
        }
      }
      return {
        status: current, accent: accent, printing: printing,
        progress: progress !== null && progress >= 0 && progress <= 100 ? progress : null,
        remaining: remaining !== null && remaining >= 0 ? remaining : null
      };
    }

    function reading(id, remaining) {
      var online = printerDataReady();
      var job = jobActive();
      var value = online ? number(id, remaining) : null;
      if (remaining && (!job || value < 0)) { value = null; }
      return {value: value, idle: online && !job};
    }

    function filaments() {
      var online = printerDataReady();
      return (config.filaments || []).map(function (slot) {
        var entry = get(slot.entity);
        var attributes = entry.attributes;
        var type = attributes.type || entry.state;
        var missing = ['', '?', 'unknown', 'unavailable', 'empty', 'none', 'n/a', 'null', '-', '--'];
        var noInfo = !C.available(entry) || !!attributes.empty || typeof type !== 'string' ||
          missing.indexOf(String(type || '').toLowerCase()) !== -1;
        return {
          label: slot.label, group: slot.group || 'Filamentler', type: type, color: attributes.color,
          active: online && !!attributes.active && !noInfo, empty: !!attributes.empty, noInfo: noInfo
        };
      });
    }

    function telemetry(id) {
      return [config.progress, config.remaining, config.nozzle, config.bed].indexOf(id) !== -1;
    }

    function camera() {
      var connected = connection();
      var power = config.power ? get(config.power).state : 'on';
      var offline = printerOffline();
      var cameraStatus = !connected ? 'disconnected' : printerShutdown ? 'shutting-down' :
        printerStartup ? 'starting' : power === 'off' ? 'off' : offline ? 'offline' : 'waiting';
      return {
        cameraReady: connected && !printerStartup && !printerShutdown && power === 'on' &&
          !offline && C.available(get(config.camera)),
        cameraWaiting: connected && power === 'on' && !offline,
        cameraStatus: cameraStatus
      };
    }

    return {
      tick: requestPrinterFailureState, entityChanged: entityChanged, ready: printerDataReady,
      status: status, summary: summary, reading: reading, filaments: filaments, telemetry: telemetry,
      jobActive: jobActive, checkPower: printerPowerAction, performPower: performPower,
      powerDialog: powerDialog, camera: camera
    };
  }
  root.PanelV2Printer = {create: create};
})(this);
