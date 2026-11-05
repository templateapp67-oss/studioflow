import React from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const outputPath = path.resolve(projectRoot, "dist/index.html");
const vite = await createServer({
  configFile: path.resolve(projectRoot, "vite.config.ts"),
  mode: "production",
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  const { PublicHomePage } = await vite.ssrLoadModule(
    "/src/components/PublicHomePage.tsx",
  );
  const pageMarkup = renderToString(
    React.createElement(PublicHomePage),
  );

  if (!/<h1\\b[^>]*>/.test(pageMarkup)) {
    throw new Error("The prerendered public homepage must contain its visible H1.");
  }

  let documentHtml = await readFile(outputPath, "utf8");
  const emptyRoot = '<div id="root"></div>';
  if (!documentHtml.includes(emptyRoot)) {
    throw new Error("The empty React root marker was not found in dist/index.html.");
  }

  documentHtml = documentHtml.replace(
    emptyRoot,
    '<div id="root" data-prerendered="true">' + pageMarkup + "</div>",
  );
  await writeFile(outputPath, documentHtml, "utf8");
  console.log("Prerendered the public NEXORA homepage into dist/index.html.");
} finally {
  await vite.close();
}
