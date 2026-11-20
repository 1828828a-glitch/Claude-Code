import numpy as np, wave, json
SR=44100; tl=json.load(open('timeline.json')); TOT=tl['total']; TURN=tl['starts'][11]  # index.html の場面11「実はね」から明るい曲に変える
N=int(SR*(TOT+.5)); out=np.zeros((N,2))
def f(n): return 440*2**((n-69)/12)
def add(t0,dur,midi,amp,kind,pan=0):
    i0=int(t0*SR); n=int(dur*SR); 
    if i0>=N: return
    n=min(n,N-i0); t=np.arange(n)/SR; fr=f(midi)
    if kind=='pad':
        s=sum(np.sin(2*np.pi*fr*(1+d)*t) for d in (-.003,0,.003))/3 + .3*np.sin(2*np.pi*fr*2*t)
        env=np.minimum(1,t/1.0)*np.minimum(1,(dur-t)/1.2).clip(0)
    elif kind=='bell':
        s=np.sin(2*np.pi*fr*t)+.4*np.sin(2*np.pi*fr*2.01*t)*np.exp(-t*6)+.2*np.sin(2*np.pi*fr*3*t)*np.exp(-t*9)
        env=np.exp(-t*2.8)*np.minimum(1,t/.004)
    else: # piano-ish
        s=np.sin(2*np.pi*fr*t)+.5*np.sin(2*np.pi*fr*2*t)*np.exp(-t*3)+.25*np.sin(2*np.pi*fr*3*t)*np.exp(-t*5)
        env=np.exp(-t*1.6)*np.minimum(1,t/.006)
    s=s*env*amp
    out[i0:i0+n,0]+=s*(1-pan)/1; out[i0:i0+n,1]+=s*(1+pan)/1
# minor section
sad=[(57,[57,60,64]),(53,[53,57,60]),(50,[50,53,57]),(52,[52,56,59])]
t=0; k=0
while t<TURN-.2:
    root,ch=sad[k%4]; d=min(3.2,TURN-t+1.2)
    add(t,d,root-12,.10,'pad')
    for m in ch: add(t,d,m,.05,'pad',pan=(m%3-1)*.3)
    for j,m in enumerate([ch[0]+12,ch[2]+12,ch[1]+12]):
        if t+j*1.07<TURN-.3: add(t+j*1.07,2.5,m,.07,'piano',pan=.2*(j-1))
    t+=3.2; k+=1
# warm section
hap=[(48,[60,64,67]),(43,[59,62,67]),(45,[60,64,69]),(41,[60,65,69])]
t=TURN; k=0; beat=.4
while t<TOT:
    root,ch=hap[k%4]; d=min(2.4,TOT-t+.4)
    add(t,d+.8,root,.09,'pad'); add(t,d,root+12,.04,'pad')
    for m in ch: add(t,d+.5,m,.035,'pad')
    arp=[ch[0]+12,ch[1]+12,ch[2]+12,ch[1]+12,ch[2]+12,ch[0]+24]
    fade_in=min(1,(t-TURN)/4)
    for j,m in enumerate(arp):
        add(t+j*beat,1.2,m,.06*fade_in,'bell',pan=.35*np.sin(j))
    t+=2.4; k+=1
add(TOT-3.6,4,84,.07,'bell'); add(TOT-3.6,4,79,.06,'bell'); add(TOT-3.6,4,76,.06,'bell')
# simple reverb: few delays
rev=np.zeros_like(out)
for dl,g in ((0.037,.35),(0.071,.28),(0.113,.22),(0.173,.17),(0.241,.12)):
    s=int(dl*SR); rev[s:,0]+=out[:-s,1]*g; rev[s:,1]+=out[:-s,0]*g
out=out+rev
tt=np.arange(N)/SR; out*=np.minimum(1,tt/1.5)[:,None]*np.clip((TOT+.3-tt)/2.5,0,1)[:,None]
out=out/np.abs(out).max()*.8
w=wave.open('bgm.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out*32767).astype('<i2').tobytes()); w.close()
print('ok',TOT,TURN)
