/* Ember is both the learning environment and the teaching voice. */

import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** chip shown next to the name on wide screens */
  chip?: string;
}

export default function Wordmark({ className, chip }: Props) {
  return (
    <span className={cn("flex items-center", className)}>
      <span className="flex flex-col">
        <span className="text-2xl font-semibold tracking-tight text-[#f1eee7]">
          Ember
          <span className="sr-only"> — every problem, a lesson</span>
        </span>
        {/* the stroke that raises a spark */}
        <svg
          viewBox="0 0 120 17"
          aria-hidden="true"
          className="mt-[5px] h-[8px] w-[84px] text-[#e6b784]"
        >
          <path
            d="M4 12 C 30 9.6, 68 9.2, 92 9.8 C 102 10.1, 108.5 8.2, 110.5 4.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          <circle cx="109" cy="2.4" r="2" fill="currentColor" />
        </svg>
      </span>
      {chip && (
        <span className="ml-3 hidden rounded-full border border-[#e6b784]/25 bg-[#e6b784]/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#e6b784] sm:inline">
          {chip}
        </span>
      )}
    </span>
  );
}
