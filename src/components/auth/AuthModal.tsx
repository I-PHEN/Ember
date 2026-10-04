"use client";

import React, { useState } from "react";
import { X, Loader2, ArrowRight, Lock, Mail, User, ShieldCheck, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth-context";

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup" | "google">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleGooglePopup = () => {
    setError(null);
    const width = 480;
    const height = 620;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const onMessage = async (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "GOOGLE_AUTH_SUCCESS") {
        window.removeEventListener("message", onMessage);
        try {
          setLoading(true);
          const { email: accEmail, name: accName } = e.data.user;
          await signInWithGoogle(accEmail, accName);
          closeAuthModal();
          window.location.href = "/studio";
        } catch (err: any) {
          setError(err?.message || "Failed to sign in with Google.");
        } finally {
          setLoading(false);
        }
      }
    };

    window.addEventListener("message", onMessage);

    const popup = window.open(
      "/auth/google",
      "Google_Sign_In",
      `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0,menubar=0,location=0`
    );

    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      // Browser blocked popup window, seamlessly use in-modal Google form
      setMode("google");
    }
  };

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) {
      setError("Please provide your Google account email.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle(googleEmail.trim(), googleName.trim());
      // On success, redirect directly into the studio app
      window.location.href = "/studio";
    } catch (err: any) {
      setError(err?.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please provide both email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name);
      }
      // On success, redirect directly into the studio app
      window.location.href = "/studio";
    } catch (err: any) {
      setError(err?.message || "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 transition-opacity"
        onClick={closeAuthModal}
      />

      {/* Disciplined Dark Modal Window */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#2b2f34] bg-[#14171a] p-6 shadow-2xl shadow-black text-[#f1eee7] sm:p-8 z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-5 right-5 rounded-lg p-1.5 text-[#8b8d8f] hover:bg-white/5 hover:text-[#f1eee7] transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-[#e6b784]" />
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#e6b784]">
              Ember Authentication
            </span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-[#f1eee7]">
            {mode === "google"
              ? "Continue with Google"
              : mode === "signin"
              ? "Sign in to access Ember Studio"
              : "Create your student account"}
          </h2>
          <p className="mt-1 text-xs text-[#8b8d8f] leading-relaxed">
            {mode === "google"
              ? "Sign in with your Google account to access all studio features."
              : mode === "signin"
              ? "Watch community solves, save derivation history, and chat in Office Hours."
              : "Start turning STEM problems into synchronized blackboard lessons."}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* ================= GOOGLE FLOW ================= */}
        {mode === "google" ? (
          <form onSubmit={handleGoogleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-[#a4a5a7] mb-1">
                Google Account Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#6e7175]" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="yourname@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#2d3136] bg-[#1a1d20] py-2 pl-9 pr-3 text-xs text-[#f1eee7] placeholder:text-[#5e6165] focus:border-[#e6b784]/60 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#a4a5a7] mb-1">
                Display Name (Optional)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-[#6e7175]" />
                <input
                  type="text"
                  placeholder="Your Full Name"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full rounded-xl border border-[#2d3136] bg-[#1a1d20] py-2 pl-9 pr-3 text-xs text-[#f1eee7] placeholder:text-[#5e6165] focus:border-[#e6b784]/60 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e6b784] py-2.5 px-4 text-xs font-semibold text-[#16181a] transition-all hover:bg-[#f2ca9e] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign in with Google Account</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("signin");
                }}
                className="flex items-center justify-center gap-1.5 py-1.5 text-xs text-[#8b8d8f] hover:text-[#f1eee7] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to standard email
              </button>
            </div>
          </form>
        ) : (
          /* ================= STANDARD SIGN IN / SIGN UP FLOW ================= */
          <>
            {/* Google One-Tap Sign In Button */}
            <button
              type="button"
              disabled={loading}
              onClick={handleGooglePopup}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#33373c] bg-[#1a1d21] py-2.5 px-4 text-xs font-semibold text-[#f1eee7] transition-all hover:border-[#e6b784]/50 hover:bg-[#202428] active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative my-5 flex items-center justify-center">
              <div className="w-full border-t border-[#262a2e]" />
              <span className="relative bg-[#14171a] px-3 font-mono text-[10px] uppercase tracking-wider text-[#6b6e73]">
                or with email
              </span>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === "signup" && (
                <div>
                  <label className="block text-[11px] font-medium text-[#a4a5a7] mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-[#6e7175]" />
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-[#2d3136] bg-[#1a1d20] py-2 pl-9 pr-3 text-xs text-[#f1eee7] placeholder:text-[#5e6165] focus:border-[#e6b784]/60 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-[#a4a5a7] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#6e7175]" />
                  <input
                    type="email"
                    required
                    placeholder="name@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-[#2d3136] bg-[#1a1d20] py-2 pl-9 pr-3 text-xs text-[#f1eee7] placeholder:text-[#5e6165] focus:border-[#e6b784]/60 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#a4a5a7] mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#6e7175]" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-[#2d3136] bg-[#1a1d20] py-2 pl-9 pr-3 text-xs text-[#f1eee7] placeholder:text-[#5e6165] focus:border-[#e6b784]/60 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e6b784] py-2.5 px-4 text-xs font-semibold text-[#16181a] transition-all hover:bg-[#f2ca9e] active:scale-[0.99] disabled:opacity-50 mt-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>{mode === "signin" ? "Sign In & Enter Studio" : "Create Account & Enter Studio"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Sign In / Sign Up */}
            <div className="mt-5 text-center text-xs text-[#8b8d8f]">
              {mode === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode("signup");
                    }}
                    className="font-semibold text-[#e6b784] hover:underline"
                  >
                    Sign up free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode("signin");
                    }}
                    className="font-semibold text-[#e6b784] hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-[#23272b] pt-4 text-[10px] text-[#6b6e73]">
          <ShieldCheck className="h-3 w-3 text-[#5cdb95]" />
          <span>Encrypted Session · SQLite &amp; Firebase Compatible</span>
        </div>
      </div>
    </div>
  );
}
