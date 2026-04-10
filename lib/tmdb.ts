const TMDB_BASE_URL = "https://api.themoviedb.org/3";
function getToken(): string {
  const token = process.env.TMDB_API_TOKEN;
  if (!token) {
    throw new Error("TMDB_API_TOKEN is not set in environment variables");
  }
  return token;
}

const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function tmdbFetch<T>(path: string, params?: URLSearchParams): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  if (params) {
    params.forEach((value, key) => url.searchParams.set(key, value));
  }

  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });

  return data as T;
}

export interface TMDBSearchResult {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  popularity: number;
  adult: boolean;
  original_language: string;
}

export interface TMDBMovieDetails extends TMDBMovie {
  genres: { id: number; name: string }[];
  runtime: number;
  tagline: string;
  budget: number;
  revenue: number;
  status: string;
  homepage: string;
  imdb_id: string | null;
  production_companies: {
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }[];
  credits?: {
    cast: {
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
      order: number;
    }[];
    crew: {
      id: number;
      name: string;
      job: string;
      department: string;
      profile_path: string | null;
    }[];
  };
}

export async function searchMovies(
  query: string,
  page = 1,
  language = "fr-FR"
): Promise<TMDBSearchResult> {
  const params = new URLSearchParams({
    query,
    page: String(page),
    language,
    include_adult: "false",
  });

  return tmdbFetch<TMDBSearchResult>("/search/movie", params);
}

export async function getMovieDetails(
  id: number,
  language = "fr-FR"
): Promise<TMDBMovieDetails> {
  const params = new URLSearchParams({
    language,
    append_to_response: "credits",
  });

  return tmdbFetch<TMDBMovieDetails>(`/movie/${id}`, params);
}
