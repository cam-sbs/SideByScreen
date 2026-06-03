import { THEATRICAL_WINDOW_DAYS } from "./constants";

export type ScreenStatus = "in_theaters" | "coming_soon" | "salon" | "unknown";

export function computeScreenStatus(theatricalReleaseDate: string | null): ScreenStatus {
  if (!theatricalReleaseDate) return "unknown";
  const release = new Date(theatricalReleaseDate);
  if (Number.isNaN(release.getTime())) return "unknown";
  const now = Date.now();
  if (release.getTime() > now) return "coming_soon";
  const diffDays = (now - release.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= THEATRICAL_WINDOW_DAYS ? "in_theaters" : "salon";
}

/** Extracts the France theatrical release date (type 3) from TMDB release_dates results.
 *  Falls back to US if no FR entry found. */
export function extractTheatricalReleaseDate(
  results: { iso_3166_1: string; release_dates: { release_date: string; type: number }[] }[],
): string | null {
  for (const country of ["FR", "US"]) {
    const entry = results.find((r) => r.iso_3166_1 === country);
    if (entry) {
      const theatrical = entry.release_dates.find((d) => d.type === 3);
      if (theatrical?.release_date) {
        return theatrical.release_date.split("T")[0];
      }
    }
  }
  return null;
}
