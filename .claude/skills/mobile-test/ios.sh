#!/bin/zsh
# Opens a page in Safari on the iPhone simulator and streams Safari's console to a file.
#   ios.sh [url]          default url: the demo build, http://localhost:5177/
#   IOS_DEVICE="iPhone 18 Pro" ios.sh ...   another simulator (xcrun simctl list devices available)
# The console log is at $TMPDIR/floe-mobile/ios-console.log; `ios.sh stop` ends the stream.
set -euo pipefail

dir="${${TMPDIR:-/tmp}%/}/floe-mobile"; mkdir -p "$dir"
log="$dir/ios-console.log" pidfile="$dir/ios-console.pid"
device="${IOS_DEVICE:-iPhone 17}"

stop_stream() { [[ -f $pidfile ]] && kill "$(<$pidfile)" 2>/dev/null; rm -f "$pidfile"; }
if [[ ${1:-} == stop ]]; then stop_stream; exit 0; fi
url="${1:-http://localhost:5177/}"

xcrun simctl boot "$device" 2>/dev/null || true   # fails when it's already booted, which is fine
xcrun simctl bootstatus "$device" -b >/dev/null

# Safari only writes page console messages to the system log with both of these on (checked on iOS 27).
for key in WebKitLogsPageMessagesToSystemConsoleEnabled WebKitDebugLogsPageMessagesToSystemConsoleEnabled; do
  xcrun simctl spawn "$device" defaults write com.apple.mobilesafari "$key" -bool YES
done
xcrun simctl terminate "$device" com.apple.mobilesafari 2>/dev/null || true   # so Safari picks them up

stop_stream
: > "$log"
# Lines look like "... http://localhost:5177/src/x.ts:12:3: CONSOLE ERROR message" (also LOG, WARN, DEBUG, JS ERROR).
nohup xcrun simctl spawn "$device" log stream --level debug --style compact \
  --predicate 'subsystem == "com.apple.WebKit" AND eventMessage CONTAINS " CONSOLE "' >> "$log" 2>&1 &
echo $! > "$pidfile"
sleep 1

xcrun simctl openurl "$device" "$url"
echo "iOS: $device opened $url"
echo "console: $log"
