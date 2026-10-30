# WallPanel Lite settings for older hardware

The current reference uses the [WallPanel Legacy Lite fork](https://github.com/kilinccagatay/wallpanel-android-legacy/tree/lite-motion-core), tested on Denver TAC-70051 / Android 4.1.1. Upstream 0.8.4 build 7 was the initial installation, not the current customized APK.

See the [complete older-hardware guide](https://github.com/kilinccagatay/wallpanel-android-legacy/blob/lite-motion-core/docs/legacy-hardware-guide.md) for build/signing requirements, hardware boundaries, diagnosis, and acceptance tests.

## Current profile

| Setting | Tested device value |
| --- | --- |
| Start URL | `http://HOME_ASSISTANT_HOST:4567/dash/` |
| Browser | Bundled Crosswalk |
| Start on boot / prevent sleep | Enabled |
| Browser Refresh | Off |
| Camera / motion | Enabled, front camera |
| Requested preview | 640 × 480 |
| Requested FPS | 3 |
| Image processing interval | 333 ms |
| Wake / brighten on motion | Enabled |
| Inactivity dim delay | 30 seconds |
| Wake brightness | 191/255, about 75% |
| Minimum luma | 1000 |
| Motion difference threshold / leniency | 5, local tuning |

The source default leniency is 20. The reference device used 10, then 6 after a dim-room test improved, and finally 5 at the user's request. A smaller threshold is more sensitive; watch for noise-driven false wakes. Five is not a universally tested preset. The minimum-luma value is a whole-frame sum check, not a lux or average-brightness setting.

Keep 3 FPS / 333 ms while tuning sensitivity. A later 4 FPS / 250 ms experiment also introduced display triggers and was reverted after wake/toggle failures. Its cause was not isolated by a controlled test. Install an APK and root helpers from the same stable source revision.

## Power and controls

On the tested Denver firmware, real Android screen-off interrupts camera frames. The continuously powered reference now uses `backlight-only`: the OS, LCD image, and camera stay active while the separate backlight-enable gate on verified AXP20 GPIO1 is closed. Brightness zero alone left low-light shimmer, which the enable-gate test eliminated. LCD power on GPIO0 is left unchanged. This wiring is specific to the reference unit. The earlier `lcd-off` profile remains available without losing application settings. See [display profiles](https://github.com/kilinccagatay/wallpanel-android-legacy/blob/lite-motion-core/device-root/display-profiles.md). A driver command is not proof of deep sleep or measured reduction on every display rail.

The Denver power key is remapped for camera-safe short-press toggles of the configured dark mode; long press uses a root helper to show Android's power menu. Motion can wake after manual off, with a two-second grace period. Other devices require their own driver/key-layout verification.

Long-pressing the native battery badge exposes Android controls for 12 seconds with a single loading dialog. The root SystemUI intervention is specific to the tested ROM. Wi-Fi ADB uses a reserved IP and a trusted LAN; do not expose this legacy service to the internet.

## Verify after changing settings

1. Return to the dashboard, and confirm the camera client is open.
2. Confirm only one instance of each root helper runs.
3. Test short power press off, short press on, and long press separately.
4. Leave the view still and confirm brightness zero/LCD off after 30 seconds.
5. Move in front of the camera without touching the panel; check `motionDetected`, brightness 191, and LCD on.
6. Repeat in dim light, then check a still scene for false wakes.
7. Reboot and repeat before assuming boot persistence works.

The stable baseline passed key-path toggles, a 30-second timeout, and a user-confirmed camera wake on 27 October 2026. Leniency tuning happened afterward; its longer-term dim-room behavior remains to be evaluated.

## Reliability and troubleshooting

The current watchdog recovers missing/non-foreground dashboards and only performs a high-memory maintenance restart after five continuously dark minutes. Boot helpers use `setsid`, and the boot launcher remains active to check their process identities every 30 seconds and recover missing helpers. Check process command lines, not just PID files; wait for an old service to exit before replacing it.

Use SettingsProvider (`content query` / `content update`) for deliberate brightness diagnostics. Direct database writes can leave caches inconsistent, and external brightness changes do not reset the app's inactivity timer. Normal testing should use WallPanel's touch or power-key paths.

For a spinner, disable Browser Refresh, check the HoaryDash address and service, and keep custom JavaScript compatible with the old browser. For missing motion, distinguish camera frame delivery from detection sensitivity before changing FPS or display scripts.

### Rooted Jelly Bean first-touch fix

WallPanel 0.8.4 Build 8 removes the Android `hidden nav` input consumer when the
existing root SystemBar helper is installed on API 16–18. This fixes the observed
first-tap loss while preserving the battery long press and its 12-second auto-hide.
The tested in-place update retained the existing preference fingerprint. The
[application-side notes](https://github.com/kilinccagatay/wallpanel-android-legacy/blob/lite-motion-core/docs/first-touch-fix.md)
describe the flags and validation. No native clock/date/audio migration is included.

## Mandatory acceptance gate

Use the [complete regression checklist](regression-checklist.md) for every runtime change. Individual earlier test results are not a complete acceptance run for a later installed revision.
