"use client";

import React, { useState } from "react";
import { User, Plus, ArrowRight, ShieldCheck, Check } from "lucide-react";

interface GoogleAccount {
  email: string;
  name: string;
  avatarColor: string;
}

const DEFAULT_ACCOUNTS: GoogleAccount[] = [
  {
    name: "Michael Ejdah",
    email: "michaelejdah179@gmail.com",
    avatarColor: "#4285F4",
  },
  {
    name: "Iphhennom",
    email: "iphhennom@gmail.com",
    avatarColor: "#e6b784",
  },
  {
    name: "Michael",
    email: "michael.stem@gmail.com",
    avatarColor: "#34A853",
  },
];

export default function GoogleAuthPopup() {
  const [selectedAccount, setSelectedAccount] = useState<GoogleAccount | null>(null);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [isUsingAnother, setIsUsingAnother] = useState(false);
  const [step, setStep] = useState<"choose" | "confirm" | "another" | "loading">("choose");

  const handleSelectAccount = (acc: GoogleAccount) => {
    setSelectedAccount(acc);
    setStep("loading");

    setTimeout(() => {
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "GOOGLE_AUTH_SUCCESS",
            user: {
              email: acc.email,
              name: acc.name,
              photoURL: null,
            },
          },
          window.location.origin
        );
        window.close();
      } else {
        try {
          const userObj = {
            uid: "usr_google_" + Math.random().toString(36).slice(2, 9),
            email: acc.email,
            displayName: acc.name,
            photoURL: null,
            createdAt: Date.now(),
          };
          window.localStorage.setItem("ember.auth.user", JSON.stringify(userObj));
          window.location.href = "/studio";
        } catch {
          window.location.href = "/studio";
        }
      }
    }, 400);
  };

  const handleConfirm = () => {
    if (!selectedAccount) return;
    setStep("loading");

    setTimeout(() => {
      // Send message to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "GOOGLE_AUTH_SUCCESS",
            user: {
              email: selectedAccount.email,
              name: selectedAccount.name,
              photoURL: null,
            },
          },
          window.location.origin
        );
        window.close();
      } else {
        // Fallback if not opened in popup: save to localStorage and navigate
        try {
          const userObj = {
            uid: "usr_google_" + Math.random().toString(36).slice(2, 9),
            email: selectedAccount.email,
            displayName: selectedAccount.name,
            photoURL: null,
            createdAt: Date.now(),
          };
          window.localStorage.setItem("ember.auth.user", JSON.stringify(userObj));
          window.location.href = "/studio";
        } catch {
          window.location.href = "/studio";
        }
      }
    }, 600);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    const nameToUse =
      customName.trim() ||
      customEmail.split("@")[0].charAt(0).toUpperCase() +
        customEmail.split("@")[0].slice(1);

    const newAcc: GoogleAccount = {
      email: customEmail.trim(),
      name: nameToUse,
      avatarColor: "#5cdb95",
    };
    setSelectedAccount(newAcc);
    setStep("loading");
    setTimeout(() => {
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "GOOGLE_AUTH_SUCCESS",
            user: {
              email: newAcc.email,
              name: newAcc.name,
              photoURL: null,
            },
          },
          window.location.origin
        );
        window.close();
      } else {
        try {
          const userObj = {
            uid: "usr_google_" + Math.random().toString(36).slice(2, 9),
            email: newAcc.email,
            displayName: newAcc.name,
            photoURL: null,
            createdAt: Date.now(),
          };
          window.localStorage.setItem("ember.auth.user", JSON.stringify(userObj));
          window.location.href = "/studio";
        } catch {
          window.location.href = "/studio";
        }
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#202124] text-[#e8eaed] font-sans flex flex-col justify-between p-6 sm:p-8 select-none">
      {/* Top Google Header */}
      <div className="w-full max-w-sm mx-auto">
        <div className="flex flex-col items-center text-center mt-2">
          {/* Google 4-Color G Logo */}
          <svg className="w-10 h-10 mb-4" viewBox="0 0 24 24">
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

          {step === "loading" ? (
            <div className="my-12 flex flex-col items-center gap-4">
              <div className="w-8 h-8 rounded-full border-3 border-[#8ab4f8] border-t-transparent animate-spin" />
              <div className="text-sm font-medium text-[#bdc1c6]">
                Signing in to Ember…
              </div>
            </div>
          ) : step === "confirm" ? (
            <div>
              <h1 className="text-xl font-medium tracking-tight text-[#f1f3f4]">
                To continue, Google will share your name and email with Ember
              </h1>
              <p className="text-xs text-[#9aa0a6] mt-2">
                Before using this app, you can review Ember’s privacy policy and terms of service.
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-normal tracking-tight text-[#f1f3f4]">
                Choose an account
              </h1>
              <p className="text-sm text-[#9aa0a6] mt-1">
                to continue to <span className="font-medium text-[#f1f3f4]">Ember</span>
              </p>
            </div>
          )}
        </div>

        {/* Content Body */}
        {step === "choose" && (
          <div className="mt-8 flex flex-col border border-[#3c4043] rounded-xl overflow-hidden divide-y divide-[#3c4043]">
            {DEFAULT_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleSelectAccount(acc)}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-[#303134] active:bg-[#35363a]"
              >
                {/* Account Avatar with Initial */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-medium text-sm text-[#202124] shrink-0"
                  style={{ backgroundColor: acc.avatarColor }}
                >
                  {acc.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[#f1f3f4] truncate">
                    {acc.name}
                  </div>
                  <div className="text-xs text-[#9aa0a6] truncate">
                    {acc.email}
                  </div>
                </div>
              </button>
            ))}

            {/* Use Another Account Button */}
            <button
              type="button"
              onClick={() => setStep("another")}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-[#303134] active:bg-[#35363a]"
            >
              <div className="w-9 h-9 rounded-full bg-[#303134] border border-[#5f6368] flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-[#9aa0a6]" />
              </div>
              <div className="text-sm font-medium text-[#f1f3f4]">
                Use another account
              </div>
            </button>
          </div>
        )}

        {/* Use Another Account Input Form */}
        {step === "another" && (
          <form onSubmit={handleCustomSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#bdc1c6] mb-1">
                Google Email
              </label>
              <input
                type="email"
                required
                autoFocus
                placeholder="youraccount@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="w-full rounded-lg border border-[#5f6368] bg-[#202124] px-3.5 py-2.5 text-sm text-[#f1f3f4] placeholder-[#80868b] focus:border-[#8ab4f8] focus:outline-none focus:ring-1 focus:ring-[#8ab4f8]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#bdc1c6] mb-1">
                Full Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Your Full Name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full rounded-lg border border-[#5f6368] bg-[#202124] px-3.5 py-2.5 text-sm text-[#f1f3f4] placeholder-[#80868b] focus:border-[#8ab4f8] focus:outline-none focus:ring-1 focus:ring-[#8ab4f8]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="text-xs font-medium text-[#8ab4f8] hover:underline"
              >
                Back to accounts
              </button>
              <button
                type="submit"
                className="rounded-full bg-[#8ab4f8] px-5 py-2 text-xs font-semibold text-[#202124] transition hover:bg-[#a8c7fa] active:scale-[0.98]"
              >
                Next
              </button>
            </div>
          </form>
        )}

        {/* Confirmation Screen */}
        {step === "confirm" && selectedAccount && (
          <div className="mt-6 flex flex-col items-center">
            {/* Selected Account Profile Pill */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-full border border-[#3c4043] bg-[#303134] mb-6">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-[#202124]"
                style={{ backgroundColor: selectedAccount.avatarColor }}
              >
                {selectedAccount.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-xs">
                <span className="font-medium text-[#f1f3f4]">
                  {selectedAccount.name}
                </span>{" "}
                <span className="text-[#9aa0a6]">
                  ({selectedAccount.email})
                </span>
              </div>
            </div>

            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full rounded-full bg-[#8ab4f8] py-2.5 px-4 text-xs font-semibold text-[#202124] transition hover:bg-[#a8c7fa] active:scale-[0.98]"
              >
                Continue
              </button>

              <button
                type="button"
                onClick={() => setStep("choose")}
                className="w-full rounded-full border border-[#5f6368] bg-transparent py-2.5 px-4 text-xs font-semibold text-[#8ab4f8] transition hover:bg-[#303134]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Google Footer */}
      <div className="w-full max-w-sm mx-auto flex items-center justify-between text-[11px] text-[#9aa0a6] pt-6 border-t border-[#3c4043]/50">
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#8ab4f8]" />
          <span>Google Secure Sign-In</span>
        </div>
        <div className="flex gap-3">
          <span className="hover:text-[#bdc1c6] cursor-pointer">Help</span>
          <span className="hover:text-[#bdc1c6] cursor-pointer">Privacy</span>
          <span className="hover:text-[#bdc1c6] cursor-pointer">Terms</span>
        </div>
      </div>
    </div>
  );
}
