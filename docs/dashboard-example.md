# Dashboard installation and entity mapping

[`../examples/hoarydash.example.yaml`](../examples/hoarydash.example.yaml) is a sanitized version of the layout running on the Denver tablet. The entity IDs are descriptive placeholders, but the screen structure, CSS fixes, Turkish weather translation, and ES5 idle-return logic are based on the working configuration.

## Install

1. Install HoaryDash 0.13.0 or check the example against your installed version's configuration reference.
2. Back up the add-on's current `hoarydash.yaml`.
3. Copy the example to the HoaryDash add-on configuration directory as `hoarydash.yaml`.
4. Replace every `example_*` entity ID using the table below.
5. Add the Turkish date template from [`../examples/home-assistant-template.example.yaml`](../examples/home-assistant-template.example.yaml) to Home Assistant.
6. Add the vacuum scripts from [`../examples/home-assistant-scripts.example.yaml`](../examples/home-assistant-scripts.example.yaml).
7. Check Home Assistant's configuration, restart Home Assistant if required, then restart HoaryDash.
8. Open `http://HOME_ASSISTANT_HOST:4567/dash/` in a current browser before testing it in WallPanel.

No Home Assistant URL or token is stored in this YAML. The add-on connects through Home Assistant. Keep port 4567 restricted to a trusted LAN.

## Entity mapping

| Example entity | Purpose |
| --- | --- |
| `weather.example_home` | Current weather on Home |
| `sensor.wall_panel_date` | Two-line Turkish date and weekday |
| `binary_sensor.mac_call_active` | Optional Mac Teams call badge; hidden without fresh reports |
| `light.example_living_room` | Living-room light |
| `light.example_kitchen_counter` | Kitchen counter light |
| `light.example_kitchen_sink` | Kitchen sink light |
| `light.example_dining_table` | Dining-table light |
| `light.example_entrance` | Entrance light |
| `light.example_front_corridor` | Front corridor light |
| `light.example_rear_corridor` | Rear corridor light |
| `light.example_bedroom` | Bedroom light |
| `light.example_office` | Office light |
| `light.example_floor_lamp` | Optional floor lamp |
| `script.example_vacuum_start` | Start the robot vacuum |
| `script.example_vacuum_stop` | Stop the robot vacuum |
| `script.example_vacuum_dock` | Return it to the dock |
| `switch.example_printer_power` | Separate smart plug powering the printer |
| `light.example_printer_chamber` | Bambu Lab chamber light |
| `sensor.example_printer_*` | Printer status, stage, progress, time, and temperatures |

The printer power entity is intentionally separate from the Bambu Lab printer integration. In this build it represents an external smart plug.

## Optional call status

The Home screen includes a small red dot above a centered **Toplantı** label,
clear of the navigation bar. It stays hidden until a fresh call report arrives.
Follow [Mac Call Indicator setup](mac-call-indicator.md) for the separate Mac
helper and Home Assistant receiver. No APK or tablet firmware update is needed.
The example's hidden sensor card is intentional: HoaryDash needs it to subscribe
to the entity, while the custom script draws the compact badge.

## Why the custom CSS exists

HoaryDash's defaults target more capable displays. On 800 × 480, longer Turkish labels were ellipsized, group headers could overlap cards, the weather icon had poor contrast, and the printer status grid was too dense. The custom CSS:

- gives the clock roughly one third of the landscape height;
- centers the date under the clock on two lines;
- constrains Home to a 48/52 split;
- allows labels such as “Çalışma Odası” and “Yemek Masası” to wrap;
- gives group headers their own fixed-height row and hides the crossing divider;
- forces three large robot controls in one row;
- lays printer sensors out as six readable cells;
- raises weather icon contrast and prevents edge clipping.

## Old-browser JavaScript

The injected script deliberately uses ES5 syntax. It translates HoaryDash's English weather condition strings to Turkish and returns to the Home screen after 125 seconds without touch, mouse, or keyboard activity. It also returns Home when the page becomes hidden or loses focus, which makes the next motion wake predictable.

Avoid arrow functions, `let`, `const`, optional chaining, and other modern syntax in code executed by Chromium 44.

## Localization

The running panel uses `en-GB` as the reliable browser locale while displaying Turkish labels through the template sensor and translation script. This avoids an old-browser locale failure that previously broke the weather card. Change the example timezone to your own Home Assistant timezone.
