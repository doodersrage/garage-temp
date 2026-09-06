/**
 * Parse KEY=VALUE lines from a dotenv-style file.
 * Double-quoted values unescape \\ \" \n \r \t (same idea as dotenv).
 */
export function unquoteEnvValue(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed
      .slice(1, -1)
      .replace(/\\([nrt"'\\])/g, (_, ch) => {
        if (ch === "n") return "\n";
        if (ch === "r") return "\r";
        if (ch === "t") return "\t";
        return ch;
      });
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseEnvFile(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    out[key] = unquoteEnvValue(trimmed.slice(eq + 1));
  }
  return out;
}
