import os,json,re,time,subprocess,sys,base64,urllib.request,urllib.error
from pathlib import Path
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
out=Path('qa-results');out.mkdir(exist_ok=True)
project=Path('android/Nexora-Android')
report={'android_api':35,'physical_redmi_test':False,'production_signing_key_used':False,'baseline_kind':'Same 1.2.2 source with code5 for package-update state retention; not historical 1.1.1 binary','tests':{}}
secrets=[]
def scrub(s):
 for secret in secrets:s=s.replace(secret,'[REDACTED]')
 return s
def save(): (out/'report.json').write_text(json.dumps(report,indent=2))
def adb(args,timeout=90,check=True,binary=None):
 try:r=subprocess.run(['adb']+args,capture_output=True,timeout=timeout)
 except subprocess.TimeoutExpired:raise RuntimeError('Android command timed out') from None
 if binary:Path(binary).write_bytes(r.stdout)
 text=scrub((r.stdout+r.stderr).decode(errors='replace'))
 if check and r.returncode:raise RuntimeError('Android command failed: '+text[-500:])
 return text
def test(name,clazz,expected,extra=None):
 args=['shell','am','instrument','-w','-r','-e','class',clazz]
 for key,value in (extra or {}).items():args+=['-e',key,value]
 args+=['com.nexora.customer.test/androidx.test.runner.AndroidJUnitRunner']
 result=adb(args,timeout=600,check=False)
 (out/(name+'.txt')).write_text(result)
 passed=bool(re.search(r'OK \('+str(expected)+r' tests?\)',result)) and 'FAILURES!!!' not in result and 'INSTRUMENTATION_FAILED' not in result
 report['tests'][name]={'passed':passed,'count':expected};save()
 if not passed:raise RuntimeError(name+' failed; see sanitized instrumentation output')
 print(name+' passed',flush=True)
def fixture():
 sid=os.environ['GITHUB_RUN_ID']+'-'+os.environ['GITHUB_RUN_ATTEMPT']
 url='https://raw.githubusercontent.com/'+os.environ['GITHUB_REPOSITORY']+'/'+os.environ['GITHUB_REF_NAME']+'/ci/android/sessions/'+sid+'.json'
 end=time.time()+600
 while True:
  try:
   with urllib.request.urlopen(url+'?t='+str(time.time_ns()),timeout=20) as response:envelope=json.load(response)
   break
  except urllib.error.HTTPError as e:
   if e.code!=404 or time.time()>end:raise RuntimeError('Encrypted QA session unavailable') from None
   time.sleep(5)
 key=serialization.load_pem_private_key((Path(os.environ['RUNNER_TEMP'])/'nexora-ci-private.pem').read_bytes(),password=None)
 un64=lambda x:base64.b64decode(envelope[x])
 aes=key.decrypt(un64('wrapped_key'),padding.OAEP(mgf=padding.MGF1(hashes.SHA256()),algorithm=hashes.SHA256(),label=None))
 q=json.loads(AESGCM(aes).decrypt(un64('nonce'),un64('ciphertext'),sid.encode()))
 assert q['run_session']==sid and q['expires_at']>time.time()
 assert q['email'].startswith('qa-android-') and q['email'].endswith('@example.invalid')
 secrets.append(q['password']);print('::add-mask::'+q['password'],flush=True)
 return q
try:
 adb(['shell','wm','size','720x1280']);adb(['shell','wm','density','320'])
 (out/'webview-provider.txt').write_text(adb(['shell','dumpsys','webviewupdate']))
 adb(['install','-r','-t','ci-baseline.apk'],timeout=180)
 adb(['install','-r','-t',str(project/'app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk')],timeout=180)
 test('upgrade-seed','com.nexora.customer.UpgradeStateUiTest#seedPersistentState',1)
 adb(['shell',"run-as com.nexora.customer sh -c 'mkdir -p files && echo retained > files/qa-marker.txt'"])
 adb(['install','-r','-t',str(project/'app/build/outputs/apk/debug/app-debug.apk')],timeout=180)
 assert 'retained' in adb(['shell','run-as','com.nexora.customer','cat','files/qa-marker.txt'])
 test('upgrade-retention','com.nexora.customer.UpgradeStateUiTest#updatedPackageRetainsState',1)
 adb(['shell','am','force-stop','com.nexora.customer'])
 (out/'cold-start.txt').write_text(adb(['shell','am','start','-W','-n','com.nexora.customer/.MainActivity']))
 time.sleep(5);adb(['exec-out','screencap','-p'],binary=out/'cold-start.png')
 test('guest-ui','com.nexora.customer.CustomerUiTest',6)
 q=fixture();extra={'qaEmail':q['email'],'qaPassword':q['password']}
 test('legacy-session','com.nexora.customer.LegacySessionUiTest',1,extra)
 test('authenticated-ui','com.nexora.customer.AuthenticatedCustomerUiTest',1,extra)
 anr=adb(['shell','dumpsys','activity','lastanr'],check=False);(out/'last-anr.txt').write_text(anr)
 assert not ('com.nexora.customer' in anr and ('ANR in' in anr or 'Reason:' in anr)), 'Application ANR recorded'
 exits=adb(['shell','dumpsys','activity','exit-info','com.nexora.customer'],check=False);(out/'exit-info.txt').write_text(exits)
 assert not re.search(r'reason=(4|5|6)\b',exits),'Application crash/ANR exit recorded'
 report['native_runtime_passed']=True;save()
except Exception as e:
 report['native_runtime_passed']=False;report['error']=scrub(str(e));save();print(scrub(str(e)),flush=True);sys.exit(1)
finally:
 adb(['exec-out','screencap','-p'],check=False,binary=out/'last-screen.png')
 (out/'last-anr.txt').write_text(adb(['shell','dumpsys','activity','lastanr'],check=False))
 (out/'exit-info.txt').write_text(adb(['shell','dumpsys','activity','exit-info','com.nexora.customer'],check=False))
 adb(['pull','/sdcard/Android/data/com.nexora.customer/files/qa',str(out/'screenshots')],check=False)
 (Path(os.environ['RUNNER_TEMP'])/'nexora-ci-private.pem').unlink(missing_ok=True)
