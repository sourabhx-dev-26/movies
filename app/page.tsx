"use client";
import { useCallback, useEffect, useState } from "react";
import { Film, Clapperboard, RefreshCw } from "lucide-react";
import { Brand, TelegramLink, SiteFooter } from "@/components/brand";
import { MovieCard } from "@/components/movie-card";
import type { Movie } from "@/lib/types";
export default function Home() {
  const [movies,setMovies] = useState<Movie[]>([]);
  const [loading,setLoading] = useState(true); const [error,setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);setError("");
    try { const response=await fetch("/api/movies");const data=await response.json() as {error?:string;movies:Movie[]};if (!response.ok) throw new Error(data.error);setMovies(data.movies); }
    catch {setError("We couldn’t load the movies. Please try again in a moment.");} finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();void fetch("/api/visit",{method:"POST",keepalive:true}).catch(()=>{});},[load]);
  return <div className="site-shell"><a className="skip-link" href="#movies">Skip to movies</a><header className="site-header"><Brand /><nav aria-label="Main navigation"><a className="nav-current" href="#movies">Movies</a><TelegramLink /></nav></header><main>
    <section className="hero" aria-labelledby="hero-title"><div className="hero-copy"><div className="eyebrow"><span className="gold-line" />YOUR NEXT WATCH</div><h1 id="hero-title">Movie night,<br /><span>made simple.</span></h1><p>Find a movie. Tap Watch. Enjoy.</p><a className="text-link" href="#movies"><Clapperboard size={18} aria-hidden="true" />Explore the movies</a></div><div className="hero-emblem"><div className="emblem-ring"><img src="/logo.png" width="230" height="230" alt="Movies for You gold cinema emblem" /></div><span className="emblem-caption">PRESS PLAY. TAKE A BREAK.</span></div></section>
    <section id="movies" className="catalog" aria-labelledby="movies-title"><div className="section-heading"><div><div className="eyebrow">THE COLLECTION</div><h2 id="movies-title">Latest movies</h2></div>{!loading&&!error&&<span className="movie-count">{movies.length} {movies.length===1?"movie":"movies"}</span>}</div>
    {loading?<div className="movie-grid" aria-label="Loading movies" aria-busy="true">{[1,2,3,4].map(i=><div className="skeleton-card" key={i}><div /><span /></div>)}</div>:error?<div className="empty-state" role="alert"><Film size={32} aria-hidden="true" /><h3>Something didn’t load</h3><p>{error}</p><button className="button secondary-button" onClick={()=>void load()}><RefreshCw size={16} aria-hidden="true" />Try again</button></div>:movies.length?<div className="movie-grid">{movies.map(movie=><MovieCard key={`${movie.id}-${movie.updatedAt}`} movie={movie}/>)}</div>:<div className="empty-state"><div className="empty-icon"><Film size={30} aria-hidden="true" /></div><h3>The first movie is on its way.</h3><p>Join our Telegram channel to hear when new movies arrive.</p><TelegramLink className="text-link" children="Join the channel" /></div>}</section>
    <aside className="telegram-strip"><div><span className="eyebrow">STAY IN THE LOOP</span><h2>Your next watch, in your inbox.</h2><p>Follow our Telegram channel for new additions.</p></div><TelegramLink children="Join our channel" /></aside>
  </main><SiteFooter /></div>;
}
