import { type NextRequest } from "next/server";
import { searchMovies } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");
  const page = request.nextUrl.searchParams.get("page") ?? "1";

  if (!query || query.trim().length === 0) {
    return Response.json(
      { error: "Le paramètre 'query' est requis" },
      { status: 400 }
    );
  }

  const pageNum = parseInt(page, 10);
  if (isNaN(pageNum) || pageNum < 1) {
    return Response.json(
      { error: "Le paramètre 'page' doit être un entier positif" },
      { status: 400 }
    );
  }

  try {
    const data = await searchMovies(query.trim(), pageNum);

    return Response.json(data, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("TMDB search error:", error);
    return Response.json(
      { error: "Erreur lors de la recherche TMDB" },
      { status: 502 }
    );
  }
}
