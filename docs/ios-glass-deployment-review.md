# iOS-inspired panel deployment review — 2026-11-13

Installed on Denver Build 9 (8411) and Samsung Build 22 (8422). No APK, preferences, display helper, camera sensitivity, wake interval or orientation changes. Server configuration backed up before atomic replacement; private backup and device screenshots are retained outside the repository. Both server routes preserve all existing entity mappings and non-presentation modules.

Changes: SF Rounded with legacy-compatible static WOFF; SF Symbols with the user-selected orange house exception; blue glass surfaces; visible active navigation colors, passive inactive symbols and Samsung room/door tab; balanced clock ink alignment; separate Samsung settings hit area; two-column Denver room tiles; shared large overview on every Denver tab including Robot; printer status/progress/telemetry colors with readable contrast.

## Evidence and remaining acceptance

- E01 PASS: 10 existing JavaScript suites passed during deployment; panel DOM suite and 7 installer tests re-run after later layout changes. Eight-tab browser preview covers clock weight/font load, no horizontal card overflow, Samsung settings clearance >=8 CSS px, and no active-lamp position shift. `git diff --check` passes.
- E02 PASS for asset delivery: served CSS and presentation JS match local source, both pages reloaded. Native builds unchanged. Device screenshots confirm SF Rounded now renders instead of falling back after an OTS font error was corrected.
- U02/U03/U08 visual scope PASS for captured home, room and printer states; device screenshots inspected. Settings dialogs opened and closed on both tablets. Final Denver Robot screenshot confirms large overview and status İstasyonda; no robot command was activated. Samsung active printer camera, percent and temperature readings displayed without control commands.
- U04 PARTIAL: page reload observed; full dark/wake/idle-return sequence PENDING.
- D01–D14, U05–U07 and H01–H11 full physical/behavior regression PENDING unless covered by the narrow observations above. No reboot, camera wake, power key, long idle, real lamp action or robot action acceptance is claimed.
- E03: private configurations and physical screenshots remain outside the repository. No robot cleaning command and no kitchen lighting command intentionally issued; room screens reviewed through navigation only.
- E04: no commit or push requested for this revision; publication PENDING.

Overall: installed visual changes reviewed; complete hardware regression remains PENDING. Do not treat desktop checks or deployment as full hardware acceptance.
