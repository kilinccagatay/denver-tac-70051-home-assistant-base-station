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
    result = copy.deepcopy(original)
    panel = result['dashboards'][dashboard]
    assert any(screen['name'] == 'Ana' for screen in panel['screens']), 'Ana screen is required'
    removed = mapping.get('removedScreens', [])
    assert isinstance(removed, list) and 'Ana' not in removed, 'Ana cannot be removed'
    panel['screens'] = [s for s in panel['screens'] if s['name'] not in removed]
    if not any(s['name'] == 'Odalar' for s in panel['screens']) and 'Odalar' not in removed:
        rooms = {'name': 'Odalar', 'icon': 'floor-plan', 'layout': 'tiled', 'dateclock': {'enabled': False}}
        index = next((i for i, s in enumerate(panel['screens']) if s['name'] == 'Robot'), len(panel['screens']))
        panel['screens'].insert(index, rooms)
    custom = panel['theme'].get('custom', '').split(BEGIN)[0].rstrip()
    css = (assets / 'panel.css').read_text()
    js = (assets / 'core.js').read_text() + '\n' + (assets / 'panel.js').read_text()
    config = json.dumps(mapping, ensure_ascii=False).replace('<', '\\u003c')
    loading = ("<script>(function(){var d=document.documentElement;d.classList.add('pv2-loading');"
               "window.panelV2LoadingTimer=setTimeout(function(){d.classList.remove('pv2-loading');},8000);})();</script>")
    panel['theme']['custom'] = (custom + '\n' + BEGIN + '\n</style>\n' + loading + '\n<style>' + css
                               + '</style>\n<script>window.PANEL_V2_CONFIG=' + config + ';\n'
                               + js + '\n</script>\n<style>\n')
    # Reuse subscriptions already supplied by cards on any screen. Avoid adding
    # ten duplicate sensor widgets just to obtain ten existing light states.
    home = next(s for s in panel['screens'] if s['name'] == 'Ana')
    cards = home.setdefault('sensors', {}).setdefault('cards', [])
    needed = list(mapping['allLights']) + mapping.get('extraLights', []) + [
        mapping['weather'], mapping['vacuum'], mapping['countdown'], mapping['meeting']]

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
