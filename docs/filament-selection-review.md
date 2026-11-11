# Rounded active filament indicator — 2026-11-01

Samsung office CSS only; native Build 16, dashboard JavaScript, mappings, root
helpers and Denver layout are unchanged. The old outline painted a rectangular
selection despite the rounded background. An inset one-pixel shadow follows the
8px radius. All slots have 4px top/bottom and 3px side padding, a 4px swatch/text
gap, and a 40px maximum width. Physical-device capture confirms aligned swatches,
clear space inside the active border and no overflow into the group headings or
outer card. AMS-HT stays left of AMS 2 Pro and slot labels/order are unchanged.

Deployment backed up the office CSS and full HoaryDash configuration privately;
the installer asserted the Denver dashboard and entity mappings were unchanged.
Rollback uses that CSS/configuration backup. No lamp, printer power, job or
filament commands were sent; an existing print continued during visual review.

Existing automated office-profile tests passed, including group navigation,
printer power acknowledgement, camera lifecycle and offline display. They use
fixtures, not real service actuation. No implementation-mirroring CSS test added.

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
| U08 | PASS | Actual Samsung print view: rounded inset border, balanced 4px vertical padding, swatch/text gap and aligned adjacent slots; no clipping. |
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
| E01 | PASS | Existing office-panel.test.cjs passed; git diff --check clean. No APK or JavaScript changes. |
| E02 | PASS | Served CSS identity verified; Samsung page refreshed and actual screen captured while printing. |
| E03 | PASS | Only office.css and this review published; no private config, company titles or credentials. |
| E04 | PASS | Intended CSS/review committed and pushed; remaining physical checks explicitly pending. |

Overall: PENDING for the complete general-feature gate; the requested visual adjustment was verified on the installed Samsung.
