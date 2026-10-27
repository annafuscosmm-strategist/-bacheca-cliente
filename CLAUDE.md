# Istruzioni per Claude

## Reel (skill monta-reel)
- I reel montati vanno salvati **sempre** nella cartella **"reel anna"** sul computer di Anna, una sottocartella per ogni video (es. `reel anna/2026-10-14 dopo 7 anni/reel.mp4`). Se non trovi la cartella, chiedi una volta dove si trova e creala.
- Il video finale resta intero e in alta qualità (non dividerlo, non comprimerlo).
- Lo stile di Anna è in `monta-reel-stile/`: prima di montare, se `~/.monta-reel/stile.json` non esiste, copia `monta-reel-stile/stile.json`, `stile.md` e i font di `monta-reel-stile/fonts/` in `~/.monta-reel/` (`fonts/` dentro). Non rifare le domande sullo stile.
- Se la sessione gira nel cloud (non sul PC di Anna), dille che da lì non puoi scrivere nella cartella "reel anna" e mandale il file da scaricare.

## Effetti video (skill effects)
- È installata la skill **effects** (45 effetti per video parlati: zoom, grade, spotlight, widget in vetro, timeline, checklist, headline, iPhone/toggle, grafici, pop-up iMessage, ecc.).
- **Usala in base al video**: scegli di volta in volta gli effetti che si adattano al contenuto e allo stile di Anna, dove aggiungono valore senza appesantire. Non applicare effetti a caso.
- Al primo uso in una sessione va lanciato il suo `scripts/setup.sh` (installa le sue dipendenze).

## Formato "Caso studio"
- Per le testimonianze di clienti usa il template in `monta-reel-stile/caso-studio/` (sfondo avorio, scritte nere, rosino, riquadro arrotondato). Taglio: frasi INTERE, partire dal beneficio del lavoro.
