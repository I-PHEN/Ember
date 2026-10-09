"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Sparkles,
  Play,
  Globe,
  Clapperboard,
  BookOpen,
} from "lucide-react";
import Wordmark from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import { compileTimeline } from "@/lib/video/compile";
import { renderToImage } from "@/lib/video/render";
import { thumbnailTime } from "@/lib/video/thumbnail";
import { THEMES, totalDuration } from "@/lib/video/types";
import { cn } from "@/lib/utils";
import MathCopy from "@/components/MathCopy";
import { galleryPublisher } from "@/lib/gallery-presentation";
import { useAuth } from "@/lib/firebase/auth-context";

interface GalleryItem {
  id: string;
  title: string;
  description?: string;
  publisher: string;
  upvotes: number;
  views: number;
  createdAt: number;
  script: any;
}

const SUBJECT_TAGS = [
  "All",
  "Calculus",
  "Mechanics",
  "Physics",
  "ODEs",
  "Circuits",
  "Chemistry",
];

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function fmtRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(ts);
}

function fmtDur(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function GalleryPage() {
  const { user, isGuest, openAuthModal } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [durs, setDurs] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.items)) {
          setItems(d.items);

          // Generate rich blackboard snapshot thumbnails & exact durations
          const newThumbs: Record<string, string> = {};
          const newDurs: Record<string, string> = {};
          for (const item of d.items) {
            if (item.script && item.script.scenes?.length) {
              try {
                const tl = compileTimeline(item.script);
                const dur = totalDuration(tl);
                newDurs[item.id] = fmtDur(dur);
                const t = thumbnailTime(tl);
                newThumbs[item.id] = renderToImage(tl, THEMES.blackboard, t, 480);
              } catch {
                newDurs[item.id] = "3:15";
              }
            } else {
              newDurs[item.id] = "3:00";
            }
          }
          setThumbs(newThumbs);
          setDurs(newDurs);
        }
      })
      .catch((err) => console.error("Failed to load gallery:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSubject =
        selectedSubject === "All" ||
        item.script?.subject?.toLowerCase() === selectedSubject.toLowerCase();
      const matchSearch =
        !search.trim() ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(search.toLowerCase())) ||
        (item.script?.question &&
          item.script.question.toLowerCase().includes(search.toLowerCase()));
      return matchSubject && matchSearch;
    });
  }, [items, selectedSubject, search]);

  const handleWatch = (item: GalleryItem) => {
    const doWatch = () => {
      try {
        window.localStorage.setItem("ember.watch.active", JSON.stringify(item.script));
        window.location.href = `/studio?solve=${item.id}`;
      } catch {
        window.location.href = "/studio";
      }
    };

    if (!user && !isGuest) {
      openAuthModal(doWatch);
      return;
    }
    doWatch();
  };

  const handleCreateSolve = () => {
    if (!user && !isGuest) {
      openAuthModal(() => {
        window.location.href = "/studio";
      });
      return;
    }
    window.location.href = "/studio";
  };

  return (
    <main className="ember-gallery flex min-h-dvh flex-col">
      {/* Top Header */}
      <header className="ember-home-header sticky top-0 z-30 flex h-20 shrink-0 items-center justify-between border-b px-6 backdrop-blur-xl sm:px-12">
        <div className="flex items-center gap-4">
          <Link
            href={user ? "/studio" : "/"}
            className="flex items-center gap-1.5 rounded-xl border border-[#34383c] bg-[#171b1d] px-3.5 py-1.5 text-xs font-semibold text-[#a4a5a7] transition-all hover:border-[#e6b784]/40 hover:text-[#f1eee7]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {user ? "Studio" : "Home"}
          </Link>
          <Wordmark />
        </div>

        <div className="flex items-center gap-3">
          {!user && (
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="rounded-xl border border-[#34383c] bg-[#171b1d] px-3.5 py-1.5 text-xs font-semibold text-[#f1eee7] hover:border-[#e6b784]/40 transition-all"
            >
              Sign In
            </button>
          )}

          <Button
            size="sm"
            onClick={handleCreateSolve}
            className="rounded-xl bg-[#e6b784] font-semibold text-[#191816] hover:bg-[#f2ca9e] shadow-[0_2px_12px_rgba(230,183,132,0.2)]"
          >
            <Clapperboard className="h-4 w-4 mr-1.5" />
            Create Solve
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 sm:px-8">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#e6b784]/25 bg-[#e6b784]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#e6b784] mb-4">
            <Globe className="h-3.5 w-3.5" />
            Community Solves
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#f1eee7]">
            The Library of Thought.
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#a4a5a7] leading-relaxed">
            University mathematics, physics, and engineering problems planned and handwritten by Professor Ember. Search or explore community lectures.
          </p>
        </div>

        {/* Search & Subject Filters */}
        <div className="mb-10 space-y-4">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b8d8f]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search across questions, topics, or equations…"
              className="w-full rounded-2xl border border-[#34383c] bg-[#171b1d] pl-11 pr-4 py-3 text-sm text-[#f1eee7] placeholder:text-[#8b8d8f] focus:outline-none focus:border-[#e6b784]/60 shadow-inner"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {SUBJECT_TAGS.map((subject) => (
              <button
                key={subject}
                type="button"
                onClick={() => setSelectedSubject(subject)}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-medium transition-all",
                  selectedSubject === subject
                    ? "bg-[#e6b784] text-[#191816] font-semibold shadow-sm"
                    : "border border-[#34383c] bg-[#1a1d20] text-[#a4a5a7] hover:border-[#4a4e53] hover:text-[#f1eee7]"
                )}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>

        {/* Video Catalog Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="rounded-2xl border border-[#2b2f33] bg-[#171b1d] p-3 animate-pulse space-y-3"
              >
                <div className="aspect-video w-full rounded-xl bg-zinc-900" />
                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#34383c] bg-[#171b1d]/40 py-20 px-6 text-center max-w-lg mx-auto">
            <BookOpen className="h-10 w-10 text-[#e6b784]/40 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[#f1eee7]">No community solves found</h3>
            <p className="mt-1 text-xs text-[#a4a5a7] leading-relaxed">
              {search
                ? `No results matched "${search}". Try searching for another topic or clear your filter.`
                : "Be the first scholar to publish a video! Create any lecture on the homepage and click 'Publish to Gallery' in the watch stage."}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedSubject("All");
                }}
                className="mt-4 text-xs text-[#e6b784] hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleWatch(item)}
                className="group relative flex flex-col rounded-2xl border border-[#282c31] bg-[#16191b] overflow-hidden transition-all duration-200 hover:border-[#e6b784]/50 hover:shadow-xl hover:shadow-black/50 cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handleWatch(item); } }}
                aria-label={`Watch ${item.title}`}
              >
                {/* 16:9 Aspect Ratio Thumbnail Container */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/90">
                  {thumbs[item.id] ? (
                    <img
                      src={thumbs[item.id]}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-950">
                      <Play className="h-8 w-8 text-white/30" />
                    </div>
                  )}

                  {/* Play Hover Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[1px] transition-all duration-200 group-hover:opacity-100">
                    <span className="scale-75 rounded-full bg-[#e6b784] p-3 text-[#191816] shadow-lg transition-transform duration-200 group-hover:scale-100 flex items-center justify-center">
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    </span>
                  </div>

                  {/* Subject Badge */}
                  {item.script?.subject && (
                    <div className="absolute top-2.5 left-2.5">
                      <span className="rounded-md bg-black/75 border border-white/10 px-2 py-0.5 text-[10px] font-medium text-[#f1eee7]/90 backdrop-blur-md">
                        {item.script.subject}
                      </span>
                    </div>
                  )}

                  {/* Duration Badge */}
                  <div className="absolute bottom-2.5 right-2.5 rounded-md bg-black/85 border border-white/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#f1eee7] shadow-sm backdrop-blur-md">
                    {durs[item.id] || "3:00"}
                  </div>
                </div>

                {/* Details */}
                <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
                  <div>
                    <h3 className="gallery-math-copy line-clamp-2 text-sm font-semibold text-[#f1eee7] group-hover:text-[#e6b784] transition-colors">
                      <MathCopy text={item.title} />
                    </h3>
                    <div className="gallery-math-copy line-clamp-2 mt-1 text-xs text-[#8b8d8f] leading-relaxed">
                      <MathCopy text={item.description || item.script?.question || ""} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#23272b] pt-2 text-xs text-[#8b8d8f]">
                    <span className="text-[11px] text-[#a4a5a7]">
                      By {galleryPublisher(item.publisher)}
                    </span>
                    <span className="text-[11px] font-mono text-[#8b8d8f]">
                      {fmtRelativeTime(item.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="ember-home-footer mt-auto border-t px-6 py-8 text-center text-xs text-[#8b8d8f]">
        Ember — Every problem, a lesson
      </footer>
    </main>
  );
}
