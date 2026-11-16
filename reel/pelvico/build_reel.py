import os, sys, json
cfg = json.load(open(sys.argv[1], encoding="utf-8"))
name=cfg["name"]; title=cfg["title"]; cues=cfg["cues"]
FONT="fonts/DMSerifDisplay.ttf"
d=f"work/{name}"; os.makedirs(d+"/cues", exist_ok=True)

# --- titolo: auto-fit font sulla riga più lunga ---
tlines=title.split("\n"); nt=len(tlines)
maxchars=max(len(l) for l in tlines)
# larghezza car ~ 0.44*fs per DM Serif; vogliamo <= 1000px
tfs=int(min(68, max(42, 1000/(maxchars*0.44))))
lh=int(tfs*1.2)
band_y=120; pad=24
band_h=nt*lh+2*pad
tx_y=band_y+pad
open(f"{d}/title.txt","w",encoding="utf-8").write(title)

# --- sottotitoli statici ---
subs=[]
for i,c in enumerate(cues):
    s,e,l1,l2=c
    txt=l1 if not l2 else l1+"\n"+l2
    fn=f"{d}/cues/c_{i:02d}.txt"; open(fn,"w",encoding="utf-8").write(txt)
    subs.append((s,e,fn))

F=[]
F.append("[0:v]scale=1080:1920,setsar=1[v0]")
F.append(f"[v0]drawbox=x=0:y={band_y}:w=1080:h={band_h}:color=0x7a1f2b@0.92:t=fill[v1]")
F.append(f"[v1]drawtext=fontfile={FONT}:textfile={d}/title.txt:expansion=none:text_align=C:"
         f"fontcolor=white:fontsize={tfs}:line_spacing=8:shadowcolor=black@0.4:shadowx=1:shadowy=2:"
         f"x=(w-text_w)/2:y={tx_y}[t]")
cur="t"; SUBY=1470
for i,(s,e,fn) in enumerate(subs):
    nxt=f"s{i}"
    F.append(f"[{cur}]drawtext=fontfile={FONT}:textfile={fn}:expansion=none:text_align=C:"
             f"fontcolor=white:fontsize=52:borderw=5:bordercolor=0x7a1f2b:"
             f"shadowcolor=black@0.5:shadowx=2:shadowy=3:line_spacing=10:"
             f"x=(w-text_w)/2:y={SUBY}-text_h:enable='between(t,{s},{e})'[{nxt}]")
    cur=nxt
OUTRO=3.0
if cfg.get("outro"):
    open(f"{d}/outro.txt","w",encoding="utf-8").write(cfg["outro"])
    F.append(f"[{cur}]tpad=stop_mode=clone:stop_duration={OUTRO}[cte]")
    dur=cfg["dur"]
    F.append(f"[cte]drawbox=x=0:y=820:w=1080:h=280:color=black@0.45:t=fill:enable='gte(t,{dur})'[cte2]")
    F.append(f"[cte2]drawtext=fontfile={FONT}:textfile={d}/outro.txt:expansion=none:text_align=C:"
             f"fontcolor=white:fontsize=60:borderw=5:bordercolor=0x7a1f2b:line_spacing=12:"
             f"shadowcolor=black@0.6:shadowx=2:shadowy=3:x=(w-text_w)/2:y=890:"
             f"enable='gte(t,{dur})'[cfin]")
    cur="cfin"
F[-1]=F[-1].rsplit("[",1)[0]+"[outv]"
open(f"{d}/filter.txt","w").write(";\n".join(F)+"\n")
print(f"{name}: titolo {nt} righe fs={tfs} band_h={band_h}, {len(subs)} sub")
