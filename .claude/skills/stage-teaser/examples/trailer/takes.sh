#!/bin/bash
# Renders every take of the 16:9 store trailer (#156) and the music beds, on the demo build at localhost:5177
# (preview_start floe-market-demo first). Three at a time; ~15 min on an M-series Mac.
#   OUT=out/trailer bash takes.sh
# Then: python3 cut.py "$OUT" trailer.mp4 --phone trailer-phone.mp4 --edl edl.json
set -u
X=$(cd "$(dirname "$0")" && pwd); P=$(cd "$X/../../scripts" && pwd)
S=$(mkdir -p "${OUT:-out/trailer}" && cd "${OUT:-out/trailer}" && pwd)
U=http://localhost:5177/; U3="http://localhost:5177/?cellar&full&beaten=4&sound=on"
FK=rush,fightBanner,finish,finBlink,ringFlash,epic,banner,fade,toast,confetti
r() { name=$1; shift; node "$P/render-play.mjs" "$@" > "$S/log-$name.txt" 2>&1; echo "$name: $(tail -1 "$S/log-$name.txt")"; }
# THE CURRENT CUT is version 9 (version 8 with the castaway as the shipwrecked chef, acting.js castaway()): python3 cut.py "$S" trailer-v9.mp4 --phone phone.mp4 --edl edl-v9.json
# (edl-v9.json names its takes O14, C11, Gx4 and T8: O, C, G/Gx and T rendered again with the new costume. edl-v8.json is the same cut in the old one.)
# Version 8 was:  python3 cut.py "$S" trailer-v8.mp4 --phone phone.mp4 --edl edl-v8.json
# (edl-v8.json names its takes O12, C9, T6 and H4, lifts the mix 2 dB into the limiter ("pre") and lays grain over the night ("grain"): the same O, C, T and H as below, rendered from these scripts, and Gx2: the
# first sale with ONE dissolve, from the fish crate to the stand, and then unbroken (a dissolve between two moments at the
# same stand left ghost customers for five frames):
#   ffmpeg -framerate 30 -start_number 0 -i "$S/G/frames/%04d.jpg" -i "$S/G/game.wav" -filter_complex "[0]trim=start_frame=0:end_frame=39,setpts=PTS-STARTPTS[a];[0]trim=start_frame=88:end_frame=225,setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration=0.2:offset=1.1,format=yuvj420p[v];[1]atrim=0:1.3,asetpts=PTS-STARTPTS[x];[1]atrim=2.9333:7.5,asetpts=PTS-STARTPTS[y];[x][y]acrossfade=d=0.2:c1=tri:c2=tri[au]" -map "[v]" -q:v 2 -start_number 0 "$S/Gx2/frames/%04d.jpg" -map "[au]" "$S/Gx2/game.wav"
# edl-v7.json was the cut after the first review round, with takes O8, C5 and T3: the same O, C and T as below, rendered from these scripts. The campfire's site is found
# afresh each load: render C again if its log says "WARNING: no clear spot". edl-v6.json is the cut before the review.)
# It needs, beside the lines below: C with hero-tuna.js in its list (the tuna lies by the fire):
#   r C "$X/kit.js,$X/hero-tuna.js,$X/acting.js,$X/campfire.js,$X/c.js" "$S/C" --landscape --url "$U?stage=1&pile=14&sound=on" --mute music --init "$X/newgame.js" --wait 9000
# T with --mute music (its picture take carries only the spin's own rush and landing), and the MUSIC as one stem from the
# first sale through the spin and on under Floe Sushi (eight beats of lead-in, ?pre=8, effects and ambience muted):
#   r TM "$X/kit.js,$X/acting.js,$X/t.js" "$S/TM" --landscape --url "$U?stage=1&pile=14&sound=on&pre=8" --init "$X/newgame.js" --wait 6000 --mute sfx,amb --sound-only
# and Ux, Floe Sushi as one clip on the game's own camera (frames 0-157 and 244-304 of U, a 6-frame dissolve between):
#   ffmpeg -framerate 30 -start_number 0 -i "$S/U/frames/%04d.jpg" -i "$S/U/game.wav" -filter_complex "[0]trim=start_frame=0:end_frame=157,setpts=PTS-STARTPTS[a];[0]trim=start_frame=244:end_frame=304,setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration=0.2:offset=5.0333,format=yuvj420p[v];[1]atrim=0:5.2333,asetpts=PTS-STARTPTS[x];[1]atrim=8.1333:10.1333,asetpts=PTS-STARTPTS[y];[x][y]acrossfade=d=0.2[au]" -map "[v]" -q:v 2 -start_number 0 "$S/Ux/frames/%04d.jpg" -map "[au]" "$S/Ux/game.wav"
# and I, the ChefControl studio intro in front (the game's own, PR #258: src/intro.ts, index.html's #intro styles,
# src/introSound.ts, brand/chefcontrol.svg). Put chefcontrol.svg, introSound.ts and the #intro block of index.html (as
# css.txt) from that branch in a folder, then:  node "$X/intro-render.mjs" <that folder> public/fonts "$S/I"
# (edl-v5.json was the cut before those notes: the 25 s opening, the campfire on the dock with a bell.)
# (takes O, C, G/Gx, M0, T, U, H, L below; K2, K2g and DRONE2 are version 3-4's night scene, which the owner cut).
# Then measure the master: repeats.py (no frame shown twice), prelimit.py (hits under the limiter), bands.py (what a
# laptop and a phone play of each hit); they need numpy (python3 -m venv venv && venv/bin/pip install numpy).
# After a change to a take's SOUND only, re-render just its game.wav: the same line with --sound-only into another
# folder, and copy that game.wav over the take's.
# the opening (the owner's script: the floe, the tuna), on a new game: 25 s, keyed pose to pose, the floe answering
# him, 'something under the ice'. (edl-v4.json was cut with a 27 s o.js, versions 1-3 with a 15 s one: git history.)
r O "$X/kit.js,$X/hero-tuna.js,$X/acting.js,$X/o.js" "$S/O" --landscape --url "$U?stage=1&sound=on" --mute music --init "$X/newgame.js" &
# the campfire (that night: the bell, the idea) and the first sale (real play, HUD on); then cut.py with edl-open.json
r C "$X/kit.js,$X/acting.js,$X/campfire.js,$X/c.js" "$S/C" --landscape --url "$U?stage=1&pile=14&sound=on" --mute music --init "$X/newgame.js" --wait 9000 &
r G "$X/kit.js,$X/acting.js,$X/campfire.js,$X/g.js" "$S/G" --landscape --url "$U?stage=1&pile=14&sound=on" --mute music --init "$X/newgame.js" --wait 6000 --keep hud,toast,prompts &
r M0 "$X/bed.js" "$S/M0" --landscape --url "$U?stage=1&sound=on#8" --mute sfx,amb --sound-only --init "$X/newgame.js" &
wait
# the spin (the dock builds itself; the game's music left on), Floe Sushi at play, three thuds, the logo on black;
# with K below these make version 2: python3 cut.py "$S" trailer-v2.mp4 --phone phone.mp4 --edl edl-full.json
r T "$X/kit.js,$X/acting.js,$X/t.js" "$S/T" --landscape --url "$U?stage=1&pile=14&sound=on" --init "$X/newgame.js" --wait 6000 &
r U "$X/kit.js,$X/u.js" "$S/U" --landscape --url "$U?upto=porter&sound=on" --mute music --wait 6000 --keep hud,toast,prompts,buy,banner,confetti &
r H "$X/kit.js,$X/h.js" "$S/H" --landscape --url "$U?upto=porter&sound=on" --mute music --wait 5000 &
r L "$X/kit.js,$X/l.js" "$S/L" --landscape --url "$U?sound=on" --mute music &
wait
# version 3's ending: the knock on the clip's own cameras (k2.js), lifted a little for a night that reads on a phone
# (K2g), and a low drone to lay under it. python3 cut.py "$S" trailer-v3.mp4 --phone phone.mp4 --edl edl-v3.json
r K2 "$X/kit.js,$X/k2.js" "$S/K2" --landscape --url "$U?sound=on" --keep offer,toast
rm -rf "$S/K2g" && mkdir -p "$S/K2g/frames" && cp "$S/K2/game.wav" "$S/K2g/" &&
  ffmpeg -v error -y -start_number 0 -i "$S/K2/frames/%04d.jpg" -vf "eq=gamma=1.28:contrast=1.1:saturation=1.15" -q:v 2 -start_number 0 "$S/K2g/frames/%04d.jpg" < /dev/null
