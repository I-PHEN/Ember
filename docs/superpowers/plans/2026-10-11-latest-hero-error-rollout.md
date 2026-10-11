# Latest hero and error-message rollout

Approved by the user: bring local landing-page work into the isolated tested-pipeline checkout; keep voice and handwriting timing unchanged; deploy only ember-generation-test.

## Design and scope

Copy the user's page, two Remotion landing components, ToggleDemo and how-it-works route without redesign. Preserve the existing Ember palette and typography. Do not import launch tooling, Edge TTS fallback or kinematic timing changes. A shared error-message presenter translates old persisted generic failures to actionable copy without guessing a cause, and preserves specific existing errors. Studio actions become Retry lesson and Edit question. The server saves the same generic copy for future failures.

## Execution

- [x] Verify isolated checkout and inspect overlapping local edits.
- [x] Transfer only approved landing-page files through patches; original checkout unchanged.
- [x] Add failing presenter tests, implement shared copy and wire the studio/server consumers.
- [x] Run full tests, production build, changed-file lint and read-only review; report pre-existing findings separately.

Verification: 159 tests passed, one database integration test skipped; changed-file ESLint and webpack production build passed. Read-only review found no critical or important issues. Local browser inspection was blocked by browser-control timeouts; hosted verification remains pending.
- [ ] Commit and push the existing test branch; promote its ready build to the test alias.
- [ ] Verify new landing content and studio error controls in the browser, saving screenshots.

No main deployment, database migration, paid services or additional generation runs are required for this UI rollout.
