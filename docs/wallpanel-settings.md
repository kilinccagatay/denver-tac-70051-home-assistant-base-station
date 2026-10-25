# WallPanel Legacy settings

These settings were tested with WallPanel Legacy 0.8.4 build 7 on Android 4.1.1. Names can differ slightly between builds.

## Browser

| Setting | Value |
| --- | --- |
| Start URL | `http://HOME_ASSISTANT_HOST:4567/dash/` |
| Browser type | Auto / bundled Crosswalk |
| Prevent screen sleep | On |
| Start on boot | On |
| Browser refresh | Off |
| Full screen | On |

Browser refresh was disabled because it could leave this old Crosswalk build on a permanent loading spinner. Use HoaryDash's live Home Assistant updates instead.

## Camera and motion

| Setting | Value used here |
| --- | --- |
| Camera | Enabled |
| Camera selection | Front |
| Resolution | 640 × 480 |
| Motion detection | Enabled |
| Wake screen on motion | Enabled |
| Brightness on motion | Enabled |
| Motion reset time | 30 seconds |
| Maximum leniency | 10 |
| Camera FPS | 2 |

Start conservatively. A high camera frame rate raises CPU use significantly on the Allwinner A13. If false triggers occur, change leniency before increasing FPS.

Opening WallPanel settings can remove its browser activity and camera service from the foreground. Always return to the dashboard before testing motion. Test this sequence:

1. Leave the dashboard untouched until WallPanel changes Android brightness to its minimum value.
2. Verify that the root backlight helper reports hardware level `0` if it is installed.
3. Move into the front camera's view.
4. Confirm that the dashboard returns at no more than 191/255 brightness.
5. Leave it again and verify the same cycle several times.

## Important power limitation

Real Android suspend stops camera processing, so the front camera cannot wake the tablet from deep sleep. This project keeps Android awake and turns off only the Allwinner hardware backlight. That preserves motion detection but still consumes power for the CPU, camera, Wi-Fi, and LCD electronics.

If maximum battery life matters, use an external PIR or mmWave sensor to simulate the tablet's power button and allow Android to sleep. That hardware path is not part of this project.

## Troubleshooting

### Motion worked once and then stopped

- Confirm the dashboard, not WallPanel settings, is in the foreground.
- Confirm the front camera opens in the stock Camera app.
- Re-enter the dashboard after changing camera settings.
- Keep the screen logically awake; deep sleep stops the camera.
- Check whether Android killed WallPanel because of memory pressure. The optional watchdog in [`../android/`](../android/README.md) addresses this case.

### The panel returns to the Android launcher overnight

Crosswalk can grow until Android kills the activity. WallPanel's service may restart without reopening the dashboard. Install the watchdog, or reduce dashboard complexity and restart WallPanel periodically while the panel is dark.

### The page shows only a spinner

- Disable Browser Refresh.
- Use the HoaryDash URL, not the normal Home Assistant frontend.
- Verify HoaryDash is running and its port is reachable from the tablet.
- Keep animations off and avoid modern JavaScript in custom code.
