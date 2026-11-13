#!/usr/bin/env python3
"""Inject the optional Panel V2 into an existing HoaryDash YAML. Requires PyYAML.

Run on the HoaryDash host. This edits only a named dashboard, keeps its original
screens and controls, adds required subscriptions, and makes a timestamped backup.
It does not create the HA countdown script or change the tablet APK/root helpers.
"""
import argparse
import copy
import json
from pathlib import Path
import tempfile
import time
import yaml

BEGIN = '/* PANEL_V2_BEGIN */'


def build_configuration(original, mapping, assets, dashboard='dash'):
    lights = mapping['lights']
    assert set(lights) == {'living', 'dining', 'front', 'rear', 'bedroom', 'office', 'counter', 'sink'}
    assert mapping['allLights'] and all(e.startswith('light.') for e in mapping['allLights'])
    assert set(lights.values()).issubset(mapping['allLights'])
    assert all(e in mapping['allLights'] for e in mapping.get('roomLights', {}).values()), 'Room lights must be subscribed household lights'
    assert mapping['countdown'].startswith('script.') and mapping['vacuum'].startswith('vacuum.')
    if mapping.get('weeklyForecast'):
        assert mapping.get('profile') == 'office' and mapping.get('agenda') and mapping['weather'].startswith('weather.'), 'Weekly forecast requires the office agenda layout and an explicit weather entity'
    if mapping.get('agenda'):
        assert mapping.get('profile') == 'office' and mapping['agenda'].startswith('sensor.'), 'Agenda is an office-only explicit sensor'
    if mapping.get('indoorTemperature'):
        assert mapping['indoorTemperature'].startswith('sensor.')
    if mapping.get('outdoorFeelsLike'):
        assert mapping['outdoorFeelsLike'].startswith('sensor.')
    if mapping.get('indoorHumidity'):
        assert mapping['indoorHumidity'].startswith('sensor.')
    printer_entities = [mapping['printer'][key] for key in ('status', 'progress', 'remaining')] if mapping.get('printer') else []
    assert all(entity.startswith('sensor.') for entity in printer_entities)
    if mapping.get('printer', {}).get('power'):
        assert mapping['printer']['power'].startswith('switch.'), 'Printer power must be an explicit switch'
        printer_entities.append(mapping['printer']['power'])
    if mapping.get('printer', {}).get('camera'):
        assert mapping['printer']['camera'].startswith('camera.'), 'Printer camera must be an explicit camera entity'
        printer_entities.append(mapping['printer']['camera'])
    for key in ('nozzle', 'bed'):
        if mapping.get('printer', {}).get(key):
            assert mapping['printer'][key].startswith('sensor.')
            printer_entities.append(mapping['printer'][key])
    for key, domain in [('stage', 'sensor.'), ('printError', 'binary_sensor.'), ('hmsErrors', 'binary_sensor.')]:
        if mapping.get('printer', {}).get(key):
            assert mapping['printer'][key].startswith(domain), 'Printer fault/stage entity has wrong domain'
            printer_entities.append(mapping['printer'][key])
    for slot in mapping.get('printer', {}).get('filaments', []):
        assert isinstance(slot, dict) and slot['entity'].startswith('sensor.') and isinstance(slot['label'], str)
        printer_entities.append(slot['entity'])
    result = copy.deepcopy(original)
    panel = result['dashboards'][dashboard]
    assert any(screen['name'] == 'Ana' for screen in panel['screens']), 'Ana screen is required'
    removed = mapping.get('removedScreens', [])
    assert isinstance(removed, list) and 'Ana' not in removed, 'Ana cannot be removed'
    panel['screens'] = [s for s in panel['screens'] if s['name'] not in removed]
    if mapping.get('robotEnabled', True) is False:
        panel['screens'] = [s for s in panel['screens'] if s['name'] != 'Robot']
    if not any(s['name'] == 'Odalar' for s in panel['screens']) and 'Odalar' not in removed:
        rooms = {'name': 'Odalar', 'icon': 'floor-plan', 'layout': 'tiled', 'dateclock': {'enabled': False}}
        index = next((i for i, s in enumerate(panel['screens']) if s['name'] == 'Robot'), len(panel['screens']))
        panel['screens'].insert(index, rooms)
    custom = panel['theme'].get('custom', '').split(BEGIN)[0].rstrip()
    css = (assets / 'panel.css').read_text()
    if mapping.get('profile') == 'office':
        css += '\n' + (assets / 'office.css').read_text()
    if mapping.get('themeStyle') == 'tessera':
        css += '\n' + (assets / 'tessera.css').read_text()
    for control in mapping.get('otherControls', []):
        assert control['kind'] in ('power', 'sensor')
        assert control['entity'].startswith('switch.' if control['kind'] == 'power' else 'sensor.')
    scripts = ['core.js', 'home-assistant.js', 'controls.js', 'weather.js']
    if mapping.get('agenda'):
        scripts.append('agenda.js')
    if mapping.get('printer'):
        scripts.extend(['printer.js', 'printer-camera.js'])
    scripts.append('samsung-layout.js' if mapping.get('profile') == 'office' else 'denver-layout.js')
    if mapping.get('robotMap'):
        scripts.append('robot-map.js')
    scripts.append('panel.js')
    js = '\n'.join((assets / name).read_text() for name in scripts)
    config = json.dumps(mapping, ensure_ascii=False).replace('<', '\\u003c')
    loading = ("<script>(function(){var d=document.documentElement;d.classList.add('pv2-loading');"
               "window.panelV2LoadingTimer=setTimeout(function(){d.classList.remove('pv2-loading');},8000);})();</script>")
    if mapping.get('profile') != 'office':
        loading = (
            "<style>#pv2-loading-retry{display:none}.pv2-loading #pv2-loading-retry{"
            "display:block;position:fixed;z-index:1000;top:60%;left:40%;width:20%;min-height:44px;"
            "border:1px solid #728493;border-radius:10px;background:#343e47;color:#f1f2f3;}</style>"
            "<script>(function(){var d=document.documentElement;d.classList.add('pv2-loading');"
            "function showRetry(){if(!d.classList.contains('pv2-loading')){return;}"
            "var b=document.createElement('button');b.id='pv2-loading-retry';b.type='button';"
            "b.textContent='Yeniden yükle';b.onclick=function(){window.location.reload();};"
            "document.body.appendChild(b);}"
            "window.panelV2LoadingTimer=setTimeout(function(){if(document.body){showRetry();}"
            "else{document.addEventListener('DOMContentLoaded',showRetry,false);}},8000);})();</script>"
        )
    panel['theme']['custom'] = (custom + '\n' + BEGIN + '\n</style>\n' + loading + '\n<style>' + css
                               + '</style>\n<script>window.PANEL_V2_CONFIG=' + config + ';\n'
                               + js + '\n</script>\n<style>\n')
    # Reuse subscriptions already supplied by cards on any screen. Avoid adding
    # ten duplicate sensor widgets just to obtain ten existing light states.
    home = next(s for s in panel['screens'] if s['name'] == 'Ana')
    cards = home.setdefault('sensors', {}).setdefault('cards', [])
    needed = list(mapping['allLights']) + mapping.get('extraLights', []) + [
        mapping['weather'], mapping['countdown'], mapping['meeting']] + ([mapping['agenda']] if mapping.get('agenda') else []) + ([mapping['indoorTemperature']] if mapping.get('indoorTemperature') else []) + ([mapping['indoorHumidity']] if mapping.get('indoorHumidity') else []) + ([mapping['outdoorFeelsLike']] if mapping.get('outdoorFeelsLike') else []) + ([mapping['vacuum']] if mapping.get('robotEnabled', True) else []) + [c['entity'] for c in mapping.get('otherControls', [])] + printer_entities + [mapping[k] for k in ('robotActive', 'robotStatus') if mapping.get(k)]

    def entity_ids(value):
        found = set()
        if isinstance(value, dict):
            if isinstance(value.get('entity_id'), str):
                found.add(value['entity_id'])
            for child in value.values():
                found.update(entity_ids(child))
        elif isinstance(value, list):
            for child in value:
                found.update(entity_ids(child))
        return found

    # Also trim redundant generated sensor cards from earlier V2 installations.
    home['sensors']['cards'] = []
    elsewhere = entity_ids(panel['screens'])
    home['sensors']['cards'] = [c for c in cards if not (
        c.get('entity_id') in needed and c.get('entity_id') in elsewhere
        and c.get('label') == '' and c.get('icon') == 'circle')]
    cards = home['sensors']['cards']
    existing = entity_ids(panel['screens'])
    for entity in needed:
        if entity not in existing:
            cards.append({'entity_id': entity, 'label': '', 'icon': 'circle'})
            existing.add(entity)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--hoarydash', type=Path, required=True)
    parser.add_argument('--mapping', type=Path, required=True)
    parser.add_argument('--assets', type=Path, required=True)
    parser.add_argument('--backup-dir', type=Path, required=True)
    parser.add_argument('--dashboard', default='dash')
    args = parser.parse_args()
    original_text = args.hoarydash.read_text()
    original = yaml.safe_load(original_text)
    mapping = json.loads(args.mapping.read_text())
    result = build_configuration(original, mapping, args.assets, args.dashboard)
    output = yaml.safe_dump(result, allow_unicode=True, sort_keys=False, width=100)
    assert yaml.safe_load(output) == result
    args.backup_dir.mkdir(parents=True, exist_ok=True)
    backup = args.backup_dir / ('hoarydash-before-panel-v2-' + str(time.time_ns()) + '.yaml')
    backup.write_text(original_text)
    backup.chmod(0o600)
    with tempfile.NamedTemporaryFile('w', dir=args.hoarydash.parent, suffix='.tmp', delete=False) as f:
        f.write(output)
        pending = Path(f.name)
    pending.chmod(args.hoarydash.stat().st_mode & 0o777)
    pending.replace(args.hoarydash)
    print('PANEL_V2_INSTALLED; YAML_VALID; BACKUP_SAVED')


if __name__ == '__main__':
    main()
