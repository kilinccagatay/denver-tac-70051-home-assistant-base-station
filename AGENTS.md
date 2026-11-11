# Required completion gate

Before changing this project, read `docs/regression-checklist.md`.
Treat its complete applicable checklist as a mandatory acceptance gate for every
code, APK, root-helper, configuration, or dashboard behavior change. A successful
build or deploy does not establish completion. Record PASS/FAIL/PENDING/N/A with
evidence for the final installed version; untested items remain PENDING and block
claiming completion. Do not silently weaken the gate to finish a task.

Preserve the configured camera, physical power keys, 30-second timeout, motion
wake, first-touch behavior, native battery long press and SystemBar auto-hide.
Verify behavior on the actual tablet; desktop preview and software brightness
alone cannot prove physical behavior. Never commit private configuration or
unrelated working-tree changes. Documentation-only edits require link/diff checks,
not household actuation or a new hardware acceptance run; they must not claim a
new runtime validation.

## Required visual spacing review

For every UI edit, inspect spacing as part of acceptance, not as optional polish.
Use the existing 4/8/12/16 px rhythm and equal top/bottom and left/right insets for
selected indicators, cards, chips and buttons unless intentional asymmetry is
documented. Keep explicit inner padding; do not rely on distributed flex space
to imply balanced padding for mixed font sizes. Check both line-box bounds and
optical text/icon alignment, selected and unselected states, and adjacent cards.
Verify on the installed device at its actual viewport before claiming visual
acceptance. Missing screenshots or physical checks remain PENDING.

For weather columns, use the weather/house symbol center as the vertical axis.
Center each complete visible reading (sign, number, unit and any leading icon)
on that axis. Do not add sign-specific offsets or hidden minus placeholders.
Keep unit glyphs visible and preserve accessible meaning.
Indoor/outdoor columns must retain matching row counts, baselines and secondary
reading sizes in both profiles.
