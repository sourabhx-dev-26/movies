"use client";
import { Film, Play, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { Movie } from "@/lib/types";
export function MovieCard({ movie }: { movie: Movie }) {
  const [failed, setFailed] = useState(false);
  const [loaded,setLoaded]=useState(false),[retry,setRetry]=useState(0);
  return <article className="movie-card"><div className={`poster-frame ${loaded?"poster-loaded":""}`}>{failed ? <div className="poster-fallback"><Film size={36} aria-hidden="true" /><span>Poster unavailable</span><button className="button secondary-button compact" aria-label={`Retry ${movie.title} poster`} onClick={()=>{setRetry(Date.now());setFailed(false);setLoaded(false);}}><RefreshCw size={15} aria-hidden="true"/>Retry poster</button></div> : <img src={`/api/poster/${movie.id}?v=${movie.updatedAt}${retry?`&retry=${retry}`:""}`} alt={`${movie.title} poster`} width="600" height="900" loading="lazy" decoding="async" onLoad={()=>setLoaded(true)} onError={() => setFailed(true)} />}</div><div className="movie-detail"><h3>{movie.title}</h3><a className="button watch-button" href={movie.watchUrl} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${movie.title} (opens in a new tab)`}><Play size={16} fill="currentColor" aria-hidden="true" />Watch now</a></div></article>;
}
