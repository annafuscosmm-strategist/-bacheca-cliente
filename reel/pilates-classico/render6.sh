#!/bin/bash
# Render finale: anziana (video1) sopra + montaggio b-roll sotto + sfumatura + sottotitoli dinamici.
set -e
SRC=/home/user/-bacheca-cliente/reel/_sorgenti_dl
cd "$(dirname "$0")"
ffmpeg -y -i "$SRC/video1.mp4" -i bottom_montage.mp4 -loop 1 -i maschera_top.png \
-filter_complex_script filter_dyn_montage.txt \
-map "[outv]" -map 0:a -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r 30 \
-c:a aac -b:a 160k -shortest export/reel-v6.mp4
echo "FATTO v6"
