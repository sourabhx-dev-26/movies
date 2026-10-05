const DRIVE = "https://www.googleapis.com/drive/v3";
async function driveRequest(token: string, path: string, options: RequestInit = {}) {
  const response = await fetch(path.startsWith("https:") ? path : `${DRIVE}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...options.headers } });
  const data = await response.json() as {id:string;files?:{id:string}[];error?:{message?:string}};
  if (!response.ok) {
    if (response.status === 401) throw new Error("Drive access expired. Connect Google Drive again.");
    throw new Error(data.error?.message || "Google Drive could not complete the upload.");
  }
  return data;
}
export async function compressPoster(file: File): Promise<Blob> {
  if (!["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("Choose a JPG, PNG, or WebP image.");
  if (file.size > 12 * 1024 * 1024) throw new Error("Choose an image smaller than 12 MB.");
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error("This image could not be opened. Try a different file."); }
  try {
    const scale = Math.min(1,1200/Math.max(bitmap.width,bitmap.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1,Math.round(bitmap.width*scale)); canvas.height = Math.max(1,Math.round(bitmap.height*scale));
    const context = canvas.getContext("2d"); if (!context) throw new Error("Image processing is unavailable in this browser.");
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve,"image/webp",0.82));
    if (!blob || blob.size > 4*1024*1024) throw new Error("This image is too large to publish. Choose a smaller image.");
    return blob;
  } finally { bitmap.close(); }
}
export async function uploadPoster(token: string, blob: Blob, title: string): Promise<string> {
  const query = encodeURIComponent("trashed = false and mimeType = 'application/vnd.google-apps.folder' and appProperties has { key='mfy' and value='posters' }");
  const folders = await driveRequest(token, `/files?q=${query}&fields=files(id)&pageSize=1`);
  let folderId = folders.files?.[0]?.id;
  if (!folderId) {
    const folder = await driveRequest(token,"/files?fields=id",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name:"Movies for You - Posters",mimeType:"application/vnd.google-apps.folder",appProperties:{mfy:"posters"}}) });
    folderId = folder.id;
  }
  const mimeType = blob.type;
  const metadata = {name:`${title.replace(/[\\/:*?"<>|]/g,"_")}.${mimeType === "image/png" ? "png" : "webp"}`,mimeType,parents:[folderId]};
  const boundary = `mfy_${crypto.randomUUID()}`;
  const body = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify(metadata),`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,blob,`\r\n--${boundary}--\r\n`]);
  const file = await driveRequest(token,"https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",{method:"POST",headers:{"Content-Type":`multipart/related; boundary=${boundary}`},body});
  try { await driveRequest(token,`/files/${file.id}/permissions?fields=id`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"anyone",role:"reader",allowFileDiscovery:false})}); }
  catch (error) { throw new Error(`${error instanceof Error ? error.message : "Sharing failed"} The image was uploaded privately to your Posters folder; enable sharing before using it.`); }
  return file.id;
}
