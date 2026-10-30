import os
# (start, end, "riga1", "riga2"|None)
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

os.makedirs("cues", exist_ok=True)
FONT="fonts/PlayfairDisplay.ttf"
dt=[]
for i,(a,b,l1,l2) in enumerate(cues):
    txt = l1 if l2 is None else l1+"\n"+l2
    fn=f"cues/cue_{i:02d}.txt"
    open(fn,"w",encoding="utf-8").write(txt)
    dt.append((a,b,fn))

# filtro: composizione con sfumatura centrale (niente linea)
F=[]
F.append("[0:v]crop=540:500:90:0,scale=1080:1000,setsar=1[topc]")
F.append("[topc][2:v]alphamerge[topa]")
F.append("[1:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1[botc]")
F.append("color=black:s=1080x1920:d=115[bgc]")
F.append("[bgc][botc]overlay=0:800[bg]")
F.append("[bg][topa]overlay=0:0[v0]")
cur="v0"
for i,(a,b,fn) in enumerate(dt):
    nxt=f"v{i+1}"
    opts=(f"drawtext=fontfile={FONT}:textfile={fn}:expansion=none:text_align=C:"
          f"fontcolor=white:fontsize=52:borderw=4:bordercolor=0x800020:"
          f"shadowcolor=black@0.5:shadowx=2:shadowy=3:line_spacing=10:"
          f"x=(w-text_w)/2:y=1015-text_h:enable='between(t,{a},{b})'")
    F.append(f"[{cur}]{opts}[{nxt}]")
    cur=nxt
F[-1]=F[-1].rsplit("[",1)[0]+"[outv]"
open("filter.txt","w").write(";\n".join(F)+"\n")
print("cue files:",len(dt),"| filter.txt (blend) scritto")
