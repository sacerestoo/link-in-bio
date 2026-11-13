export type EnvEntry = { value: string };

function parseValue(rawValue: string): { valid: boolean; value: string } {
  const trimmed = rawValue.trim();
  const quote = trimmed[0];
  if (quote === "'" || quote === '"') {
    const closingQuote = trimmed.indexOf(quote, 1);
    if (closingQuote < 0) return { valid: false, value: "" };
    const trailing = trimmed.slice(closingQuote + 1).trim();
    return {
      valid: trailing === "" || trailing.startsWith("#"),
      value: trimmed.slice(1, closingQuote),
    };
  }
  return { valid: true, value: (trimmed.split("#", 1)[0] ?? "").trim() };
}

export function readDotenvEntries(
  source: string,
  label: string,
): Map<string, EnvEntry> {
  const entries = new Map<string, EnvEntry>();
  for (const [index, line] of source.split(/\r?\n/u).entries()) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u.exec(
      trimmed,
    );
    if (!match)
      throw new Error(`${label} has an invalid entry on line ${index + 1}.`);
    const name = match[1];
    const rawValue = match[2];
    if (name === undefined || rawValue === undefined) {
      throw new Error(`${label} has an invalid key on line ${index + 1}.`);
    }
    const parsed = parseValue(rawValue);
    if (!parsed.valid)
      throw new Error(`${label} has an invalid value on line ${index + 1}.`);
    // Match dotenv: the last duplicate value wins.
    entries.set(name, { value: parsed.value });
  }
  return entries;
}
