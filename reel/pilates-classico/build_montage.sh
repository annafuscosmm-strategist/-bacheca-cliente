#!/bin/bash
# Monta la parte inferiore (b-roll in movimento) da video2.
# Spezzoni scelti analizzando il movimento (YDIF) su tutto video2: scartate le parti ferme.
set -e
SRC=/home/user/-bacheca-cliente/reel/_sorgenti_dl
cd "$(dirname "$0")"
ffmpeg -y \
 -ss 124 -t 22 -i "$SRC/video2.mp4" \
 -ss 197 -t 23 -i "$SRC/video2.mp4" \
 -ss 249 -t 29 -i "$SRC/video2.mp4" \
 -ss 674 -t 7  -i "$SRC/video2.mp4" \
 -ss 696 -t 21 -i "$SRC/video2.mp4" \
 -ss 722 -t 5.5 -i "$SRC/video2.mp4" \
 -filter_complex "\
[0:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1,fps=30[a];\
[1:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1,fps=30[b];\
[2:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1,fps=30[c];\
[3:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1,fps=30[d];\
[4:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1,fps=30[e];\
[5:v]scale=1991:1120,crop=1080:1120:455:0,setsar=1,fps=30[f];\
[a][b][c][d][e][f]concat=n=6:v=1:a=0[out]" \
 -map "[out]" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 bottom_montage.mp4
echo "FATTO bottom_montage.mp4"
