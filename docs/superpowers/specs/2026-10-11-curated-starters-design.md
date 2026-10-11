# Two submission-ready curated lessons

## Goal

Populate the existing empty Curated Starters section below the studio input with two genuinely playable, reviewed lessons. This is the last scoped submission improvement, not an architecture expansion or another generation flow.

## Recommended pair

1. **Solve x + 2 = 5** — a short introduction to balancing an equation: subtract 2 from both sides, simplify to x = 3, and verify by substitution.
2. **Integration by parts** — evaluate ∫ x·e^(2x) dx: explain the choice of u and dv, find du and v, substitute, integrate, and check the result by differentiation.

Use clear, concise narration. No repeated question headings/underlining, duplicated explanation, incidental sound effects, long artificial pauses, or answers written before an audience prediction. Measured audio and board timing must satisfy the existing synchronized-teaching checks; never accelerate ink to fit a short recording. Display the measured playback duration, not a fixed guess.

## Delivery

- Generate/record each lesson once using the existing teaching pipeline and provider configuration. Review correctness, layout, voice/board ordering, pauses, seek, and replay before freezing the final script and recordings.
- Keep the existing SolveScript/recorded-audio contract and SolvePlayer. Watching a curated lesson must retrieve existing recordings only, never call generation or speech synthesis.
- Preserve immutable recordings with the curated content. Prefer shipping the reviewed audio assets alongside the app, resolved by an explicit allowlist of their existing hash keys through the read-only audio path; never accept a user-supplied filesystem path or expose unrelated recordings. Keep the normal database-backed recording path unchanged for generated lessons.
- Two responsive cards in the current Curated Starters section: real board thumbnail, subject, title, measured duration, and short question. Click or Enter/Space opens the existing studio player.
- Clearly label the lessons as prepared examples. Preserve the existing studio sign-in rules; no authentication changes, new gallery, or new public lesson route.
- Playback must not consume generation quota. Existing optional follow-up/refinement behavior remains separate and keeps its normal access/quota rules.

## Boundaries

Replace the empty SAMPLE_LESSONS list with reviewed curated content, preserving the legacy SAMPLE_CALCULUS used by the landing comparison. Do not repurpose that old sample as a finished narrated lesson: it has no frozen recordings and includes the older title/lead-in behavior.

Limit changes to curated content/assets, existing starter presentation, and the narrowly allowlisted read-only audio lookup needed for frozen playback. No landing redesign, provider change, paid service, generation architecture refactor, or teaching-speed change.

## Verification and rollout

- Test exactly two valid curated scripts, mathematical results, valid recorded-audio references and durations, and readable synchronized steps.
- Test allowlisted audio retrieval and unknown-key behavior; prove watching does not invoke generation or synthesis.
- Browser-check both lessons through the real studio: cards, keyboard access, voice, writing order, chapters, seek, replay, and mobile layout. Listening quality requires an actual listen, not just an audio-file existence check.
- Run focused tests, lint, full regression suite, and production build; disclose existing typecheck issues separately.
- Commit and fast-forward push the verified result to main; confirm Vercel serves the two working lessons. If recording quota or a provider failure blocks recording, report it rather than substituting silent demos or invented ready states.
