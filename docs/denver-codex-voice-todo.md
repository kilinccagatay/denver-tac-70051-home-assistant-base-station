# TODO — Report a Denver panel problem to Codex by voice

Status: planned. This document records the design and acceptance criteria.

When outdoor temperature disappears from Denver, the user opens **Ayarlar**,
chooses **Codex’e sorun bildir**, and says “Denver dış sıcaklığı göstermiyor.”
The panel shows the recognized Turkish text for editing, then sends it when
the user taps **Gönder**. It shows whether the task is queued, running, resolved,
or waiting for input, with a short result and a way to cancel.

- [ ] **Prove the text workflow first.** Run a local bridge on a host that can
  reach Home Assistant, HoaryDash, and Denver over ADB. Accept an authenticated
  report from the panel, associate it with the Denver profile, and launch a
  dedicated maintenance task through Codex App Server. Keep job IDs and
  status in the bridge. Handle duplicate submissions, an unavailable host,
  timeouts, and reconnects. Start with the Mac as the development host.
- [ ] **Implement one diagnostic workflow.** For a missing outside reading,
  check whether SMHI has fresh data, whether HoaryDash exposes it, and whether
  Denver renders it or uses its existing fallback. Use a controlled test fixture
  to exercise missing data without disrupting the live weather integration.
  After a scoped repair, verify the value on the physical panel and report
  the cause and what changed. Report upstream outages as such.
- [ ] **Bound what the bridge can do.** Keep credentials on the host. The tablet
  sends a report, never a shell command. Start with diagnostics and explicitly
  allowed reversible Denver repairs. Gate firmware changes, broad deployments,
  and Home Assistant configuration writes behind a separate approval. Use
  existing HA state reads initially. Evaluate MCP independently if it simplifies
  access without expanding permissions beyond the maintenance task.
- [ ] **Add short Turkish voice reports.** Verify actual capture on Android
  4.1.1, then use a native WallPanel microphone action while recording is
  visibly active. Transcribe on the host and offer text entry if capture or
  recognition fails. Discard temporary audio after transcription. Check that
  canceling exits recording and leaves no queued task.
- [ ] **Verify the installed workflow.** Repeat the outdoor temperature example
  on Denver from report to verified result. Check the actual viewport, correct
  device targeting, cancellation, duplicate requests, and bridge downtime.
  Run the applicable [device regression checklist](regression-checklist.md),
  including the 30-second timeout, camera wake, first tap, power buttons,
  and SystemBar behavior.

Reference: [OpenAI Codex App Server](https://developers.openai.com/codex/app-server).
