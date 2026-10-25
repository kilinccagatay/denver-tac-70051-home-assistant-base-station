#!/system/bin/sh

PIDFILE=/data/local/tmp/wallpanel-backlight.pid
LOGFILE=/data/local/tmp/wallpanel-backlight.log
TOOL=/system/xbin/sunxi-backlight
SETTINGS_DB=/data/data/com.android.providers.settings/databases/settings.db
MAX_LEVEL=191

if [ -f "$PIDFILE" ]; then
    OLD_PID=$(cat "$PIDFILE" 2>/dev/null)
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
        exit 0
    fi
fi

echo $$ > "$PIDFILE"
trap 'busybox rm -f "$PIDFILE"' EXIT
trap 'exit 0' INT TERM

LAST_LEVEL=-1
while true; do
    LEVEL=$(sqlite3 "$SETTINGS_DB" \
        "select value from system where name='screen_brightness';" 2>/dev/null)

    if [ -n "$LEVEL" ] && [ "$LEVEL" != "$LAST_LEVEL" ]; then
        if [ "$LEVEL" -le 5 ]; then
            "$TOOL" 0
            echo "$(date) android=$LEVEL hardware=0" >> "$LOGFILE"
        else
            HARDWARE_LEVEL=$LEVEL
            if [ "$HARDWARE_LEVEL" -gt "$MAX_LEVEL" ]; then
                HARDWARE_LEVEL=$MAX_LEVEL
            fi
            "$TOOL" "$HARDWARE_LEVEL"
            echo "$(date) android=$LEVEL hardware=$HARDWARE_LEVEL" >> "$LOGFILE"
        fi
        LAST_LEVEL=$LEVEL
    fi

    sleep 1
done
