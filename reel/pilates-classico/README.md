# Reel "Pilates Classico"

Montaggio di un reel verticale (1080×1920) a schermo diviso con **sfumatura centrale**:
- **sopra**: l'ospite che parla (ritagliata da un reel già montato, escludendo titoli/firme/sottotitoli preesistenti);
- **sotto**: b-roll della pratica a corpo libero, zoomato a tutto schermo;
- **sottotitoli**: traduzione italiana del parlato originale (qui inglese→italiano), font Playfair ("Classic"), bianco con bordo bordeaux (#800020).

## File
- `build_dt.py` — genera i file dei sottotitoli (`cues/`) e il grafo ffmpeg `filter.txt` (sottotitoli con `drawtext`).
- `cues/cue_NN.txt` — testo dei sottotitoli, una frase per file (max ~30 caratteri/riga).
- `maschera_top.png` — maschera alpha della sfumatura centrale (bianco→nero).
- `fonts/` — Playfair Display (TTF), usati dal render.
- `render3.sh` — comando di render finale.

## Rigenerare
I video sorgente non sono versionati (troppo pesanti). Mettere `video1.mp4` (ospite) e `video2.mp4` (b-roll) in `reel/_sorgenti_dl/`, poi:
```
python3 build_dt.py        # rigenera cues/ e filter.txt
bash render3.sh            # produce export/reel-v3.mp4
```

## Note
- NON usare libass/filtro `subtitles` con file .ass: con molti sottotitoli compare una virgola fantasma a inizio riga (bug libass). Usare `drawtext` (già impostato in `build_dt.py`).
- Trascrizione: `hyperframes transcribe -e parakeet` (trascrive la lingua parlata anche con `-l es`).
