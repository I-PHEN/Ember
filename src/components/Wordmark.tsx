/* ------------------------------------------------------------------
   Wordmark — the Chalkcast mark (a piece of chalk drawing its own
   underline swash) next to the name. One mark everywhere: headers,
   overlay, footer.
------------------------------------------------------------------- */

import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** chip shown next to the name on wide screens */
  chip?: string;
}

export default function Wordmark({ className, chip }: Props) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 64 64"
        className="h-8 w-8 shrink-0"
        aria-hidden="true"
        fill="none"
      >
        <g transform="rotate(-42 30 28)">
          <rect x="12" y="22" width="26" height="11" rx="5.5" fill="#f4f6fa" />
          <rect x="38" y="22" width="9" height="11" rx="4.5" fill="#ffd66e" />
        </g>
        <path
          d="M15 50 Q 32 43.5 49 49"
          stroke="#ffd66e"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-lg font-semibold tracking-tight">
        Chalkcast
        <span className="sr-only"> — every problem, a lesson</span>
      </span>
      {chip && (
        <span className="hidden rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:inline">
          {chip}
        </span>
      )}
    </span>
  );
}
