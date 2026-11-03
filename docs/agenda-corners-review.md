# Samsung active-meeting corner review — 2026-11-03

The green current-meeting row shared its top and bottom edge with table divider
strokes. On the installed Samsung Crosswalk viewport these strokes visually cut
through the small right-hand rounded corners.

The active row now uses the existing 8px corner scale with its top divider made
transparent. The following row's top divider is also transparent; the left accent
remains. The border box, 6px vertical/4px horizontal padding, time-column width,
text line heights and card positions are unchanged. Background painting stays
inside the padding box. There are no new alignment offsets or flex distribution
rules. Other, unselected rows retain their separators.

## Evidence and limits

- PASS: actual Samsung 1280×720 capture shows continuous upper/lower right curves.
  Active and unselected rows retain the same time/title alignment and insets.
- PASS: single-tap day navigation to the next day and back to Today on the phone.
  The selected day button is unchanged; both selected and unselected event states
  were inspected. Original private captures remain local because they contain
  real meeting names; they are not repository assets.
- PASS: existing agenda-panel and office-panel regression suites and diff check.
- PASS: deployed office CSS block identity; Denver configuration preserved by
  equality checks. No APK, root helper, permission, camera or power policy change.
- Rollback: prior office CSS and private HoaryDash configuration saved before the
  deployment. Only the Samsung launch URL cache version was updated; all other
  preference elements were compared unchanged.

This is targeted visual validation, not full general acceptance. The complete
installed-version matrix below retains unperformed checks as PENDING.

| Check | Status | Evidence |
| --- | --- | --- |
| D01 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| D02 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| D03 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| D04 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| D05 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| D06 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| D07 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| D08 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| D09 | N/A | Samsung has no battery badge; Denver configuration unchanged. |
| D10 | N/A | Samsung has no battery badge; Denver configuration unchanged. |
| D11 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| D12 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| D13 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| D14 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| U01 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| U02 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| U03 | PASS | Actual Samsung active/inactive rows inspected; curves and existing spacing preserved. |
| U04 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| U05 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| U06 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| U07 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| U08 | PASS | Actual Samsung active/inactive rows inspected; curves and existing spacing preserved. |
| H01 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| H02 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| H03 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| H04 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| H05 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| H06 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| H07 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| H08 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| H09 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| H10 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| H11 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
| E01 | PASS | Agenda and office DOM regression suites; git diff check. |
| E02 | PASS | Served CSS change and actual Samsung capture verified. |
| E03 | PASS | No private captures, mappings or credentials committed; unrelated work preserved. |
| E04 | PENDING | Full general installed-revision check not repeated for this CSS deployment. |
