import {mkdirSync,readdirSync,existsSync,copyFileSync,statSync,unlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';
// Only public, content-hashed JS/CSS. Never copy account/API responses or env files.
/** @returns {import('vite').Plugin} */
export function retainScreenAssets(){
 let root,out,history;
 const files=dir=>existsSync(dir)?readdirSync(dir).filter(name=>/^[\w.-]+-[\w-]+\.(js|css)$/.test(name)):[];
 return {name:'studioflow-retain-screen-assets',apply:'build',configResolved(config){root=config.root;out=resolve(root,config.build.outDir,'assets');history=resolve(root,'.openai/screen-asset-history');},buildStart(){
  mkdirSync(history,{recursive:true});
  for(const name of files(out))if(!existsSync(join(history,name)))copyFileSync(join(out,name),join(history,name));
 },closeBundle(){
  mkdirSync(out,{recursive:true});let bytes=0,count=0;
  for(const name of files(history).sort((a,b)=>statSync(join(history,b)).mtimeMs-statSync(join(history,a)).mtimeMs)){
   const file=join(history,name),stat=statSync(file);
   if(Date.now()-stat.mtimeMs>14*86400000||count>=300||bytes+stat.size>64*1024*1024){unlinkSync(file);continue;}
   count++;bytes+=stat.size;if(!existsSync(join(out,name)))copyFileSync(file,join(out,name));
  }
 }};
}
