import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");
const publicDir = join(root, "public");

mkdirSync(publicDir, { recursive: true });

const openapiSrc = join(repoRoot, "public", "openapi.yaml");
const openapiDest = join(publicDir, "openapi.yaml");
if (!existsSync(openapiSrc)) {
  console.error("Missing", openapiSrc);
  process.exit(1);
}
copyFileSync(openapiSrc, openapiDest);
console.log("Copied openapi.yaml → docs/public/");
