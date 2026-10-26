@echo off
rem Measures Low and High in every scene (about 6 minutes). Results: a box at the end, and floe-electron-bench.txt on the Desktop.
"%~dp0FloeMarketSpike.exe" --bench --scene=all
