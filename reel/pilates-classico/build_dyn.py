import os, re
# frasi con tempi (start,end, riga1, riga2|None)
cues = [
 (0.24, 3.04,  "Una parola da appiccicare", "a questo tipo di etichette."),
 (3.20, 6.40,  "C'è il buon Pilates", "e c'è il cattivo Pilates."),
 (7.84,10.50,  "Joe è morto nel 1967.", None),
 (10.64,12.40, "Io c'ero.", None),
 (12.48,16.88, "Non ha mai chiamato", "il suo metodo «classico»."),
 (17.84,20.08, "Quindi, cosa significa", "«classico»?"),
 (20.32,22.72, "Nello stesso modo", "in cui lo insegnava lui?"),
 (22.72,24.80, "Beh, io credo", "nel cambiamento."),
 (24.80,29.10, "Credo nel restare aggiornati", "con la scienza."),
 (29.20,32.20, "E molto di ciò che faceva Joe,", None),
 (32.20,34.80, "con rispetto e amore", "per il mio maestro,"),
 (34.88,37.30, "non era scientifico.", None),
 (37.36,40.20, "Joe non era un medico.", None),
 (40.32,43.80, "Joe non aveva", "una formazione scientifica."),
 (43.84,47.76, "E oggi sappiamo", "molto di più sul corpo"),
 (48.64,52.50, "di quanto sapessimo nel 1967.", None),
 (52.56,53.40, "Giusto?", None),
 (53.40,59.84, "Quindi non dirò:", "«Smetto di imparare nel 1967»."),
 (59.84,62.32, "Perché se lo fai,", "resti indietro."),
 (62.71,65.60, "Non indosso", "i vestiti del 1967."),
 (65.67,71.19, "Continuo a cambiare in base", "a ciò che ritengo giusto."),
 (71.19,76.79, "Prima impari, poi decidi", "se accettarlo o no."),
 (76.79,82.00, "Il fatto è che nessuno", "che si definisce «classico»"),
 (82.00,85.03, "lo insegna", "esattamente come lui. Nessuno."),
 (85.03,92.63, "E «formato classicamente»", "significa allenato da Romana,"),
 (92.63,95.11, "ma anche Romana, mia amica,", "ha cambiato le cose."),
 (95.11,98.60, "Quindi «classico»", "è una parola stupida"),
 (98.60,101.19,"per queste etichette.", None),
 (101.19,104.07,"C'è il buon Pilates", "e c'è il cattivo Pilates."),
 (104.23,106.90,"Quindi, ma per favore.", None),
]

KEY = {"pilates","classico","classico»","«classico»","classicamente","«formato","medico","medico.",
       "scienza","scienza.","scientifico","scientifico.","scientifica","scientifica.","romana","romana,",
       "1967","1967.","1967»","joe","joe,","cambiamento","cambiamento.","cambiare","buon","cattivo",
       "stupida","maestra","maestra,","maestro","maestro,","corpo"}

def norm(w): return w.lower().strip(".,:;!?»«\"'")

# raggruppa in chunk da 2 parole; distribuisci il tempo per lunghezza
groups=[]  # (s,e,text,emph)
for (a,b,l1,l2) in cues:
    text = l1 if l2 is None else l1+" "+l2
    words = text.split()
    chunks=[]
    i=0
    while i < len(words):
        chunks.append(words[i:i+2]); i+=2
    weights=[sum(len(w) for w in c) for c in chunks]
    tot=sum(weights) or 1
    dur=b-a
    t=a
    for c,wt in zip(chunks,weights):
        d=dur*wt/tot
        s,e=t,t+d; t=e
        txt=" ".join(c)
        emph=any(norm(w) in KEY for w in c)
        groups.append((round(s,3),round(e,3),txt,emph))

os.makedirs("cues_dyn", exist_ok=True)
FONT="fonts/DMSerifDisplay.ttf"
YC=1010
dtlines=[]
for i,(s,e,txt,emph) in enumerate(groups):
    fn=f"cues_dyn/g_{i:03d}.txt"
    open(fn,"w",encoding="utf-8").write(txt)
    if emph:
        col="0x800020"; bord="white"; bw=5; fs=82
    else:
        col="white"; bord="0x800020"; bw=5; fs=74
    alpha=f"'min(1,(t-{s})/0.12)'"
    y=f"'{YC}-text_h/2+18*(1-min(1,(t-{s})/0.15))'"
    opts=(f"drawtext=fontfile={FONT}:textfile={fn}:expansion=none:text_align=C:"
          f"fontcolor={col}:fontsize={fs}:borderw={bw}:bordercolor={bord}:"
          f"shadowcolor=black@0.45:shadowx=2:shadowy=3:"
          f"alpha={alpha}:x=(w-text_w)/2:y={y}:enable='between(t,{s},{e})'")
    dtlines.append(opts)

# grafo completo
F=[]
F.append("[0:v]crop=540:500:90:0,scale=1080:1000,setsar=1[topc]")
F.append("[topc][2:v]alphamerge[topa]")
F.append("[1:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1[botc]")
F.append("color=black:s=1080x1920:d=115[bgc]")
F.append("[bgc][botc]overlay=0:800[bg]")
F.append("[bg][topa]overlay=0:0[v0]")
cur="v0"
for i,opts in enumerate(dtlines):
    nxt=f"v{i+1}"
    F.append(f"[{cur}]{opts}[{nxt}]")
    cur=nxt
F[-1]=F[-1].rsplit("[",1)[0]+"[outv]"
open("filter_dyn.txt","w").write(";\n".join(F)+"\n")
print("gruppi parole:",len(groups),"| filter_dyn.txt scritto")
