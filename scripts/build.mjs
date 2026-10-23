import {
  readFile,
  mkdir,
  writeFile,
  cp,
  readdir,
  lstat,
  rm,
} from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
const core = await readFile("src/core.js", "utf8"),
  app = await readFile("src/app.js", "utf8"),
  css = await readFile("src/styles.css", "utf8");
const inline =
  core.replace(/^export\s+(?=(?:const|function|class|let)\b)/gm, "") +
  "\n" +
  app.replace(
    /^\s*import\s*\{[\s\S]*?\}\s*from\s*["']\.\/core\.js["'];?\s*/,
    "",
  );
const html = (await readFile("index.html", "utf8"))
  .replace(
    /<link\b[^>]*href=["']src\/styles\.css["'][^>]*>/,
    () => `<style>${css}</style>`,
  )
  .replace(
    /<script\b[^>]*src=["']src\/app\.js["'][^>]*>\s*<\/script>/,
    () => `<script>${inline.replaceAll("</script", "<\\/script")}</script>`,
  );
await mkdir("dist", { recursive: true });
await writeFile("dist/index.html", html);
await mkdir("dist/site", { recursive: true });
await writeFile("dist/site/index.html", html);
// The ZIP root is the directly-openable app. source/ retains the original
// module entry point and everything needed to test, format and rebuild it.
const dist = path.resolve("dist");
const source = path.resolve(dist, "source");
if (path.dirname(source) !== dist)
  throw new Error("Generated source must stay inside dist.");
try {
  if ((await lstat(source)).isSymbolicLink())
    throw new Error("Refusing a symlinked generated source directory.");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await rm(source, { recursive: true, force: true });
await mkdir(source, { recursive: true });
for (const entry of await readdir(".", { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const file = entry.name;
  if (
    /\.md$/.test(file) ||
    [
      "LICENSE",
      "package.json",
      "package-lock.json",
      "playwright.config.mjs",
      ".gitignore",
      ".gitattributes",
      ".prettierignore",
    ].includes(file)
  ) {
    await cp(file, path.join(source, file));
    if (/\.md$/.test(file) || file === "LICENSE")
      await cp(file, path.join(dist, file));
  }
}
await cp("index.html", path.join(source, "index.html"));
for (const directory of [
  "src",
  "scripts",
  "test",
  "browser-tests",
  "examples",
  ".github",
]) {
  try {
    await lstat(directory);
  } catch (error) {
    if (error.code === "ENOENT") continue;
    throw error;
  }
  await cp(directory, path.join(source, directory), { recursive: true });
}
await cp("examples", "dist/examples", { recursive: true });
// Python's standard library creates a portable ZIP without a runtime npm dependency.
execFileSync(
  process.platform === "win32" ? "python" : "python3",
  ["scripts/package.py"],
  { stdio: "inherit" },
);
