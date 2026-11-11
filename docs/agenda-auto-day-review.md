# Automatic agenda day selection — 2026-11-04

The Samsung office calendar preserves its three chronological workday tabs but
automatically selects the first displayed day with a valid event ending after
now. Ongoing meetings count. Three empty days fall back to the first tab.
A manual selection survives heartbeats and timer ticks until native dark,
document hiding or a base-day change returns it to automatic mode. Stale data
never creates an inferred automatic jump. No meeting/title payload or permissions
changed; no lamp, printer-power or robot command was sent.

## Installed change and rollback

Only the office `panel.js` asset and its embedded copy in HoaryDash's office
custom theme were replaced. The Denver dashboard configuration compared equal,
and served Denver HTML does not contain the new selection helper. CSS, APK,
root helpers, display/camera settings and private mappings were not edited.
Samsung remains its existing Build 20, landscape, native-battery-disabled profile.

Before JS SHA-256:
`0b9abf6236dd7aa89a77cf653a6196e19f68e62a5e0cfef45d5e9c1173741078`.
Installed JS SHA-256:
`022be180e01c5b0e627a85092d6d76543755239f735b9a460524745f108c7335`.
A private backup of the full HoaryDash YAML and previous office asset was saved
under its existing panel backup directory. Restore those matching originals and
refresh the office panel to roll back; no app data clear is needed.

## Verification

- Expanded agenda DOM tests use a fixed Wednesday clock. They cover today
  finished, tomorrow empty, a useful third day, all-empty fallback, retained manual
  choice, native-dark/hidden reset, a newly arriving earlier meeting, last-event
  expiry without a heartbeat, stale data, Friday/Monday/Tuesday order, legacy
  single-day input, escaped titles and disconnected behavior.
- `agenda-panel.test.cjs`, `office-panel.test.cjs`, `panel-ui.test.cjs`,
  `panel-v2.test.cjs`, Acorn ES5 parse and `git diff --check` passed.
- Real Samsung 1280×720 capture showed automatic Thursday selection while the
  tab order stayed Today/Thursday/Friday. A real tap selected empty Today.
  The user then covered the camera, waited for dark, uncovered it and confirmed
  the wake/reset test passed: Thursday was selected again.
- Actual selected Today and Thursday states were visually compared. Existing
  32px chip height, explicit symmetric 4px vertical / 3px horizontal padding,
  rounded 6px corners and equal tab layout were preserved. The 3px horizontal
  inset is the existing compact three-label treatment, not a new optical offset.
  No CSS, icon, text-line-box size, card geometry or spacing was changed.
- Real calendar screenshots remain private; no company meeting titles or personal
  entity mappings were added to the repository.

## Full acceptance gate

This change's requested automatic/manual/dark-reset behavior passed its installed
single-cycle test. This is not full regression or reboot/overnight acceptance.

| ID | Status | Evidence / limit |
| --- | --- | --- |
| D01 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| D02 | PASS | User confirmed covered-camera darkening during the installed reset test. |
| D03 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| D04 | PENDING | Single camera wake/reset cycle confirmed; three-cycle/dim-room sequence not repeated. |
| D05 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| D06 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| D07 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| D08 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| D09 | N/A | Batteryless Samsung has no native battery badge; Denver deployment was not changed. |
| D10 | N/A | Batteryless Samsung has no native battery badge; Denver deployment was not changed. |
| D11 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| D12 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| D13 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| D14 | PASS | No APK update; preferences checked against pre-change XML. |
| U01 | N/A | The Denver-specific eight-control reference is not the Samsung office calendar layout. |
| U02 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| U03 | PASS | Actual office viewport retains all three fitting calendar tabs and card layout. |
| U04 | PENDING | Actual settings reload, manual calendar selection, dark and wake reset observed; full other-tab startup review remains pending. |
| U05 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| U06 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| U07 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| U08 | PASS | Actual Today/Thursday selected and unselected states compared with unchanged explicit padding and line boxes. |
| H01 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| H02 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| H03 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| H04 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| H05 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| H06 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| H07 | N/A | Samsung has no robot or delayed all-lights-off control. |
| H08 | N/A | Samsung has no robot or delayed all-lights-off control. |
| H09 | PENDING | Agenda selection and expiry tests passed; full live calendar invitation synchronization/meeting-channel expiry regression not repeated. |
| H10 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| H11 | PENDING | Complete applicable physical/general regression not repeated on this installed revision. |
| E01 | PASS | Four relevant suites, ES5 parse and diff checks passed; no APK compilation needed. |
| E02 | PASS | Installed office JS hash and real-device behavior verified. |
| E03 | PASS | Only generic source, synthetic tests and documentation selected for publication; screenshots/mappings remain private. |
| E04 | PENDING | Guides and rollback updated; commit/push verification recorded separately. |

Overall: targeted behavior verified; **complete general acceptance PENDING**.
