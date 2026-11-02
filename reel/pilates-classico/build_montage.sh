#!/bin/bash
# Monta la parte inferiore (b-roll) SOLO con spezzoni in movimento di video2.
# Spezzoni scelti analizzando il movimento (YDIF) su tutto video2: esclusi
# riposo/preparazione (inizio), il finale (si alza e va alla camera) e le pause.
set -e
SRC=/home/user/-bacheca-cliente/reel/_sorgenti_dl
cd "$(dirname "$0")"
ffmpeg -y \
 -ss 124 -t 7 -i "$SRC/video2.mp4" \
 -ss 198 -t 22 -i "$SRC/video2.mp4" \
 -ss 252 -t 8 -i "$SRC/video2.mp4" \
 -ss 261 -t 13 -i "$SRC/video2.mp4" \
 -ss 315 -t 6 -i "$SRC/video2.mp4" \
 -ss 385 -t 10 -i "$SRC/video2.mp4" \
 -ss 468 -t 8 -i "$SRC/video2.mp4" \
 -ss 643 -t 10 -i "$SRC/video2.mp4" \
 -ss 674 -t 7 -i "$SRC/video2.mp4" \
 -ss 700 -t 9 -i "$SRC/video2.mp4" \
 -ss 710 -t 7 -i "$SRC/video2.mp4" \
 -filter_complex "\
[0:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1,fps=30[v0];\
[1:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1,fps=30[v1];\
[2:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1,fps=30[v2];\
[3:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1,fps=30[v3];\
[4:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1,fps=30[v4];\
[5:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1,fps=30[v5];\
[6:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1,fps=30[v6];\
[7:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1,fps=30[v7];\
[8:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1,fps=30[v8];\
[9:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1,fps=30[v9];\
[10:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1,fps=30[v10];\
[v0][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10]concat=n=11:v=1:a=0[out]" \
 -map "[out]" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 bottom_montage.mp4
echo "FATTO bottom_montage.mp4"
