"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
  createdAt: number;
}

export interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  isGuest: boolean;
  continueAsGuest: () => void;
  signInWithGoogle: (googleEmail?: string, googleName?: string) => Promise<FirebaseUser>;
  signInWithEmail: (email: string, pass: string) => Promise<FirebaseUser>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<FirebaseUser>;
  signOut: () => Promise<void>;
  openAuthModal: (onSuccess?: () => void) => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
  authModalCallback: (() => void) | null;
}

const STORAGE_KEY = "ember.auth.user";
const GUEST_KEY = "ember.auth.guest";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalCallback, setAuthModalCallback] = useState<(() => void) | null>(null);

  // Restore existing session on mount — strictly purge any legacy mock "Alex Rivera"
  useEffect(() => {
    try {
      setIsGuest(window.sessionStorage.getItem(GUEST_KEY) === "true");
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: FirebaseUser = JSON.parse(stored);
        if (
          parsed.displayName === "Alex Rivera" ||
          parsed.email === "scholar@stanford.edu"
        ) {
          window.localStorage.removeItem(STORAGE_KEY);
          setUser(null);
        } else {
          setUser(parsed);
        }
      }
    } catch {
      /* ignore storage errors */
    } finally {
      setLoading(false);
    }
  }, []);

  const saveUserSession = useCallback((u: FirebaseUser) => {
    setUser(u);
    setIsGuest(false);
    try {
      window.sessionStorage.removeItem(GUEST_KEY);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } catch {
      /* ignore */
    }
  }, []);

  const clearUserSession = useCallback(() => {
    setUser(null);
    setIsGuest(false);
    try {
      window.sessionStorage.removeItem(GUEST_KEY);
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const signInWithGoogle = useCallback(
    async (googleEmail?: string, googleName?: string): Promise<FirebaseUser> => {
      setLoading(true);
      const emailToUse = googleEmail?.trim() || "";
      if (!emailToUse) {
        setLoading(false);
        throw new Error("Google sign-in was cancelled.");
      }
      const nameToUse =
        googleName ||
        emailToUse.split("@")[0].charAt(0).toUpperCase() +
          emailToUse.split("@")[0].slice(1);

      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "google",
            email: emailToUse,
            name: nameToUse,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to sign in with Google");

        const googleUser: FirebaseUser = {
          uid: data.user.uid,
          email: data.user.email,
          displayName: data.user.displayName,
          photoURL: null,
          isAnonymous: false,
          createdAt: data.user.createdAt,
        };
        saveUserSession(googleUser);
        setIsAuthModalOpen(false);
        if (authModalCallback) {
          authModalCallback();
          setAuthModalCallback(null);
        }
        return googleUser;
      } finally {
        setLoading(false);
      }
    },
    [authModalCallback, saveUserSession]
  );

  const signInWithEmail = useCallback(
    async (email: string, pass: string): Promise<FirebaseUser> => {
      setLoading(true);
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "signin",
            email,
            password: pass,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Invalid credentials.");

        const emailUser: FirebaseUser = {
          uid: data.user.uid,
          email: data.user.email,
          displayName: data.user.displayName,
          photoURL: null,
          isAnonymous: false,
          createdAt: data.user.createdAt,
        };
        saveUserSession(emailUser);
        setIsAuthModalOpen(false);
        if (authModalCallback) {
          authModalCallback();
          setAuthModalCallback(null);
        }
        return emailUser;
      } finally {
        setLoading(false);
      }
    },
    [authModalCallback, saveUserSession]
  );

  const signUpWithEmail = useCallback(
    async (email: string, pass: string, name?: string): Promise<FirebaseUser> => {
      setLoading(true);
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "signup",
            email,
            password: pass,
            name,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Registration failed.");

        const newUser: FirebaseUser = {
          uid: data.user.uid,
          email: data.user.email,
          displayName: data.user.displayName,
          photoURL: null,
          isAnonymous: false,
          createdAt: data.user.createdAt,
        };
        saveUserSession(newUser);
        setIsAuthModalOpen(false);
        if (authModalCallback) {
          authModalCallback();
          setAuthModalCallback(null);
        }
        return newUser;
      } finally {
        setLoading(false);
      }
    },
    [authModalCallback, saveUserSession]
  );

  const signOut = useCallback(async (): Promise<void> => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 100));
    clearUserSession();
    setLoading(false);
  }, [clearUserSession]);

  const openAuthModal = useCallback((onSuccess?: () => void) => {
    if (onSuccess) setAuthModalCallback(() => onSuccess);
    else setAuthModalCallback(null);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthModalCallback(null);
  }, []);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
    try { window.sessionStorage.setItem(GUEST_KEY, "true"); } catch { /* Current page still supports guest mode. */ }
    const destination = authModalCallback;
    setAuthModalCallback(null);
    setIsAuthModalOpen(false);
    if (destination) destination();
    else if (window.location.pathname !== "/studio") window.location.assign("/studio");
  }, [authModalCallback]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest,
        continueAsGuest,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        openAuthModal,
        closeAuthModal,
        isAuthModalOpen,
        authModalCallback,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
