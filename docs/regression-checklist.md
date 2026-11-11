# Mandatory regression acceptance checklist

A build, deployment, or fix is not complete until every applicable check below
passes on the installed version. Compile success, an ADB command succeeding, a
brightness setting of zero, or a desktop preview alone is not acceptance.

## How to use this gate

- Record the app revision/build, dashboard revision, root-helper revision and
  display profile before and after a change. Preserve preferences and a rollback.
- For each row record PASS, FAIL, PENDING, or N/A, evidence, date and tested version.
  N/A requires an explanation that the feature is not configured; it cannot hide
  a failure. Untested hardware behavior is PENDING, never PASS.
- Repeat the complete applicable checklist after the final installed change.
  A later change invalidates earlier evidence for behavior it could affect.
- Automatic checks supplement actual-device checks. Obtain user observation for
  physical light, sound and camera behavior that telemetry cannot establish.
- Do not actuate household devices or start cleaning just to clear this gate
  without authorization for that test. If unavailable, leave it PENDING.
- Any FAIL or PENDING blocks claiming completion. Report the blocker explicitly;
  restore the stable version when a new change breaks a previously working path.
- Repeated failures require diagnosis and a controlled test before another patch.
  Do not change multiple display/camera parameters at once to chase a symptom.

## Device, display and recovery

| ID | Required check and acceptance |
| --- | --- |
| D01 | Cold boot: dashboard launches automatically, no swipe lock blocks it, selected orientation and touch coordinates match. |
| D02 | Leave camera scene still/covered and do not touch: after 30 seconds from last touch/motion, the configured dark state is reached (allow helper polling latency). |
| D03 | Backlight-only reference: physical light is completely off and stable, without faint glow/flicker; camera and dashboard remain alive. Do not call this Android sleep or LCD power-off. |
| D04 | Uncover/move without touching: camera wakes the light reliably to 191/255 (~75%); repeat at least three off/wake cycles, including dim-room conditions. |
| D05 | Still scene stays dark for at least two minutes; no repeated false wakes or flicker. Camera target stays 3 FPS / 333 ms and reference sensitivity 5 unless a separate change is requested. |
| D06 | Physical short power press while lit darkens it; short press while dark wakes it. Motion still wakes after manual off following the existing grace period. No immediate accidental re-wake. |
| D07 | Physical long power press retains Android's original power menu; dismissing it returns to a usable dashboard. |
| D08 | First tap works while lit after 15 seconds idle and again after at least two minutes; first touch is not consumed by hidden navigation. Check settings, navigation and a permitted lamp action. |
| D09 | Battery percentage/charging state is visible and correct in position on every tab. Long press opens one loading dialog and Android controls; controls hide again after about 12 seconds. Ordinary taps never expose SystemBar. |
| D10 | Native battery overlay does not cover headings or touch controls on any tab; the badge remains reachable when controls are temporarily shown. |
| D11 | Only one copy of each configured root helper runs. Validate process existence AND command line, not PID files alone. A stopped helper recovers within the 30-second supervision interval plus startup latency. |
| D12 | Reboot and repeat timeout, camera wake, power keys, first tap and battery-menu checks. Wi-Fi ADB remains reachable on the trusted LAN. No reboot persistence claim before this test passes. |
| D13 | Dashboard survives at least 30 minutes including idle and wake. Camera remains active and the watchdog does not interrupt normal use. Overnight reliability requires a separate overnight observation. |
| D14 | App update retains preferences, display profile, orientation, camera settings and authentication. No unrequested native migration or firmware replacement. |

## Dashboard appearance and touch

