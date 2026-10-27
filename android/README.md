# Rooted-tablet helpers

> Historical snapshot: these scripts describe the earlier backlight-only implementation.
> Current display, power-button, SystemUI, and watchdog helpers live in the
> [WallPanel Lite fork](https://github.com/kilinccagatay/wallpanel-android-legacy/tree/lite-motion-core/device-root).
> Follow its [older-hardware guide](https://github.com/kilinccagatay/wallpanel-android-legacy/blob/lite-motion-core/docs/legacy-hardware-guide.md).
> Do not mix this snapshot with the current APK.

These files reproduce the optional root changes used on one Denver TAC-70051 firmware build. The dashboard itself does not require root.

## Requirements

- A rooted tablet with working ADB access.
- A complete, restorable firmware or partition backup.
- BusyBox and `sqlite3` on the tablet.
- A compatible ARMv7 Android toolchain for compiling `sunxi-backlight.c`.
- A verified `/dev/disp` Allwinner sun5i display driver.

Do not copy the binary or boot script to a different tablet unless you have verified the driver commands, paths, boot behavior, and recovery method. The numeric ioctls can be wrong for another kernel.

## Components

### `sunxi-backlight.c`

This small native utility opens `/dev/disp` and sends the same sun5i display commands used by the firmware's lights HAL:

- `0x142` sets brightness from 0–255;
- `0x140` requests LCD on;
- `0x141` requests LCD off.

On this device, brightness `0` reliably turns the backlight off. The LCD-off command did not produce true display power-down while keeping camera motion active.

Compile a small, static ARM binary with your own trusted toolchain. One typical Android NDK-style command is:

```sh
arm-linux-androideabi-gcc -Os -static -s -o sunxi-backlight sunxi-backlight.c
```

The exact compiler name depends on the NDK/toolchain. Inspect the result before pushing it:

```sh
file sunxi-backlight
```

### `wallpanel-backlight.sh`

WallPanel changes Android's `screen_brightness` setting when motion starts and its dim timer expires. The helper watches the Android settings database and mirrors that logical value to the hardware:

- Android brightness 0–5 → hardware backlight 0;
- any higher value → same value, capped at 191/255 (about 75%).

This allows WallPanel's camera service to remain awake while removing the backlight load. The helper is deliberately independent of a Home Assistant token or network connection.

### `wallpanel-watchdog.sh`

Every 30 seconds the watchdog checks whether WallPanel exists and whether the launcher is visible. It reopens the dashboard when Android restarts only the background service. It also checks WallPanel's resident memory and recycles it above 180,000 KB, but only while Android brightness is at its minimum.

Change the memory limit only after measuring your device. Too low a value causes unnecessary restarts; too high a value may let Android's low-memory killer act first.

### `install-recovery.sh.example`

This firmware executes `/system/etc/install-recovery.sh` during boot. The example waits for Android services, dismisses the firmware's insecure swipe keyguard if it is focused, opens WallPanel, and starts both helpers. That boot hook is firmware-specific.

## Manual installation outline

The following is intentionally an outline rather than a blind installer. Review every path first.

```sh
adb push sunxi-backlight /data/local/tmp/
adb push wallpanel-backlight.sh /data/local/tmp/
adb push wallpanel-watchdog.sh /data/local/tmp/
adb push install-recovery.sh.example /data/local/tmp/
adb shell
su
mount -o remount,rw /system
cp /data/local/tmp/sunxi-backlight /system/xbin/sunxi-backlight
cp /data/local/tmp/wallpanel-backlight.sh /system/xbin/wallpanel-backlight
cp /data/local/tmp/wallpanel-watchdog.sh /system/xbin/wallpanel-watchdog
chmod 0755 /system/xbin/sunxi-backlight /system/xbin/wallpanel-backlight /system/xbin/wallpanel-watchdog
```

Before replacing the boot hook, save the original file somewhere off the tablet. Merge the example into an existing script instead of discarding vendor logic. Remount `/system` read-only after testing.

## Test before enabling at boot

From a root shell:

```sh
/system/xbin/sunxi-backlight 191
/system/xbin/sunxi-backlight 0
/system/xbin/sunxi-backlight 128
```

Then start each shell helper manually, exercise one dim/motion cycle, inspect its log under `/data/local/tmp`, and stop it. Only add the boot hook after several successful cycles.

Useful checks:

```sh
cat /data/local/tmp/wallpanel-backlight.log
cat /data/local/tmp/wallpanel-watchdog.log
busybox pidof com.thanksmister.iot.wallpanellegacy
dumpsys window | busybox grep mCurrentFocus
```

## Uninstall

Restore your backed-up boot script, remove the three helper files from `/system/xbin`, and reboot. Do this from a known-good recovery path if normal Android boot is not reliable.

## Why no prebuilt binary is included

A prebuilt root binary encourages installation without checking the kernel ABI and driver. Building from the short source makes the architecture and ioctl dependency explicit. The repository also intentionally excludes the device's boot partitions and vendor `script.bin` images.
