# Panel V2: touch controls on older hardware

Panel V2 is an optional ES5/CSS overlay on the existing HoaryDash dashboard.
It preserves WallPanel's native battery badge (including its long press), camera,
backlight profile, watchdog, and power-key behavior. No APK/firmware update is needed.

## Home

The left column has a large clock, two-line Turkish date, larger weather and an
optional fresh meeting indicator. The right column has eight controls:

- Living room and dining table: tap to toggle; hold 650 ms for settings.
- Corridor: turn both corridor lights off if either is on, otherwise both on.
  Hold to adjust the two lights individually.
- Bedroom and office: tap to toggle; hold for settings.
- Kitchen off: **counter and sink only**, excluding the dining table.
- Robot: start when idle/docked, return to base when cleaning/paused; show returning
  without offering another start. Unavailable/error states do not offer actions.
- All lights off: schedule a 60-second shutdown; tap again to cancel. The countdown
  also has a cancel button above the navigation on every tab.

The settings dialog only offers the capabilities the entity supports: brightness,
three white-temperature presets within the device limits, and four RGB presets.
Sliders send a command on release/change, not on every movement. There are no
chevrons under light buttons; long presses do not also toggle. A dragged/canceled
touch does not act. Other tabs keep their existing layouts, using the same light
cards and modal. Printer power remains a separate original control.

The UI distinguishes unavailable devices and disconnected transport from "off".
No blur, continuous animation, framework, or extra state polling is introduced.
Weather changes merge attributes; missing temperature is never replaced with zero.
On connection/reconnection, a one-time targeted REST reconciliation avoids stale
initial data from HoaryDash's warming pool. At most two requests run together,
and WebSocket changes received while a request is in flight take precedence.

## Install

1. Back up the current HoaryDash configuration and use a matching known-good APK
   and root helper profile. Do not change native battery/brightness settings.
2. Copy `examples/panel-v2/config.example.json` to a **private** mapping file. Replace
   every example entity. Give the lights helpful labels. Include every displayed
   light in `allLights` or `extraLights`; `extraLights` are not shutdown targets.
3. Install `examples/panel-v2/lights-off-script.example.yaml` in Home Assistant and
   reload scripts. Set `countdown` in the mapping to that script entity. The script
   and mapping must use the **same explicit household light list**. Exclude power
   switches, smart-plug indicators, printer illumination, and server devices.
4. On the HoaryDash host, with Python 3 and PyYAML available, run:

   ```sh
   python3 tools/install-panel-v2.py \
     --hoarydash /path/to/hoarydash.yaml \
     --mapping /private/path/panel-mapping.json \
     --assets examples/panel-v2 \
     --backup-dir /private/path/panel-backups
   ```

5. HoaryDash regenerates the dashboard and asks connected browsers to reload.
   Restart the HoaryDash add-on once when adding new entity subscriptions; the
   tested 0.13.0 proxy retains its startup subscription list until restart.
   Verify Home, every tab, dialogs, unavailable states, and timeout/motion wake on
   the actual tablet. The install preserves original screens and adds the entity
   subscriptions it requires. Re-running updates the injected overlay once.

Private mappings, complete live configurations, tokens, and backups do not belong
in Git. Assets and sanitized examples here have no credentials or private hosts.
Rollback by restoring the saved YAML. Do not mix two independently implemented
countdown scripts with the same UI mapping.

## Countdown behavior

The running **HA script**, rather than a browser timer, owns the delay. Its on/off
state and `last_triggered` time let a refreshed/reconnected panel reconstruct the
remaining time. `script.turn_off` cancels the waiting script. At expiry the script
selects only currently-on lights from its explicit allowlist; an empty selection
never invokes a broad turn-off action. Lights switched on during the countdown
are included if they belong to that list.

A full Home Assistant restart or script reload stops a waiting script; the UI
then clears its countdown. This is a short exit delay, not a persistent schedule.
Cancellation cannot undo a turn-off service already dispatched at expiry.

## Tests

Run `node tests/panel-v2.test.cjs` for compact state merging, device capabilities,
group behavior, robot state transitions, countdown timing, and touch/long-press
separation. Also run `node tests/weather-state.test.cjs` for weather regression.
The old-browser syntax should be parsed as ES5 before deploying changed assets.

For the countdown's actual HA script engine tests, use an isolated Python 3.13
environment with `tests/requirements-panel-ha.txt`, then run
`python tests/countdown-ha.test.py`. These four tests exercise allowlisted/currently
on targets, empty-selection safety, lights turned on during the delay, and
cancellation. They shorten only the delay and register a local recording service;
no physical devices or network calls are used.
