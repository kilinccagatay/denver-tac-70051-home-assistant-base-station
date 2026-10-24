# Dashboard planning template

This is a **layout and entity-mapping example**, not the exported configuration from my Home Assistant host. HoaryDash versions may use different schema keys, so follow [its current documentation](https://github.com/Skrubbadubba/HoaryDash/blob/main/hoarydash/DOCS.md) when translating this plan into YAML.

| Tab | Display and controls | Replace with your own entities |
| --- | --- | --- |
| Home | Large clock; centered date and weekday; weather; most used lights | Weather entity and favorite light entities |
| Kitchen | Three large lighting controls | Counter, sink, dining table lights |
| Entrance | Large entrance and corridor controls | Entrance, front corridor, rear corridor lights |
| Robot | Start, stop/pause, return to dock | Vacuum entity and supported actions |
| Printer | Printer status, power, and internal light | Printer integration and smart plug entities |

For the 800 × 480 screen, aim for a clock around one third of the display height, two short lines for the date, and large touch areas. Avoid long headers over controls, ellipsized labels, dark icons on dark backgrounds, dense graphs, and animation. This unit used Turkish weather translations and a two-line Turkish date; test localization in the tablet's actual browser because an unsupported locale broke the weather card during this build.

The idle return to Home was implemented with ES5-compatible JavaScript and a 125-second fallback timer. Treat it as a UI convenience, not an authentication control.

The published example uses placeholders. Replace them with your own local Home Assistant entities and dashboard address.
