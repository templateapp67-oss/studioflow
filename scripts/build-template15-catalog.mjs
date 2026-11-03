import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const result = await build({
  stdin: {
    contents:
      "import {CATEGORY_TEMPLATES} from './src/categoryTemplates';console.log(JSON.stringify(CATEGORY_TEMPLATES.mens_hair_studio));",
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  write: false,
  loader: {
    ".jpg": "dataurl",
    ".png": "dataurl",
    ".webp": "dataurl",
    ".css": "empty",
  },
});
const run = spawnSync(process.execPath, ["--input-type=module"], {
  input: result.outputFiles[0].text,
  encoding: "utf8",
});
if (run.status !== 0) throw new Error(run.stderr);
const cfg = JSON.stringify(JSON.parse(run.stdout));
const path = "supabase/migrations/202611030003_template15_keshkraft.sql";
const sql = readFileSync(path, "utf8");
const seed = `insert into public.studioflow_templates(id,title,config,active) values('mens_hair_studio','KeshKraft Men''s Hair Studio','${cfg.replaceAll("'", "''")}'::jsonb,true) on conflict(id) do nothing;`;
writeFileSync(
  path,
  sql.replace(
    /insert into public\.studioflow_templates\(id,title,config,active\).*?on conflict\(id\) do nothing;/s,
    seed,
  ),
);
