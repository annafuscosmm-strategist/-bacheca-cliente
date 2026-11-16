# 7 Reel — Pavimento pelvico (convegno ACS)

7 reel verticali (1080×1920) estratti da un unico video sorgente, ciascuno con
**titolo chiaro** in banda bordeaux in alto e **sottotitoli italiani** (corretti a
mano) in basso. Font DM Serif Display, bianco con bordo bordeaux (#7a1f2b).

## Reel
1. Una donna su 2 soffre di disfunzioni del pavimento pelvico (138–223)
2. Perché a soffrirne sono soprattutto le donne (304–355 + frase-ponte finale)
3. Perché il respiro libera il pavimento pelvico (514–597)
4. La diastasi non viene solo col parto (616–667)
5. Addominali e perineo: il falso mito (1054–1109)
6. Il trasverso non lo alleni in palestra (757–805)
7. Prolasso di terzo grado: può ballare la salsa? (1225–1280)

## File
- `make_configs.py` — scrive i config `work_reelN.json` (titolo, start, dur, sottotitoli).
- `build_reel.py <config.json>` — genera `work/reelN/filter.txt` (titolo + sottotitoli drawtext; supporta un `outro` a fermo-immagine).
- `render_all.sh` — renderizza i reel 2–7 in `export/`.
- `work/reelN/` — filtro, titolo e testi dei sottotitoli di ogni reel.

## Rigenerare
Il video sorgente (`reel/_sorgenti_dl/pelvico.mov`) non è versionato. Rimetterlo,
poi: `python3 build_reel.py work_reelN.json && bash render_all.sh`.

## Note
- Sottotitoli con `drawtext` (niente libass). Trascrizione: `hyperframes transcribe -e parakeet -l it`, poi correzione manuale (es. "fallimento"→"pavimento", "di so"→"di solito").
