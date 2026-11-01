"""Explicit snapshot refresh. Each source is cached for at least two hours."""
import csv, json, os, time, urllib.request
from datetime import datetime, timezone
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache' / 'orbits'
OUT = ROOT / 'public' / 'data'
SOURCES = {
 'active.json':'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json',
 'debris.json':'https://celestrak.org/NORAD/elements/gp.php?NAME=DEB&FORMAT=json',
 'rockets.json':'https://celestrak.org/NORAD/elements/gp.php?NAME=R%2FB&FORMAT=json',
 'satcat.csv':'https://celestrak.org/pub/satcat.csv',
}
def iso(t): return datetime.fromtimestamp(t, timezone.utc).isoformat().replace('+00:00','Z')
def update():
 CACHE.mkdir(parents=True,exist_ok=True); OUT.mkdir(parents=True,exist_ok=True)
 for name,url in SOURCES.items():
  dest=CACHE/name; initial=OUT/name
  if initial.exists() and not dest.exists():
   assert initial.resolve().is_relative_to(ROOT) and dest.resolve().is_relative_to(ROOT)
   initial.rename(dest)
  if dest.exists() and time.time()-dest.stat().st_mtime<7200: continue
  request=urllib.request.Request(url,headers={'User-Agent':'OrbitWatch/0.2'})
  # Errors stop the run. Never overwrite a usable snapshot with an error response.
  with urllib.request.urlopen(request,timeout=90) as response:
   if response.status!=200: raise RuntimeError(f'{name}: HTTP {response.status}')
   body=response.read()
  if name.endswith('.json'):
   rows=json.loads(body)
   if not isinstance(rows,list) or not rows or 'NORAD_CAT_ID' not in rows[0]: raise ValueError(f'Invalid response: {name}')
  elif not body.startswith(b'OBJECT_NAME,OBJECT_ID,NORAD_CAT_ID'): raise ValueError('Invalid SATCAT response')
  temp=dest.with_suffix('.tmp');temp.write_bytes(body);os.replace(temp,dest)
 with (CACHE/'satcat.csv').open(encoding='utf-8-sig',newline='') as f: metadata={r['NORAD_CAT_ID']:r for r in csv.DictReader(f)}
 records={};counts={}
 for group in ['active','debris','rockets']:
  rows=json.loads((CACHE/f'{group}.json').read_text());counts[group]=len(rows)
  for row in rows:
   key=str(row['NORAD_CAT_ID']);old=records.get(key)
   if old and old['omm']['EPOCH']>=row['EPOCH']:continue
   m=metadata.get(key,{})
   if m.get('DECAY_DATE') or m.get('ORBIT_CENTER','EA') not in ['EA','']:continue
   records[key]={'omm':row,'meta':{k:m.get(k,'') for k in ['OBJECT_TYPE','OPS_STATUS_CODE','OWNER','LAUNCH_DATE','LAUNCH_SITE','ORBIT_TYPE']}}
 epochs=sorted(r['omm']['EPOCH'] for r in records.values())
 manifest={'provider':'CelesTrak','assembledAt':iso(time.time()),'downloadedAt':{n:iso((CACHE/n).stat().st_mtime) for n in SOURCES},'sources':SOURCES,'sourceCounts':counts,'count':len(records),'oldestEpoch':epochs[0]+'Z','newestEpoch':epochs[-1]+'Z','coverage':'Active group plus names containing DEB or R/B; deduplicated by NORAD ID. Not the complete catalog. Some inactive, unnamed, restricted, and untracked objects are absent.'}
 temp=OUT/'catalog.tmp';temp.write_text(json.dumps({'manifest':manifest,'records':list(records.values())},separators=(',',':')),encoding='utf-8');os.replace(temp,OUT/'catalog.json')
 print(json.dumps(manifest,indent=2))
if __name__=='__main__':update()
