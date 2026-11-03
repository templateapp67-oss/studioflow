// Creates honest animated AI-photo style previews, NOT haircut-process footage.
// FFMPEG_PATH=/path/to/ffmpeg node scripts/build-template15-videos.mjs
import {spawnSync} from 'node:child_process';
const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';
for(const name of ['fade','colour','long']){
 const result=spawnSync(ffmpeg,['-y','-loop','1','-i',`public/templates/15/${name}.webp`,'-vf',"scale=600:800:force_original_aspect_ratio=increase,crop=600:800,zoompan=z='min(zoom+0.0007,1.10)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=125:s=540x720:fps=25,format=yuv420p",'-t','5','-an','-c:v','libx264','-preset','fast','-crf','25','-movflags','+faststart',`public/templates/15/${name}-preview.mp4`],{encoding:'utf8'});
 if(result.status!==0)throw new Error(result.stderr);
}
console.log('Built three male-only, silent animated-photo previews (5 seconds each).');
