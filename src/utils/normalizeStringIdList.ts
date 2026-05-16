export function normalizeStringIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw.map((value) => String(value || '').trim()).filter(Boolean))).toSorted((a, b) =>
    a.localeCompare(b),
  );
}
