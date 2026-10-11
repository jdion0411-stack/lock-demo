import { readdir, stat, mkdir, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const destination=path.join(root,'assets');
const limit=25*1024*1024;
const extensions=new Set(['.html','.css','.png','.jpg','.jpeg','.gif','.svg','.webp','.avif','.ico','.mp3','.wav','.ogg','.m4a','.mp4','.webm','.woff','.woff2','.ttf']);
const ignored=new Set(['assets','node_modules','.git','Browser-update']);
const files=[];
async function walk(directory){
 for(const item of await readdir(directory,{withFileTypes:true})){
  if(item.name.startsWith('.')||ignored.has(item.name))continue;
  const absolute=path.join(directory,item.name);
  if(item.isDirectory()){await walk(absolute);continue;}
  if(!item.isFile())continue;
  const relative=path.relative(root,absolute);
  if(!extensions.has(path.extname(item.name).toLowerCase()))continue;
  // Match the existing server: only index/public HTML and media are published.
  if(path.extname(item.name).toLowerCase()==='.html'&&!['index.html','public.html'].includes(relative))continue;
  files.push({absolute,relative,size:(await stat(absolute)).size});
 }
}
await walk(root);
const oversized=files.filter(file=>file.size>limit);
if(oversized.length){
 console.error('\nThese files exceed Cloudflare\'s 25 MiB asset limit:');
 for(const file of oversized)console.error(`${file.relative}: ${(file.size/1024/1024).toFixed(2)} MiB`);
 console.error('Deployment stopped. Keep the originals; these files need a different media delivery method.');
 process.exit(1);
}
for(const required of ['index.html','public.html','public-background.webp'])if(!files.some(file=>file.relative===required))throw Error(`Missing required file: ${required}`);
if(files.length>20000)throw Error('The free plan permits at most 20,000 static asset files.');
await rm(destination,{recursive:true,force:true});
for(const file of files){const output=path.join(destination,file.relative);await mkdir(path.dirname(output),{recursive:true});await copyFile(file.absolute,output);}
console.log(`Prepared ${files.length} assets. All files fit the 25 MiB limit. Server files and configuration were excluded.`);
