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
