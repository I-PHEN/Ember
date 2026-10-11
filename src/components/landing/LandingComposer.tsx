"use client";

import type { KeyboardEvent } from "react";
import { ArrowRight, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type LandingComposerProps = {
  question: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAttach: () => void;
};

export function shouldSubmitComposerOnEnter(event: Pick<KeyboardEvent<HTMLTextAreaElement>, "key" | "shiftKey" | "ctrlKey" | "metaKey" | "isComposing">) {
  return event.key === "Enter" && !event.isComposing && (event.metaKey || event.ctrlKey || !event.shiftKey);
}

export default function LandingComposer({ question, busy, onChange, onSubmit, onAttach }: LandingComposerProps) {
  const disabled = !question.trim() || busy || question.length > 600;

  return (
    <form
      className="landing-composer group relative w-full rounded-2xl border border-white/[0.08] bg-[#12151b]/95 p-3 sm:p-3.5 shadow-2xl shadow-black/50 transition-all focus-within:border-[#e6b784]/60 focus-within:ring-1 focus-within:ring-[#e6b784]/20"
      onSubmit={(event) => { event.preventDefault(); if (!disabled) onSubmit(); }}
    >
      <Textarea
        aria-label="Your question"
        value={question}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (shouldSubmitComposerOnEnter(event)) {
            event.preventDefault();
            if (!disabled) onSubmit();
          }
        }}
        rows={2}
        maxLength={601}
        placeholder="Paste any math, physics, chemistry, or engineering problem…"
        className="min-h-[64px] sm:min-h-[72px] resize-none border-0 bg-transparent px-2.5 py-1 font-sans text-sm leading-relaxed text-[#f4f4f6] placeholder:text-[#6a7180] focus-visible:ring-0"
      />
      <div className="mt-1 flex items-center justify-between border-t border-white/[0.06] px-1 pt-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAttach}
            aria-label="Attach an image in the studio"
            title="Open the studio to attach an image"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#8b919e] transition hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-[#f4f4f6]"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>
          {question.trim() && <button type="button" onClick={() => onChange("")} className="rounded-xl px-2.5 py-1 text-xs text-[#8b919e] transition-colors hover:text-[#f4f4f6]">Clear</button>}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1 font-mono text-[10px] text-[#6a7180] sm:flex">
            <span className="rounded border border-white/[0.08] bg-white/[0.03] px-1 py-0.5">⌘</span>
            <span className="rounded border border-white/[0.08] bg-white/[0.03] px-1 py-0.5">↵</span>
            <span className="ml-0.5">to solve</span>
          </div>
          <span className="font-mono text-[11px] text-[#6a7180]">{question.length}/600</span>
          <Button type="submit" disabled={disabled} className="h-8 rounded-xl bg-gradient-to-r from-[#e6b784] to-[#f2ca9e] px-4 text-xs font-semibold text-[#141619] shadow-md shadow-[#e6b784]/20 transition-all hover:shadow-[#e6b784]/35 active:scale-95 disabled:opacity-30">
            Start lesson <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </form>
  );
}
