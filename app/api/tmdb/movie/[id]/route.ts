import { type NextRequest } from "next/server";
import { getMovieDetails } from "@/lib/tmdb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const movieId = parseInt(id, 10);
  if (isNaN(movieId) || movieId < 1) {
    return Response.json(
      { error: "L'identifiant du film doit être un entier positif" },
      { status: 400 }
    );
  }

  try {
    const data = await getMovieDetails(movieId);

    return Response.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("TMDB movie details error:", error);
    return Response.json(
      { error: "Erreur lors de la récupération des détails du film" },
      { status: 502 }
    );
  }
}
