"""Real HA template validation; never calls weather or household services."""
from datetime import timedelta
from homeassistant.util import dt as dt_util
import tempfile
import unittest
from pathlib import Path
import yaml
from homeassistant.core import HomeAssistant
from homeassistant.helpers.template import Template

ROOT = Path(__file__).resolve().parents[1]

class LocalApparentTests(unittest.IsolatedAsyncioTestCase):
    async def test_weather_units_signed_values_and_invalid_inputs(self):
        with tempfile.TemporaryDirectory() as folder:
            hass = HomeAssistant(folder)
            cfg = yaml.safe_load((ROOT/'examples/weather/met-no-feels-like.yaml').read_text())[0]['sensor'][0]
            available = Template(cfg['availability'], hass)
            value = Template(cfg['state'], hass)
            def set_weather(**changes):
                attrs = dict(temperature=7.4, humidity=90, wind_speed=13, temperature_unit='°C', wind_speed_unit='km/h')
                attrs.update(changes)
                hass.states.async_set('weather.forecast_home', 'cloudy', attrs)
            set_weather()
            self.assertTrue(available.async_render())
            self.assertAlmostEqual(value.async_render(), 3.9, places=1)
            for unit, speed in [('m/s', 5), ('km/h', 18), ('mph', 5/0.44704), ('kn', 5/0.5144444444444445)]:
                set_weather(temperature=-10, wind_speed=speed, wind_speed_unit=unit)
                self.assertTrue(available.async_render())
                self.assertAlmostEqual(value.async_render(), -16.7, places=1)
            set_weather(temperature=0, wind_speed=0, humidity=0)
            self.assertTrue(available.async_render())
            self.assertEqual(value.async_render(), -4.0)
            for changes in [dict(temperature=None), dict(humidity='unknown'), dict(wind_speed=None), dict(wind_speed_unit='invalid'), dict(temperature_unit='°F'),dict(humidity=101)]:
                set_weather(**changes)
                self.assertFalse(available.async_render())
            set_weather()
            self.assertFalse(available.async_render({'now': lambda: dt_util.utcnow() + timedelta(seconds=7300)}))
            hass.states.async_set('weather.forecast_home','unavailable')
            self.assertFalse(available.async_render())

if __name__ == '__main__': unittest.main()
