import Image from "next/image";
import Link from "next/link";
import type { GroupFilmCard } from "@/app/api/group/films/route";
import { Badge } from "./Badge";
import { MemberAvatarRow, type MemberInterest } from "./MemberAvatarRow";

function urgencyRank(theatricalReleaseDate: string | null): 0 | 1 | 2 {
  if (!theatricalReleaseDate) return 2;
  const release = new Date(theatricalReleaseDate);
  if (Number.isNaN(release.getTime())) return 2;
  const diffDays = (Date.now() - release.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 21) return 0;
  if (diffDays >= 14) return 1;
  return 2;
}

function getUrgency(film: GroupFilmCard): "red" | "orange" | "none" {
  if (film.screenStatus !== "in_theaters") return "none";
  const rank = urgencyRank(film.theatricalReleaseDate);
  if (rank === 0) return "red";
  if (rank === 1) return "orange";
  return "none";
}

type FilmCardRowProps = {
  film: GroupFilmCard;
  interests: MemberInterest[];
  priority?: boolean;
};

export function FilmCardRow({ film, interests, priority = false }: FilmCardRowProps) {
  const urgency = getUrgency(film);
  const genres = film.genres.map((g) => g.name).join(", ");

  const urgencyBorderClass =
    urgency === "red"
      ? "border-l-[3px] border-l-urgent"
      : urgency === "orange"
        ? "border-l-[3px] border-l-warn"
        : "";

  return (
    <Link href={`/film/${film.tmdbId}`} className="block mb-3">
      <article
        className={[
          "bg-ink-2 rounded-xl border border-white/6 overflow-hidden",
          "flex items-stretch",
          "transition-all duration-200 hover:border-white/11",
          urgencyBorderClass,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Poster — w×h explicites car flex stretch override aspect-ratio */}
        <div className="w-[120px] min-h-[180px] shrink-0 relative overflow-hidden">
          {film.posterPath ? (
            <Image
              src={`https://image.tmdb.org/t/p/w185${film.posterPath}`}
              alt={`Affiche de ${film.title}`}
              fill
              sizes="120px"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-b from-ink-3 to-ink-4" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0 gap-2">
          <div className="flex flex-col gap-1">
            {film.isConsensus && (
              <Badge variant="gold">Tout le groupe ✦</Badge>
            )}
            <h2 className="text-md font-medium text-fog truncate">{film.title}</h2>
            {genres && (
              <p className="text-sm text-dust italic">{genres}</p>
            )}
          </div>

          <MemberAvatarRow interests={interests} />
        </div>
      </article>
    </Link>
  );
}
