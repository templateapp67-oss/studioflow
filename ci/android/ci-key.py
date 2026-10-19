import os,json
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
key=rsa.generate_private_key(public_exponent=65537,key_size=3072)
p=Path(os.environ['RUNNER_TEMP'])/'nexora-ci-private.pem'
p.write_bytes(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()));p.chmod(0o600)
out=Path('qa-public-key');out.mkdir(exist_ok=True)
(out/'public.pem').write_bytes(key.public_key().public_bytes(serialization.Encoding.PEM,serialization.PublicFormat.SubjectPublicKeyInfo))
(out/'session.json').write_text(json.dumps({k:os.environ[v] for k,v in {'run_id':'GITHUB_RUN_ID','attempt':'GITHUB_RUN_ATTEMPT','commit':'GITHUB_SHA'}.items()}))
