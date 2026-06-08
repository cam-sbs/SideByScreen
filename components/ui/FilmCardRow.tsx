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

function getAccentClass(film: GroupFilmCard): string {
  if (film.screenStatus === "in_theaters") {
    const rank = urgencyRank(film.theatricalReleaseDate);
    if (rank === 0) return "bg-urgent";
    if (rank === 1) return "bg-warn";
  }
  if (film.screenStatus === "salon" || film.salonOverride) return "bg-sage";
  return "";
}


type FilmCardRowProps = {
  film: GroupFilmCard;
  interests: MemberInterest[];
  priority?: boolean;
};

export function FilmCardRow({ film, interests, priority = false }: FilmCardRowProps) {
  const accentClass = getAccentClass(film);
  const genres = film.genres.map((g) => g.name).join(", ");

  return (
    <Link href={`/film/${film.tmdbId}`} className="block mb-3">
      <article className="relative bg-ink-2 rounded-xl border border-white/6 overflow-hidden flex items-stretch h-[215px] transition-all duration-200 hover:border-white/11">
        {/* Accent bar */}
        {accentClass && (
          <div className={`absolute left-0 top-0 bottom-0 w-[6px] z-10 ${accentClass}`} />
        )}

        {/* Poster */}
        <div className="w-[153px] shrink-0 relative overflow-hidden">
          {film.posterPath ? (
            <Image
              src={`https://image.tmdb.org/t/p/w185${film.posterPath}`}
              alt={`Affiche de ${film.title}`}
              fill
              sizes="153px"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-b from-ink-3 to-ink-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between py-4 px-3 min-w-0">
          {/* Top: badge + title + genre */}
          <div className="flex flex-col gap-1.5">
            {film.isConsensus && (
              <Badge variant="gold">Consensus</Badge>
            )}
            <h2 className="text-md font-semibold text-fog truncate">{film.title}</h2>
            {genres && (
              <p className="text-sm text-dust italic">{genres}</p>
            )}
          </div>

          {/* Bottom: member avatars */}
          <MemberAvatarRow interests={interests} />
        </div>
      </article>
    </Link>
  );
}
