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
        by_name = {s['name']: s for s in result['dashboards']['dash']['screens']}
        for screen in original['dashboards']['dash']['screens'][1:]:
            if screen['name'] not in mapping.get('removedScreens', []):
                self.assertEqual(by_name[screen['name']], screen)
        self.assertIn('Odalar', by_name)
        custom = result['dashboards']['dash']['theme']['custom']
        self.assertEqual(custom.count(install.BEGIN), 1)
        self.assertIn('root.PanelV2DenverLayout', custom)
        self.assertNotIn('root.PanelV2SamsungLayout', custom)
        self.assertNotIn('Optional dark panel theme', custom)
        for marker in ('root.PanelV2Agenda', 'root.PanelV2Printer', 'root.PanelV2PrinterCamera'):
            self.assertNotIn(marker, custom)
        self.assertTrue(custom.startswith(original['dashboards']['dash']['theme']['custom'].rstrip()))
        self.assertEqual(yaml.safe_load(yaml.safe_dump(result, allow_unicode=True)), result)
        cards = result['dashboards']['dash']['screens'][0]['sensors']['cards']
        subscribed = {c['entity_id'] for c in cards}
        self.assertLessEqual(len(cards), 4, 'reuse existing subscriptions instead of duplicating light sensors')
        self.assertIn(mapping['countdown'], subscribed)
        self.assertIn(mapping['vacuum'], subscribed)
        self.assertNotIn('Yazıcı', by_name)
        self.assertNotIn('light.example_printer_chamber', mapping['allLights'])

    def test_tessera_styles_are_opt_in_for_the_target_route(self):
        original = yaml.safe_load((ROOT / 'examples/hoarydash.example.yaml').read_text())
        original['dashboards']['office'] = copy.deepcopy(original['dashboards']['dash'])
        mapping = json.loads((ROOT / 'examples/panel-v2/config.example.json').read_text())
        mapping.update(profile='office', themeStyle='tessera')
        result = install.build_configuration(original, mapping, ROOT / 'examples/panel-v2', 'office')
        self.assertEqual(result['dashboards']['dash'], original['dashboards']['dash'])
        custom = result['dashboards']['office']['theme']['custom']
        self.assertIn('body.panel-v2.pv2-tessera', custom)
        self.assertIn('"themeStyle": "tessera"', custom)

    def test_removed_tab_is_not_a_swipe_destination_and_home_is_protected(self):
        original = yaml.safe_load((ROOT / 'examples/hoarydash.example.yaml').read_text())
        mapping = json.loads((ROOT / 'examples/panel-v2/config.example.json').read_text())
        mapping['removedScreens'] = ['Yazıcı']
        result = install.build_configuration(original, mapping, ROOT / 'examples/panel-v2')
        names = [s['name'] for s in result['dashboards']['dash']['screens']]
        self.assertNotIn('Yazıcı', names)
        self.assertIn('Yazıcı', [s['name'] for s in original['dashboards']['dash']['screens']])
        mapping['removedScreens'] = ['Ana']
        with self.assertRaises(AssertionError):
            install.build_configuration(original, mapping, ROOT / 'examples/panel-v2')

    def test_office_profile_isolated_from_original_dashboard(self):
        original = yaml.safe_load((ROOT / 'examples/hoarydash.example.yaml').read_text())
        original['dashboards']['office'] = copy.deepcopy(original['dashboards']['dash'])
        mapping = json.loads((ROOT / 'examples/panel-v2/config.example.json').read_text())
        mapping['profile'] = 'office'
        mapping['indoorTemperature'] = 'sensor.example_indoor'
        mapping['indoorHumidity'] = 'sensor.example_humidity'
        mapping['outdoorFeelsLike'] = 'sensor.example_outdoor_feels_like'
        mapping['otherControls'] = [{'entity': 'sensor.example_printer_status', 'label': 'Printer', 'kind': 'sensor'}]
        result = install.build_configuration(original, mapping, ROOT / 'examples/panel-v2', 'office')
        self.assertEqual(result['dashboards']['dash'], original['dashboards']['dash'])
        office_assets = result['dashboards']['office']['theme']['custom']
        self.assertIn('panel-v2-office', office_assets)
        self.assertIn('root.PanelV2SamsungLayout', office_assets)
        self.assertNotIn('root.PanelV2DenverLayout', office_assets)
        cards = result['dashboards']['office']['screens'][0]['sensors']['cards']
        self.assertIn('sensor.example_printer_status', {c['entity_id'] for c in cards})
        self.assertIn('sensor.example_indoor', {c['entity_id'] for c in cards})
        self.assertIn('sensor.example_humidity', {c['entity_id'] for c in cards})
        self.assertIn('sensor.example_outdoor_feels_like', {c['entity_id'] for c in cards})
        mapping['robotEnabled'] = False
        without_robot = install.build_configuration(original, mapping, ROOT / 'examples/panel-v2', 'office')
        self.assertNotIn('Robot', [s['name'] for s in without_robot['dashboards']['office']['screens']])
        self.assertEqual(without_robot['dashboards']['dash'], original['dashboards']['dash'])
        mapping['otherControls'][0]['kind'] = 'power'
        with self.assertRaises(AssertionError):
            install.build_configuration(original, mapping, ROOT / 'examples/panel-v2', 'office')

    def test_printer_failure_corroboration_subscriptions_and_domains(self):
        original = yaml.safe_load((ROOT / 'examples/hoarydash.example.yaml').read_text())
        original['dashboards']['office'] = copy.deepcopy(original['dashboards']['dash'])
        mapping = json.loads((ROOT / 'examples/panel-v2/config.example.json').read_text())
        mapping['profile'] = 'office'
        mapping['printer'] = dict(status='sensor.example_status', progress='sensor.example_progress',
                                  remaining='sensor.example_remaining', stage='sensor.example_stage',
                                  printError='binary_sensor.example_print_error', hmsErrors='binary_sensor.example_hms_errors')
        result = install.build_configuration(original, mapping, ROOT / 'examples/panel-v2', 'office')
        cards = result['dashboards']['office']['screens'][0]['sensors']['cards']
        self.assertTrue(set(mapping['printer'].values()).issubset({c['entity_id'] for c in cards}))
        for marker in ('root.PanelV2Printer', 'root.PanelV2PrinterCamera'):
            self.assertIn(marker, result['dashboards']['office']['theme']['custom'])
        self.assertEqual(result['dashboards']['dash'], original['dashboards']['dash'])
        mapping['printer']['printError'] = 'light.invalid_error'
        with self.assertRaises(AssertionError):
            install.build_configuration(original, mapping, ROOT / 'examples/panel-v2', 'office')

    def test_agenda_subscription_is_office_only(self):
        original = yaml.safe_load((ROOT / 'examples/hoarydash.example.yaml').read_text())
        original['dashboards']['office'] = copy.deepcopy(original['dashboards']['dash'])
        mapping = json.loads((ROOT / 'examples/panel-v2/config.example.json').read_text())
        mapping['agenda'] = 'sensor.example_agenda'
        with self.assertRaises(AssertionError):
            install.build_configuration(original, mapping, ROOT / 'examples/panel-v2')
        mapping['profile'] = 'office'
        result = install.build_configuration(original, mapping, ROOT / 'examples/panel-v2', 'office')
        self.assertEqual(result['dashboards']['dash'], original['dashboards']['dash'])
        self.assertNotIn(mapping['agenda'], result['dashboards']['dash']['theme']['custom'])
        cards = result['dashboards']['office']['screens'][0]['sensors']['cards']
        self.assertIn(mapping['agenda'], {c['entity_id'] for c in cards})
        self.assertIn('root.PanelV2Agenda', result['dashboards']['office']['theme']['custom'])
        mapping['agenda'] = 'light.example_wrong_domain'
        with self.assertRaises(AssertionError):
            install.build_configuration(original, mapping, ROOT / 'examples/panel-v2', 'office')

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
