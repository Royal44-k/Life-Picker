import {readFile, realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve, relative, isAbsolute, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const manifest=JSON.parse(await readFile(resolve(root,'docs/assets/file-manifest.json'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
if(manifest.schemaVersion!==1||!Array.isArray(manifest.files))throw Error('Unsupported asset manifest');
const seen=new Set();let total=0;
for(const file of manifest.files){
  if(typeof file.path!=='string'||isAbsolute(file.path)||file.path.includes('\\')||file.path.split('/').some(p=>p==='..'||p===''))throw Error('Invalid asset path');
  if(seen.has(file.path))throw Error('Duplicate asset path: '+file.path);
  seen.add(file.path);
  const location=await realpath(resolve(root,file.path)),local=relative(root,location);
  if(local.startsWith('..'+sep)||isAbsolute(local))throw Error('Asset outside project: '+file.path);
  const bytes=await readFile(location);
  if(bytes.length!==file.bytes||hash(bytes)!==file.sha256)throw Error('Asset mismatch: '+file.path);
  total+=bytes.length;
}
const versions=JSON.parse(await readFile(resolve(root,'archives/versions.json'),'utf8'));
for(const version of versions.versions){
  const file='archives/versions/'+version.archive;
  if(!seen.has(file))throw Error('Version archive missing from manifest: '+file);
  const bytes=await readFile(resolve(root,file));
  if(bytes.length!==version.bytes||hash(bytes)!==version.sha256)throw Error('Version archive mismatch: '+file);
}
console.log('PASS '+manifest.files.length+' assets, '+versions.versions.length+' original version archives, '+total+' bytes; SHA-256 verified.');