# the first sale as one piece: three parts of take G (pick up, sell, collect) with a 6-frame dissolve between them
# (straight cuts between parts of one play take on one angle read as jump cuts)
rm -rf "$S/Gx" && mkdir -p "$S/Gx/frames" && ffmpeg -v error -y -framerate 30 -start_number 0 -i "$S/G/frames/%04d.jpg" -i "$S/G/game.wav" -filter_complex \
  "[0]trim=start_frame=0:end_frame=39,setpts=PTS-STARTPTS[a];[0]trim=start_frame=88:end_frame=147,setpts=PTS-STARTPTS[b];[0]trim=start_frame=166:end_frame=225,setpts=PTS-STARTPTS[c];[a][b]xfade=transition=fade:duration=0.2:offset=1.1[ab];[ab][c]xfade=transition=fade:duration=0.2:offset=2.8667,format=yuvj420p[v];[1]atrim=0:1.3,asetpts=PTS-STARTPTS[x];[1]atrim=2.9333:4.9,asetpts=PTS-STARTPTS[y];[1]atrim=5.5333:7.5,asetpts=PTS-STARTPTS[z];[x][y]acrossfade=d=0.2:c1=tri:c2=tri[xy];[xy][z]acrossfade=d=0.2:c1=tri:c2=tri[au]" \
  -map "[v]" -q:v 2 -start_number 0 "$S/Gx/frames/%04d.jpg" -map "[au]" "$S/Gx/game.wav" < /dev/null
