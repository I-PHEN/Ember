---
name: better-ui
description: Polishes the surfaces, icons and motion in your project with exact values for border radius, optical alignment, shadows, icon states and animation. Use when refining interface design, aligning typography and icons, perfecting button clicks, cards, and modal polish.
---

# UI Polish

This skill holds the visual polish for surfaces, icons and motion, with the exact value each detail takes. It applies once the underlying interaction is sound, and a polish finding never outranks a broken interaction.

## Exact Values, Optional Polish

The values below are exact, not ranges to approximate. `cubic-bezier(0.2, 0, 0, 1)` is not `cubic-bezier(0.4, 0, 0.2, 1)`, and `0.96` is not `0.95`. The optical nudges and the concentric padding cutoff are the exceptions. They are starting points, judged by eye.

Keep the project's component library, tokens and density, and match its motion language wherever no rule here gives a value.

## Outer Radius Equals Inner Radius Plus Padding

Where nested surfaces share a visible, even inset, the outer radius is the inner radius plus the padding plus any border width. Past `24px` of padding, or where the padding is deliberately asymmetric, treat the layers as separate surfaces and keep each one's radius token:
$$R_{\text{outer}} = R_{\text{inner}} + \text{padding} + \text{border}$$

## Align Optically Where Geometry Looks Off

Where geometric centering looks off, nudge by eye. Give a button `2px` less padding on its icon side, shift a play triangle toward its point (e.g. `ml-0.5` or `translate-x-[1px]`), and fix asymmetric glyphs in the SVG itself.

## Shadows for Elevation, Borders for Structure

Where a border exists only to create depth, replace it with layered transparent `box-shadow` values. Keep borders on dividers, separators, table cells and selected states. Keep them on form inputs too (needs 3:1 non-text contrast).

Forced-colors mode removes every `box-shadow`. Keep `border: 1px solid transparent` under a shadow ring so that mode still draws an edge.

## Outline Images in Pure Black or White

Give content images a `1px` outline inset by `1px`. Use `oklch(0 0 0 / 0.1)` (or `rgba(0,0,0,0.1)`) in light mode and `oklch(1 0 0 / 0.1)` (or `rgba(255,255,255,0.1)`) in dark mode. Never use a palette near-black or tinted neutral, because the tint shows as a colored fringe on the image edge.

## Transitions, Not Keyframes, for Interactive State

Drive interactive state changes with CSS transitions or a motion library's springs, which retarget when the user reverses mid-flight. Keyframes run a fixed timeline and cannot reverse, so reserve them for sequences that run once.

## Press Scales to 0.96

A pressed button scales to `0.96` over `150ms` with `ease-out`, and a disabled one never scales. Give the button an opt-out where the motion would distract:
```css
button:active:not(:disabled) {
  transform: scale(0.96);
  transition: transform 150ms cubic-bezier(0.23, 1, 0.32, 1);
}
```

## High-Frequency Interactions Get No Animation

Keystrokes, row hovers and tab switches get instant feedback, or a transition of `150ms` or less on `opacity` or `background-color`. Reserve expressive motion for infrequent moments such as a view's first load, a success state or an empty state.

Every animated state change also leaves a static cue in the form of a color, icon or label. Motion is never the only feedback channel.

## Gate Motion Behind Reduced-Motion Preference

Run movement, scale and blur only under `prefers-reduced-motion: no-preference`. Under reduced motion, replace them with an opacity cross-fade rather than removing the element instantly.

## Cross-Fade Contextual Icons with Exact Values

Where an icon swaps on an infrequent state change, such as play to pause or copy to copied, cross-fade it. Scale runs `0.25` to `1`, opacity `0` to `1`. Cross-fade over `200–300ms` with `cubic-bezier(0.2, 0, 0, 1)`.

## Transition Only What Changes

Name the exact properties, as in `transition-property: transform, opacity, background-color`, and never `all`.

## Match Icon Stroke to Text Weight

An icon's rendered stroke tracks the weight of the text beside it, from `1.5px` at regular (400) to `2px` at medium (500) and `2.5px` at bold (700).

## Before You Finish Checklist

| Detection | Fix |
| --- | --- |
| Padded parent and child with the same radius | Outer radius = Inner radius + padding |
| Ring with no border beside it | `border: 1px solid transparent` fallback |
| `transition-all` or `transition: all` | Name the changing properties |
| `:active` scale with no `:disabled` exclusion | `:not(:disabled):active` |
| `active:scale-95` or `scale-90` | `scale(0.96)` |
| Missing `prefers-reduced-motion` | Cross-fade opacity under reduced motion |
| Overlays scrolling page behind | `overscroll-behavior: contain` |
