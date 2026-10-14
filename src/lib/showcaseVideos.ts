import type {SalonProfile,SocialVideo} from '../types';
// Public Shorts retain creator attribution and are labelled as demo references.
const REFERENCES = [
 ['KqLCuvMVB-k','Beard trim — step by step','Hair And Beard'],
 ['nehZDeIHwJ8','Beard trim transformation','Beardbrand Shorts'],
 ['pQ5h3rrJuDM','Gentle natural nail manicure','The Salon Life'],
 ['hzMSId-sxtY','Facial massage short','SHEF'],
 ['QAC81ZkryrY','Lifting facial massage short','Faceyoga Specialist'],
];
const OLD_FULL_VIDEO_IDS=new Set(['ulbjW3JyK8E','SYSj3KPiVfg','gHVUoN5n4xw','0f6AOLy4C9Y','tKkJnauWFgA']);
export function createDemoVideos(businessType:string):SocialVideo[]{
 return REFERENCES.map(([videoId,title,channelTitle],index)=>({id:`demo-${businessType}-${index+1}`,videoId,title,youtubeUrl:`https://www.youtube.com/shorts/${videoId}`,channelTitle,thumbnailUrl:`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,categoryTag:'SHORT',isOwnerVideo:false,isDemo:true,description:'Reference YouTube Short.'}));
}
export function showcaseVideos(profile:SalonProfile):SocialVideo[]{
 if(profile.socialVideos?.length||profile.demoVideosInitialized){
  const demos=createDemoVideos(profile.businessType);
  return (profile.socialVideos||[]).map(video=>{
   // Replace only legacy seeded demos. Owner videos, edited Shorts and deletions remain intact.
   const index=Number(video.id.match(/^demo-.+-(\d+)$/)?.[1])-1;
   return video.isDemo&&OLD_FULL_VIDEO_IDS.has(video.videoId)&&demos[index]?{...demos[index],id:video.id}:video;
  });
 }
 return createDemoVideos(profile.businessType);
}
