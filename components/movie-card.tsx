"use client";
import { Film, Play } from "lucide-react";
import { useState } from "react";
import type { Movie } from "@/lib/types";
export function MovieCard({ movie }: { movie: Movie }) {
  const [failed, setFailed] = useState(false);
  return <article className="movie-card"><div className="poster-frame">{failed ? <div className="poster-fallback"><Film size={36} aria-hidden="true" /><span>Poster unavailable</span></div> : <img src={`/api/poster/${movie.id}?v=${movie.updatedAt}`} alt={`${movie.title} poster`} width="400" height="600" loading="lazy" onError={() => setFailed(true)} />}</div><div className="movie-detail"><h3>{movie.title}</h3><a className="button watch-button" href={movie.watchUrl} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${movie.title} (opens in a new tab)`}><Play size={16} fill="currentColor" aria-hidden="true" />Watch now</a></div></article>;
}
