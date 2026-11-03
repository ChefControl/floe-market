#!/usr/bin/env bash
# Joins frame folders from separate renders into one clip and mixes the sound.
#
#   assemble.sh <out.mp4> <seconds> <fx.wav> <frames dir>:<first>:<last>[:<game.wav>[:<gain dB>]] [more parts ...]
#
# Each part is a folder of 0000.jpg … frames, the frame range to use from it, and optionally its game.wav (the game's
# own sound from render_frames.mjs) with a gain (usually +14..+18 dB). Parts follow each other; each part's game sound
# starts where the part starts and fades over its last 0.3 s. fx.wav (voices + effects) runs over the whole clip.
# Ends with a limiter and a 0.4 s fade out. Cut parts on whole frames: a part's start time is (frames before it) / 30.
set -euo pipefail
out=$1 secs=$2 fx=$3; shift 3
list=$(mktemp) inputs=(-f concat -safe 0 -i "$list" -i "$fx") filters="" mixes="[fx]" n=2 at=0
: > "$list"
for part in "$@"; do
  IFS=: read -r dir first last gwav gain <<< "$part"
  for ((i = first; i <= last; i++)); do printf "file '%s/%04d.jpg'\nduration 0.0333333\n" "$(cd "$dir" && pwd)" "$i" >> "$list"; done
  count=$((last - first + 1))
  if [[ -n "${gwav:-}" ]]; then
    ms=$(awk -v f="$at" 'BEGIN { printf "%d", f * 1000 / 30 }'); dur=$(awk -v c="$count" 'BEGIN { printf "%.3f", c / 30 }')
    inputs+=(-i "$gwav")
    filters+="[$n:a]aresample=48000,aformat=channel_layouts=stereo,volume=${gain:-16}dB,atrim=0:$dur,afade=t=in:d=0.05,afade=t=out:st=$(awk -v d="$dur" 'BEGIN { printf "%.3f", d - 0.3 }'):d=0.3,adelay=$ms|$ms[g$n];"
    mixes+="[g$n]"; n=$((n + 1))
  fi
  at=$((at + count)); lastfile=$(printf "%s/%04d.jpg" "$(cd "$dir" && pwd)" "$last")
done
printf "file '%s'\n" "$lastfile" >> "$list"
k=$(( n - 1 ))
ffmpeg -v error -y "${inputs[@]}" -filter_complex "[0:v]fps=30,format=yuv420p[v];[1:a]aresample=48000,aformat=channel_layouts=stereo[fx];${filters}${mixes}amix=inputs=$k:normalize=0:duration=first,alimiter=limit=0.9:level=false:attack=3:release=50,afade=t=out:st=$(awk -v s="$secs" 'BEGIN { printf "%.3f", s - 0.4 }'):d=0.4[a]" \
  -map "[v]" -map "[a]" -t "$secs" -c:v libx264 -preset slow -crf 21 -r 30 -c:a aac -b:a 192k -movflags +faststart "$out"
rm -f "$list"
ls -l "$out"
