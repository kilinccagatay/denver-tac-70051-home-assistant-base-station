# HoaryDash startup and connection recovery

HoaryDash 0.13.0 can start before Home Assistant's WebSocket API is ready. Its log
then reports `Build setup failed: fetch component icons` / `websocket: bad handshake`.
The process remains running, but dashboard requests return HTTP 404. Supervisor's
process watchdog cannot detect that failure. An old browser can retain this error
page after the server recovers.

## Server guard

`examples/recovery/hoarydash-guard.py` runs inside an **already installed** Advanced
SSH & Web Terminal app. It exposes no listener and uses that app's existing
`SUPERVISOR_TOKEN` environment variable; it never saves or logs the token. No new
Home Assistant token, permission, cloud service or firmware is required.

Copy the script and a private copy of `config.example.json` to
`/config/hoarydash-recovery/`. Set the actual app slug and static-file probe URLs. Back up
SSH app options before adding this entry to its existing `init_commands` list:

```sh
nohup python3 /config/hoarydash-recovery/hoarydash-guard.py /config/hoarydash-recovery/config.json >/dev/null 2>&1 &
```

Preserve every other option. The SSH app must start automatically. Start the same
command in its terminal for immediate activation without rebooting Home Assistant.
The script requires Python 3 and runs only within this Supervisor app environment.

Every 30 seconds the guard checks generated dashboard HTML using HEAD requests.
For tested HoaryDash 0.13.0, use `/dash%2f` and `/office%2f` (an encoded trailing
slash), **not** the normal dashboard routes and not `index.html`. Go's ServeMux
routes these to the existing public static file handler without the dashboard's
WebSocket-prewarming middleware. A missing dashboard still returns 404. Normal
`/dash/` health probes would accumulate unused warming connections and could
supply old initial states to a later browser. Verify both healthy and missing
static paths when upgrading HoaryDash; this routing behavior is version-specific.
These are health URLs only; the browser launch URLs stay unchanged.
After a failure, it verifies the authenticated Core API is ready. Two consecutive
failed checks while Core is ready permit a restart of **only the configured
HoaryDash app**. It never restarts Core, the host, SSH or Android.

A file lock prevents duplicate guards. Attempts are persisted before requesting a
restart, with a five-minute cooldown and a maximum of three attempts per rolling
hour, including failed restart requests. Healthy responses reset the failure
count, not the hourly safety budget. Missing Core connectivity causes waiting,
not restart loops. A rate limit requires investigation, not bypassing the limit.
Bounded diagnostics are in `guard.log`; restart-budget metadata is in
`guard-state.json`. Both live next to the private configuration.

## Denver browser recovery

`examples/recovery/denver-http-recovery.sh` is sourced by the existing Denver watchdog;
it does not replace its memory, camera, navigation or display logic. Add this
before the watchdog loop:

```sh
[ ! -r /system/xbin/wallpanel-http-recovery ] || . /system/xbin/wallpanel-http-recovery
```

Invoke `http_recovery_tick` once per existing 30-second loop, after `NOW` and
`FOCUS` have been read. Install the script as `/system/xbin/wallpanel-http-recovery`
and put the static-file probe URL (no token, encoded trailing slash as above) in the root-owned mode-600 file
`/data/local/tmp/wallpanel-recovery-url`.

A confirmed HTTP 404 arms recovery immediately; transport failures require two failed probes. After two successful probes, the watchdog
restarts WallPanel once to discard a retained error page. It does so only with
the dashboard foreground and no more than once per five minutes. It never changes
the launch URL, preferences, display brightness or power-key behavior. Transient
single failures do not arm recovery. The current implementation uses BusyBox
`wget -s` with a five-second timeout and requires that option on the device.

This Denver helper is not a Samsung deployment recipe. Samsung has a separate
package and supervisor; do not copy Denver's watchdog or package IDs to it.

## Samsung browser recovery

Samsung now has its own independent recovery worker and Magisk boot supervisor:
see the fork's [Samsung HTTP recovery guide](https://github.com/kilinccagatay/wallpanel-android-legacy/blob/lite-motion-core/docs/samsung-http-recovery.md).
It probes the encoded office static path, reloads only the Samsung package after
confirmed recovery, and defers while Android is asleep or another window is
foreground. It preserves the Mac-linked sleep/display helper and 45% brightness.
Do not reuse Denver's watchdog or package IDs. Its installed recovery and worker
supervision were exercised; full cold-boot and physical regression remain PENDING.
The server guard in this document already monitors both panels.

## Rollback and verification

Remove only the guard's added startup entry, stop its process, and restore the
saved SSH options if necessary. On Denver, restore the saved watchdog script and
restart only that watchdog. Preserve unrelated options and root helpers. The
private URL file and sourced helper can then be removed after rollback.

Run `python3 tests/hoarydash-guard.test.py` and `sh tests/http-recovery.test.sh`.
On the installed system verify healthy pages cause no restart, a controlled 404
triggers one bounded HoaryDash restart, and browser recovery runs once after
connectivity returns. Do not interrupt an actual print, lamp or cleaning task.
Cold-boot persistence, physical timeout/wake/power keys, first touch and extended
reliability still require the complete `regression-checklist.md` acceptance gate.
A startup entry and passing unit tests are not proof of those physical checks.

See the [installed acceptance record](hoarydash-recovery-acceptance.md) for verified checks and remaining PENDING items.
