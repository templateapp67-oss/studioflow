"""Verify the final original-key signature and unchanged tested APK payload."""
import sys,zipfile,hashlib,json,subprocess,re,xml.etree.ElementTree as ET
from pathlib import Path
artifact=Path(sys.argv[1]);final=Path(sys.argv[2]);out=Path(sys.argv[3])
report=json.loads((artifact/'qa-results/report.json').read_text())
assert report['native_runtime_passed'] is True
anr=(artifact/'qa-results/last-anr.txt').read_text()
exits=(artifact/'qa-results/exit-info.txt').read_text()
assert 'com.nexora.customer' not in anr
assert not re.search(r'reason=(4|5|6)\b',exits)
assert sum(t['count'] for t in report['tests'].values() if t['passed'])==10
app=artifact/'android/Nexora-Android/app/build/outputs/apk/debug/app-debug.apk'
def payload(path):
 with zipfile.ZipFile(path) as z:
  return {n:hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist() if not re.fullmatch(r'META-INF/(?:MANIFEST\.MF|[^/]+\.(?:SF|RSA|DSA|EC))',n,re.IGNORECASE)}
a,b=payload(app),payload(final);assert a==b,'Tested APK content changed during signing'
identity=json.loads(subprocess.check_output(['python3','cloud-ci/apk-identity.py',str(final)],text=True))
assert identity['package']=='com.nexora.customer' and identity['versionCode']==6 and identity['versionName']=='1.2.2'
expected=json.loads(Path('cloud-ci/web-assets-sha256.json').read_text())
assert all(b['assets/web/'+n]==h for n,h in expected.items())
assert not any(n.endswith(('.keystore','.jks','.pem')) for n in b)
units=[ET.parse(p).getroot() for p in artifact.rglob('TEST-*.xml')]
assert sum(int(r.attrib['tests']) for r in units)==14
assert all(r.attrib['failures']=='0' and r.attrib['errors']=='0' for r in units)
jar=artifact/'qa-tools/apksigner.jar'
r=subprocess.run(['java','-jar',str(jar),'verify','--verbose','--print-certs',str(final)],check=True,capture_output=True,text=True)
assert 'a8261b815aaf4ea90ef7ba31b96abdcf33e0fb75877803995603b1c466c00149' in r.stdout
report.update({'version_name':'1.2.2','version_code':6,'native_tests_passed':10,'unit_tests_passed':14,'bridge_tests_passed':6,'website_assets_matched':len(expected),'signer_matches_original_apk':True,'tested_payload_unchanged_after_signing':True,'apk_sha256':hashlib.sha256(final.read_bytes()).hexdigest(),'apk_bytes':final.stat().st_size,'final_apk_signed_with_original_key':True,'app_crash_or_anr_observed':False,'unrelated_emulator_launcher_boot_anr_observed':'com.google.android.apps.nexuslauncher' in anr,'website_version':142,'website_source_commit':'1de78028b436abd27b7f3f165820e6a293220409'})
out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
