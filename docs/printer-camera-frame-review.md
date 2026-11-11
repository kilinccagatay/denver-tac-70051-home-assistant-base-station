# Camera framing and Home remaining time — 2026-11-01

Samsung office profile only, native Build 16 unchanged. Camera content now uses a
rounded viewport inside 12px outer padding, separated from its 40px header by an
8px gap. The feed fills the viewport with `object-fit: cover`, preserving its
aspect ratio and cropping overflow instead of showing letterbox background.
The placeholder/spinner is centered inside this viewport. Camera start/stop,
offline gating, request timing and pause/resume logic are unchanged.

The Home printer tile shows `Kalan:` above compact minutes at bottom left, beside
the existing percentage on the right. A footer layout reserves room for either
value independently. Remaining time follows confirmed printer/power/connection
state, converts hour/second units, rejects unavailable/negative values and clears
on power-off; zero while printing means less than one minute, not an invented
idle duration. The button accessible label includes the remaining minutes.

Existing office tests passed with additional remaining-value and power-off
assertions. Actual Samsung capture verifies the live tile and camera viewport.
No physical printer/lamp/power commands were used. Deployment privately backed
up CSS, JavaScript, mapping and HoaryDash configuration; it asserted Denver and
mappings unchanged. Rollback uses those backups. Source changes are office-only
at deployment; the Denver APK, helpers and runtime assets remain unchanged.

| Check | Status | Evidence / remaining work |
| --- | --- | --- |
| D01 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| D02 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| D03 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| D04 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| D05 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| D06 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| D07 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| D08 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| D09 | N/A | Samsung has no battery overlay; Denver assets were not deployed. |
| D10 | N/A | Samsung has no battery overlay; Denver assets were not deployed. |
| D11 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| D12 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| D13 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| D14 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| U01 | N/A | Office profile has no Denver home layout, robot or all-house countdown. |
| U02 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| U03 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| U04 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| U05 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| U06 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| U07 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| U08 | PASS | Actual Samsung print view: camera fills the rounded viewport; balanced 12px outer padding and 8px header gap. Home time/progress footer has equal 10px side and 8px bottom insets. |
| H01 | N/A | Office profile has no Denver home layout, robot or all-house countdown. |
| H02 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| H03 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| H04 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| H05 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| H06 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| H07 | N/A | Office profile has no Denver home layout, robot or all-house countdown. |
| H08 | N/A | Office profile has no Denver home layout, robot or all-house countdown. |
| H09 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| H10 | PENDING | Not repeated on this deployment; no full general-feature acceptance claim. |
| H11 | PENDING | Active printing state visually checked. Automated power-off/camera/offline tests passed; live power transitions not tested during a print. |
| E01 | PASS | office-panel.test.cjs and ES5 parse passed; missing/negative/zero/hour remaining values and power-off clearing verified with fixtures. |
| E02 | PASS | Served CSS/viewport/footer identity verified; actual Samsung Home and Printer views captured while printing. |
| E03 | PASS | Only intended source/tests/guides and printer-only images published; no company calendar titles or credentials. |
| E04 | PASS | Intended source/tests/guides/screenshots committed/pushed; remaining physical checks explicitly pending. |

Overall: PENDING for the full general-feature gate; requested visual behavior verified on the Samsung.
