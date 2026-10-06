import { firebaseConfig } from "./config";
import { HttpError } from "./server-auth";
const MAX_BYTES = 4 * 1024 * 1024;
async function imageBody(response: Response) {
  const type = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (!response.ok || !["image/jpeg","image/png","image/webp"].includes(type)) { await response.body?.cancel(); return null; }
  if (Number(response.headers.get("content-length")) > MAX_BYTES) { await response.body?.cancel(); throw new HttpError(413,"Poster image is too large."); }
  const reader=response.body?.getReader();if(!reader)return null;
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BYTES){await reader.cancel();throw new HttpError(413,"Poster image is too large.");}chunks.push(value);}
  if(!size)return null;
  return new Blob(chunks as BlobPart[],{type});
}
export async function downloadPoster(fileId:string) {
  if(!/^[a-zA-Z0-9_-]{10,200}$/.test(fileId))throw new HttpError(400,"Invalid Drive poster identifier.");
  const id=encodeURIComponent(fileId),key=encodeURIComponent(process.env.GOOGLE_DRIVE_API_KEY || firebaseConfig.apiKey);
  const sources=[
    `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
    `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${key}`,
    `https://drive.usercontent.google.com/download?id=${id}&export=download`,
  ];
  for(const source of sources){
    try { const response=await fetch(source,{signal:AbortSignal.timeout(6500)});const image=await imageBody(response);if(image)return image; }
    catch(error){if(error instanceof HttpError)throw error;}
  }
  throw new HttpError(502,"The poster could not be read from Drive. Share the image as Anyone with the link → Viewer, check the image link, then retry. A Google login or HTML page cannot be used as a poster.");
}
