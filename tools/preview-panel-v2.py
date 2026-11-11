#!/usr/bin/env python3
"""Build standalone Denver and Samsung previews using only synthetic data."""
import argparse
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'examples/panel-v2'
FIXTURES = ASSETS / 'preview'
SCREENS = {
    'denver': ['Ana', 'Mutfak', 'Giriş', 'Odalar', 'Robot'],
    'samsung': ['Ana', 'Işıklar', 'Diğer'],
}
SCENARIOS = {
    'normal': 'Normal',
    'offline': 'Home Assistant çevrimdışı',
    'loading': 'İlk yükleme',
    'missing-weather': 'Dış sıcaklık eksik',
    'empty-agenda': 'Boş ajanda',
    'long-title': 'Uzun toplantı başlığı',
    'printing': 'Aktif baskı',
}


def embedded_json(value):
    return json.dumps(value, ensure_ascii=False).replace('<', '\\u003c')


def profile_config(profile):
    cfg = json.loads((ASSETS / 'config.example.json').read_text())
    cfg.update(indoorTemperature='sensor.preview_indoor', indoorHumidity='sensor.preview_humidity',
               outdoorFeelsLike='sensor.preview_feels')
    for key, filename, mime in [('clickSoundUrl', 'panel-click.mp3', 'audio/mpeg'),
                                 ('clickSoundWavUrl', 'panel-click.wav', 'audio/wav')]:
        cfg[key] = f'data:{mime};base64,' + base64.b64encode((ASSETS / filename).read_bytes()).decode()
    if profile == 'samsung':
        cfg.update(profile='office', nativeBatteryBadge=False, robotEnabled=False,
                   agenda='sensor.preview_agenda', weeklyForecast=True, forecastDays=5)
        cfg['printer'] = {
            'label': 'Bambu Lab H2D', 'status': 'sensor.preview_printer_status',
            'power': 'switch.preview_printer', 'progress': 'sensor.preview_progress',
            'remaining': 'sensor.preview_remaining', 'camera': 'camera.preview_printer',
            'nozzle': 'sensor.preview_nozzle', 'bed': 'sensor.preview_bed',
            'filaments': [{'entity': 'sensor.preview_slot_1', 'label': '1', 'group': 'AMS-HT'}] +
                         [{'entity': f'sensor.preview_slot_{i + 1}', 'label': str(i), 'group': 'AMS 2 Pro'}
                          for i in range(1, 5)]
        }
        cfg['otherControls'] = [
            {'kind': 'sensor', 'label': label, 'entity': cfg['printer'][key], 'icon': 'printer'}
            for key, label in [('status', 'Yazıcı Durumu'), ('progress', 'Baskı İlerlemesi')]
        ]
    return cfg


def panel_document(profile):
    office = profile == 'samsung'
    scripts = ['core.js', 'home-assistant.js', 'controls.js', 'weather.js']
    if office:
        scripts += ['agenda.js', 'printer.js', 'printer-camera.js']
    scripts += [profile + '-layout.js']
    bundle = '\n'.join((ASSETS / name).read_text() for name in scripts)
    css = (ASSETS / 'panel.css').read_text()
    if office:
        css += '\n' + (ASSETS / 'office.css').read_text()
    css += '\n' + (ASSETS / 'tessera.css').read_text()
    screens = SCREENS[profile]
    sections = ''.join(f'<main class="screen" id="screen-{name}" hidden></main>' for name in screens)
    tabs = ''.join(f'<button class="navbar-item" type="button"><span class="navbar-label">{name}</span></button>'
                   for name in screens)
    return ('<!doctype html><html lang="tr"><meta charset="utf-8"><title>Panel önizleme</title>'
            '<style>' + (FIXTURES / 'shell.css').read_text() + '\n' + css + '</style>'
            + sections + '<div class="navbar-container navbar-bottom"><nav>' + tabs + '</nav></div>'
            '<script>window.PANEL_V2_CONFIG=' + embedded_json(profile_config(profile)) + ';\n'
            'window.previewScenario="__PANEL_SCENARIO__";\n'
            'window.PANEL_V2_CONFIG.themeStyle="__PANEL_THEME__";\n' + bundle + '\n'
            + (FIXTURES / 'fixture.js').read_text() + '\n' + (ASSETS / 'panel.js').read_text()
            + '</script></html>')


def preview_document(profile):
    width, height = (800, 480) if profile == 'denver' else (640, 360)
    physical = '800 × 480' if profile == 'denver' else '1280 × 720'
    title = profile.capitalize()
    choices = ''.join(f'<option value="{key}">{label}</option>' for key, label in SCENARIOS.items()
                      if profile == 'samsung' or key not in ('empty-agenda', 'long-title', 'printing'))
    return f'''<!doctype html>
<html lang="tr">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} panel önizleme</title>
<style>
body {{margin:24px;background:#161c26;color:#e1e8f2;font:16px system-ui,sans-serif}}
main {{width:{width + 2}px;margin:0 auto}}
header {{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:16px}}
h1 {{margin:0;font-size:20px}} select {{font:inherit;padding:4px 8px}}
iframe {{border:1px solid #45556c;display:block;background:#171d27}}
</style>
<main>
<header>
  <h1>{title} · {physical}</h1>
  <label>Tasarım <select id="theme"><option value="current">Mevcut</option><option value="tessera">Tessera · Koyu</option></select></label>
  <label>Test verisi <select id="scenario">{choices}</select></label>
</header>
<iframe id="panel" title="{title} paneli" width="{width}" height="{height}"></iframe>
</main>
<script>
var template = {embedded_json(panel_document(profile))};
var selector = document.getElementById('scenario');
var frame = document.getElementById('panel');
var theme = document.getElementById('theme');
function load() {{
  var next = document.createElement('iframe');
  next.id = frame.id;
  next.title = frame.title;
  next.width = frame.width;
  next.height = frame.height;
  next.srcdoc = template.replace('__PANEL_SCENARIO__', selector.value).replace('__PANEL_THEME__', theme.value);
  frame.parentNode.replaceChild(next, frame);
  frame = next;
}}
selector.addEventListener('change', load);
theme.addEventListener('change', load);
load();
</script>
</html>
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    for profile in SCREENS:
        target = args.output / (profile + '.html')
        target.write_text(preview_document(profile), encoding='utf-8')
        print(target)


if __name__ == '__main__':
    main()
