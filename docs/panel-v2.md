# Panel V2: touch controls on older hardware

Panel V2 is an optional ES5/CSS overlay on the existing HoaryDash dashboard.
It preserves WallPanel's native battery badge (including its long press), camera,
backlight profile, watchdog, and power-key behavior. No APK/firmware update is needed.

## Screenshots

These are 800 × 480 browser captures of the deployed dashboard with live HA data,
not screenshots taken from the tablet. The battery badge is a native WallPanel
overlay and is therefore absent in a desktop browser.

![Home controls](../photos/panel-v2/home-browser.png)

![Long-press brightness and color dialog](../photos/panel-v2/light-dialog-browser.png)

| Kitchen | Entrance |
| --- | --- |
| ![Kitchen controls](../photos/panel-v2/kitchen-browser.png) | ![Entrance controls](../photos/panel-v2/entrance-browser.png) |

| Rooms | Robot |
| --- | --- |
| ![Room controls](../photos/panel-v2/rooms-browser.png) | ![Robot controls](../photos/panel-v2/robot-browser.png) |

![Panel preferences](../photos/panel-v2/settings-browser.png)

### Meeting indicator on the actual tablet

Unlike the browser captures above, this is a direct tablet capture with the native
battery badge visible. It shows an active meeting on Evim; only its orientation
was rotated 180° to match the mounted display.

![Active meeting on the physical Denver tablet](../photos/panel-v2/home-meeting-tablet.png)

## Home

The left column has a large clock, two-line Turkish date, larger weather and an
optional fresh meeting indicator. Every room/robot tab retains this same left
column, with room-specific controls on the right. The battery overlay has its
own reserved area at the top left on every screen. The native badge is 58 × 28 dp
with 8 dp top/left margins; headers start after an additional 82 CSS px inset
inside the 22 px panel gutter, keeping every tab title clear of this native layer. The right column has eight controls, in this row order:

| Left | Right |
| --- | --- |
| Kitchen | Living room |
| Dining table | Corridor |
| Office | Bedroom |
| Robot | All lights off |

Their behaviors are:

- Living room and dining table: tap to toggle; hold the configured delay for settings (normal: 500 ms).
- Corridor: group the front corridor, rear corridor, and entrance lights. If any
  is on, turn all three off; otherwise turn all three on. Hold for individual settings.
- Bedroom and office: tap to toggle; hold for settings.
- Kitchen: toggle **counter and sink only**, excluding the dining table. If either
  light is on, turn both off; otherwise turn both on. Hold for individual settings.
- Robot: **Evi Temizle** when idle, **Temizliği Durdur** when cleaning (returns to
  base, including when paused). While returning, another start is not offered. Unavailable/error states do not offer actions.
- All lights off: schedule a 60-second shutdown; tap again to cancel. The countdown
  is displayed only on this Home button; there is no duplicate banner.

The settings dialog only offers the capabilities the entity supports: brightness,
three white-temperature presets within the device limits, and six large circular RGB presets.
The brightness control has a large thumb and percentage readout. Off lamps open
at 0% even if HA retains an old brightness attribute; missing brightness on an on
lamp is shown as unknown rather than 100%. Opening the dialog sends no command. Its brightness and selected color follow live
HA state without replacing a slider while it is being dragged. Single RGB lamp
cards use a dark tint derived from their actual reported color; off/group cards
retain their standard appearance. A preset closes the dialog after a successful HA service response; a failure
keeps it open with a notice. Sliders keep the dialog open. Menu DOM is cached per lamp/group and capability
set, so repeated opens reuse controls while refreshing current values.
Moving the slider to zero turns the lamp off; a positive value turns it on at the
chosen level. Ordinary on/off taps preserve HA’s previous brightness. Optional `defaultLightStates`
profiles supply each lamp’s normal color on the next **panel** turn-on, in the same
command that lights it. A normal warm-white profile stays warm; no universal cold
white is imposed. Off commands do not briefly turn lamps on to reset color.
Calibrate profiles from actual normal/power-on states: Kelvin for color-temperature
lamps, RGB for RGB-only lamps. Off-state null attributes are not usable calibration.
Example values are illustrative; replace them with your own observed defaults.
Other HA controls/automations are not intercepted by this frontend setting. An optional
**Ses: Kapalı / Açık** preference in **Panel Ayarları** enables a quiet
click. Open these separate panel settings using the settings icon below the clock/date
at the lower left; sound controls are not part of individual lamp dialogs. The
preference is saved in this browser only and defaults on unless explicitly disabled.
For low-latency feedback, a tiny PCM sample is decoded into a Web Audio buffer
once and started on touch-down. Unsupported/failed Web Audio engines retain the
working HTML audio fallback: MP3/PCM WAV files served by HA’s public `/local/` static route
for old WebView compatibility; no Internet audio request or microphone
permission is needed. **Sesi Dene** plays a test and reports playback/load errors. The device media volume
must be audible. Audio failures do not block controls. Feedback on interactive controls, presets, close icons, sliders, and navigation
starts on touch/mouse down, before the touch-release/click command. A shared capture listener excludes disabled
controls and blank areas, suppresses synthetic mouse/click duplicates, and retains
keyboard feedback. Valid short touches act at touchend
without waiting for legacy click synthesis; follow-up mouse/click events are
suppressed to avoid double commands. An unpaired touchend does not swallow the
browser click fallback, preserving input recovery when a start event is missing. Long presses
do not replay it when opening settings. The dialog closes with an × icon labeled
"Pencereyi kapat" for accessibility, distinct from turning a lamp off. Drag cancellation still prevents commands.
Panel settings also offer 250/500/800 ms lamp long-press timing (normal: 500 ms; older preferences migrate
by their Fast/Normal/Long choice),
a 20-second panel touch lock for cleaning, and a page reload button. The cleaning
lock does not disable native Android controls or the native battery overlay.
Neither preference changes the battery badge long press or native display helpers.
Touch focus rings clear when the dialog closes; keyboard Tab focus stays visible.
The Home Assistant label at the top indicates the connection to HA.
Sliders send a command on release/change, not on every movement. There are no
chevrons under light buttons; long presses do not also toggle. A dragged/canceled
touch does not act. The five tabs now use a shared layout:

