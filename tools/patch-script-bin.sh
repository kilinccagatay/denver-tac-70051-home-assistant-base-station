#!/bin/sh
set -eu

if [ "$#" -ne 3 ]; then
    echo "usage: $0 INPUT_SCRIPT_BIN OUTPUT_SCRIPT_BIN CAPACITY_MAH" >&2
    exit 2
fi

INPUT=$1
OUTPUT=$2
CAPACITY=$3

case "$CAPACITY" in
    ''|*[!0-9]*) echo "capacity must be a positive integer" >&2; exit 2 ;;
esac

if [ "$CAPACITY" -le 0 ]; then
    echo "capacity must be greater than zero" >&2
    exit 2
fi

if [ ! -f "$INPUT" ]; then
    echo "input not found: $INPUT" >&2
    exit 1
fi

if [ -e "$OUTPUT" ]; then
    echo "refusing to overwrite: $OUTPUT" >&2
    exit 1
fi

if ! command -v sunxi-fexc >/dev/null 2>&1; then
    echo "sunxi-fexc is required" >&2
    exit 1
fi

TMPDIR_PATH=$(mktemp -d)
trap 'rm -rf "$TMPDIR_PATH"' EXIT INT TERM

sunxi-fexc -I bin -O fex "$INPUT" > "$TMPDIR_PATH/original.fex"

awk -v capacity="$CAPACITY" '
    /^\[pmu_para\][[:space:]]*$/ { in_pmu=1; print; next }
    /^\[/ { in_pmu=0 }
    in_pmu && /^[[:space:]]*pmu_battery_cap[[:space:]]*=/ {
        print "pmu_battery_cap = " capacity
        changed++
        next
    }
    { print }
    END {
        if (changed != 1) {
            print "expected exactly one pmu_battery_cap in [pmu_para]" > "/dev/stderr"
            exit 3
        }
    }
' "$TMPDIR_PATH/original.fex" > "$TMPDIR_PATH/patched.fex"

sunxi-fexc -I fex -O bin "$TMPDIR_PATH/patched.fex" > "$OUTPUT"
sunxi-fexc -I bin -O fex "$OUTPUT" > "$TMPDIR_PATH/verified.fex"

if ! grep -Eq "^[[:space:]]*pmu_battery_cap[[:space:]]*=[[:space:]]*$CAPACITY[[:space:]]*$" \
    "$TMPDIR_PATH/verified.fex"; then
    echo "round-trip verification failed" >&2
    rm -f "$OUTPUT"
    exit 1
fi

echo "created $OUTPUT with pmu_battery_cap=$CAPACITY"
echo "review the full decompiled diff before writing it to any device"
