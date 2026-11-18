import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

const raw=process.env.SUPABASE_MIGRATION_LIST_OUTPUT||'';
if(!raw.trim()){
  // The regular offline verification suite has no production database access.
  // The production workflow supplies this value after a remote CLI query.
  console.log('SKIP: remote migration history preflight is run by the protected production workflow.');
  process.exit(0);
}
const output=raw.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,'');
const localFromCli=[];
const remoteFromCli=[];
function migrationColumns(line){
  const separator=line.includes('│')?'│':line.includes('|')?'|':null;
  if(!separator) return null;
  const cells=line.split(separator);
  if(cells[0]?.trim()==='') cells.shift();
  if(cells.at(-1)?.trim()==='') cells.pop();
  return cells.map(value=>value.trim());
}
for(const line of output.split(/\r?\n/)){
  const columns=migrationColumns(line);
  if(!columns || columns.length<2) continue;
  // Supabase CLI prints Local first and Remote second. Preserve empty cells:
  // an empty Local value means remote-only; an empty Remote value means pending.
  const local=columns[0]||'';
  const remote=columns[1]||'';
  if(/^\d{14}$/.test(local)) localFromCli.push(local);
  if(/^\d{14}$/.test(remote)) remoteFromCli.push(remote);
}

const localFiles=readdirSync('supabase/migrations')
  .filter(name=>/^\d{14}_.+\.sql$/.test(name))
  .sort();
const localVersions=localFiles.map(name=>name.slice(0,14));
const duplicates=localVersions.filter((version,index)=>localVersions.indexOf(version)!==index);
assert.deepEqual([...new Set(duplicates)],[],
  'Duplicate local migration timestamps found: '+[...new Set(duplicates)].join(', '));

const uniqueSorted=values=>[...new Set(values)].sort();
const cliLocal=uniqueSorted(localFromCli);
const cliRemote=uniqueSorted(remoteFromCli);
const duplicateCliLocal=localFromCli.filter((version,index)=>localFromCli.indexOf(version)!==index);
const duplicateCliRemote=remoteFromCli.filter((version,index)=>remoteFromCli.indexOf(version)!==index);
assert.deepEqual([...new Set(duplicateCliLocal)],[],
  'Supabase CLI returned duplicate local migration history rows: '+[...new Set(duplicateCliLocal)].join(', '));
assert.deepEqual([...new Set(duplicateCliRemote)],[],
  'Supabase CLI returned duplicate remote migration history rows: '+[...new Set(duplicateCliRemote)].join(', '));
assert(cliLocal.length>0||localVersions.length===0,
  'Could not parse local timestamps from supabase migration list --remote; output format changed.');
assert(cliRemote.length>0||localVersions.length===0,
  'Could not parse remote timestamps from supabase migration list --remote; output format changed.');
assert.deepEqual(cliLocal,uniqueSorted(localVersions),
  'Supabase CLI local migration list does not match files checked out in supabase/migrations.');

const localSet=new Set(localVersions);
const remoteSet=new Set(cliRemote);
const remoteOnly=cliRemote.filter(version=>!localSet.has(version));
const localOnly=uniqueSorted(localVersions.filter(version=>!remoteSet.has(version)));

const history=JSON.parse(readFileSync('docs/integrations/restored-supabase-history.json','utf8'));
const approvedPending=(history.release_pending_migrations||[])
  .map(record=>record.file.split('_',1)[0]).sort();
assert.deepEqual(localOnly,approvedPending,
  [
    'Local/remote migration history is not aligned with the reviewed release plan.',
    'Local-only (pending) versions: '+(localOnly.join(', ')||'(none)'),
    'Explicitly approved pending versions: '+(approvedPending.join(', ')||'(none)')
  ].join('\n'));

assert.deepEqual(remoteOnly,[],
  [
    'Remote Supabase history contains applied versions with no matching local SQL source.',
    'Remote-only versions: '+(remoteOnly.join(', ')||'(none)'),
    'Restore the exact original migration source into supabase/migrations before continuing.',
    'Do not automatically run supabase migration repair --status reverted: it removes applied history and may cause already-executed SQL to run again.'
  ].join('\n'));

const postExport=history.post_export_applied_versions||[];
for(const record of postExport){
  assert(remoteSet.has(record.version),
    'Post-export version is recorded as applied in the ledger but missing from remote history: '+record.version);
  assert(localSet.has(record.version),
    'Post-export version is recorded as applied but its SQL source is missing locally: '+record.file);
}

console.log(
  'PASS: '+localSet.size+' local migration sources match '+remoteSet.size+
  ' remote applied versions; '+localOnly.length+' approved pending migrations.'
);
