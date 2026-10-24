# Template reel "Caso studio" (cinematografico, avorio)

Formato elegante per testimonianze di clienti sul profilo di Anna.

## Look
- Sfondo **avorio** (#F4ECDE) con leggera vignettatura e grana minima.
- Video della cliente in un **riquadro arrotondato** (840×1050) con bordo **rosino** (#A8636A) e ombra morbida, centrato in alto (x120 y320).
- Scritte **nere** (#2B2724), accenti e dettagli **rosino** (#A8636A), titoli in **Playfair corsivo**.
- Sottotitoli neri, una parola per volta (in basso, top ~1480).

## Regole di taglio (importante)
- **Frasi intere**: usare prese lunghe e continue, far finire le frasi. Non spezzare dentro una frase, non tagliare la coda dell'ultima parola.
- Togliere solo l'aria morta tra una frase e l'altra; lasciare le piccole pause naturali (danno respiro/eleganza).
- Partire dal **beneficio del lavoro** (la trasformazione della cliente), non dal metodo.

## Arco narrativo
1. Apertura: frase-gancio emotiva (titolo serif a tutto schermo).
2. Schermata "grazie al percorso": elenco ✓ dei risultati + timbro "è cambiato tutto".
3. Riquadro + etichette discrete sui punti chiave.
4. Schermata della svolta (es. "la confusione non c'è più").
5. Chiusura serif + "+ Segui".

## Come si costruisce (tecnico)
- Base avorio: `assets/bg_iv.png` + `assets/shadow_iv.png` + card (crop cliente 432×540 → scala 840×1050) con `assets/mask.png` (angoli) e `assets/border_iv.png` (bordo rosino). Vedi il comando ffmpeg in reel/7 (base.mp4).
- Grafiche: inserire `css_iv.txt` nello <style>, la sezione `#fs` (track 4) da `fs_iv.txt`, le etichette in `#g` da `g_iv.txt`, la timeline da `js_iv.txt`. Lo fa `genera_iv.py` sul template base di monta-reel.
- Poi `sottotitoli.mjs`, `suoni.mjs`, render HQ (crf 15).
