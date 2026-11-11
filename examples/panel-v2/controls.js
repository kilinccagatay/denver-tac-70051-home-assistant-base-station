/* Household actions and control state. Rendering and Home Assistant I/O are injected. */
(function (root) {
  function create(core, config, ha, io) {
    var pending = Object.create(null);

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

    function setBrightness(id, value) {
      perform('dim:' + id, 'light', value === 0 ? 'turn_off' : 'turn_on',
        id, value === 0 ? undefined : {brightness_pct: value});
    }

    function setColor(id, data, onSuccess) {
      perform('color:' + id, 'light', 'turn_on', id, data, onSuccess);
    }

    function lightSettings(id) {
      var entry = ha.get(id);
      return {
        available: core.available(entry), name: entry.attributes.friendly_name,
        capabilities: core.capabilities(entry), brightness: core.brightness(entry),
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
      setColor: setColor, robot: robot, controlRobot: controlRobot,
      countdown: countdown, toggleCountdown: toggleCountdown
    };
  }
  root.PanelV2Controls = {create: create};
})(this);
