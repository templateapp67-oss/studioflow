import struct,sys,zipfile,json
with zipfile.ZipFile(sys.argv[1]) as z:b=z.read('AndroidManifest.xml')
u16=lambda o:struct.unpack_from('<H',b,o)[0]
u32=lambda o:struct.unpack_from('<I',b,o)[0]
strings=[];result={};pos=8
while pos<len(b):
 kind,head,size=struct.unpack_from('<HHI',b,pos)
 if kind==1:
  count=u32(pos+8);flags=u32(pos+16);start=pos+u32(pos+20)
  for i in range(count):
   off=start+u32(pos+head+i*4)
   if flags&0x100:
    def length(o):
     x=b[o];return (((x&127)<<8)|b[o+1],o+2) if x&128 else (x,o+1)
    _,off=length(off);n,off=length(off);strings.append(b[off:off+n].decode())
   else:
    n=u16(off);off+=2
    if n&0x8000:n=((n&0x7fff)<<16)|u16(off);off+=2
    strings.append(b[off:off+n*2].decode('utf-16le'))
 elif kind==0x102 and strings[u32(pos+20)]=='manifest':
  base=pos+16+u16(pos+24);width=u16(pos+26);count=u16(pos+28)
  for i in range(count):
   a=base+i*width;name=strings[u32(a+4)];raw=u32(a+8);typ=b[a+15];value=u32(a+16)
   if name in ('package','versionCode','versionName','compileSdkVersion'):
    result[name]=strings[raw] if raw!=0xffffffff else strings[value] if typ==3 else value
 pos+=size
print(json.dumps(result))
