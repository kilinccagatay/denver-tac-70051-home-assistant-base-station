const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const temp = {textContent: '--'};
const unit = {textContent: '°C'};
const widget = {querySelector: selector => selector === '.weather-temp' ? temp : unit};
const callbacks = [(state, attributes) => {
  // HoaryDash's stock weather widget ignores attribute-only updates and
  // incorrectly substitutes zero when a delta omits temperature.
  if (state !== undefined) temp.textContent = Math.round(parseFloat(attributes.temperature || 0) * 10) / 10;
}];
const context = {
  window: {entityListeners: {'weather.example_home': callbacks}},
  document: {readyState: 'complete', querySelectorAll: () => [widget]}
};
const script = fs.readFileSync('examples/hoarydash-weather-state.js', 'utf8');
vm.runInNewContext(script, context);
function update(state, attributes, expected) {
  callbacks[0](state, attributes);
  assert.equal(temp.textContent, expected);
}
update('partlycloudy', {temperature: 12.5, humidity: 83}, 12.5);
update('cloudy', {humidity: 80}, 12.5);
update(undefined, {temperature: 12.7}, 12.7);
update(undefined, undefined, 12.7);
update('cloudy', {temperature: 0}, 0);
update('unavailable', {}, '--');
update('cloudy', {humidity: 80}, '--');
update(undefined, {temperature: -2.1}, -2.1);
update('cloudy', {temperature: null}, '--');
update('cloudy', {temperature: 'bad'}, '--');
update('sunny', {temperature: 12.5, temperature_unit: '°C'}, 12.5);
vm.runInNewContext(script, context);
assert.equal(callbacks.length, 1, 'installation is idempotent');
console.log('Weather state regression checks passed.');
