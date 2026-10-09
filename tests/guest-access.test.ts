import { describe, it, expect } from "bun:test";
import fs from "node:fs";
describe("guest demo access", () => {
  const auth = fs.readFileSync("src/lib/firebase/auth-context.tsx", "utf8");
  it("keeps guest status separate from authenticated users and restores only a tab session", () => {
    const guest = auth.slice(auth.indexOf("const continueAsGuest"), auth.indexOf("return (", auth.indexOf("const continueAsGuest")));
    expect(guest).toContain("sessionStorage.setItem(GUEST_KEY");
    expect(guest).not.toContain("setUser(");
    expect(guest).not.toContain("fetch(");
    expect(guest).toContain("if (destination) destination()");
    expect(guest).toContain('window.location.pathname !== "/studio"');
    expect(auth).toContain('sessionStorage.getItem(GUEST_KEY) === "true"');
    expect(auth).toContain("sessionStorage.removeItem(GUEST_KEY)");
  });
  it("allows guest entry throughout the requested workflow", () => {
    expect(fs.readFileSync("src/app/studio/page.tsx", "utf8")).toContain("!user && !isGuest");
    expect(fs.readFileSync("src/app/gallery/page.tsx", "utf8")).toContain("!user && !isGuest");
    expect(fs.readFileSync("src/app/gallery/page.tsx", "utf8")).toContain('href={user || isGuest ? "/studio" : "/"}');
    expect(fs.readFileSync("src/app/gallery/page.tsx", "utf8")).toContain('{user || isGuest ? "Studio" : "Home"}');
    expect(fs.readFileSync("src/app/page.tsx", "utf8")).toContain("user || isGuest");
    const modal = fs.readFileSync("src/components/auth/AuthModal.tsx", "utf8");
    expect(modal).toContain("Continue as guest");
    expect(modal).toContain("not production authentication");
    expect(modal).not.toContain("Encrypted Session");
    expect(modal).toContain("max-h-[calc(100dvh-2rem)] overflow-y-auto");
  });
});