mkdir -p "$S/DRONE2" && ffmpeg -v error -y -f lavfi -i "sine=f=55:d=12.2:r=48000" -f lavfi -i "sine=f=82.4:d=12.2:r=48000" \
  -f lavfi -i "sine=f=110.3:d=12.2:r=48000" -f lavfi -i "sine=f=164.6:d=12.2:r=48000" -f lavfi -i "anoisesrc=c=brown:d=12.2:a=0.6:r=48000" \
  -filter_complex "[0]volume=0.5[a];[1]volume=0.28[b];[2]volume=0.13[c];[3]volume=0.06[d];[4]lowpass=f=180,volume=0.5[e];[a][b][c][d][e]amix=inputs=5:normalize=0,tremolo=f=0.31:d=0.35,volume=10dB,aformat=channel_layouts=stereo" \
  -ar 48000 "$S/DRONE2/game.wav" < /dev/null
# version 1's takes (K, the knock, is used by version 2 as well)
# act 1: the ice market, then Floe Sushi and the knocking hatch (music laid in from the beds)
r S1 "$X/kit.js,$X/s1.js" "$S/S1" --landscape --url "$U?stage=1&sound=on" --mute music &
r S2 "$X/kit.js,$X/s2.js" "$S/S2" --landscape --url "$U?sound=on" --keep toast,offer --mute music &
# act 2: the knock, the game's own scene with its own music
r K "$X/kit.js,$X/k.js" "$S/K" --landscape --url "$U?sound=on" --keep offer &
wait
# act 3: fight night (the gong, the prep, the fight and its finish)
r FA "$X/kit.js,$X/fa.js" "$S/FA" --landscape --url "$U3" --keep "$FK,gong" --mute music &
r FB "$X/kit.js,$X/fb.js" "$S/FB" --landscape --url "$U3" --keep "$FK" --skip 20 --mute music &
r FC "$X/kit.js,$X/fc.js" "$S/FC" --landscape --url "$U3" --keep "$FK" --skip 64 --mute music &
wait
# the end card, and the music beds (the game's own music for each place)
r E "$X/kit.js,$X/e.js" "$S/E" --landscape --url "$U?sound=on" --mute music &
r M1 "$X/bed.js" "$S/M1" --landscape --url "$U?stage=1&sound=on#16" --mute sfx,amb --sound-only &
r M2 "$X/bed.js" "$S/M2" --landscape --url "$U?sound=on#20" --mute sfx,amb --sound-only &
wait
r M3 "$X/bed.js" "$S/M3" --landscape --url "$U3#60" --mute sfx,amb --sound-only
