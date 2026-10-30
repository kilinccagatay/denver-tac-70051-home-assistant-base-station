"""Real Home Assistant script-engine tests; run in an HA development environment.
No network/devices: services are local test doubles; only the delay is shortened.
"""
import asyncio
import copy
from pathlib import Path
import tempfile
import unittest
import yaml
from homeassistant.core import Context, HomeAssistant
from homeassistant.helpers.script import Script
from homeassistant.helpers import config_validation as cv, template

ROOT = Path(__file__).resolve().parents[1]


class CountdownTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.hass = HomeAssistant(self.temp.name)
        self.calls = []

        async def record(call):
            self.calls.append(dict(call.data))
        self.hass.services.async_register('light', 'turn_off', record)
        self.sequence = yaml.safe_load((ROOT / 'examples/panel-v2/lights-off-script.example.yaml').read_text())['panel_lights_off_delayed']['sequence']
        self.targets = self.sequence[1]['variables']['panel_lights']
        for eid in self.targets:
            self.hass.states.async_set(eid, 'off')
        self.hass.states.async_set('light.unrelated_printer', 'on')
        self.hass.states.async_set('switch.unrelated_server', 'on')

    async def asyncTearDown(self):
        await self.hass.async_stop()
        self.temp.cleanup()

    def runner(self, ms):
        sequence = copy.deepcopy(self.sequence)
        sequence[0]['delay'] = {'milliseconds': ms}
        sequence = cv.SCRIPT_SCHEMA(sequence)
        template.attach(self.hass, sequence)
        return Script(self.hass, sequence, 'Panel countdown test', 'script')

    async def test_only_currently_on_allowlisted_lights_are_targeted(self):
        self.hass.states.async_set(self.targets[0], 'on')
        self.hass.states.async_set(self.targets[1], 'unavailable')
        await self.runner(1).async_run(context=Context())
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(self.calls[0]['entity_id'], [self.targets[0]])

    async def test_empty_selection_never_dispatches_broad_turn_off(self):
        await self.runner(1).async_run(context=Context())
        self.assertEqual(self.calls, [])

    async def test_light_switched_on_during_delay_is_included(self):
        script = self.runner(150)
        task = asyncio.create_task(script.async_run(context=Context()))
        await asyncio.sleep(.03)
        self.hass.states.async_set(self.targets[2], 'on')
        await task
        self.assertEqual(self.calls[0]['entity_id'], [self.targets[2]])

    async def test_cancel_stops_the_delayed_action(self):
        self.hass.states.async_set(self.targets[0], 'on')
        script = self.runner(150)
        task = asyncio.create_task(script.async_run(context=Context()))
        await asyncio.sleep(.03)
        await script.async_stop()
        await task
        self.assertEqual(self.calls, [])


if __name__ == '__main__':
    unittest.main()
