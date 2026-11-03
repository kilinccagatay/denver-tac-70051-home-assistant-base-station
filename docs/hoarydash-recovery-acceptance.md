# HoaryDash recovery acceptance — 2026-11-03

Installed change: server HTTP guard plus a sourced Denver watchdog recovery policy.
No APK, firmware, dashboard assets, entity mappings or native preferences changed.
Denver remains Build 8; Samsung remains Build 20. Dashboard baseline: `931998c`.
Rollback: private original SSH app options and Denver watchdog were saved before deployment.

The server test used a temporary nonexistent health URL, not a real print/light/robot
command. It observed two failed checks, one successful HoaryDash-only restart request,
and recovery to HTTP 200 for both real dashboard paths. Test configuration was restored
automatically. Restarting only the SSH app demonstrated its startup command relaunches
one guard instance. The deployed guard SHA-256 is
`b4c0bc766ea149ab7dd67dac60fc8b4fb45438185297c23b1a738e24fec70a45`.

The Denver test temporarily pointed only its private health probe at a nonexistent
route, then restored the real route. The watchdog logged one recovery and reloaded
WallPanel. The final policy (including immediate arming on explicit 404) was
retested on the installed watchdog and logged a second recovery after the test
probe was restored. Its SHA-256 is
`09ef2ccc9bb6def2d88d03cfe2cb67a0adaa0662a1b81c0da2cb476918f0efce`. Preferences compared element-for-element equal; camera client matched the
WallPanel PID. Tests do not prove a full host cold boot or physical light behavior.

Automated: `python3 tests/hoarydash-guard.test.py` (3 tests),
`sh tests/http-recovery.test.sh`, shell syntax checks and `git diff --check` passed.
No Android build is needed for this sourced-shell change.

| Check | Status | Evidence / remaining work |
| --- | --- | --- |
| D01 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| D02 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| D03 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| D04 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| D05 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| D06 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| D07 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| D08 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| D09 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| D10 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| D11 | PENDING | Five helper PID command lines and watchdog supervision recovery verified; deliberate failure of every other helper not repeated. |
| D12 | PENDING | SSH app restart/guard automatic launch PASS; full host and tablet reboot regression PENDING. |
| D13 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| D14 | PASS | No APK update; all Denver preference elements before/after identical. |
| U01 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| U02 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| U03 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| U04 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| U05 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| U06 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| U07 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| U08 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| H01 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| H02 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| H03 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| H04 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| H05 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| H06 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| H07 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| H08 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| H09 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| H10 | PENDING | 404/server recovery and retained-page reload paths tested; complete unavailable-controls and meeting-state expiry regression PENDING. |
| H11 | PENDING | Complete applicable physical/general regression has not been repeated on this installed change. |
| E01 | PASS | Guard policy + real HTTP tests, device policy tests, shell syntax and diff checks passed. |
| E02 | PASS | Guard installed hash verified; real server and Denver recovery observed; no APK replaced. |
| E03 | PASS | Only generic source/config examples committed; private runtime settings, screenshots and backups remain local. |
| E04 | PENDING | Guides and rollback documented; publication/remote commit verification recorded separately. |

Overall: recovery mechanism verified; **full acceptance PENDING**, not a claim of zero future failures or an overnight reliability result. Samsung received no native/root-helper change.
