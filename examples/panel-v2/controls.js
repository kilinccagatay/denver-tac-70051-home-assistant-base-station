/* Household actions and control state. Rendering and Home Assistant I/O are injected. */
(function (root) {
  function create(core, config, ha, io) {
    var pending = Object.create(null);
    var dimming = Object.create(null);

    function isBusy(key) {
      return !!pending[key];
    }

    function run(key, action, failed, onStart, onSuccess, onFailure) {
      if (isBusy(key)) { return; }
      pending[key] = true;
      if (onStart) { onStart(); }
      io.changed();
      function finish(ok) {
        delete pending[key];
        if (!ok && onFailure) { onFailure(); }
        io.changed();
        if (ok && onSuccess) { onSuccess(); }
        if (!ok) { io.notice(failed); }
      }
      action().then(finish, function () { finish(false); });
    }

    function perform(key, domain, service, target, data, onSuccess, onStart, onFailure) {
      run(key, function () {
        return ha.call(domain, service, target, data).then(function () { return true; });
      }, 'commandFailed', onStart, onSuccess, onFailure);
    }

    function availableLights(ids) {
      return ids.filter(function (id) { return core.available(ha.get(id)); });
    }

    function lightGroup(ids) {
      var states = Object.create(null);
      ids.forEach(function (id) { states[id] = ha.get(id); });
      return core.group(ids, states);
    }

    function toggleLights(ids) {
      var targets = availableLights(ids);
      if (!targets.length) { io.notice('lightUnavailable'); return; }
      var key = ids.join(',');
      if (lightGroup(ids).on) {
        perform(key, 'light', 'turn_off', targets);
        return;
      }
      var defaults = targets.map(function (id) {
        return core.defaultLightData(ha.get(id), config.defaultLightStates && config.defaultLightStates[id]);
      });
      if (!defaults.some(Boolean)) {
        perform(key, 'light', 'turn_on', targets);
        return;
      }
      run(key, function () {
        return io.all(targets.map(function (id, index) {
          return ha.call('light', 'turn_on', id, defaults[index]).then(function () { return true; }, function () { return false; });
        })).then(function (results) { return results.every(Boolean); });
      }, 'someLightsFailed');
    }

    function turnLightsOff(ids) {
      var targets = availableLights(ids);
      if (targets.length) { perform(ids.join(','), 'light', 'turn_off', targets); }
    }

    function clearBrightness(id, edit) {
      io.clearTimeout(edit.timer);
      delete dimming[id];
      io.changed();
    }

    function brightnessMatches(id, edit) {
      var entry = ha.get(id);
      if (ha.version(id) === edit.version || !core.available(entry)) { return false; }
      if (edit.value === 0) { return entry.state === 'off'; }
      var brightness = core.brightness(entry);
      return entry.state === 'on' && brightness.label !== '—' && brightness.value === edit.value;
    }

    function brightnessChanged(id) {
      var edit = dimming[id];
      if (edit && edit.awaiting && brightnessMatches(id, edit)) { clearBrightness(id, edit); }
    }

    function sendBrightness(id, edit) {
      if (!ha.connected() || ha.generation() !== edit.generation || !core.available(ha.get(id))) {
        clearBrightness(id, edit);
        io.notice('commandFailed');
        return;
      }
      var value = edit.value;
      edit.version = ha.version(id);
      ha.call('light', value === 0 ? 'turn_off' : 'turn_on', id,
        value === 0 ? undefined : {brightness_pct: value}).then(function () {
        // Give rapid input events a short window to coalesce into the latest value.
        edit.timer = io.setTimeout(function () {
          if (edit.value !== value) {
            sendBrightness(id, edit);
          } else if (brightnessMatches(id, edit)) {
            clearBrightness(id, edit);
          } else {
            edit.awaiting = true;
            edit.timer = io.setTimeout(function () { clearBrightness(id, edit); }, 2500);
          }
        }, 125);
      }, function () {
        clearBrightness(id, edit);
        io.notice('commandFailed');
      });
    }

    function setBrightness(id, value) {
      var edit = dimming[id];
      if (edit) {
        if (edit.value === value) { return; }
        edit.value = value;
        if (edit.awaiting) {
          io.clearTimeout(edit.timer);
          edit.awaiting = false;
          sendBrightness(id, edit);
        }
      } else {
        var entry = ha.get(id);
        var brightness = core.brightness(entry);
        if (brightness.label !== '—' && brightness.value === value &&
            (value === 0 ? entry.state === 'off' : entry.state === 'on')) { return; }
        edit = dimming[id] = {value: value, generation: ha.generation(), timer: null, awaiting: false};
        sendBrightness(id, edit);
      }
      io.changed();
    }

    function dimmableLights(ids) {
      return availableLights(ids).filter(function (id) { return core.capabilities(ha.get(id)).dim; });
    }

    function groupBrightness(ids) {
      var levels = ids.map(function (id) { return lightSettings(id).brightness; })
        .filter(function (level) { return level.label !== '—'; });
      if (!levels.length) { return 0; }
      return Math.round(levels.reduce(function (sum, level) { return sum + level.value; }, 0) / levels.length);
    }

    function setGroupBrightness(ids, value) {
      dimmableLights(ids).forEach(function (id) { setBrightness(id, value); });
    }

    function setColor(id, data, onSuccess) {
      perform('color:' + id, 'light', 'turn_on', id, data, onSuccess);
    }

    function lightSettings(id) {
      var entry = ha.get(id);
      var edit = dimming[id];
      return {
        available: core.available(entry), name: entry.attributes.friendly_name,
        capabilities: core.capabilities(entry), brightness: edit ? {value: edit.value, label: edit.value + '%'} : core.brightness(entry),
        selected: function (preset) { return core.presetSelected(entry, preset); }
      };
    }

    function robot(kind) {
      var entry = ha.get(config.vacuum);
      var action = kind ? core.robotControl(entry, kind) : core.robot(entry);
      return {
        service: action.service, label: action.label, detail: action.detail,
        available: core.available(entry), state: entry.state
      };
    }

    function controlRobot(kind) {
      var action = robot(kind);
      if (action.service) { perform(kind ? 'vacuum' : 'robot', 'vacuum', action.service, config.vacuum); }
    }

    function countdown(now) {
      var entry = ha.get(config.countdown);
      return {active: entry.state === 'on', available: core.available(entry), remaining: core.remaining(entry, now)};
    }

    function toggleCountdown() {
      var state = countdown(io.now());
      if (!state.available) { io.notice('countdownUnavailable'); return; }
      perform('countdown', 'script', state.active ? 'turn_off' : 'turn_on', config.countdown);
    }

    return {
      perform: perform, isBusy: isBusy, lightGroup: lightGroup, lightSettings: lightSettings,
      toggleLights: toggleLights, turnLightsOff: turnLightsOff, setBrightness: setBrightness,
      brightnessChanged: brightnessChanged, dimmableLights: dimmableLights,
      groupBrightness: groupBrightness, setGroupBrightness: setGroupBrightness,
      setColor: setColor, robot: robot, controlRobot: controlRobot,
      countdown: countdown, toggleCountdown: toggleCountdown
    };
  }
  root.PanelV2Controls = {create: create};
})(this);
