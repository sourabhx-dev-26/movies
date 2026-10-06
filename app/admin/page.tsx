"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import type { User } from "firebase/auth";
import { Film,Plus,Upload,Pencil,Eye,EyeOff,Trash2,LogOut,RefreshCw,ShieldCheck,BarChart3,Check,X } from "lucide-react";
import { Brand,SiteFooter } from "@/components/brand";
import { ADMIN_EMAIL, PUBLIC_SITE_URL } from "@/lib/config";
import { readApiResponse } from "@/lib/api-response";
import { clearActivity, idleExpired, lastActivity, startIdleTimer, touchActivity } from "@/lib/admin-session";
import { driveIdFromLink,movieInput } from "@/lib/validation";
import type { Movie,Stats } from "@/lib/types";
import { compressPoster,uploadPoster } from "@/lib/drive";
type Draft={id?:string;title:string;watchUrl:string;driveFileId:string;published:number};
const emptyDraft:Draft={title:"",watchUrl:"",driveFileId:"",published:1};
function authError(error:unknown){
  const code=(error as {code?:string})?.code;
  if(code==="auth/unauthorized-domain")return "Add this website’s domain to Firebase Authentication → Settings → Authorized domains, then try again.";
  if(code==="auth/operation-not-allowed"||code==="auth/configuration-not-found")return "Enable Email/Password in Firebase Authentication → Sign-in method first.";
  if(["auth/invalid-credential","auth/wrong-password","auth/user-not-found"].includes(code||""))return "Incorrect password. Try again or reset your password.";
  if(code==="auth/too-many-requests")return "Too many attempts. Please wait a few minutes and try again.";
  if(code==="auth/network-request-failed")return "Check your internet connection and try again.";
  return error instanceof Error?error.message:"Something went wrong. Please try again.";
}
export default function Admin(){
  const [password,setPassword]=useState(""),[showPassword,setShowPassword]=useState(false);
  const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false),[authorized,setAuthorized]=useState(false),[restoring,setRestoring]=useState(true);
  const [statsBusy,setStatsBusy]=useState(false),[statsUpdated,setStatsUpdated]=useState(0);
  const [movies,setMovies]=useState<Movie[]>([]),[stats,setStats]=useState<Stats|null>(null);
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState("");
  const [draft,setDraft]=useState<Draft|null>(null),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState("");
  const [driveLink,setDriveLink]=useState(""),[driveConnected,setDriveConnected]=useState(false),[deleteId,setDeleteId]=useState<string|null>(null);
  const driveToken=useRef<{token:string;expires:number}|null>(null),editorRef=useRef<HTMLFormElement>(null);
  const accountRef=useRef<User|null>(null),statsInFlight=useRef(false);
  const request=useCallback(async(path:string,options:RequestInit={},account?:User)=>{
    const current=account||user;if(!current)throw new Error("Sign in again to continue.");
    const response=await fetch(path,{cache:"no-store",...options,headers:{"Content-Type":"application/json",Authorization:`Bearer ${await current.getIdToken()}`,...options.headers}});
    return readApiResponse<{movies:Movie[]}&Stats>(response);
  },[user]);
  const load=useCallback(async(account:User)=>{
    setError("");try{const data=await request("/api/movies?admin=1",{},account);if(accountRef.current?.uid!==account.uid)return;setMovies(data.movies);setAuthorized(true);const visits=await request("/api/stats",{},account);if(accountRef.current?.uid!==account.uid)return;setStats(visits);setStatsUpdated(Date.now());}catch(e){if(accountRef.current?.uid===account.uid)setError(authError(e));}
  },[request]);
  useEffect(()=>{
    let unsubscribe=()=>{};let active=true;
    Promise.all([import("firebase/auth"),import("@/lib/firebase-client")]).then(([sdk,client])=>{
      if(!active)return;return sdk.setPersistence(client.auth,sdk.browserSessionPersistence).then(()=>{
        if(!active)return;unsubscribe=sdk.onAuthStateChanged(client.auth,account=>{
          accountRef.current=account;setUser(account);setReady(true);setAuthorized(false);
          if(!account?.emailVerified){setRestoring(false);return;}
          if(idleExpired()){setRestoring(false);void logout(true);return;}
          if(!lastActivity())touchActivity();setRestoring(true);void load(account).finally(()=>{if(active)setRestoring(false);});
        });
      });
    }).catch(e=>{setReady(true);setRestoring(false);setError(authError(e));});
    return()=>{active=false;unsubscribe();};
    // The subscription passes the current account explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  useEffect(()=>{if(!user?.emailVerified)return;return startIdleTimer(()=>void logout(true));},[user?.uid,user?.emailVerified]);
  useEffect(()=>{
    if(!authorized||!user)return;let active=true,stopMovies=()=>{},stopVisits=()=>{};let timer:ReturnType<typeof setTimeout>;
    const update=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(active)void refreshStats(false);},150);};
    void import("@/lib/live-data").then(module=>{if(!active)return;stopMovies=module.watchMovies(true,data=>{if(active)setMovies(data);},()=>{});stopVisits=module.watchVisits(update,()=>{});}).catch(()=>{});
    const interval=setInterval(()=>{if(!document.hidden)void refreshStats(false);},15000);
    const focus=()=>{if(!document.hidden)void refreshStats(false);};window.addEventListener("focus",focus);document.addEventListener("visibilitychange",focus);
    return()=>{active=false;stopMovies();stopVisits();clearTimeout(timer);clearInterval(interval);window.removeEventListener("focus",focus);document.removeEventListener("visibilitychange",focus);};
  },[authorized,user?.uid]);
  useEffect(()=>{void import("@/lib/drive-auth").then(module=>module.prepareDrive()).catch(()=>{});},[]);
  useEffect(()=>{if(!file){setPreview("");return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
  useEffect(()=>{if(draft){editorRef.current?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"});editorRef.current?.querySelector<HTMLInputElement>("input")?.focus({preventScroll:true});}},[draft?.id,!!draft]);
  async function login(event:React.FormEvent){
    event.preventDefault();setBusy("login");setError("");setNotice("");
    try{
      const[sdk,client]=await Promise.all([import("firebase/auth"),import("@/lib/firebase-client")]);
      touchActivity();
      const result=await sdk.signInWithEmailAndPassword(client.auth,ADMIN_EMAIL,password);
      setPassword("");
      if(!result.user.emailVerified){
        try{await sdk.sendEmailVerification(result.user);setNotice("A verification email was sent. Open it, verify your email, then log in again.");}
        finally{await sdk.signOut(client.auth);}
      }
    }catch(e){setError(authError(e));}finally{setBusy("");}
  }
  async function resetPassword(){
    setBusy("reset");setError("");setNotice("");
    try{const[sdk,client]=await Promise.all([import("firebase/auth"),import("@/lib/firebase-client")]);await sdk.sendPasswordResetEmail(client.auth,ADMIN_EMAIL);setNotice("Password reset instructions have been sent to your admin email.");}
    catch(e){setError(authError(e));}finally{setBusy("");}
  }
  async function logout(idle=false){accountRef.current=null;setAuthorized(false);const[sdk,client]=await Promise.all([import("firebase/auth"),import("@/lib/firebase-client")]);await sdk.signOut(client.auth);clearActivity();driveToken.current=null;setDriveConnected(false);setDraft(null);setFile(null);setPassword("");setMovies([]);setStats(null);setError("");setRestoring(false);setNotice(idle?"You were signed out after 30 minutes of inactivity. Log in to continue.":"");}
  async function refreshStats(manual=true){
    const account=accountRef.current;if(!account||statsInFlight.current)return;statsInFlight.current=true;setStatsBusy(true);if(manual)setError("");
    try{const data=await request("/api/stats",{},account);if(accountRef.current?.uid===account.uid){setStats(data);setStatsUpdated(Date.now());if(manual)setNotice("Visit counts updated.");}}
    catch(e){if(manual&&accountRef.current?.uid===account.uid)setError(authError(e));}finally{statsInFlight.current=false;setStatsBusy(false);}
  }
  async function connectDrive(){
    if(!user)return;setBusy("drive");setError("");
    try{const module=await import("@/lib/drive-auth");driveToken.current=await module.connectDriveAccount();setDriveConnected(true);setNotice("Google Drive connected. You can upload a poster now.");}
    catch(e){setError(authError(e));}finally{setBusy("");}
  }
  function openEditor(movie?:Movie){setError("");setNotice("");setFile(null);setDriveLink("");setDeleteId(null);setDraft(movie?{id:movie.id,title:movie.title,watchUrl:movie.watchUrl,driveFileId:movie.driveFileId,published:movie.published}:{...emptyDraft});}
  async function save(event:React.FormEvent){
    event.preventDefault();if(!draft||!user)return;setError("");setNotice("");
    const linkId=driveLink?driveIdFromLink(driveLink):"";
    const validation=movieInput.safeParse({...draft,driveFileId:linkId||draft.driveFileId||"temporaryfileid"});
    if(!validation.success){setError(validation.error.issues[0].message);return;}
    if(!draft.id&&movies.length>=200){setError("The catalog holds up to 200 movies. Remove an old movie before adding another.");return;}
    if(driveLink&&!linkId){setError("Paste a Google Drive file sharing link.");return;}
    if(file&&(!driveToken.current||driveToken.current.expires<Date.now())){setDriveConnected(false);setError("Connect Google Drive before uploading your image.");return;}
    if(!file&&!linkId&&!draft.driveFileId){setError("Choose a poster image or paste a public Drive image link.");return;}
    setBusy("save");
    try{let driveFileId=linkId||draft.driveFileId;if(file){setNotice("Preparing and uploading your poster…");driveFileId=await uploadPoster(driveToken.current!.token,await compressPoster(file),draft.title);setDraft({...draft,driveFileId});setDriveLink("");setFile(null);}await request(draft.id?`/api/movies/${draft.id}`:"/api/movies",{method:draft.id?"PUT":"POST",body:JSON.stringify({...draft,driveFileId})});setDraft(null);setFile(null);setDriveLink("");await load(user);setNotice("Movie saved. Published movies are visible on the home page.");}
    catch(e){setNotice("");setError(authError(e));}finally{setBusy("");}
  }
  async function toggle(movie:Movie){if(!user)return;setBusy(movie.id);setError("");setNotice("");try{await request(`/api/movies/${movie.id}`,{method:"PUT",body:JSON.stringify({...movie,published:movie.published?0:1})});await load(user);setNotice(movie.published?"Movie hidden from the home page.":"Movie published on the home page.");}catch(e){setError(authError(e));}finally{setBusy("");}}
  async function remove(id:string){if(!user)return;setBusy(id);setError("");setNotice("");try{await request(`/api/movies/${id}`,{method:"DELETE"});setDeleteId(null);await load(user);setNotice("Movie removed from the catalog. Its poster is still in your Drive.");}catch(e){setError(authError(e));}finally{setBusy("");}}
  return <div className="site-shell admin-shell"><a className="skip-link" href="#admin-main">Skip to admin</a><header className="site-header"><Brand/><nav><a href={PUBLIC_SITE_URL}>View website</a>{user&&<button className="button secondary-button compact" onClick={()=>void logout()}><LogOut size={16} aria-hidden="true"/>Sign out</button>}</nav></header>
  <main id="admin-main" className="admin-main"><div className="admin-heading"><div><div className="eyebrow">BEHIND THE SCENES</div><h1>Your movie desk.</h1><p>Manage the collection. See who’s stopping by.</p></div>{authorized&&<button className="button primary-button" disabled={!!busy} onClick={()=>openEditor()}><Plus size={18} aria-hidden="true"/>Add movie</button>}</div>
  {error&&<div className="message error-message" role="alert">{error}</div>}{notice&&<div className="message success-message" role="status">{notice}</div>}
  {!ready||restoring?<section className="admin-loading" role="status" aria-label="Restoring admin session"><div className="loading-line" aria-hidden="true"/><h2>Opening your movie desk…</h2><p>Restoring your session and loading the collection.</p></section>:!authorized?<section className="login-panel"><div className="empty-icon"><ShieldCheck size={28} aria-hidden="true"/></div><h2>Admin login</h2><p>Enter your password to manage movies and see visit statistics.</p><form className="login-form" onSubmit={event=>void login(event)}><label htmlFor="admin-email">Email</label><input id="admin-email" type="email" value={ADMIN_EMAIL} readOnly autoComplete="username"/><label htmlFor="admin-password">Password</label><div className="password-field"><input id="admin-password" type={showPassword?"text":"password"} value={password} onChange={event=>setPassword(event.target.value)} required autoComplete="current-password" maxLength={4096} disabled={!!busy}/><button className="password-toggle" type="button" aria-label={showPassword?"Hide password":"Show password"} aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={19} aria-hidden="true"/>:<Eye size={19} aria-hidden="true"/>}</button></div><button className="button primary-button login-submit" type="submit" disabled={!ready||!!busy}>{!ready?"Preparing login…":busy==="login"?"Logging in…":"Log in"}</button><button className="text-link reset-password" type="button" disabled={!ready||!!busy} onClick={()=>void resetPassword()}>{busy==="reset"?"Sending reset email…":"Forgot password?"}</button></form></section>:<>
  <div className="account-note"><ShieldCheck size={16} aria-hidden="true"/>Signed in as {user?.email} · Signs out after 30 minutes of inactivity</div>
  <section className="stats-section" aria-labelledby="stats-title"><div className="section-heading"><h2 id="stats-title">Website visits</h2><button className="button secondary-button compact" disabled={statsBusy} onClick={()=>void refreshStats()} aria-label="Refresh visit counts"><RefreshCw size={15} className={statsBusy?"refreshing-icon":""} aria-hidden="true"/>{statsBusy?"Refreshing…":"Refresh"}</button></div><div className="stat-grid">{[{label:"Today",value:stats?.today,hint:"Asia/Kolkata"},{label:"Total visits",value:stats?.total,hint:"Since tracking began"},{label:"Daily average",value:stats?.average,hint:stats?.days?`Across ${stats.days} calendar days`:"No visits yet"}].map(stat=><div className="stat-card" key={stat.label}><span>{stat.label}</span><strong>{stat.value===undefined?"—":stat.value.toLocaleString("en-IN")}</strong><small>{stat.hint}</small></div>)}</div><p className="helper">Page views: every opening and reload counts, including repeated visits in the same browser. Retrying the same request counts once. Known bots are filtered. The average includes days with zero visits.</p>{statsUpdated>0&&<p className="stats-updated" role="status">Last updated {new Date(statsUpdated).toLocaleTimeString("en-IN")} · Counts refresh automatically</p>}<details className="history"><summary><BarChart3 size={17} aria-hidden="true"/>Daily history · Last 30 days</summary><div className="history-rows">{stats?.daily.map(row=><div className="history-row" key={row.day}><time dateTime={row.day}>{new Date(row.day+"T00:00:00+05:30").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kolkata"})}</time><div className="history-bar" aria-hidden="true"><span style={{width:`${row.visits?Math.max(3,row.visits/Math.max(1,...stats.daily.map(d=>d.visits))*100):0}%`}}/></div><strong>{row.visits}</strong></div>)}</div></details></section>
  {draft&&<form className="editor" onSubmit={save} ref={editorRef}><div className="section-heading"><h2>{draft.id?"Edit movie":"Add a movie"}</h2><button className="icon-button" type="button" aria-label="Close movie editor" disabled={!!busy} onClick={()=>setDraft(null)}><X size={20} aria-hidden="true"/></button></div><div className="editor-grid"><div><label htmlFor="title">Movie title</label><input id="title" required maxLength={160} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Enter the movie name" disabled={!!busy}/><label htmlFor="watch-url">Watch link</label><input id="watch-url" type="url" required maxLength={2048} value={draft.watchUrl} onChange={e=>setDraft({...draft,watchUrl:e.target.value})} placeholder="https://…" disabled={!!busy}/><p className="helper">The Watch button opens this link in a new tab.</p><label className="checkbox-label"><input type="checkbox" checked={!!draft.published} disabled={!!busy} onChange={e=>setDraft({...draft,published:e.target.checked?1:0})}/>Publish on home page</label></div><div><label htmlFor="poster-file">Movie poster</label><div className="upload-panel">{preview?<img className="upload-preview" src={preview} alt="Selected poster preview"/>:<Upload size={26} aria-hidden="true"/>}<input id="poster-file" type="file" accept="image/jpeg,image/png,image/webp" disabled={!!busy} key={file?.name||draft.driveFileId||"empty"} onChange={e=>{setFile(e.target.files?.[0]||null);setDriveLink("");}}/><p className="helper">JPG, PNG or WebP · Up to 12 MB<br/>Images are compressed and saved to your Drive.</p><button type="button" className="button secondary-button compact" disabled={!!busy} onClick={()=>void connectDrive()}>{driveConnected?<Check size={16} aria-hidden="true"/>:<Upload size={16} aria-hidden="true"/>}{busy==="drive"?"Connecting…":driveConnected?"Drive connected · Reconnect":"Connect Google Drive"}</button></div><label htmlFor="drive-link">Or use an existing Drive image link</label><input id="drive-link" type="url" maxLength={2048} value={driveLink} disabled={!!busy||!!file} onChange={e=>setDriveLink(e.target.value)} placeholder="https://drive.google.com/file/d/…/view"/><p className="helper">Share it with “Anyone with the link” first.{draft.driveFileId&&!file&&!driveLink&&<> <a href={`https://drive.google.com/file/d/${draft.driveFileId}/view`} target="_blank" rel="noopener noreferrer">Current poster</a> will be kept.</>}</p></div></div><div className="editor-actions"><p className="helper">Your uploaded posters are public. Your other Drive files stay private.</p><div><button className="button secondary-button" type="button" disabled={!!busy} onClick={()=>setDraft(null)}>Cancel</button><button className="button primary-button" disabled={!!busy} type="submit">{busy==="save"?"Saving…":"Save movie"}</button></div></div></form>}
  <section className="manage-section" aria-labelledby="manage-title"><div className="section-heading"><h2 id="manage-title">Your collection <span className="inline-count">{movies.length}</span></h2></div>{!movies.length?<div className="empty-state"><Film size={30} aria-hidden="true"/><h3>A fresh start.</h3><p>Add your first poster and Watch link to get the collection going.</p><button className="button primary-button" disabled={!!busy} onClick={()=>openEditor()}><Plus size={16} aria-hidden="true"/>Add first movie</button></div>:<div className="manage-list">{movies.map(movie=><article className="manage-row" key={movie.id}><div className="manage-movie"><div className="mini-poster"><Film size={20} aria-hidden="true"/></div><div><h3>{movie.title}</h3><a href={movie.watchUrl} target="_blank" rel="noopener noreferrer">Open Watch link</a></div></div><span className={`status-chip ${movie.published?"published":""}`}>{movie.published?"Published":"Hidden"}</span><div className="row-actions"><button className="icon-button" aria-label={`Edit ${movie.title}`} disabled={!!busy} onClick={()=>openEditor(movie)}><Pencil size={17} aria-hidden="true"/></button><button className="icon-button" aria-label={`${movie.published?"Hide":"Publish"} ${movie.title}`} disabled={!!busy} onClick={()=>void toggle(movie)}>{movie.published?<EyeOff size={17} aria-hidden="true"/>:<Eye size={17} aria-hidden="true"/>}</button><button className="icon-button danger" aria-label={`Delete ${movie.title}`} disabled={!!busy} onClick={()=>setDeleteId(movie.id)}><Trash2 size={17} aria-hidden="true"/></button></div>{deleteId===movie.id&&<div className="delete-confirm" role="alert"><p>Remove “{movie.title}” from the catalog? Its poster stays in Drive.</p><button className="button secondary-button compact" disabled={!!busy} onClick={()=>setDeleteId(null)}>Cancel</button><button className="button danger-button compact" disabled={!!busy} onClick={()=>void remove(movie.id)}>{busy===movie.id?"Removing…":"Remove movie"}</button></div>}</article>)}</div>}</section>
  </>}
  </main><SiteFooter/></div>;
}
