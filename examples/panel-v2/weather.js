/* Shared weather state and refresh policy. Browser and HoaryDash I/O is injected. */
(function (root) {
  function create(core, config, io, preferencePrefix) {
    var weatherId = config.weather;
    var feelsId = config.outdoorFeelsLike;
    var key = preferencePrefix + 'weather-cache-v1:' + weatherId + ':' + (feelsId || '');
    var memory = {weather: null, feels: null};
    var seen = {};
    var forecastRows = [];
    var forecastAt = 0;
    var forecastAttempt = 0;
    var forecastPending = false;
    var feelsAttempt = io.now();
    var feelsPending = false;
    var lastMinute;

    function isArray(value) {
      return Object.prototype.toString.call(value) === '[object Array]';
    }

    try {
      var stored = JSON.parse(io.load(key) || 'null');
      if (stored && stored.version === 1) {
        memory = {weather: stored.weather, feels: stored.feels};
        if (isArray(stored.forecast) && stored.forecast.length <= 14) {
          forecastRows = stored.forecast;
          forecastAt = Number(stored.forecastAt) || 0;
        }
      }
    } catch (ignore) {}

    function save() {
      try {
        io.save(key, JSON.stringify({
          version: 1,
          weather: memory.weather,
          feels: memory.feels,
          forecast: forecastRows,
          forecastAt: forecastAt
        }));
      } catch (ignore) {}
    }

    function observation(entry, kind, now) {
      if (!io.connected() || !core.available(entry)) { return null; }
      var value = kind === 'weather' ? entry.attributes.temperature : entry.state;
      if (value === null || value === undefined || value === '' || !isFinite(Number(value))) { return null; }
      if (seen[kind] && seen[kind].entry === entry) { return seen[kind].sample; }

      var stamp = Number(entry.attributes.time);
      var sample = {
        value: Number(value),
        condition: kind === 'weather' ? entry.state : '',
        at: isFinite(stamp) && stamp > 0 ? stamp * 1000 : now
      };
      seen[kind] = {entry: entry, sample: sample};
      if (core.weatherReading(sample, null, [], 0, now, kind === 'feels').source === 'live' &&
          (!memory[kind] || sample.at >= memory[kind].at)) {
        memory[kind] = sample;
        save();
      }
      return sample;
    }

    function indoorReading(id, humidity) {
      var entry = io.get(id);
      var value = Number(entry.state);
      var valid = io.connected() && core.available(entry) && entry.state !== '' && isFinite(value);
      if (humidity && (value < 0 || value > 100)) { valid = false; }
      return {value: valid ? value : null, raw: entry.state, unit: entry.attributes.unit_of_measurement || '°C'};
    }

    function readings() {
      var now = io.now();
      var outdoor = observation(io.get(weatherId), 'weather', now);
      var feels = observation(io.get(feelsId), 'feels', now);
      return {
        outdoor: core.weatherReading(outdoor, memory.weather, forecastRows, forecastAt, now, false),
        feels: core.weatherReading(feels, memory.feels, forecastRows, forecastAt, now, true),
        indoor: indoorReading(config.indoorTemperature, false),
        humidity: indoorReading(config.indoorHumidity, true)
      };
    }

    function forecast() {
      var now = io.now();
      var fresh = io.connected() && forecastAt > 0 && now - forecastAt < 3600000;
      var usable = forecastAt > 0 && forecastAt <= now + 300000 && now - forecastAt <= 604800000;
      var rows = core.forecastDays(usable ? forecastRows : [], now, config.forecastDays);
      return {
        fresh: fresh,
        usable: usable,
        pending: forecastPending,
        rows: rows,
        incomplete: rows.some(function (day) { return day.high === null; })
      };
    }

    function requestForecast(now) {
      if (!weatherId || forecastPending || !io.connected() || now - forecastAttempt < 60000 ||
          (forecastAt && now >= forecastAt && now - forecastAt < 1800000)) { return; }
      forecastAttempt = now;
      forecastPending = true;
      io.forecastChanged();
      var finished = false;
      io.fetchForecast(weatherId, function (rows) {
        if (finished) { return; }
        finished = true;
        forecastPending = false;
        if (isArray(rows) && rows.length) {
          try {
            forecastRows = rows.slice(0, 14).map(function (row) {
              return {
                datetime: row.datetime,
                condition: row.condition,
                temperature: row.temperature,
                templow: row.templow,
                apparent_temperature: row.apparent_temperature
              };
            });
            forecastAt = io.now();
            save();
          } catch (ignore) {}
        }
        io.forecastChanged();
        io.changed();
      });
    }

    function requestFeelsLike(now) {
      if (!feelsId || !io.connected() || feelsPending || now - feelsAttempt < 60000) { return; }
      feelsAttempt = now;
      feelsPending = true;
      var generation = io.generation();
      var version = io.version(feelsId);
      var expired = false;
      var timeout = io.setTimeout(function () {
        expired = true;
        feelsPending = false;
        io.changed();
      }, 15000);
      io.fetchState(feelsId, now, function (error, entry) {
        if (expired) { return; }
        io.clearTimeout(timeout);
        feelsPending = false;
        if (!error && io.connected() && generation === io.generation() && entry && entry.entity_id === feelsId) {
          var incoming = Number((entry.attributes || {}).time) || 0;
          var current = Number(io.get(feelsId).attributes.time) || 0;
          if ((!core.available(entry) && io.version(feelsId) === version) ||
              (core.available(entry) && incoming >= current)) {
            io.update(feelsId, {state: entry.state, attributes: entry.attributes || {}});
          }
        }
        io.changed();
      });
    }

    function tick(canRequestForecast) {
      var now = io.now();
      var minute = Math.floor(now / 60000);
      if (minute !== lastMinute) {
        lastMinute = minute;
        io.changed();
      }
      // Recover missed state updates through HA without polling the weather provider.
      requestFeelsLike(now);
      if (canRequestForecast) { requestForecast(now); }
    }

    return {readings: readings, forecast: forecast, tick: tick};
  }

  root.PanelV2Weather = {create: create};
})(this);
