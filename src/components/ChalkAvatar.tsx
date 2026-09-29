/* ------------------------------------------------------------------
   ChalkAvatar — Professor Ada, drawn the way she'd draw herself:
   a few chalk strokes (bun, round glasses, a small smile) on a soft
   chalk-dust disc. Used in the watch-page channel row, the Meet
   card, and overlay headers.

   Small sizes get thicker strokes and drop the fine detail (the
   temple lines) so the face always passes the squint test.
------------------------------------------------------------------- */

interface Props {
  /** rendered size in px */
  size?: number;
  className?: string;
}

export default function ChalkAvatar({ size = 40, className }: Props) {
  const small = size < 80;
  const s = small ? 4.5 : 3; // stroke width in the 96-unit viewBox
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      role="img"
      aria-label="Professor Ember"
      className={className}
    >
      {/* chalk-dust disc so the strokes always sit on their own panel */}
      <circle cx="48" cy="48" r="46" fill="rgba(255,255,255,0.05)" />
      <circle
        cx="48"
        cy="48"
        r="46"
        stroke="rgba(255,214,110,0.22)"
        strokeWidth="1.5"
      />
      {/* shoulders / collar */}
      <path
        d="M18 90 Q 48 66 78 90"
        stroke="#f4f6fa"
        strokeWidth={s + 1}
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* face */}
      <circle
        cx="48"
        cy="46"
        r="26"
        stroke="#f4f6fa"
        strokeWidth={s}
        opacity="0.95"
      />
      {/* hair bun */}
      <circle cx="48" cy="14" r="7.5" stroke="#ffd66e" strokeWidth={s} />
      <path
        d="M33 28 Q 48 17 63 28"
        stroke="#f4f6fa"
        strokeWidth={s}
        strokeLinecap="round"
        opacity="0.8"
      />
      {/* round glasses */}
      <circle cx="38.5" cy="44" r="8" stroke="#ffd66e" strokeWidth={s} />
      <circle cx="57.5" cy="44" r="8" stroke="#ffd66e" strokeWidth={s} />
      <path d="M46.5 44 H 49.5" stroke="#ffd66e" strokeWidth={s} strokeLinecap="round" />
      {!small && (
        <>
          <path
            d="M30.5 44 H 25"
            stroke="#ffd66e"
            strokeWidth={s}
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M65.5 44 H 71"
            stroke="#ffd66e"
            strokeWidth={s}
            strokeLinecap="round"
            opacity="0.8"
          />
        </>
      )}
      {/* the small smile */}
      <path
        d="M41 59 Q 48 65 55 59"
        stroke="#f4f6fa"
        strokeWidth={s}
        strokeLinecap="round"
      />
    </svg>
  );
}