| ID | Required check and acceptance |
| --- | --- |
| U01 | On the physical 800 × 480 reference, Evim, Mutfak, Giriş, Odalar and Robot retain the shared clock/date/weather column and logical controls for their areas. No printer tab. |
| U02 | Large clock and centered two-line date remain legible; day names and weather conditions are Turkish. Weather shows a real current value or a clear unavailable state, never a fabricated 0 °C. |
| U03 | Text, headings, icons and weather fit without clipping, ellipsis hiding essential names, collisions or dark invisible icons. Settings remains at the lower left of the clock area. |
| U04 | Startup/reload does not flash the old layout. Active tab and native overlay spacing remain correct after navigation and wake; configured idle return goes to Evim. |
| U05 | Each interactive control sounds once immediately on finger-down when sound is enabled; disabled/blank areas stay silent. Sound setting works and persists. No extra sound after release. |
| U06 | Tap triggers once, long press opens settings once without also toggling the lamp. Fast/normal/long timing works without a second tap. Dragging/cancelling a gesture does not trigger a stray action. |
| U07 | Closing dialogs uses the X icon, clears selection/focus outlines, makes feedback sound and restores touch. No misleading “Gönderiliyor” label or sound control inside a lamp dialog. |
| U08 | Selected highlights, cards and buttons use consistent spacing. Compare top/bottom and left/right insets, mixed-size text/icon alignment and adjacent selected/unselected states at the actual device viewport. Record intentional optical offsets; do not hide uneven padding behind distributed flex spacing. |

## Home Assistant controls

| ID | Required check and acceptance |
| --- | --- |
| H01 | Evim order: Mutfak / Salon; Yemek Masası / Koridor; Çalışma Odası / Yatak Odası; Robot / Tüm Işıkları Kapat. Short taps toggle without dropdown arrows. |
| H02 | Mutfak toggles counter + sink only. Koridor toggles entrance + front + rear corridor. Mixed group state turns the group off; all-off state turns it on. |
| H03 | Single lamps toggle correctly. Opening a settings dialog sends no service command. Off lamps show 0%, not a retained/default 100%; unknown state is not fabricated. |
| H04 | Brightness and selected presets track confirmed HA state without replacing a slider during drag. Only supported color/temperature controls are offered. |
| H05 | Color/temperature preset applies once and closes after success; failure keeps the dialog usable. RGB lamp button tint follows actual color and clears when off. |
| H06 | Normal next-on restores each configured lamp's calibrated default tone, including warm white where appropriate, without an off/on flash or forcing all lamps to cold white. |
| H07 | “Evi Temizle” starts only when appropriate; “Temizliği Durdur” returns the robot to its dock. Returning/unavailable/error states prevent invalid start actions. |
| H08 | All-lights-off countdown runs 60 seconds, appears only on its button, second tap cancels. The allowlist includes household lighting only; printer/server power and unrelated switches are excluded. Verify targets before any live execution. |
| H09 | Meeting indicator appears only on Evim for fresh meeting state, disappears on meeting end and becomes inactive when its heartbeat expires. The ordinary/Denver meeting channel transmits no meeting titles, participants or company data. An explicitly enabled office calendar channel may show titles and times only; test its independent expiry, next-workday selection and new-event synchronization. |
| H10 | Disconnect/reconnect HA: unavailable controls cannot send misleading actions; reconnection updates actual state and never leaves a stale meeting indicator or stuck pending dialog. |
| H11 | Office printer: power-off overrides retained running/progress readings on Home and Printer views. Percentage text/ARIA/fills clear, live telemetry is unavailable, camera requests stop, and cached AMS slots lose active highlighting. Test delayed switch acknowledgement, startup, failures and navigation without interrupting a real print. |

## Engineering and publication

| ID | Required check and acceptance |
| --- | --- |
| E01 | Run existing relevant automated checks, syntax/ES5 compatibility checks for dashboard changes, and the proper legacy Android build for APK changes. Record exact commands/results. |
| E02 | Install/deploy the intended revision, verify package/build and asset identity, and distinguish local preview from actual tablet acceptance. |
| E03 | No secrets, tokens, private addresses, personal paths, company details or private entity mappings in commits/screenshots. Preserve unrelated uncommitted work. |
| E04 | Update affected guides and commit/push only intended files after validation. Report remaining FAIL/PENDING items explicitly; “pushed” does not mean “accepted”. |

## Acceptance record template

```text
Change / date:
App build / revision:
Dashboard revision:
Root-helper revision / display profile:
Previous stable version / rollback:
Check ID | PASS / FAIL / PENDING / N/A | evidence / explanation
Automated checks:
Physical-device observations:
Boot persistence:
Remaining blockers:
Overall: ACCEPTED only if every applicable row is PASS.
```

This checklist defines required behavior; it is not a claim that a complete
regression run has already passed. Prior individual confirmations must not be
presented as a full acceptance record for a new version.
