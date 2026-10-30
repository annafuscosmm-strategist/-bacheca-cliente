#!/bin/bash
set -e
SRC=/home/user/-bacheca-cliente/reel/_sorgenti_dl
cd /home/user/-bacheca-cliente/reel/pilates-classico
ffmpeg -y -i "$SRC/video1.mp4" -ss 150 -i "$SRC/video2.mp4" -loop 1 -i maschera_top.png \
-filter_complex_script filter.txt \
-map "[outv]" -map 0:a -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r 30 \
-c:a aac -b:a 160k -shortest export/reel-v3.mp4
echo "FATTO v3"
