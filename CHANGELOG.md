# Project updates

## Local apparent-temperature source — 2026-11-02

- Add an HA template using existing Met.no temperature, humidity and wind; no extra weather account or API request.
- Validate wind units, zero/negative values, missing data and source freshness; keep calculation and source timestamps distinct.
- Both deployed panel profiles now read the local sensor and retain their existing layout. Actual device captures confirm the reading.
- Keep the former Open-Meteo example for rollback; a live HTTP503 motivated migration. General final acceptance remains pending.


## 2026-11-01 — Home Assistant Legacy Panels

The repository was renamed from `denver-tac-70051-home-assistant-base-station` to
`home-assistant-legacy-panels`. Existing GitHub links redirect; update local Git
remotes and bookmarks to the new name. The printable enclosure remains Denver-only.

### Shared dashboard

- Optional Open-Meteo apparent temperature with negative/zero/missing-state handling;
  matching three-row inside/outside readings on both profiles.

- Settings sound toggles/test feedback keep dialog geometry stable on both devices.
- Agenda rows use consistent text metrics; settings padding and close icons align.
- Custom lamp holds suppress the legacy native selection crash path. See the
  [scoped visual review and outstanding device gate](docs/ui-review-2026-11-01.md).

- Large clock and centered two-line Turkish date; translated weather conditions.
- Live indoor temperature/humidity mappings, separate from printer or plug temperatures.
- Grouped light controls, long-press dimmer/color presets, default lamp tones,
  and immediate finger-down audio feedback.
- No old-layout startup flash; reusable dialog state and first-touch handling.
- Mandatory regression and visual-spacing review with private configuration excluded.

### Denver profile

- Eight quick controls; kitchen and corridor lighting groups.
- Vacuum start/return-to-dock and cancellable 60-second lights-off countdown.
- Native battery overlay and long-press Android controls retained.
- Boolean meeting indicator without work titles or attendee data.

### Samsung office profile (development branch / draft PR #1)

- Three selectable workdays in the agenda; ordinary refresh retains the selected
  day and a native display-dark event resets it to the first workday.

- Separate office layout, preferences and Android flavor; no battery badge or robot tab.
- Selected-calendar workday agenda, weekends showing Monday, freshness/expiry states.
- Five-day forecast beginning today; colored SVG icons, high/low temperatures,
  missing-data handling and balanced current-day highlight padding.
- Status-colored Bambu Lab H2D summary and active-print percentage.
- Printer page with camera lifecycle/loading state, aligned telemetry, physical
  AMS-HT / AMS 2 Pro grouping, and persistent empty filament slots.
- Double-tap existing printer power switch with confirmation and active-print acknowledgement.
- Read-only agenda/forecast long-press guards to avoid native text-selection crashes.

### Validation limits

Source tests and targeted installed screenshots/gestures are recorded. The full
physical regression gate remains incomplete; Samsung display/wake behavior has
an unresolved baseline failure. No general acceptance or new stable APK is claimed.
