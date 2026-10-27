#!/bin/sh
# Plays the game. Electron's Chrome sandbox needs a root-owned helper that a plain unpacked folder (or Steam's Linux
# runtime) doesn't have, so the spike runs without it.
cd "$(dirname "$0")" && exec ./FloeMarketSpike --no-sandbox "$@"
