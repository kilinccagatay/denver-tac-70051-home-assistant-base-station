# Office dashboard profile (Samsung test device)

This optional landscape profile is independent of the default Denver dashboard.
Install it as a separate HoaryDash dashboard route with `profile: "office"` in
its private mapping. Do not replace an existing household dashboard to enable it.

The home view prioritizes the office lamp and a printer summary. Iris is available
under Işıklar → Odalar. Room-off remains in Işıklar → Toplu; it is not a home tile.
Robot and native battery controls can be omitted for a batteryless office panel.

## Printer power

An existing power switch can be assigned explicitly:

```json
"printer": {
  "label": "3D Yazıcı",
  "status": "sensor.example_print_status",
  "progress": "sensor.example_print_progress",
  "remaining": "sensor.example_print_remaining",
  "power": "switch.example_printer_power",
  "camera": "camera.example_printer"
}
```

Use the actual switch from the existing power automation, not a chamber-light,
fan, or camera entity. There is no separate home power button. One tap on the
home printer summary opens Yazıcı; two taps within350ms control its power. The
printer status card on Yazıcı also accepts the same double tap.

With a confirmed off switch state, double tap turns power on directly. With an
on switch state, it opens a separate confirmation with Vazgeç and Gücü Kapat.
If the printer is printing, preparing, slicing, or paused, a checkbox must be
selected before power-off is enabled. The job requirement is reevaluated while
the dialog is open and again before sending a command, including a job that
starts after the dialog was opened. Idle/finished printers do not show the box.
The confirmation also rechecks switch availability and state. Opening or
cancelling it never sends a power command. Device power is excluded from
household all-lights-off targets.

## Native navigation control

In the Samsung app, Panel Settings → Alt Tuşlar opens the native navigation-lock
settings. This requires the Samsung flavor's optional Accessibility service.
Home, Back and Recent Apps can be blocked while the dashboard is foregrounded;
Power and volume remain normal. Serbest restores navigation. No Accessibility
service is added to the Denver flavor. In a regular web browser the native
control is unavailable; this link is intended for the Samsung panel app.

This profile is experimental. Compilation and mock tests do not replace the
installed-device checks in regression-checklist.md. Physical screen and wake
acceptance is recorded separately; full panel blanking is not yet accepted.

## Printer camera view

![Actual Samsung printer view during an H2D print](images/samsung-printer-live.png)

This device capture shows the camera, live print telemetry and AMS groups, with
AMS-HT on the left and the active filament highlighted in a rounded, padded tile.
The camera fills its rounded viewport using aspect-preserving cropping, with
12px card padding and an 8px gap below the header.

The Home printer tile places a small two-line remaining-time readout at the lower
left and progress at the lower right. Missing, negative, idle, disconnected or
powered-off data clears the remaining-time readout. Valid values below one
minute display `<1dk`; hour/second sensors are converted to minutes.

![Home printer tile with remaining minutes and progress](images/samsung-printer-summary.png)


The visible Yazıcı tab retains the internal Diğer route for existing bookmarks.
It removes the clock/date/weather column and uses the full body for camera plus
print metrics. Snapshots are requested through the existing authenticated server
proxy; no access token or printer password is embedded in the dashboard. A frame
is requested two seconds after the previous frame loads. Errors retry after ten
seconds. Leaving the tab, hiding the page, or pressing Duraklat cancels refresh
and removes the displayed frame. Unavailable camera states show an explicit
message and do not start image requests.

