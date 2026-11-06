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

/** Template 13 — Arch & Flutter Lash & Brow Bar (businessType `lash_brow`).
 * Eye-area-only references so a new lash bar never opens with beard or nail
 * clips: brow lamination, lash lift & tint, a lift before/after, lower lash
 * extensions and retention aftercare. All five are public YouTube Shorts from
 * real lash & brow brands and studios, kept with their original titles; where a
 * channel name could not be confirmed the clip is attributed as a studio
 * reference. They stay labelled "DEMO / REFERENCE" until the owner adds reels. */
const LASH_BROW_REFERENCES:DemoReference[] = [
 ['4d9MZe_vpUY','Brow lamination — master the brushed-up arch','Buff Browz'],
 ['xhrLIpz9q5I','Lash lift & tint — ultra lift with deep black tint','RefectoCil'],
 ['eyOuZBqP-hI','Lash lift before & after — the instant curl','YUMI Lashes'],
 ['x5FixAITeDY','Lower lash extensions — step by step','Lash studio reference'],
 ['-CEYQkj3EB8','Lash extension aftercare that keeps retention','Lash studio reference'],
];

/** Template 01 — Ziya Women’s Hair Studio (businessType `hair_salon`).
 * Strictly women's haircut references: multi-layer transformation, butterfly
 * haircut tutorial, before & after bob haircut, cheekbone curtain bangs, and
 * face-framing scissor layering. All five are verified public YouTube Shorts
 * featuring women only. */
const WOMENS_HAIRCUT_REFERENCES:DemoReference[] = [
 ['Zto1aKO3YLQ','Multi-layer haircut transformation — bouncy layers','bhatia bijal'],
 ['SZvWrR21Tqs','Butterfly haircut — long layered step-by-step cut','myguiltycrown'],
 ['sixEsYNvTmo','Bob haircut transformation — before & after cut','Hair.com By L’Oréal'],
 ['X4vi0G8HJ9s','Curtain bangs haircut — cheekbone-framing fringe','Ankita Barapatre'],
 ['qNTfVB4Ptcw','Face-framing fluffy layers — women’s scissor technique','ProStylistTV'],
];

// hair_salon (Template 01), hair_coloring (Template 10) and lash_brow
// (Template 13) get their own lists; the other 11 templates keep REFERENCES.
const DEMO_REFERENCES:Record<string,DemoReference[]>={hair_salon:WOMENS_HAIRCUT_REFERENCES,hair_coloring:HAIR_COLOR_REFERENCES,lash_brow:LASH_BROW_REFERENCES};
function demoReferences(businessType:string):DemoReference[]{return DEMO_REFERENCES[businessType]||REFERENCES;}

const OLD_FULL_VIDEO_IDS=new Set(['ulbjW3JyK8E','SYSj3KPiVfg','gHVUoN5n4xw','0f6AOLy4C9Y','tKkJnauWFgA']);
const GENERIC_DEMO_IDS=new Set(REFERENCES.map(([videoId])=>videoId));

export function createDemoVideos(businessType:string):SocialVideo[]{
 if(businessType==='mens_hair_studio'||businessType==='aurelia_beauty_parlour')return [];
 return demoReferences(businessType).map(([videoId,title,channelTitle],index)=>({id:`demo-${businessType}-${index+1}`,videoId,title,youtubeUrl:`https://www.youtube.com/shorts/${videoId}`,channelTitle,thumbnailUrl:`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,categoryTag:'SHORT',isOwnerVideo:false,isDemo:true,description:'Reference YouTube Short.'}));
}

export function showcaseVideos(profile:SalonProfile):SocialVideo[]{
 if(profile.businessType==='mens_hair_studio')return []; // Men's template uses its own reviewed media; never seed unrelated clips.
 if(profile.businessType==='aurelia_beauty_parlour')return profile.socialVideos||[]; // Show saved Aurelia media only; never seed unrelated generic clips.
 if(profile.socialVideos?.length||profile.demoVideosInitialized){
  const demos=createDemoVideos(profile.businessType),generic=REFERENCES;
  return (profile.socialVideos||[]).map(video=>{
   if(!video.isDemo)return video;
   // Replace only demo references. Owner videos, edited Shorts and deletions remain intact.
   const index=Number(video.id.match(/^demo-.+-(\d+)$/)?.[1])-1,replacement=demos[index];
   if(!replacement)return video;
   const legacyFull=OLD_FULL_VIDEO_IDS.has(video.videoId);
   // Women's hair studios, colour studios and lash bars seeded before their own
   // lists keep their position but now show on-theme references instead of the
   // generic beard / nail / facial clips.
   const legacyGeneric=(profile.businessType==='hair_salon'||profile.businessType==='hair_coloring'||profile.businessType==='lash_brow')&&GENERIC_DEMO_IDS.has(video.videoId);
   if(!legacyFull&&!legacyGeneric)return video;
   // A demo title the owner already edited by hand is kept.
   const ownerTitle=legacyGeneric&&!legacyFull&&video.title&&video.title!==(generic[index]?.[1]||'');
   return {...replacement,id:video.id,...(ownerTitle?{title:video.title}:{})};
  });
 }
 return createDemoVideos(profile.businessType);
}
