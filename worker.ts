import * as catalog from "@/app/api/movies/route";
import * as movie from "@/app/api/movies/[id]/route";
import * as poster from "@/app/api/poster/[id]/route";
import * as visits from "@/app/api/visit/route";
import * as stats from "@/app/api/stats/route";
import { assets } from "./.sites-runtime/assets.generated";
import { SITE_ROLE } from "@/lib/config";
import { trustedOrigin } from "@/lib/server-auth";
const html=(admin:boolean)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${admin?"Admin — Movies for You":"Movies for You — Find your next watch"}</title><meta name="description" content="Find a movie, follow its Watch link, and join Movies for You on Telegram for new additions.">${admin?'<meta name="robots" content="noindex,nofollow">':''}<link rel="icon" href="/favicon.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="stylesheet" href="/styles.css"></head><body><div id="app"><p role="status" style="padding:40px">Loading Movies for You…</p></div><noscript><p>This website needs JavaScript to display movies and manage the collection.</p></noscript><script type="module" src="/app.js"></script></body></html>`;
async function dispatch(request:Request){
    const url=new URL(request.url),path=url.pathname,method=request.method;
    if(SITE_ROLE!=="admin"&&path==="/api/movies"){
      if(method==="GET")return catalog.GET(request);
      if(method==="POST")return catalog.POST(request);
    }
    const movieId=path.match(/^\/api\/movies\/([^/]+)$/)?.[1];
    if(SITE_ROLE!=="admin"&&movieId){const context={params:Promise.resolve({id:decodeURIComponent(movieId)})};if(method==="PUT")return movie.PUT(request,context);if(method==="DELETE")return movie.DELETE(request,context);}
    const posterId=path.match(/^\/api\/poster\/([^/]+)$/)?.[1];
    if(SITE_ROLE!=="admin"&&posterId&&method==="GET")return poster.GET(request,{params:Promise.resolve({id:decodeURIComponent(posterId)})});
    if(SITE_ROLE!=="admin"&&path==="/api/visit"&&method==="POST")return visits.POST(request);
    if(SITE_ROLE!=="admin"&&path==="/api/stats"&&method==="GET")return stats.GET(request);
    if(path.startsWith("/api/"))return Response.json({error:"Route or method not available."},{status:405});
    if(method!=="GET"&&method!=="HEAD")return new Response("Method not allowed",{status:405});
    const asset=assets[path];
    if(asset){const bytes=Uint8Array.from(atob(asset.data),character=>character.charCodeAt(0));return new Response(method==="HEAD"?null:bytes,{headers:{"Content-Type":asset.type,"Cache-Control":path.endsWith(".js")?"public,max-age=300":"public,max-age=3600","X-Content-Type-Options":"nosniff"}});}
    if(path==="/")return new Response(method==="HEAD"?null:html(SITE_ROLE==="admin"),{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Referrer-Policy":"strict-origin-when-cross-origin","X-Content-Type-Options":"nosniff"}});
    return new Response("Page not found",{status:404});
}
export default {async fetch(request:Request){
  const isApi=new URL(request.url).pathname.startsWith("/api/");
  const origin=request.headers.get("origin");
  if(isApi&&origin&&!trustedOrigin(request,origin))return Response.json({error:"Origin is not allowed."},{status:403});
  const response=isApi&&request.method==="OPTIONS"?new Response(null,{status:204}):await dispatch(request);
  if(isApi&&origin){const headers=new Headers(response.headers);headers.set("Access-Control-Allow-Origin",origin);headers.set("Vary","Origin");headers.set("Access-Control-Allow-Methods","GET,POST,PUT,DELETE,OPTIONS");headers.set("Access-Control-Allow-Headers","Authorization,Content-Type");headers.set("Access-Control-Max-Age","600");return new Response(response.body,{status:response.status,headers});}
  return response;
}};
