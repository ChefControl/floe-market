#!/bin/sh
# Measures Low and High in every scene (about 6 minutes). Results: a box at the end, and ~/Desktop/floe-electron-bench.txt.
cd "$(dirname "$0")" && exec ./FloeMarketSpike --no-sandbox --bench --scene=all
