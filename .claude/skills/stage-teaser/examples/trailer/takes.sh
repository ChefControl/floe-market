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
# the opening (the owner's script: the floe, the tuna, the cleaver), on a new game
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
