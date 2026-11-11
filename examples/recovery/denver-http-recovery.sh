# Sourced by the existing Denver watchdog; invoke http_recovery_tick once per loop.
# No extra daemon, credentials, display changes or household actions.
HTTP_FAILURES=0
HTTP_SUCCESSES=0
HTTP_RECOVERY_PENDING=0
HTTP_LAST_RECOVERY=-300

http_recovery_tick() {
    [ -r /data/local/tmp/wallpanel-recovery-url ] || return 0
    RECOVERY_URL=$(cat /data/local/tmp/wallpanel-recovery-url)
    case "$RECOVERY_URL" in http://*|https://*) ;; *) return 0 ;; esac
    if HTTP_RESULT=$(busybox wget -s -T 5 -Y off "$RECOVERY_URL" 2>&1); then
        HTTP_FAILURES=0
        HTTP_SUCCESSES=$((HTTP_SUCCESSES + 1))
        [ "$HTTP_SUCCESSES" -gt 2 ] && HTTP_SUCCESSES=2
        if [ "$HTTP_RECOVERY_PENDING" -eq 1 ] && [ "$HTTP_SUCCESSES" -ge 2 ] && \
           [ $((NOW - HTTP_LAST_RECOVERY)) -ge 300 ] && \
           echo "$FOCUS" | busybox grep -q "$PACKAGE/$PACKAGE.ui.activities.BrowserActivityLegacy"; then
            log_message 'http_recovered: reloading_dashboard'
            am force-stop "$PACKAGE" >/dev/null 2>&1
            sleep 2
            start_dashboard 'http_recovered: dashboard_restarted'
            HTTP_RECOVERY_PENDING=0
            HTTP_LAST_RECOVERY=$NOW
        fi
    else
        HTTP_SUCCESSES=0
        # A confirmed HTTP 404 is already an error page, even if the server
        # recovers before the next poll. Transport failures need two samples.
        case "$HTTP_RESULT" in *"404 Not Found"*) HTTP_RECOVERY_PENDING=1 ;; esac
        [ "$HTTP_FAILURES" -lt 2 ] && HTTP_FAILURES=$((HTTP_FAILURES + 1))
        [ "$HTTP_FAILURES" -ge 2 ] && HTTP_RECOVERY_PENDING=1
    fi
    return 0
}
