# Proposal analytics

Uses the existing GA4 property `G-7KW40PVYLH`. The homepage retains its existing Google tag; the shared script initializes the proposal page once. Embedded frames are not initialized by this script.

## Events

| Event | Meaning |
| --- | --- |
| `page_view` | Standard Google tag page view |
| `proposal_link_click` | Same-site link to the proposal clicked from the homepage |
| `proposal_open` | Proposal page initialized |
| `proposal_pdf_click` | Link to the site's proposal PDF clicked from the homepage or proposal page |
| `proposal_scroll_25`, `_50`, `_75`, `_90` | Page depth reached during a visible, focused scroll; each threshold once per page load |
| `proposal_active_30s`, `_60s`, `_180s`, `_300s` | Accumulated foreground, focused time; each milestone once per page load |
| `proposal_engaged_visit` | At least 60 active seconds and 25 percent page depth during the same page load |

Active time pauses while hidden, unfocused, or after 60 seconds without a pointer press, key press, touch, scroll, or focus event. Suspension gaps over five seconds are not counted. This is conservative and can undercount someone reading quietly without interacting.

These events are activity signals, not proof of a human reader, comprehension, endorsement, or PDF completion. Automation may generate activity. Direct PDF URLs cannot execute this JavaScript, so direct opens and reading inside an external PDF viewer remain unmeasured. Nothing backfills prior visits.

`proposal_pdf_click` is deliberately distinct from GA4 enhanced measurement's `file_download`; do not sum the two as independent downloads. Neither proves a completed download. Unique-user counts are more useful than raw event totals for repeat actions. Scroll and time milestones reset on a new page load.

No names, email addresses, form text, or user-entered search terms are included in custom parameters. PDF and proposal link parameters omit query strings and fragments. Standard GA page/referrer handling remains in place.

## Verification and account settings

Run `node scripts/check_proposal_analytics.cjs` for isolated event checks without sending test traffic to GA.

Use GA4 Realtime/DebugView to confirm receipt after deployment; standard reports can take 24-48 hours. Named milestones can be found in the Events report without registering custom parameters. Register parameters as custom dimensions/metrics if you need parameter-based explorations. Check internal-traffic filters in Testing mode before activation; exclusions affect future processing and can be irreversible.

The code audit found one Google tag configuration on the homepage and none on the proposal before this change. Other standalone app pages are outside this change. No Analytics account settings, bot exclusions, consent settings, or filters were changed. A connected GA4 account is needed to inspect those settings. Known-bot exclusion does not establish that all remaining traffic is human.
