# Outside apparent temperature on both panel profiles

## Recommended local source — 2026-11-02

The deployed panels now use a Home Assistant template calculated from the existing
Met.no weather entity. A direct request from HA confirmed HTTP503 from Open-Meteo
when the old sensor became unavailable. This removes that extra provider/API
as the only live provider; bounded browser fallback is described below.

Merge [the local template](../examples/weather/met-no-feels-like.yaml) into the
existing `template:` list and use its sensor as `outdoorFeelsLike` in each profile.
The example creates `sensor.panel_outdoor_feels_like_local`. Replace the weather
entity with your actual Met.no entity. Keep backups of the old REST include and
private mappings before retiring that dedicated poller. Do not replace other REST
sources or other templates.

The calculation is the shade apparent-temperature approximation:
`T + 0.33 × e − 0.70 × wind_m/s − 4`, where
`e = RH/100 × 6.105 × exp(17.27 × T/(237.7+T))`.
It is a locally derived estimate, not Met.no's published feels-like reading and
not a physical temperature measurement. Sun exposure and individual comfort can
differ. See the [ECMWF implementation and references](https://github.com/ecmwf/thermofeel/blob/main/thermofeel/thermofeel.py).

Temperature must be °C; m/s, km/h, mph and knots are converted explicitly. Zero
and negative values are valid. Missing/invalid inputs or a weather report older
than two hours make the sensor unavailable. `time` records calculation time;
`source_time` records the actual weather report time, which is checked separately.
This avoids mistaking the normal hourly upstream update for an expired 30-minute
Open-Meteo sample. Neither tablet computes the formula or calls a weather API.

Targeted validation: real HA templates cover signed/zero values, equivalent wind
units, missing/invalid inputs and expiry. The live source produced3.9°C from
7.4°C /90% RH /13km/h. Actual Denver and Samsung captures both confirm3.9° in the existing layout.
The complete general regression gate remains pending; no APK or display-helper
change was required for this weather update.

## Previous Open-Meteo source (optional / rollback)


The optional secondary outside value comes from Open-Meteo's current
`apparent_temperature`, read by Home Assistant's REST integration. The main
outside temperature and conditions retain the existing weather entity, so two
providers can differ. It is a model-derived weather value, not an indoor sensor.

1. Copy [the REST example](../examples/weather/open-meteo-feels-like.yaml) into
   your private HA configuration and include the list under `rest:`. Merge into
   an existing REST list rather than adding a duplicate root key.
2. The example rounds `zone.home` coordinates to one decimal place before the
   request. This sends a regional location instead of precise home coordinates.
   No API key, account, calendar data or company information is sent.
3. Check HA configuration, then restart/reload the REST integration as appropriate
   for your setup. Confirm `sensor.panel_outdoor_feels_like` receives °C readings.
4. Set the private panel mapping `outdoorFeelsLike` to that sensor and rebuild
   each intended profile. The installer adds an explicit sensor subscription.
   Keep printer/lamp/default-tone/calendar mappings unchanged.

```json
{"outdoorFeelsLike": "sensor.panel_outdoor_feels_like"}
```

Both outside and inside sections use three aligned rows: large temperature,
condition or room label, then a small icon/value. Outside has a thermometer and
apparent temperature; inside has a droplet and relative humidity. There is no
visible “Hissedilen” label; the accessible name and tooltip retain that meaning.
The compact style applies only when the secondary outside sensor is configured.
Apparent temperature and humidity use matching 18 px Denver / 16 px Samsung
fonts. Each complete visible reading, including its sign, unit and leading symbol,
is centered under the weather/house symbol. Primary symbols have zero side
margin; the previous inherited 7 px right margin displaced their visual axis.
There are no positive/negative-specific offsets or invisible sign placeholders.

Negative values and zero are valid for both temperature readings. Invalid values
never become a fabricated zero. The panel normally treats a sample as live for
30 minutes; [weather fallback](weather-fallback.md) then retains today's last
known value, and can use a matching daily forecast for outside temperature.
The HA sensor calculation and its availability rules remain unchanged.

## Validation and limitations

The real installed sensor returned 1.3 °C during the review. DOM tests verify
−12.5 °C, 0 °C and positive temperatures for both readings, plus stale/missing
apparent data. Those synthetic values were never sent to the live sensor.
Actual Denver and Samsung captures were reviewed; the complete device checklist
still has outstanding physical/regression observations. See
[the combined review](three-day-agenda-review.md).

Sources: [Open-Meteo Weather API](https://open-meteo.com/en/docs),
[Home Assistant REST sensors](https://www.home-assistant.io/integrations/sensor.rest/).

## Missed update recovery — 2026-11-01

Denver displayed unavailable while the shared HA sensor and Samsung were fresh.
The tablet clock matched the host; a Denver-only page refresh restored the value.
The exact missed transport event was not established. Both profiles now perform
one read-only request per minute for the single configured HA apparent sensor.
This reads HA's cached state, not the upstream weather provider. Requests have a
15-second watchdog; disconnected pages do not poll, older samples cannot replace
newer values, and the existing 30-minute freshness limit still applies.

`tests/feels-like-refresh.test.cjs` simulates a missed event, minute throttling,
zero/negative readings, late/older data, unavailable state and disconnect without
issuing household commands. ES5 parsing and the existing panel DOM suite passed.
See [the reboot/weather acceptance record](reboot-weather-review-2026-11-01.md)
for remaining physical checks.
