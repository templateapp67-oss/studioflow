import { build } from "esbuild";
import { spawnSync } from "node:child_process";
const result = await build({
  entryPoints: ["scripts/verify-template15-interactions.tsx"],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  write: false,
  loader: {
    ".css": "empty",
    ".jpg": "dataurl",
    ".png": "dataurl",
    ".webp": "dataurl",
  },
});
const run = spawnSync(process.execPath, ["--input-type=module"], {
  input: result.outputFiles[0].text,
  stdio: ["pipe", "inherit", "inherit"],
});
if (run.error) throw run.error;
process.exitCode = run.status ?? 1;
