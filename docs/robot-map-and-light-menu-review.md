# Robot map and adaptive light menus — 2026-11-13

## Behavior

Denver keeps the large overview beside a cropped map rotated 180 degrees, with start,
pause and dock controls on the right. Progress is shown only while cleaning. There
is no remaining-cleaning-time sensor in the inspected installation; elapsed time is
not substituted for an estimate.

Two short taps in the same room, within 350 ms and 32 CSS px on each axis, open a confirmation. A single tap only prefetches room metadata; it never cleans. Holds are ignored.
Cancel, close, navigation, darkness and stale callbacks cannot start cleaning. An
explicit confirmation re-reads room metadata and vacuum state before sending one
allowlisted `app_segment_clean` command. Offline, busy, unknown room, ambiguous
color and mismatched map metadata fail closed. Multiple saved maps are unsupported
and disable selection rather than risk cleaning a different floor.

The current V1 renderer's room-color table was checked against the actual image
and `roborock.get_maps` room IDs. This is a configured palette hit test, **not** raw
segment geometry. `robotMapFlag` and `robotRooms` (numeric `id`, exact integration
`name`, RGB `color`, optional localized `confirm`) must be verified when changing
the map or renderer. Names are checked again on selection and confirmation.

Sources:
- https://github.com/PiotrMachowski/Python-package-vacuum-map-parser-base/blob/master/src/vacuum_map_parser_base/config/color.py
- https://www.home-assistant.io/integrations/roborock/

Both profiles restore the omitted base quick-dim and light-menu styles. Deploying
only a theme fragment had left gesture code without its overlay CSS. The installer
regression now checks that gesture, slider and tab CSS remain in the output.
The full light menu uses brightness and color panes; brightness-only lamps use a
narrow centered card. Group lamp tabs retain their individual capabilities.
The reference YAML uses `more-info` for its light card, so this menu is a custom
implementation in the existing visual language:
https://github.com/alistairmerritt/iOS-dashboard/blob/main/home-assistant

## Validation and acceptance

- PASS: baseline 11 JavaScript suites; later targeted UI, room command and map
  suites. Allowlist, exact segment payload, offline/busy rejection, deduplication,
  pixel rotation, unknown/wall/ambiguous pixels and stale polling callbacks tested.
- PASS: seven installer tests, including restored base menu CSS.
- PASS: browser previews for both profiles: touch hold/drag/release, no command on
  hold alone, group brightness updates, double-tap menus, bounded layout and
  brightness-only 400px cards. Robot preview: short tap no command, long hold opens
  named confirmation, cancellation no command, explicit confirmation sends one
  segment command. All commands in these tests target synthetic fixtures.
- PASS: installed asset identity checked against local JS/CSS; Denver map renders
  on the tablet with right-hand controls and no progress while docked.
- PENDING: physical room-clean execution (intentionally not run), real lamp dimming,
  final adaptive-menu and hold-gesture hardware acceptance where screenshots do
  not prove the interaction; complete device regression D01–D14/U05–U07/H01–H11
  from `regression-checklist.md`, including wake, power keys and reboot.
- Native APK, root helpers and configured display/camera preferences unchanged.
- Backup kept on the Home Assistant host before this deployment. No commit/push.

Overall: deployed and software-tested, **not full physical acceptance**. Robot
execution and kitchen-light actuation are excluded by the user's instructions.

Toast follow-up: content-sized, centered notification measured at 301.7px on the
800px preview (previously almost full width). Final CSS and presentation JS matched
both served routes. During ADB menu checks the corridor group toggled; restored
that group to its observed prior off state. Kitchen lights and vacuum were not
actuated. Device screenshots are local artifacts, not committed fixtures.

Active-job follow-up: live HA evidence showed `vacuum=docked`, cleaning binary
sensor `on`, status `washing_the_mop` simultaneously after the user started a job.
Dock/start enablement now considers the active cleaning job, not vacuum state alone.
Robot-page telemetry refreshes every five seconds and rejects stale/hidden responses.
The UI labels mop preparation explicitly and permits return-to-base while the job
is active at the dock. Tests cover this contradictory state and block a duplicate
room clean. No return/stop command was issued on the real robot by the assistant;
physical cancellation remains unverified.

Loading-size follow-up: fixed the robot workspace width to 100%. Preview measured
identical loading/ready card bounds (408.7 × 296 CSS px) and right rail x=726px;
all tab layout checks passed. Final Denver screenshot confirms the full map card
and correctly placed right rail. This visual check does not clear pending physical
cleaning, brightness, camera/power-key or reboot acceptance.

## Double-tap selection follow-up

Replaced map holds with normalized touch/mouse taps. The first tap starts one
read-only metadata request. The matching second tap opens immediately, reusing
that result or showing “Oda bilgisi alınıyor…” with the start button disabled.
A different room, expired 350ms window, distant point, background tap, drag,
multi-touch, navigation, darkness, disconnect or cancellation invalidates the
previous selection. Requests belong to a selection generation; delayed responses
from room A cannot overwrite room B or reopen a closed dialog. No first-tap toast.

Validation: `tests/robot-room-selection.test.cjs` was written before implementation
and initially failed because the API did not exist, then passed. Six targeted test
results and seven installer tests passed. Touch browser tests exercised A→B→B,
slow/cached metadata, immediate loading, timeout, cancel, long hold, synthetic-click
suppression and zero vacuum commands. Installed source identity is checked against
the model and presentation files. Samsung configuration is preserved byte-for-byte
inside its custom theme string; no native/app/helper changes or GitHub publication.
Physical double-tap acceptance remains pending unless a corresponding tablet
screenshot/user observation below establishes it. Existing full-device regression
and real-cleaning execution remain pending; no robot or kitchen-light actuation.

Reproducible touch/browser test: generate fixtures with
`python3 tools/preview-panel-v2.py /tmp/panel-preview`, then (with Playwright
available) run `node tests/robot-room-selection.browser.cjs /tmp/panel-preview`.
Tablet replay did not establish gesture acceptance; requesting a human double-tap
check rather than treating synthetic injection as proof. No cleaning was started.

Human device confirmation — 2026-11-13: user replied “Doğru oda açılıyor” to the
Denver same-room double-tap check. PASS: real-finger double-tap opens the correct
room dialog on the installed version. This does not establish physical cleaning,
cancellation, delayed-response behavior or the remaining full-device regression;
those retain their separately recorded validation scope.

## Countdown contrast — 2026-11-13

CSS-only correction on both profiles: active all-lights countdown now has a solid
warm amber surface (#ffd18b), dark timer (#172337), dark cancellation hint (#493516),
and a 28px tabular timer beside the icon. Card bounds and inactive appearance are
preserved. Timer/cancel logic and household targets were not changed.

PASS: synthetic Denver/Samsung start/cancel previews; text stays inside both cards;
timer contrast 11.07:1, hint contrast 8.17:1; deployed CSS identity matches both
routes and applications were reloaded. Existing scripts/configuration preserved.
PENDING: live active-countdown physical appearance and complete hardware regression.
No real countdown was started, no lights switched and no robot command was sent.
Local previews are under artifacts/robot-map-light-menu, outside this repository.


## Publication verification — 2026-11-13

PASS: all 12 `tests/*.test.cjs` suites, 7 installer tests, fixture generation,
`tests/robot-room-selection.browser.cjs` against the generated Denver fixture,
and `git diff --check`. Browser checks use simulated Home Assistant data and send
no device commands. This publication run changes no installed assets or native APK.
Previously documented physical-device checks retain their scope; the full physical
regression remains PENDING. No robot, kitchen light, printer or countdown was
actuated during publication verification.