- **Evim** (internal `Ana` route): the eight quick controls above.
- **Mutfak:** counter, sink, and dining table, with no unrelated nearby-room section.
- **Giriş:** entrance and the two corridor lights only.
- **Odalar:** living room, office, bedroom, and a named accent light.
- **Robot:** live status plus start, pause/resume, and return-to-base. Actions respect
  reported HA vacuum feature flags and state; no start is offered during cleaning
  or return, and no dock action while already docked/returning.

Set `roomLights.entrance` and `roomLights.accent` in the private mapping; both must
belong to `allLights`. The installer adds the Odalar navigation/swipe destination
without changing unrelated HA entities or automations. Set `removedScreens` to a list of exact screen names in the private
mapping to remove unwanted tabs, including their swipe destinations. The installer
backs up their original definitions; `Ana` cannot be removed.

The UI distinguishes unavailable devices and disconnected transport from "off".
Pending actions keep their labels and state text stable, dim only the icon, and
prevent duplicate taps until acknowledged. Failures still show a notice.
A small pre-render gate hides the legacy screen until the overlay is ready, avoiding
a flash of the old Home layout. An eight-second fallback releases it if initialization
fails, so a JavaScript failure does not leave a permanent loading screen.
Only the active tab is rendered. The one-second clock tick updates that tab’s
clock/meeting freshness and an active Home countdown; it does not redraw all lamp
cards or hidden tabs. HA event bursts are coalesced into one pending UI update.
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
4. Copy `examples/panel-v2/panel-click.mp3` and `panel-click.wav` into Home
   Assistant’s `/config/www/` directory. The defaults use
   the dashboard hostname on HA port 8123, under `/local/`. Optional `clickSoundUrl`
   and `clickSoundWavUrl` mappings override these URLs if HA uses another address.
   Supervisor-backed API proxies can reject static-file paths, so media is loaded
   directly from HA; no HA token is included in the URLs.
   On the HoaryDash host, with Python 3 and PyYAML available, run:

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

For the DOM interaction regression (no physical HA/device commands), install the
optional test dependency and run:

```sh
npm install --prefix /tmp/denver-panel-ui-tests --no-save jsdom@26.1.0
NODE_PATH=/tmp/denver-panel-ui-tests/node_modules node tests/panel-ui.test.cjs
```

This checks live modal brightness/color, drag protection, cached menu reuse,
250 ms Fast timing/migration, shared feedback, automatic close only after successful
presets, failure notices, Home display naming, and tab activation from cached state.

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

## Tablet remains on the old layout

The tested HoaryDash 0.13.0 proxy uses a shared reload channel; a rebuild notification
can be consumed by another open dashboard connection instead of the tablet.
A normal reboot also does not guarantee that the tablet fetches a fresh document.
Do not erase WallPanel settings or reinstall the APK to solve this.

The verified recovery is to temporarily navigate other dashboard browsers away,
restart only the HoaryDash add-on to discard old connection handlers, let the
tablet reconnect, then save a harmless YAML comment to request a rebuild/reload.
Confirm the new layout on the physical tablet before reopening test dashboards.
Home Assistant and native WallPanel helpers do not need to be restarted or changed.

## First tap is lost after waiting (rooted Android 4.1)

On the tested Denver ROM, this was traced to Android’s `hidden nav` input consumer,
created by `SYSTEM_UI_FLAG_HIDE_NAVIGATION`, rather than the dashboard touch handler.
WallPanel **0.8.4 Build 8** keeps SystemBar visibility under the existing root helper
without requesting that touch-consuming flag on API 16–18. The first tap and the
battery long-press/auto-hide behavior were verified after the update; application
preferences were preserved. Clock/date/audio remain in HoaryDash in this build.

See the [native fix and installation/validation notes](https://github.com/kilinccagatay/wallpanel-android-legacy/blob/lite-motion-core/docs/first-touch-fix.md).
Use an APK with the same signing certificate and an in-place update; do not clear
app data. The root-helper path is firmware-specific, not a generic Android fix.
