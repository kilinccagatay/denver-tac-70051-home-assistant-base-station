# Samsung dark-to-Home review — 2026-11-01

The native Build 16 already emits `panel-display-dark` on brightness zero. The
browser listener previously reset only the calendar day. It now also closes
open dialogs and navigates to the configured Home screen (Odam) for the office
profile. Existing navigation cleanup stops camera requests when leaving Printer.
No extra idle timer is introduced: the existing native 30-second timeout remains
the source of the event. No APK, root helper, power key, motion threshold or
brightness setting was changed. Denver dashboard deployment remains unchanged.

The actual Samsung was left on Printer. With the camera covered, Android
brightness reached zero and the existing helper reported Android/driver `0 0`.
A private screenshot during that dark state shows Odam, rather than Printer,
with the first calendar day selected. This establishes the tab transition; it
alone does not prove physical backlight appearance or camera wake reliability.
The user subsequently confirmed that, after covering the camera, waiting for
the light to turn off and uncovering it, the awakened panel had returned to
Odam. This completes the requested off/wake/Home-return observation for one
cycle; dim-room repetitions, power keys and the wider general gate remain pending.
The capture contains a work-calendar title and is deliberately not published.

Office asset/configuration backups were kept privately before deployment; the
installer asserted unchanged Denver configuration and entity mapping. Restore
those files and refresh the office URL to roll back without clearing app data.

| Check | Status | Evidence / remaining work |
| --- | --- | --- |
| D01 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| D02 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| D03 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| D04 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| D05 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| D06 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| D07 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| D08 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| D09 | N/A | Samsung has no native battery overlay; Denver assets unchanged. |
| D10 | N/A | Samsung has no native battery overlay; Denver assets unchanged. |
| D11 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| D12 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| D13 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| D14 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| U01 | N/A | Office profile does not configure the Denver home/robot/all-house countdown. |
| U02 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| U03 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| U04 | PENDING | Actual native dark transition returned Printer to Odam with first calendar day selected. Complete startup/reload/wake gate still pending. |
| U05 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| U06 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| U07 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| U08 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| H01 | N/A | Office profile does not configure the Denver home/robot/all-house countdown. |
| H02 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| H03 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| H04 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| H05 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| H06 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| H07 | N/A | Office profile does not configure the Denver home/robot/all-house countdown. |
| H08 | N/A | Office profile does not configure the Denver home/robot/all-house countdown. |
| H09 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| H10 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| H11 | PENDING | Not repeated on this final deployment; earlier unrelated evidence is not full acceptance. |
| E01 | PASS | Existing office and agenda tests plus ES5 parse passed; dark-event test verifies Home navigation and camera source removal. |
| E02 | PASS | Served final handler verified; actual Samsung screen captured on Odam while Android brightness and driver status were 0. |
| E03 | PASS | Only intended source/test/guides published. Private Home capture contains work titles and is excluded. |
| E04 | PASS | Intended changes committed/pushed; general physical checks remain explicitly pending. |

Overall: PENDING for the complete general-feature gate.
