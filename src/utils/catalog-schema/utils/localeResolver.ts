export function resolveRequestedLocale(
  requestedLocale: string | null | undefined,
  supportedLocales: string[],
  fallbackLocale: string,
): string {
  const normalizedRequested = typeof requestedLocale === 'string' ? requestedLocale.trim() : '';
  if (normalizedRequested && supportedLocales.includes(normalizedRequested)) {
    return normalizedRequested;
  }
  return fallbackLocale;
}

export function buildLocaleCandidates(requestedLocale: string | null | undefined, fallbackLocale: string): string[] {
  const candidates = [typeof requestedLocale === 'string' ? requestedLocale.trim() : '', fallbackLocale.trim()].filter(
    Boolean,
  );
  return Array.from(new Set(candidates));
}
