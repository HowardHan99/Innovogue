/* Writes tokens.css from src/tokens.ts. Run via `npm run tokens`, which
   bundles tokens.ts to node_modules/.dd/tokens.mjs first. */
import { writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { tokensCss } = await import(pathToFileURL(join(root, "node_modules/.dd/tokens.mjs")).href);

const out = join(root, "tokens.css");
writeFileSync(out, tokensCss());
console.log("wrote " + out);
