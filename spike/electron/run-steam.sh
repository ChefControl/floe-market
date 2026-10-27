#!/bin/sh
# Starts the game with Steamworks as Valve's test app (Spacewar, 480). Needs Steam running and logged in, and Valve's
# SDK folder "steamworks_sdk" (with redistributable_bin/linux64/libsteam_api.so inside) next to this file.
# Press Shift+Tab in game to try the Steam overlay. A log goes to steam-log.txt here.
cd "$(dirname "$0")" && exec ./FloeMarketSpike --no-sandbox --steam > steam-log.txt 2>&1
