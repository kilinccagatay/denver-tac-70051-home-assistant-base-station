"""Real HA template checks; no network or household actions."""
import tempfile
import unittest
from pathlib import Path
import yaml
from homeassistant.core import HomeAssistant
from homeassistant.helpers.template import Template
from homeassistant.util import dt as dt_util

ROOT = Path(__file__).resolve().parents[1]

class ApparentTemperatureTests(unittest.IsolatedAsyncioTestCase):
    async def test_numeric_bounds_freshness_and_regional_location(self):
        with tempfile.TemporaryDirectory() as folder:
            hass = HomeAssistant(folder)
            config = yaml.safe_load((ROOT / 'examples/weather/open-meteo-feels-like.yaml').read_text())[0]
            sensor = config['sensor'][0]
            available = Template(sensor['availability'], hass)
            value = Template(sensor['value_template'], hass)
            now = dt_util.utcnow().timestamp()
            for temperature in [-12.5, 0, 8.1]:
                data = {'value_json': {'current': {'apparent_temperature': temperature, 'time': now}}}
                self.assertTrue(available.async_render(data))
                self.assertEqual(value.async_render(data), temperature)
            for temperature, epoch in [(None, now), ('invalid', now), (2, now-1900), (2, now+400)]:
                data = {'value_json': {'current': {'apparent_temperature': temperature, 'time': epoch}}}
                self.assertFalse(available.async_render(data))
            self.assertIsNone(value.async_render({'value_json': {'current': {'apparent_temperature': None}}}))
            hass.states.async_set('zone.home', '0', {'latitude': 40.129, 'longitude': 20.987})
            url = Template(config['resource_template'], hass).async_render()
            self.assertIn('latitude=40.1&longitude=21.0', url)
            self.assertNotIn('40.129', url)
            self.assertNotIn('20.987', url)

if __name__ == '__main__':
    unittest.main()
