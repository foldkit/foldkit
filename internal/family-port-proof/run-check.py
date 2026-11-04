import os
from pathlib import Path
import json,subprocess,sys,time
w=Path(__file__).resolve().parent.parent.parent
subprocess.run(['python3',str(w/'internal/family-port-proof/prepare-configs.py')],check=True)
a=Path(os.environ.get('FOLDKIT_FAMILY_PORT_ARTIFACTS', f'/private/tmp/foldkit-recovery-artifacts/family-port-{w.name}'));a.mkdir(parents=True,exist_ok=True)
name=sys.argv[1];args=sys.argv[2:];start=time.monotonic()
r=subprocess.run(args,cwd=w,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
(a/f'{name}.log').write_text(r.stdout)
p=a/'commands.json';rows=json.loads(p.read_text()) if p.exists() else []
rows.append({'name':name,'cwd':str(w),'args':args,'status':r.returncode,'seconds':time.monotonic()-start,'log':str(a/f'{name}.log')});p.write_text(json.dumps(rows,indent=2)+'\n')
shown = r.stdout[:16000] if '--listFiles' not in args else '\n'.join(line for line in r.stdout.splitlines() if 'error TS' in line) + f'\nListed {sum(line.startswith("/") for line in r.stdout.splitlines())} inputs'
print(name,r.returncode,shown);sys.exit(r.returncode)
