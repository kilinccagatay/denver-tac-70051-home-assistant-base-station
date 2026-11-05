# SMHI weather for both panel profiles

## Setup

SMHI is the Swedish Meteorological and Hydrological Institute. Its official
Home Assistant integration needs no account or API key and covers Sweden and
nearby areas. It polls every 31 minutes; HA forecast requests use its already
loaded data. Its current values are forecast-model output, not nearby station
measurements. A successful request is not an uptime guarantee.

1. In HA, open Settings → Devices & services → Add integration → SMHI.
2. Select an appropriate regional location. Avoid sending precise home
   coordinates when a coarse regional point meets your needs. Do not publish
   private coordinates or integration credentials.
3. Confirm temperature, humidity, wind units and at least five daily forecasts
   using `weather.get_forecasts` with `type: daily`.
4. Back up HA configuration, the private HoaryDash YAML and both mappings.
5. In the existing local apparent-temperature template, replace the Met.no
   weather entity references with the new SMHI weather entity. Keep the existing
   sensor name and unique ID when migrating, so its entity ID/history survives.
   Update its `source` attribute to identify SMHI. The old unique ID can retain
   its historical provider suffix; it is identity, not the selected provider.
6. Validate HA configuration and reload template entities. Confirm the local
   sensor becomes numeric before changing either panel's private `weather`
   mapping, embedded configuration and subscribed weather entity.
7. Change both panel profiles, restart only HoaryDash, then reload each panel.
   Keep lamp, printer, calendar, indoor sensor and native display settings intact.

The existing [local formula](../examples/weather/met-no-feels-like.yaml) works
with either provider after replacing its weather entity. It converts supported
wind units to m/s and accepts zero/negative temperatures. Input validity and the
two-hour weather-report age guard are unchanged. This is a shade apparent
estimate, not an official SMHI feels-like observation.

The browser [weather fallback](weather-fallback.md) remains active. Its cache key
includes the weather entity, so a provider switch intentionally starts a separate
cache. Confirm a live reading and forecasts load before relying on this cache.
SMHI ordinary forecasts have no apparent-temperature field: today's previously
observed apparent reading can be retained, but a future day's ordinary high must
not masquerade as its apparent temperature. No extra visible fallback label was
added.

Met.no remains installed for **manual rollback**, not an automatic second live
provider. To roll back, restore the backed-up HA template and both private panel
mappings/YAML, reload templates and restart HoaryDash. No HA Core restart or APK
replacement is required.

## Installed migration — 2026-11-05

- PASS: official HA integration created using a coarse regional point; valid
  temperature, humidity and wind received. Daily forecast API returned ten rows.
- PASS: HA configuration check and template reload. Live temperature 4.4 °C,
  locally calculated apparent temperature 0.6 °C at the targeted check.
- PASS: both served dashboards reference SMHI; neither contains the old weather
  entity. Only weather mapping/subscription references and the existing local
  sensor's provider references changed. Backup retained privately on HA.
- PASS: user confirms Samsung displays 4.4 / 0.6 °C after Settings → Reload.
  Samsung ADB was offline; no claim of a new Samsung screenshot is made.
- PASS: actual Denver 800 × 480 screenshot shows both values in the existing
  weather column. Native preferences are byte-identical after page restart.
  Existing mounted orientation remains unchanged.
- PASS targeted spacing review: no CSS or layout delta. Existing explicit card
  insets, selected/unselected spacing and weather icon/value axes are retained
  on the installed Denver viewport. Samsung numerical fields are user-confirmed;
  a fresh pixel-level Samsung review remains PENDING.
- PASS: weather fallback, forecast and feels-like refresh suites, including
  signed/zero values, date rollover, stale responses and cache recovery.
- N/A: no APK, firmware, camera/display helper, native permission or household
  control change. No new UI offsets or actuated household tests.
- PENDING: complete [regression checklist](regression-checklist.md), physical
  wake/touch/sound after this reload, reboot and overnight/provider reliability.
  Prior confirmations on earlier versions do not close these checks.

Overall: provider migration and targeted weather validation PASS. Full general
acceptance and long-term reliability remain PENDING.

Sources: [HA SMHI integration](https://www.home-assistant.io/integrations/smhi/),
[SMHI](https://www.smhi.se/),
[HA weather forecast action](https://www.home-assistant.io/integrations/weather/#action-weatherget_forecasts).
