#!/bin/bash
SRC=/home/user/-bacheca-cliente/reel/_sorgenti_dl/pelvico.mov
cd /home/user/-bacheca-cliente/reel/pelvico
NODE=/opt/node22/bin/node
render(){
  n=$1; out=$2
  st=$($NODE -e "console.log(require('./work_$n.json').start)")
  du=$($NODE -e "console.log(require('./work_$n.json').dur)")
  hasout=$($NODE -e "console.log(require('./work_$n.json').outro?1:0)")
  if [ "$hasout" = "1" ]; then
    tot=$($NODE -e "console.log(require('./work_$n.json').dur+3.0)")
    ffmpeg -y -ss $st -i "$SRC" -filter_complex_script work/$n/filter.txt \
      -map "[outv]" -map 0:a -af "apad=pad_dur=3.3" -t $tot \
      -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 30 -c:a aac -b:a 160k export/$out.mp4
  else
    ffmpeg -y -ss $st -i "$SRC" -filter_complex_script work/$n/filter.txt \
      -map "[outv]" -map 0:a -t $du \
      -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 30 -c:a aac -b:a 160k export/$out.mp4
  fi
  echo "FATTO $n -> $out"
}
render reel2 reel2_noi-donne-vuote
render reel3 reel3_lasciarlo-stare
render reel4 reel4_diastasi-non-solo-parto
render reel5 reel5_tubetto-dentifricio
render reel6 reel6_trasverso-non-palestra
render reel7 reel7_prolasso-salsa
echo "=== TUTTI FATTI ==="
