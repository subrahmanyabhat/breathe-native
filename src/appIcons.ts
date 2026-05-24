// Fetches app icons from iTunes Lookup API by bundle ID.
// Tries US store first, then IN store (for Indian apps like Swiggy, Zomato, Blinkit, PhonePe).
const cache: Record<string, string | null> = {};

async function tryCountry(bundleId: string, country: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleId)}&country=${country}&limit=1`,
      { signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined }
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.results?.length) return null;
    const exact = json.results.find((r: any) => r.bundleId?.toLowerCase() === bundleId.toLowerCase());
    return (exact ?? json.results[0])?.artworkUrl100 ?? null;
  } catch {
    return null;
  }
}

export async function fetchAppIconUrl(bundleId: string): Promise<string | null> {
  if (bundleId in cache) return cache[bundleId];
  // Try US first, then IN (covers Indian apps not in US store)
  let url = await tryCountry(bundleId, 'us');
  if (!url) url = await tryCountry(bundleId, 'in');
  cache[bundleId] = url;
  return url;
}

export async function fetchAppIcons(bundleIds: string[]): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  // Batch in groups of 10 to avoid rate limiting
  const chunks: string[][] = [];
  for (let i = 0; i < bundleIds.length; i += 10) chunks.push(bundleIds.slice(i, i + 10));
  for (const chunk of chunks) {
    await Promise.allSettled(chunk.map(async id => {
      const url = await fetchAppIconUrl(id);
      if (url) results[id] = url;
    }));
  }
  return results;
}
