# Dashboard planning template

The [shareable HoaryDash YAML example](../examples/hoarydash.example.yaml) models the five-tab layout. It is **not** the exported configuration from my Home Assistant host. The backup available on this computer stores the HoaryDash add-on data in an encrypted archive, so I rebuilt this example from [HoaryDash's configuration reference](https://github.com/Skrubbadubba/HoaryDash/blob/main/docs/CONFIG.md) and the verified project notes.

Copy the example into your HoaryDash add-on configuration as `hoarydash.yaml`, replace every `example_*` entity ID with one from your Home Assistant installation, and set WallPanel's start URL to `http://<your-ha-host>:4567/dash/`. Add-on installations use their Home Assistant connection; the example does not include a server address or token. Confirm the YAML keys against your installed HoaryDash version before replacing an existing configuration.

The Robot tab calls three example Home Assistant scripts. [These script definitions](../examples/home-assistant-scripts.example.yaml) show how to connect the buttons to a vacuum entity. Replace `vacuum.example_robot` and check which vacuum actions your integration supports. Home Assistant documents [vacuum actions](https://www.home-assistant.io/integrations/vacuum/) and [script YAML](https://www.home-assistant.io/docs/automation/building-blocks/).

| Tab | Display and controls | Replace with your own entities |
| --- | --- | --- |
| Home | Large clock; centered date and weekday; weather; most used lights | Weather entity and favorite light entities |
| Kitchen | Three large lighting controls | Counter, sink, dining table lights |
| Entrance | Large entrance and corridor controls | Entrance, front corridor, rear corridor lights |
| Robot | Start, stop/pause, return to dock | Vacuum entity and supported actions |
| Printer | Printer status, power, and internal light | Printer integration and smart plug entities |

For the 800 × 480 screen, aim for a clock around one third of the display height, two short lines for the date, and large touch areas. Avoid long headers over controls, ellipsized labels, dark icons on dark backgrounds, dense graphs, and animation. This unit used Turkish weather translations and a two-line Turkish date; test localization in the tablet's actual browser because an unsupported locale broke the weather card during this build.

The original panel also used an ES5-compatible idle return to Home with a 125-second fallback timer. That custom script is not included because the working source is not available in this backup. The sample YAML illustrates the visible five-tab layout.

The published example uses placeholders. Replace them with your own local Home Assistant entities and dashboard address.
