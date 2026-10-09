"use client";
import { Layers, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StudioConsoleTabs({ activeTab, chapterCount, onSelect }: { activeTab: "chapters" | "refine"; chapterCount: number; onSelect: (tab: "chapters" | "refine") => void }) {
  return <div className="shrink-0 p-3 border-b border-white/[0.06] bg-[#0a0c10]/90"><div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-[#07080a] p-1">
    <button type="button" aria-pressed={activeTab === "chapters"} onClick={() => onSelect("chapters")} className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all", activeTab === "chapters" ? "bg-[#161920] text-[#f4f4f6] shadow-sm border border-white/[0.06]" : "text-[#8b919e] hover:text-[#f4f4f6]")}><Layers className="h-3.5 w-3.5 text-[#e6b784]" />Chapters ({chapterCount})</button>
    <button type="button" aria-pressed={activeTab === "refine"} onClick={() => onSelect("refine")} className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all", activeTab === "refine" ? "bg-gradient-to-r from-[#e6b784] to-[#f2ca9e] text-[#141619] shadow-sm font-bold" : "text-[#8b919e] hover:text-[#f4f4f6]")}><Sparkles className="h-3.5 w-3.5" />Office Hours</button>
  </div></div>;
}
