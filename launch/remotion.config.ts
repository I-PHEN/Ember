import path from "node:path";
import { Config } from "@remotion/cli/config";

/* ------------------------------------------------------------------
   The film lives OUTSIDE the app, but it borrows the app's real board
   engine (compile.ts / render.ts / the single-stroke font) read-only,
   so the handwriting in the launch film is byte-for-byte what users
   see in Ember. `@/…` resolves to the app's src/ exactly like Next.
------------------------------------------------------------------- */
const APP_SRC = path.resolve(process.cwd(), "..", "src");

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setConcurrency(4);

Config.overrideWebpackConfig((current) => ({
  ...current,
  resolve: {
    ...current.resolve,
    alias: {
      ...(current.resolve?.alias ?? {}),
      "@": APP_SRC,
    },
  },
}));
