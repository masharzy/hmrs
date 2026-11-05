// Public homepage widgets share one request, instead of fetching the same
// notices, image settings and routines separately on initial render.
let latest=null;
let fetchedAt=0;
let inFlight=null;
const TTL_MS=15000;

export async function loadPublicData({force=false}={}){
 if(!force&&latest&&Date.now()-fetchedAt<TTL_MS)return latest;
 if(inFlight)return inFlight;
 inFlight=fetch("/api/public",{cache:"no-store"}).then(async response=>{
  if(!response.ok)throw Error("ওয়েবসাইটের তথ্য পাওয়া যায়নি");
  const result=await response.json();
  latest=result;
  fetchedAt=Date.now();
  return result;
 }).finally(()=>{inFlight=null});
 return inFlight;
}
