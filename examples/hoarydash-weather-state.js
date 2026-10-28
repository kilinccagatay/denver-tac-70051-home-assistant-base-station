/* Keep full weather state when HoaryDash receives partial HA updates.
   ES5 compatible: paste inside a <script> in the dashboard's injected HTML. */
(function () {
  function installWeatherState() {
    if (window.wallPanelWeatherStateInstalled) { return; }
    window.wallPanelWeatherStateInstalled = true;
    var listeners = window.entityListeners || {};
    for (var entityId in listeners) {
      if (Object.prototype.hasOwnProperty.call(listeners, entityId) &&
          entityId.indexOf('weather.') === 0) {
        wrapWeather(entityId, listeners[entityId]);
      }
    }
  }

  function wrapWeather(entityId, callbacks) {
    var cachedState;
    var cachedAttributes = {};
    var originals = callbacks.slice(0);
    callbacks.length = 0;
    callbacks.push(function (state, attributes) {
      var key;
      if (state !== undefined) { cachedState = state; }
      if (attributes) {
        for (key in attributes) {
          if (Object.prototype.hasOwnProperty.call(attributes, key)) {
            cachedAttributes[key] = attributes[key];
          }
        }
      }
      if (cachedState === 'unavailable' || cachedState === 'unknown') {
        cachedAttributes = {};
      }
      var temperature = cachedAttributes.temperature;
      var valid = temperature !== null && temperature !== undefined &&
        temperature !== '' && isFinite(Number(temperature));
      for (var i = 0; i < originals.length; i++) {
        if (originals[i]) { originals[i](cachedState, cachedAttributes); }
      }
      var prefix = entityId.replace('.', '-') + '-';
      var widgets = document.querySelectorAll('[id^="' + prefix + '"]');
      for (var j = 0; j < widgets.length; j++) {
        var temp = widgets[j].querySelector('.weather-temp');
        var unit = widgets[j].querySelector('.weather-temp-unit');
        if (temp && !valid) { temp.textContent = '--'; }
        if (unit && cachedAttributes.temperature_unit) {
          unit.textContent = cachedAttributes.temperature_unit;
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', installWeatherState);
  } else {
    installWeatherState();
  }
})();
