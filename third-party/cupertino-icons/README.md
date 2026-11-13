SF Symbols SVG subset from https://github.com/menahishayan/HomeAssistant-Cupertino-Icons

Source revision: 624a49e7cf7c7ccf6f7369072548a4397a2c1620

Embedded in panel.js; XML wrappers and transparent bounds removed, fill colors adapted. No runtime download.

Mappings:
- home: house-fill
- pause: pause-fill
- play: play-fill
- droplet: drop-fill
- clock: clock-fill
- nozzle: flame-fill
- heatbed: heater-vertical-fill
- plug: powerplug-fill
- thermometer: thermometer-medium
- printer: printer-fill
- settings: gearshape-fill
- bulb: lightbulb-fill
- kitchen: fork-knife
- corridor: door-left-hand-open
- bed: bed-double-fill
- desk: lamp-desk-fill
- robot: robotic-vacuum-fill
- moon: moon-fill
- cloud: cloud-fill
- sun: sun-max-fill
- rain: cloud-rain-fill
- rooms: square-grid-2x2-fill
- close: xmark
- sunny: sun-max-fill
- partlycloudy: cloud-sun-fill
- clear-night: moon-stars-fill
- cloudy: cloud-fill
- lightning: cloud-bolt-fill
- lightning-rainy: cloud-bolt-rain-fill
- snowy: cloud-snow-fill
- snowy-rainy: cloud-sleet-fill
- rainy: cloud-rain-fill
- pouring: cloud-heavyrain-fill
- hail: cloud-hail-fill
- fog: cloud-fog-fill
- windy: wind
- windy-variant: wind
- unknown: minus

Nozzle uses flame.fill and heated bed uses heater.vertical.fill as semantic equivalents.

Printer telemetry now overrides the generic nozzle/heatbed defaults with the
MDI printer-3d-nozzle-heat path and an original heated-print-bed SVG via
printerThermalSymbol(). See ../material-design-icons/README.md.
