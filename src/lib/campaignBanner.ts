export type CampaignAd={file:File;caption:string};
export type BannerConfig={imageUrl:string;logoUrl?:string;aspectRatio:string;salon:string;city:string;service:string;headline:string;subtext:string;offer:string;price:number;originalPrice:number;code:string;bookingUrl:string;accent:string};
export const bannerSize=(ratio:string)=>ratio==='9:16'?[1080,1920]:ratio==='16:9'?[1920,1080]:[1080,1080];
const image=(url:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('An ad image could not load for export. Upload the image directly and retry.'));img.src=url;});
export async function renderCampaignBanner(c:BannerConfig):Promise<Blob>{
 const [background,logo]=await Promise.all([image(c.imageUrl),c.logoUrl?image(c.logoUrl):Promise.resolve(null)]);await document.fonts?.ready;
 const [w,h]=bannerSize(c.aspectRatio),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image export is unavailable in this browser.');
 const scale=Math.max(w/background.width,h/background.height);ctx.drawImage(background,(w-background.width*scale)/2,(h-background.height*scale)/2,background.width*scale,background.height*scale);
 const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'rgba(8,12,20,.72)');shade.addColorStop(.4,'rgba(8,12,20,.4)');shade.addColorStop(1,'rgba(8,12,20,.96)');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
 const pad=w*.055,space=w-2*pad;
 function text(value:string,x:number,y:number,size:number,width:number,maxLines=1,color='#fff',bold=true){ctx.font=`${bold?'700':'400'} ${size}px sans-serif`;ctx.fillStyle=color;const lines:string[]=[];let line='';for(const word of value.split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>width&&line){lines.push(line);line=word}else line=next;}if(line)lines.push(line);for(let i=0;i<Math.min(lines.length,maxLines);i++){let t=lines[i];while(ctx.measureText(t+(i===maxLines-1&&lines.length>maxLines?'…':'')).width>width&&t.length)t=t.slice(0,-1);if(i===maxLines-1&&lines.length>maxLines)t+='…';ctx.fillText(t,x,y+i*size*1.22);}return Math.min(lines.length,maxLines)*size*1.22;}
 let brandX=pad;const logoSize=Math.min(w*.09,110);if(logo){ctx.fillStyle='#fff';ctx.fillRect(pad,pad-8,logoSize,logoSize);const ratio=Math.min((logoSize-12)/logo.width,(logoSize-12)/logo.height);ctx.drawImage(logo,pad+(logoSize-logo.width*ratio)/2,pad-8+(logoSize-logo.height*ratio)/2,logo.width*ratio,logo.height*ratio);brandX+=logoSize+20;}
 text(c.salon,brandX,pad+30,w*.031,w-pad-brandX,1);text(c.city,brandX,pad+65,w*.019,w-pad-brandX,1,'#e2e8f0',false);
 ctx.fillStyle=c.accent;ctx.fillRect(pad,h*.22,space,58);text(c.offer,pad+18,h*.22+38,26,space-36);
 const serviceY=h*.44;const used=text(c.service,pad,serviceY,w*.055,space,2);const headlineY=serviceY+used+10;const subtitleUsed=text(c.headline,pad,headlineY,w*.027,space,2,'#f1f5f9');text(c.subtext,pad,headlineY+subtitleUsed+6,w*.019,space,2,'#cbd5e1',false);
 const priceY=h*.79;text(`₹${c.price.toLocaleString('en-IN')}`,pad,priceY,w*.064,space*.52);text(`Regular ₹${c.originalPrice.toLocaleString('en-IN')}`,w*.56,priceY-10,w*.025,space*.42,1,'#cbd5e1',false);text(`CODE: ${c.code}`,pad,priceY+50,w*.024,space,1,'#bae6fd');
 text('Book your appointment',pad,h-84,w*.023,space);text(c.bookingUrl,pad,h-48,Math.min(22,w*.019),space,2,'#e2e8f0',false);
 return new Promise((resolve,reject)=>{try{canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not export the ad image.')),'image/png')}catch{reject(new Error('The image host blocked export. Upload that image directly and retry.'));}});
}
export function downloadCampaignAd(file:File){const url=URL.createObjectURL(file),link=document.createElement('a');link.download=file.name;link.href=url;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
