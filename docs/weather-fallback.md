# Weather fallback on legacy panels

Both profiles use the same ES5 browser rules, without changing APKs, Home Assistant
weather entities, display helpers, credentials, household controls or CSS.

Priority for outside temperature and apparent temperature is:

1. Valid live sample, at most 30 minutes old and from the current local day.
2. That day's most recent valid observation stored by this browser.
3. A cached daily forecast with a date matching today, fetched at most seven days
   ago. Outside temperature uses the forecast daily high, not a measured current
   temperature. Apparent temperature uses only an explicit `apparent_temperature`
   forecast field. An ordinary high or indoor temperature never substitutes for it.
4. Unavailable if there is no supported, correctly dated value.

Today's old apparent reading is retained independently of the main temperature.
When a new day starts, yesterday's observations expire; forecast rows are matched
by local calendar date, including daylight-saving changes. Late older samples do
not overwrite newer observations. Zero and negative readings are valid. Future,
invalid and over-age cache timestamps are rejected.

The layout and visible condition labels remain unchanged: no new visible fallback
badge or explanatory text. Tooltips and accessible descriptions identify estimates
and last-known apparent readings. The Home Assistant connection indicator remains
independent, including when cached values are displayed while disconnected.

## Storage and refresh

A versioned localStorage key is scoped by profile, weather entity and apparent
sensor. It contains only two observations and at most 14 normalized forecast rows;
no auth token, location coordinates, meeting titles or indoor measurements. Storage
errors do not prevent the dashboard from running. Reloads retain this cache;
clearing application/browser storage deletes it. Nothing is retrospectively
recovered if the browser never observed a valid sample.

Both profiles now read the same HA daily forecast API even if Denver has no
forecast strip. Requests occur only on the home screen, while visible and
connected: successful forecasts refresh at most every 30 minutes, failures retry
at most once per minute, with one request in flight and a 15-second timeout. This
queries Home Assistant's integration, not an additional provider from the tablet.
The office five-day strip keeps valid stored rows during provider/HA outages.
Live data takes priority again as soon as it becomes valid. Cache never controls
lights, meeting state, cameras, printers or device brightness.

## Verification and rollback — 2026-11-04

Automated PASS: `weather-fallback`, `forecast-panel`, `feels-like-refresh`,
`panel-v2`, `panel-ui`, `office-panel`, `agenda-panel`,
`printer-failure-recovery` Node test suites and Acorn ES5 parsing.
Weather scenarios include fresh/old/offline data, reload, midnight, zero/negative,
invalid/future/expired entries, both profiles and return to live values. No real
weather outage or household actuation is required by these tests.

Deployment backs up each profile's `core.js` / `panel.js` and the complete private
HoaryDash YAML before replacing the embedded JS and matching asset copies. Restore
those three files from the deployment backup and restart only HoaryDash to roll
back; APK, preferences, helpers and CSS remain unchanged.

The complete [regression gate](regression-checklist.md) is **PENDING**. No newly
passed full physical/boot/overnight acceptance is implied by automated tests.
Live source identity and page output must be verified after installation. Actual
installed viewport spacing, physical first touch, sound and sleep/wake remain
PENDING until observed on the final version. No new optical offsets or spacing
changes are introduced. Existing shared rules for balanced padding are retained.

### Installed targeted checks

Both served dashboard HTML files contain the exact final shared JS bundle
SHA-256 `e031537ddb5415166f79b8924a075f5d3a8536c129e4a6a6f5606176ea3ff063`.
Live captures on the 1280 × 720 office device and 800 × 480 Denver device show
outside 6.6 °C, apparent 2.6 °C, inside 21.5 °C and 36% RH. No fallback labels are
visible. Both preferences XML files are byte-identical before/after page reload.
The mounted Denver's raw screenshot is inverted by its existing orientation;
that orientation was not changed. No APK/helper replacement was made.

| Gate IDs | Status | Evidence / limit |
| --- | --- | --- |
| D01–D08, D12–D13 | PENDING | Full boot, physical timeout/wake/power/touch/long-run checks not repeated. |
| D09–D10 | PENDING | Denver badge visible in installed capture; long-press behavior not retested. Office has no badge by design. |
| D11 | PENDING | No root-helper changes; full process/recovery test not repeated. |
| D14 | N/A | No APK update; existing native preferences are byte-identical. |
| U01 | PENDING | Installed home layouts retained; all tabs not physically retested. |
| U02–U03 | PASS (targeted) | Both installed viewports show signed-capable temperature/secondary fields without clipping; date/clock retained. |
| U04–U07 | PENDING | Gesture, sound, dialog and idle-return physical checks not repeated. DOM suites pass. |
| U08 | PASS (targeted) | No CSS delta. Existing balanced rows, icon axes, left/right and top/bottom insets retained in installed captures. Selected forecast/day cards match neighbors. No new optical offset. |
| H01–H11 | PENDING | Read-only weather change; no live household/calendar/printer actuation for this gate. Relevant DOM suites pass. |
| E01 | PASS | Eight automated suites and ES5 parser pass on final source. |
| E02 | PASS | Both served bundles match final source; native app pages reloaded. |
| E03 | PASS | Private mappings, preferences and screenshots remain outside repository. |
| E04 | PENDING | Documentation updated; full physical acceptance still open. |

Overall: targeted weather implementation and automated checks PASS; full general
acceptance PENDING. Do not treat this as an overnight/boot reliability claim.
