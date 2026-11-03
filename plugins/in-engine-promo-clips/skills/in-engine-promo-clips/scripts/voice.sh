#!/usr/bin/env bash
# ffmpeg recipes for voice takes. Find the times with takes.mjs first.
#
#   voice.sh clean <in> <start> <end> <out.wav>                 the main character: trim, de-clip, tidy ends
#   voice.sh phone <in> <start> <end> <pitch> <speed> <out.wav> another character on a phone speaker
#
# pitch: 0.86 (deeper, pompous) .. 1.15 (higher); speed: 1.1 suits a robocall. Give each character its own pitch so one
# performer sounds like several people.
set -euo pipefail
mode=${1:-}; shift || true
case "$mode" in
  clean)
    in=$1 a=$2 b=$3 out=$4
    # de-clip first (shouting into a phone mic clips), then trim, a high-pass, short fades and a soft limiter
    ffmpeg -v error -y -i "$in" -ac 1 -ar 48000 -af "aformat=sample_fmts=flt,volume=-1dB,adeclip=w=80:o=75:a=8:t=8,atrim=$a:$b,asetpts=N/SR/TB,highpass=f=90,lowpass=f=7000,afade=t=in:d=0.015,areverse,afade=t=in:d=0.04,areverse,alimiter=limit=0.5:level=false:attack=2:release=40" "$out" ;;
  phone)
    in=$1 a=$2 b=$3 p=$4 s=$5 out=$6
    tempo=$(awk -v s="$s" -v p="$p" 'BEGIN { printf "%.4f", s / p }')
    ffmpeg -v error -y -i "$in" -ac 1 -ar 48000 -af "atrim=$a:$b,asetpts=N/SR/TB,asetrate=48000*$p,aresample=48000,atempo=$tempo,highpass=f=330,highpass=f=330,lowpass=f=3300,lowpass=f=3300,equalizer=f=1700:t=q:w=1.2:g=6,acompressor=threshold=-24dB:ratio=4:attack=5:release=60:makeup=2,afade=t=in:d=0.012,areverse,afade=t=in:d=0.035,areverse" "$out" ;;
  *) sed -n '2,8p' "$0"; exit 1 ;;
esac
echo "$out"
