import { expect, test } from "bun:test";
import { databaseConfig } from "../src/lib/database-config";

test("local development defaults to SQLite", () => {
  expect(databaseConfig(undefined, false)).toEqual({ provider: "sqlite", url: "file:./db/custom.db" });
});
test("Postgres URLs select the hosted client without exposing or rewriting credentials", () => {
  for (const url of ["postgresql://test:secret@localhost/ember", "postgres://test:secret@localhost/ember"]) {
    expect(databaseConfig(url, true)).toEqual({ provider: "postgresql", url });
  }
});
test("Vercel rejects missing or ephemeral SQLite databases", () => {
  for (const url of [undefined, "", "file:./db/custom.db"]) {
    expect(() => databaseConfig(url, true)).toThrow("Postgres");
  }
});
test("unsupported or malformed URLs fail without logging credentials", () => {
  for (const url of ["https://user:secret@localhost/db", "postgresql://", "mysql://localhost/ember"]) {
    expect(() => databaseConfig(url, false)).toThrow("database");
    try { databaseConfig(url, false); } catch (error) {
      expect(String(error)).not.toContain("secret");
    }
  }
});
