// ts-lex's cross-directory relative imports come out with Windows path
// separators when codegen runs on Windows (e.g. './..\..\com\atproto\repo\
// strongRef.defs'), which Node's ESM resolver won't accept -- it treats
// backslashes as literal filename characters, not separators. Same-directory
// imports (e.g. './team.defs') never hit this. Since lib/lexicons is
// regenerated on every build and never committed, this normalizes the
// output in place rather than patching anything upstream.
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = "./lib/lexicons";

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (entry.endsWith(".ts")) {
      const original = readFileSync(full, "utf8");
      const fixed = original.replace(
        /from (['"])([^'"]*\\[^'"]*)\1/g,
        (match, quote, spec) =>
          `from ${quote}${spec.replace(/\\/g, "/").replace(/\/{2,}/g, "/")}${quote}`,
      );
      if (fixed !== original) {
        writeFileSync(full, fixed);
      }
    }
  }
}

walk(root);
