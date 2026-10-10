/** Never silently use ephemeral SQLite on a hosted Vercel deployment. */
export function databaseConfig(url: string | undefined, hosted: boolean): {
  provider: "sqlite" | "postgresql"; url: string;
} {
  if (!url && !hosted) return { provider: "sqlite", url: "file:./db/custom.db" };
  if (url?.startsWith("file:") && !hosted) return { provider: "sqlite", url };
  if (url && /^postgres(?:ql)?:\/\//.test(url)) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname && parsed.pathname.length > 1) return { provider: "postgresql", url };
    } catch { /* Do not include potentially secret URLs in errors. */ }
  }
  throw new Error(hosted ? "Vercel requires a Postgres database URL" : "Invalid database URL");
}
