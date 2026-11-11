# Reboot and weather review — 2026-11-01

Denver remains Build 8. Samsung is development Build 15 plus the model/API-specific landscape helper. Both dashboards receive the minute-limited apparent-sensor recovery. Private preference/configuration backups and previous APKs are retained locally. No sensor mappings, lamp actions, camera/display settings or credentials were changed by the weather deployment.

The Samsung manifest-only fix failed a real user reboot; it is not accepted as a boot solution. A transparent non-touchable orientation window corrected the system orientation in a controlled 30-second test; removing it returned portrait. The final idle helper is therefore model/API guarded, singleton, and independent of power/backlight control. The user then restarted the phone and confirmed correct landscape startup. ADB after that real boot showed uptime 79 seconds and SurfaceOrientation=1. Full physical regression remains pending.

| Check | Denver | Samsung | Evidence / limitation |
| --- | --- | --- | --- |
| D01 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| D02 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| D03 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| D04 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| D05 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| D06 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| D07 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| D08 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| D09 | PENDING | N/A | Samsung has no native battery overlay; Denver physical menu/spacing not repeated. |
| D10 | PENDING | N/A | Samsung has no native battery overlay; Denver physical menu/spacing not repeated. |
| D11 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| D12 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| D13 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| D14 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| U01 | PENDING | N/A | Office profile has separate layout and no robot/all-house countdown controls; Denver behavior remains pending. |
| U02 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| U03 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| U04 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| U05 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| U06 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| U07 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| U08 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| H01 | PENDING | N/A | Office profile has separate layout and no robot/all-house countdown controls; Denver behavior remains pending. |
| H02 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| H03 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| H04 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| H05 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| H06 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| H07 | PENDING | N/A | Office profile has separate layout and no robot/all-house countdown controls; Denver behavior remains pending. |
| H08 | PENDING | N/A | Office profile has separate layout and no robot/all-house countdown controls; Denver behavior remains pending. |
| H09 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| H10 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| H11 | PENDING | PENDING | Not repeated on the final installed revision; previous observations do not clear this gate. |
| E01 | PASS | PASS | Weather recovery and panel DOM suites, ES5 parse, Samsung APK/helper build and shell syntax passed. |
| E02 | PASS | PASS | Both served dashboards contain recovery code. Denver actual capture shows apparent temperature. Samsung Build 15 and orientation helper installed; SurfaceOrientation=1 with helper. |
| E03 | PASS | PASS | Intended source/docs only; no secrets, private mappings or personal screenshots included. |
| E04 | PASS | PASS | Intended source/docs only; no secrets, private mappings or personal screenshots included. |

Overall: PENDING. No household lights/printer were actuated for this change. A fresh page rendering is not proof of overnight transport reliability.
