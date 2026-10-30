import type {SalonProfile,SocialVideo} from '../types';

type DemoReference=[videoId:string,title:string,channelTitle:string];

// Public Shorts retain creator attribution and are labelled as demo references.
// This is the shared list for every template except Template 10 (hair_coloring).
const REFERENCES:DemoReference[] = [
 ['KqLCuvMVB-k','Beard trim — step by step','Hair And Beard'],
 ['nehZDeIHwJ8','Beard trim transformation','Beardbrand Shorts'],
 ['pQ5h3rrJuDM','Gentle natural nail manicure','The Salon Life'],
 ['hzMSId-sxtY','Facial massage short','SHEF'],
 ['QAC81ZkryrY','Lifting facial massage short','Faceyoga Specialist'],
];

/** Template 10 — Prism & Chroma Hair Color Atelier (businessType `hair_coloring`).
 * Colour-only references so a new colour studio never opens with beard/nail
 * clips: balayage, fashion/pastel colour, highlights & money piece, colour
 * correction and keratin smooth + gloss shine. All five are public YouTube
 * Shorts from real colour studios and colour-care brands, kept with their
 * original title and channel name (the "DEMO / REFERENCE" label is shown
 * until the owner adds their own reels). */
const HAIR_COLOR_REFERENCES:DemoReference[] = [
 ['64CRWOKFxag','Balayage transformation — soft blended lift','Salon Allure Agadir'],
 ['2EAPuAQ2EHo','Fashion & pastel colour — red transformation for Indian hair','naveen_hair'],
 ['rTkTQfiSRwI','Highlights & money piece — face-framing lift','Mirella Manelli'],
 ['yYBSrj1eyII','Colour correction — blonde to brown and back','SalonCentric'],
 ['U9moKdpniks','Keratin smooth & gloss shine — before / after','KERASILK'],
];

// Only hair_coloring gets its own list; the other 13 templates keep REFERENCES.
const DEMO_REFERENCES:Record<string,DemoReference[]>={hair_coloring:HAIR_COLOR_REFERENCES};
function demoReferences(businessType:string):DemoReference[]{return DEMO_REFERENCES[businessType]||REFERENCES;}

const OLD_FULL_VIDEO_IDS=new Set(['ulbjW3JyK8E','SYSj3KPiVfg','gHVUoN5n4xw','0f6AOLy4C9Y','tKkJnauWFgA']);
const GENERIC_DEMO_IDS=new Set(REFERENCES.map(([videoId])=>videoId));

export function createDemoVideos(businessType:string):SocialVideo[]{
 return demoReferences(businessType).map(([videoId,title,channelTitle],index)=>({id:`demo-${businessType}-${index+1}`,videoId,title,youtubeUrl:`https://www.youtube.com/shorts/${videoId}`,channelTitle,thumbnailUrl:`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,categoryTag:'SHORT',isOwnerVideo:false,isDemo:true,description:'Reference YouTube Short.'}));
}

export function showcaseVideos(profile:SalonProfile):SocialVideo[]{
 if(profile.socialVideos?.length||profile.demoVideosInitialized){
  const demos=createDemoVideos(profile.businessType),generic=REFERENCES;
  return (profile.socialVideos||[]).map(video=>{
   if(!video.isDemo)return video;
   // Replace only demo references. Owner videos, edited Shorts and deletions remain intact.
   const index=Number(video.id.match(/^demo-.+-(\d+)$/)?.[1])-1,replacement=demos[index];
   if(!replacement)return video;
   const legacyFull=OLD_FULL_VIDEO_IDS.has(video.videoId);
   // Colour studios seeded before the colour list keep their position but now
   // show colour references instead of the generic beard / nail / facial clips.
   const legacyGeneric=profile.businessType==='hair_coloring'&&GENERIC_DEMO_IDS.has(video.videoId);
   if(!legacyFull&&!legacyGeneric)return video;
   // A demo title the owner already edited by hand is kept.
   const ownerTitle=legacyGeneric&&!legacyFull&&video.title&&video.title!==(generic[index]?.[1]||'');
   return {...replacement,id:video.id,...(ownerTitle?{title:video.title}:{})};
  });
 }
 return createDemoVideos(profile.businessType);
}
