/** Returns a validated public origin for canonical URLs and sitemaps. */
export function getPublicSiteUrl(): URL | null {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password
    )
      return null;
    return new URL(url.origin);
  } catch {
    return null;
  }
}
