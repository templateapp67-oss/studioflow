import type {SocialVideo} from '../types';
export function socialVideoSource(raw:string):{platform:'YouTube'|'Instagram';id:string;url:string}|null {
 try {
  const url=new URL(raw.trim());if(url.protocol!=='https:')return null;
  const host=url.hostname.toLowerCase().replace(/^www\./,'').replace(/^m\./,'');
  if(host==='instagram.com'){
   const match=url.pathname.match(/^\/(?:reel|reels|p|tv)\/([\w-]+)\/?$/);
   return match?{platform:'Instagram',id:match[1],url:`https://www.instagram.com${url.pathname}`}:null;
  }
  if(!['youtube.com','youtu.be','youtube-nocookie.com'].includes(host))return null;
  const id=host==='youtu.be'?url.pathname.slice(1):url.searchParams.get('v')||url.pathname.match(/^\/(?:shorts|embed|v)\/([\w-]+)/)?.[1];
  return id&&/^[\w-]{11}$/.test(id)?{platform:'YouTube',id,url:raw.trim()}:null;
 }catch{return null;}
}
export function videoSource(video:SocialVideo){return socialVideoSource(video.youtubeUrl);}
export function secureMediaUrl(raw?:string){try{const url=new URL(raw||'');return url.protocol==='https:'?url.href:'';}catch{return '';}}
// A long video does not become a Short by changing its card shape or category tag.
export function shortVideoSource(raw:string){
 const source=socialVideoSource(raw);if(!source)return null;
 const path=new URL(raw.trim()).pathname;
 if(source.platform==='YouTube'&&!/^\/shorts\/[\w-]{11}\/?$/.test(path))return null;
 if(source.platform==='Instagram'&&!/^\/reels?\/[\w-]+\/?$/.test(path))return null;
 return {...source,url:source.platform==='YouTube'?`https://www.youtube.com/shorts/${source.id}`:source.url};
}
export function reelSource(video:SocialVideo){return video.categoryTag==='LONG'?null:shortVideoSource(video.youtubeUrl);}
