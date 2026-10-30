"""Run with Python 3 + PyYAML: python tests/panel-install.test.py."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest
import yaml

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('panel_install', ROOT / 'tools/install-panel-v2.py')
install = importlib.util.module_from_spec(spec)
spec.loader.exec_module(install)


class InstallationTests(unittest.TestCase):
    def test_preserves_existing_configuration_and_reinstalls_once(self):
        original = yaml.safe_load((ROOT / 'examples/hoarydash.example.yaml').read_text())
        untouched = copy.deepcopy(original)
        original['dashboards']['another'] = {'unchanged': True}
        mapping = json.loads((ROOT / 'examples/panel-v2/config.example.json').read_text())
        result = install.build_configuration(original, mapping, ROOT / 'examples/panel-v2')
        second = install.build_configuration(result, mapping, ROOT / 'examples/panel-v2')
        self.assertEqual(result, second)
        self.assertEqual(original['dashboards']['dash'], untouched['dashboards']['dash'])
        self.assertEqual(result['dashboards']['another'], {'unchanged': True})
        self.assertEqual(result['dashboards']['dash']['screens'][1:], original['dashboards']['dash']['screens'][1:])
        custom = result['dashboards']['dash']['theme']['custom']
        self.assertEqual(custom.count(install.BEGIN), 1)
        self.assertTrue(custom.startswith(original['dashboards']['dash']['theme']['custom'].rstrip()))
        self.assertEqual(yaml.safe_load(yaml.safe_dump(result, allow_unicode=True)), result)
        cards = result['dashboards']['dash']['screens'][0]['sensors']['cards']
        subscribed = {c['entity_id'] for c in cards}
        self.assertLessEqual(len(cards), 4, 'reuse existing subscriptions instead of duplicating light sensors')
        self.assertIn(mapping['countdown'], subscribed)
        self.assertIn(mapping['vacuum'], subscribed)
        self.assertIn('light.example_printer_chamber', str(result))
        self.assertNotIn('light.example_printer_chamber', mapping['allLights'])

    def test_script_guards_empty_target_and_limits_household_lights(self):
        scripts = yaml.safe_load((ROOT / 'examples/panel-v2/lights-off-script.example.yaml').read_text())
        script = scripts['panel_lights_off_delayed']
        mapping = json.loads((ROOT / 'examples/panel-v2/config.example.json').read_text())
        steps = script['sequence']
        self.assertEqual(steps[0]['delay'], '00:01:00')
        self.assertEqual(set(steps[1]['variables']['panel_lights']), set(mapping['allLights']))
        self.assertEqual(steps[-2]['condition'], 'template')
        self.assertIn('count > 0', steps[-2]['value_template'])
        self.assertEqual(steps[-1]['action'], 'light.turn_off')
        self.assertEqual(steps[-1]['target']['entity_id'], '{{ on_lights }}')


if __name__ == '__main__':
    unittest.main()