The Home Assistant camera entity must work first. H2D/H2S owners must enable
LAN Only Liveview in the printer's network settings, as documented by the
[integration setup guide](https://docs.page/greghesp/ha-bambulab/setup). This is
separate from switching the entire printer to LAN-only operation. A camera tile
or successful mock test does not establish working live video on the device.

## Startup and compact printer details

A power-on request enters a temporary Açılıyor state. It is ended by a fresh
Home Assistant status report, not an old cached idle snapshot, and expires after
two minutes. After readiness, ordinary printer state controls the display again.
Switch state is read before each double tap and read back after a power command.
An off switch is Kapalı; an on switch with an unreachable printer is Çevrimdışı.
Camera requests are suppressed when the switch is not on or the printer is offline.

Optional printer mapping fields `nozzle` and `bed` are temperature sensor entities.
`filaments` is an array of `{ "entity": "sensor.example_tray_1", "label": "A1" }`.
With these fields the right column shows status, progress as a soft green card
fill, a compact time/nozzle/bed row, and filament material/color chips. Active
trays are marked. Disconnected data is labelled Son bilinen; unavailable telemetry
uses a dash rather than stale temperatures. RFID, spool identifiers and print
filenames are not displayed or exported.

## Indoor temperature and physical AMS order

Both profiles can optionally set `indoorTemperature` to a temperature sensor and
`indoorLabel` to a descriptive label. A house icon and a large one-decimal reading share the weather area below the
clock, beside the outdoor value. Controls and the clock retain their positions.
Missing/disconnected values show a dash; weather and indoor values remain distinct.
The installer subscribes to the configured sensor without creating HA entities.

Filament entries can optionally include a `group` label. Their configuration
order defines the physical display order, e.g. AMS-HT with slot label1 first,
then AMS2Pro with labels1–4. Each group has its own heading and divider. These
labels are presentation-only; power automation and HA entity identity do not change.
Camera pause/play buttons use SVG icons with descriptive accessible labels.

## Spacing conventions

Cards use8px vertical and12px horizontal padding with a fixed icon slot and
consistent title/value rhythm. Compact printer cards retain their own smaller
font scale. Telemetry and filament panels follow the same insets; repeated office
style overrides have been consolidated into one component rule per variant.
The lower-left settings control is offset10px downward on both profiles, retaining
clearance from the bottom navigation. Its hit target size is unchanged.

Optional `indoorHumidity` accepts the matching HA humidity sensor entity. Its
percentage appears with a droplet beside the indoor caption, using the existing
weather row on both profiles. Values outside0–100 or unavailable/disconnected
states display a dash. Samsung uses26px temperature numerals and16px humidity;
Denver retains44px temperature numerals with18px humidity. The shared reading
area is offset6px left without moving the clock or control grid. The extra sensor
uses the existing state subscription, not a new periodic polling loop.

## Optional workday agenda

Set an explicit `agenda` sensor ID in the private office mapping to enable the
six-cell home layout. The office lamp and printer remain in the right column.
The agenda occupies the lower-left two cells, leaving the upper-left pair
available for later information. Without `agenda`, the previous home layout is
preserved. Denver must not receive this setting or subscribe to meeting titles.

The sensor comes from Mac Call Indicator's optional macOS Calendar channel:
[Calendar setup and freshness (companion draft)](https://github.com/kilinccagatay/mac-call-indicator/pull/1).
It provides `events` (title/start/end), `day_start`, and `valid_until` attributes.
The meeting list scrolls under the day tabs. Switching days or resetting the
screen returns the list to the top.
Past events disappear. Samsung keeps the last successful plan in its local WebView
storage for the workdays covered by that plan. If the Mac or connection goes
offline, the panel displays the cached schedule in the same layout. Cached
events do not receive the live meeting highlight. Without a usable snapshot the
panel says the calendar cannot be updated. Weekends use the
next Monday selected by the Mac helper. Calendar titles render as text only.

EventKit change notifications plus a one-minute query fallback detect changes
once they have synced into macOS Calendar. Heartbeats expire after 90 seconds.
Neither this display nor a weekday schedule can guarantee invitation delivery
while the Mac is asleep or the calendar provider has not synchronized.

Tests use synthetic titles. Never commit a private mapping, calendar payload,
webhook credential or a screenshot containing real work meetings.

After adding a newly subscribed entity, restart HoaryDash once: its existing
WebSocket handlers can retain the previous entity list even after the HTML is
rebuilt. Asset-only edits with the same subscriptions do not require this. Verify
actual incoming events and reconnection, rather than treating HTML refresh as
proof that a new subscription is active.

The home printer summary uses subdued accents for ready, printing, preparation,
pause, error and completed states. While a live job has a valid progress value,
the percentage appears in the lower-right corner. Power-off, unavailable and
invalid values hide it even if an old printer status still says running. Existing
single-tap navigation and double-tap power confirmation are preserved.

![Office agenda and printer progress using synthetic data](images/office-agenda-printer-demo.jpg)

The illustration uses synthetic meeting titles and a simulated print percentage;
it contains no actual calendar content and is not a physical printer test.

Printer telemetry uses fixed-size centered icon boxes and equal-width cells.
Remaining time is shown only for an active job; idle state shows an em dash
while nozzle and bed readings remain live. An active job estimated below one
minute shows `<1 dk` rather than claiming a completed print.

Configured AMS slots always retain their physical positions and numbers. Empty
or unavailable slots show an em dash material label and a gray/white checker
swatch; an empty slot cannot retain the active-filament highlight.

## Daily weather overview

Set `weeklyForecast: true` in the private office mapping to fill the upper-left
pair above the agenda. Set `forecastDays: 5` for five wider columns (default: seven). The first column is always today, followed by consecutive local calendar days. This option requires the office agenda layout; Denver
remains unchanged. The widget reads daily forecasts from the existing Home
Assistant weather entity through HoaryDash's authenticated proxy. No location,
weather API key or Home Assistant token is placed in frontend configuration.

The read-only card shows Turkish weekday labels, distinct colored SVG weather
symbols and daily high/low temperatures. It requests forecasts at most every
30 minutes while the home view is visible, retries failures after one minute,
and expires cached values after one hour. Disconnection hides cached values.
A provider may supply fewer than seven days: those days retain their columns
with em dashes and an explicit missing-data note, rather than invented readings.
No native selection menu or service command is triggered by holding the card.

Actual Samsung forecast card (cropped to exclude calendar titles and private configuration):

![Five-day forecast starting today](images/office-five-day-forecast.png)

## Power-off and retained printer readings

The configured printer power switch takes priority over cached print sensors.
While a power-off command is awaiting confirmation the UI shows `Kapatılıyor…`
and suppresses progress and live telemetry. Confirmed power-off shows `Kapalı`;
progress/remaining time/temperatures become em dashes, progress fills clear and
camera requests stop. A retained `running` state or percentage cannot keep the
home percentage visible without confirmed power. A bounded shutdown state clears
on failure or timeout; startup continues to wait for a fresh printer response.
Filament metadata can remain labelled `Son bilinen`, but no slot is marked active
while the printer is off, starting, shutting down or disconnected.

Actual Samsung Printer view with the configured power switch off:

![Printer off: no retained progress or live telemetry](images/office-printer-off.png)

## Three-workday agenda selection

The optional calendar area has three equal day tabs. The first is today's
workday, or Monday on weekends; the next two workdays skip Saturday/Sunday.
The selected tab has a filled, outlined accent treatment. Tapping a day filters
its meetings without changing lights or meeting status. An empty day explicitly
says there are no meetings; expired/disconnected data says it cannot update.
The three day tabs stay in their original chronological order. In automatic
mode, the selected tab is the first displayed day with a valid meeting that has
not ended (including one currently in progress). If today is finished/empty,
selection moves to the next displayed day with a meeting; if all three days are
empty, it stays on the first tab. New invitations and meeting end times update
automatic selection without waiting for an additional user action.

A manual day selection survives ordinary calendar heartbeats and clock ticks.
A new base workday, document hiding or native `panel-display-dark` event clears
the manual choice and applies the same automatic rule, rather than always
selecting today. Expired/disconnected data never drives a new inferred selection;
the existing unavailable message remains. Legacy single-day reports still work.
On Samsung, the native dark event also closes dialogs and returns the dashboard
to Odam, stopping Printer-view camera requests. It does not use a separate web
idle timer or change Android timeout/motion/power policy. Brightness-only
dimming needs that native event; browser visibility alone is insufficient.

Use MacCallIndicator development Build 8 and the matching updated agenda receiver.
Upgrade the receiver first, then restart HA; old single-day reports remain valid.
No agenda title subscription or APK update is added to Denver.

![Samsung three-day agenda, meeting titles redacted](images/office-three-day-agenda.png)

Actual Samsung Home capture. Meeting titles were covered with flat neutral labels
before publication; no underlying work title or metadata is retained.

See [the three-day validation record](three-day-agenda-review.md) for exact scope
and outstanding physical-device acceptance.

## Cancelled jobs and retained failure state

Some Bambu printers retain `failed` as the last job result after cancellation.
The panel does not infer a current hardware error from that result alone when
corroborating sensors are configured. Optional printer mapping fields are
`stage` (a sensor), `printError` and `hmsErrors` (binary problem sensors).

If status is `failed`, stage is explicitly `idle` and both problem sensors are
available and `off`, Home and Printer show **Hazır** with the ready accent. The
old percentage and remaining-time footer stay cleared because no job is active.
Active, unknown, unavailable or unconfigured corroborating signals retain the
failure display. While the office display still resolves a retained `failed`
state as a failure, it revalidates the four status/stage/fault readings from HA
at most once per 10 seconds, with only two requests in flight and a 15-second
batch timeout. A complete successful batch is applied atomically; newer live
events and reconnect generations win over late responses. Recovery stops when
Ready is confirmed. This repairs a missed fault-clear update without polling
the printer or clearing a real error on a timer. There is no time-based suppression of errors, fabricated
cancellation reason, or change to the underlying Home Assistant entities/history.

```json
{
  "stage": "sensor.example_printer_stage",
  "printError": "binary_sensor.example_printer_error",
  "hmsErrors": "binary_sensor.example_printer_hms_errors"
}
```

Add these inside your existing `printer` mapping. The installer validates their
domains and subscribes them explicitly; no printer service is called.

## Optional computer-aware Samsung display power

The rooted Samsung can use MacCallIndicator's existing heartbeat to select full
Android display-off after the Mac has stopped reporting for two minutes and the
panel's own idle timeout has darkened it. Fresh reports restore normal
backlight-only behavior. The meeting boolean is ignored; app exit, permission
loss or connectivity loss can also interrupt the heartbeat, so this is not
proof of a Mac shutdown. A partial CPU wake lock keeps the network recovery
path alive while the display is off.

See the [Samsung helper setup, controlled-test evidence and rollback](https://github.com/kilinccagatay/wallpanel-android-legacy/blob/lite-motion-core/docs/samsung-computer-display.md).
The Mac app, dashboard JavaScript and Denver do not need updates for this mode.
Immediate camera wake after a manual power press remains an
[explicitly deferred TODO](https://github.com/kilinccagatay/wallpanel-android-legacy/blob/lite-motion-core/docs/samsung-display-todo.md).
The isolated heartbeat off/on cycle passed; real Mac sleep/shutdown, phone reboot
and the complete general-feature acceptance gate remain pending.

See the [automatic agenda-day validation record](agenda-auto-day-review.md) for the installed test scope.
