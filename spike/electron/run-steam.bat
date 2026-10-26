@echo off
rem Starts the game with Steamworks as Valve's test app (Spacewar, 480). Needs Steam running and logged in, and Valve's
rem SDK folder "steamworks_sdk" (with redistributable_bin\win64\steam_api64.dll inside) next to this file.
rem Press Shift+Tab in game to try the Steam overlay. A log goes to steam-log.txt here.
"%~dp0FloeMarketSpike.exe" --steam > "%~dp0steam-log.txt" 2>&1
