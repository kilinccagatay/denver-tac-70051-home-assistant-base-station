#!/system/bin/sh

PIDFILE=/data/local/tmp/wallpanel-watchdog.pid
LOGFILE=/data/local/tmp/wallpanel-watchdog.log
PACKAGE=com.thanksmister.iot.wallpanellegacy
ACTIVITY=$PACKAGE/.ui.activities.WelcomeActivity
SETTINGS_DB=/data/data/com.android.providers.settings/databases/settings.db
MAX_RSS_KB=180000

if [ -f "$PIDFILE" ]; then
    OLD_PID=$(cat "$PIDFILE" 2>/dev/null)
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
        exit 0
    fi
fi

echo $$ > "$PIDFILE"
trap 'busybox rm -f "$PIDFILE"' EXIT
trap 'exit 0' INT TERM

log_message() {
    echo "$(date) $1" >> "$LOGFILE"
    LOG_SIZE=$(busybox wc -c < "$LOGFILE" 2>/dev/null)
    if [ -n "$LOG_SIZE" ] && [ "$LOG_SIZE" -gt 65536 ]; then
        busybox tail -100 "$LOGFILE" > "$LOGFILE.tmp"
        busybox mv -f "$LOGFILE.tmp" "$LOGFILE"
    fi
}

start_dashboard() {
    am start -n "$ACTIVITY" >/dev/null 2>&1
    log_message "$1"
    sleep 12
}

while true; do
    APP_PID=$(busybox pidof "$PACKAGE" 2>/dev/null)

    if [ -z "$APP_PID" ]; then
        start_dashboard "app_missing: dashboard_started"
    else
        FOCUS=$(dumpsys window 2>/dev/null | busybox grep 'mCurrentFocus=' | busybox head -1)

        if echo "$FOCUS" | busybox grep -q 'com.android.launcher'; then
            start_dashboard "launcher_visible: dashboard_started"
        else
            RSS_KB=$(busybox awk '/VmRSS:/ {print $2}' "/proc/$APP_PID/status" 2>/dev/null)
            BRIGHTNESS=$(sqlite3 "$SETTINGS_DB" \
                "select value from system where name='screen_brightness';" 2>/dev/null)

            # Restart only while the panel is dark so maintenance is unobtrusive.
            if [ -n "$RSS_KB" ] && [ "$RSS_KB" -gt "$MAX_RSS_KB" ] && \
               [ -n "$BRIGHTNESS" ] && [ "$BRIGHTNESS" -le 5 ]; then
                log_message "high_memory: rss_kb=$RSS_KB restarting"
                am force-stop "$PACKAGE" >/dev/null 2>&1
                sleep 2
                start_dashboard "high_memory: dashboard_restarted"
            fi
        fi
    fi

    sleep 30
done
