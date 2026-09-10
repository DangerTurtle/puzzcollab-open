// Resolves *.test.ts files ourselves and passes them to `node --test` as
// explicit paths, rather than a glob string in the "test" script. Node's
// built-in test runner only grew shell-independent glob support recently,
// and package.json scripts pass a quoted "**/*.test.ts" through to Node
// *literally* -- on Node 20.9 (this project's stated minimum, matching
// Next.js's own `engines.node`), that fails outright instead of finding
// nothing. Doing discovery in JS works the same on every supported Node
// version and every OS shell (no reliance on bash's globstar either).
import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

async function findTestFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findTestFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      files.push(full);
    }
  }
  return files;
}

const testFiles = await findTestFiles(root);
if (testFiles.length === 0) {
  console.error("No *.test.ts files found.");
  process.exit(1);
}

const child = spawn(
  process.execPath,
  ["--import", "tsx", "--test", ...testFiles],
  { stdio: "inherit" },
);
child.on("exit", (code) => process.exit(code ?? 1));
