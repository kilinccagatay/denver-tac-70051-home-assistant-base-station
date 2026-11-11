#!/bin/sh
set -eu
# Run the deployed function against controlled HTTP results and focus changes.
# Redirect its fixed private configuration file to a temporary readable fixture.
TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST"' EXIT
printf 'http://example.invalid/dash/\n' > "$TMPDIR_TEST/url"
sed "s@/data/local/tmp/wallpanel-recovery-url@$TMPDIR_TEST/url@g" examples/recovery/denver-http-recovery.sh > "$TMPDIR_TEST/recovery.sh"
. "$TMPDIR_TEST/recovery.sh"
PACKAGE=panel
FOCUS='panel/panel.ui.activities.BrowserActivityLegacy'
NOW=0
NETWORK=down
RESTARTS=0
busybox() { if [ "$1" = wget ]; then if [ "$NETWORK" = missing ]; then echo "HTTP/1.1 404 Not Found" >&2; return 1; fi; [ "$NETWORK" = up ]; else shift; command grep "$@"; fi; }
log_message() { :; }
am() { :; }
sleep() { :; }
start_dashboard() { RESTARTS=$((RESTARTS+1)); }
http_recovery_tick
[ "$HTTP_RECOVERY_PENDING" -eq 0 ]
NOW=30; http_recovery_tick
[ "$HTTP_RECOVERY_PENDING" -eq 1 ]
NETWORK=up; NOW=60; http_recovery_tick
[ "$RESTARTS" -eq 0 ]
NOW=90; http_recovery_tick
[ "$RESTARTS" -eq 1 ]
NOW=120; http_recovery_tick
[ "$RESTARTS" -eq 1 ]
NETWORK=down; NOW=150; http_recovery_tick; NOW=180; http_recovery_tick
NETWORK=up; NOW=210; http_recovery_tick; NOW=240; http_recovery_tick
[ "$RESTARTS" -eq 1 ]
FOCUS='android/settings'; NOW=400; http_recovery_tick
[ "$RESTARTS" -eq 1 ]
FOCUS='panel/panel.ui.activities.BrowserActivityLegacy'; NOW=430; http_recovery_tick
[ "$RESTARTS" -eq 2 ]
HTTP_RECOVERY_PENDING=0; HTTP_FAILURES=0; NETWORK=missing; NOW=800; http_recovery_tick
[ "$HTTP_RECOVERY_PENDING" -eq 1 ]
NETWORK=up; NOW=830; http_recovery_tick; NOW=860; http_recovery_tick
[ "$RESTARTS" -eq 3 ]
printf 'HTTP recovery policy PASS\n'
