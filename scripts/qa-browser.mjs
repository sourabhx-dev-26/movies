import { chromium } from "file:///C:/Users/soura/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
import { mkdirSync,readFileSync } from "node:fs";
mkdirSync("outputs",{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
try{
  const page=await browser.newPage();const errors=[];page.on("pageerror",error=>errors.push(error.message));
  for(const width of [375,768,1440]){
    await page.setViewportSize({width,height:950});await page.goto("http://127.0.0.1:5173/");
    await page.getByText("The first movie is on its way.").waitFor();
    assert.equal(await page.locator('a[href="https://t.me/+sJUxZiJyB7w5Yzk1"]').count(),4);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Horizontal overflow at ${width}`);
    await page.screenshot({path:`outputs/home-${width}.png`,fullPage:true});
  }
  assert.equal((await page.request.get("http://127.0.0.1:5173/admin")).status(),404);
  await page.goto("http://127.0.0.1:5174/");await page.getByRole("button",{name:"Continue with Google"}).waitFor();
  assert.equal(await page.getByRole("button",{name:"Add movie",exact:true}).count(),0);
  await page.getByText("First-time setup",{exact:true}).click();await page.getByText(/In Firebase, enable Google/).waitFor();
  await page.screenshot({path:"outputs/admin-signin.png",fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.equal((await page.request.get("http://127.0.0.1:5173/api/movies?admin=1")).status(),401);
  assert.equal((await page.request.get("http://127.0.0.1:5173/api/stats")).status(),401);
  assert.equal((await page.request.post("http://127.0.0.1:5173/api/movies",{headers:{Origin:"http://127.0.0.1:5173"},data:{}})).status(),401);
  assert.equal((await page.request.post("http://127.0.0.1:5173/api/visit",{headers:{Origin:"https://evil.example"}})).status(),403);
  const preflight=await page.request.fetch("http://127.0.0.1:5173/api/movies",{method:"OPTIONS",headers:{Origin:"http://127.0.0.1:5174","Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"authorization,content-type"}});
  assert.equal(preflight.status(),204);assert.equal(preflight.headers()["access-control-allow-origin"],"http://127.0.0.1:5174");
  const fixtures=["A very long movie title to check readable wrapping in a narrow poster card","Another Movie","A Third Film","Movie Four"].map((title,index)=>({id:`fixture-${index}`,title,watchUrl:`https://example.com/watch/${index}`,driveFileId:"fixturefileid",published:1,createdAt:1,updatedAt:1}));
  await page.route("**/api/movies",route=>route.fulfill({json:{movies:fixtures}}));
  await page.route("**/api/poster/**",route=>route.fulfill({contentType:"image/png",body:readFileSync("public/logo.png")}));
  await page.setViewportSize({width:375,height:900});await page.goto("http://127.0.0.1:5173/");
  await page.getByRole("link",{name:/Watch Another Movie/}).waitFor();
  assert.equal(await page.locator(".watch-button").count(),4);
  assert.equal(await page.locator(".watch-button").nth(1).getAttribute("href"),"https://example.com/watch/1");
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:"outputs/catalog-fixture-mobile.png",fullPage:true});
  assert.deepEqual(errors,[]);console.log("PASS: public page at 375/768/1440px, Telegram links, admin sign-in, protected APIs, unsafe origins, poster layout and Watch destinations");
}finally{await browser.close();}
