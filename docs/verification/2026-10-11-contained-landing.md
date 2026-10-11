# Contained landing verification

## Rendered review

- Desktop local preview at 1264px viewport: composer visually measures about 712px wide and 146px tall; its controls follow the 720px studio sizing and two-row text area. The image capture was inspected in the local browser but was not saved as a file.
- Comparison and closing sections are centered in a 960px maximum content column. The two comparison panels have equal widths and separate rounded borders.
- The community section no longer uses an oversized sticky scroll region; the existing cursor and amber phrase highlights remain in the scene.
- A real mobile viewport screenshot was not available in this browser session. Mobile widths, stacked panels, and 16px small-screen gutters are set by the existing CSS breakpoints but still need a device-width visual check.

## Checks

- Focused composer, hero, film, and comparison tests: 11 passed, 0 failed, 80 assertions.
- Full `bun test`: 175 passed, 2 skipped, 1 timed out. The timeout was `a durable lesson publishes measured speech steps and never reveals a prediction answer early` after 15 seconds in the synchronized generation tests; the edited scope is the landing page.
- ESLint on changed TS/TSX files: passed. `globals.css` is ignored by ESLint configuration.
- `node node_modules/next/dist/bin/next build --webpack`: passed; Next reported that its build skips type validation.
