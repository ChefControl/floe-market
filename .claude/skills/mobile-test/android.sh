#!/bin/zsh
# Opens a page in Chrome on the Android emulator and connects Chrome's DevTools to the Mac, for the chrome-devtools MCP.
#   android.sh [url]      default url: the demo build, http://localhost:5177/
#   ANDROID_AVD=other android.sh ...   another emulator (emulator -list-avds)
#   ANDROID_GPU=host android.sh ...    the Mac's GPU instead of software (see below; restart the emulator to switch)
# localhost urls reach the Mac through `adb reverse`, so they stay a secure context like on a phone with a real host.
# Chrome's DevTools is at http://127.0.0.1:9333 (the MCP's --browserUrl); `adb logcat -s chromium` has Chrome's own log.
set -euo pipefail

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
path=("$ANDROID_HOME/platform-tools" "$ANDROID_HOME/emulator" $path)
avd="${ANDROID_AVD:-floe-pixel9}"
# Software GPU: Chrome's WebGL on Android 17 breaks with the Mac's GPU (-gpu host draws a blank world as Chrome's GPU
# process keeps dying; adding -feature GuestAngle fails with "Error creating WebGL context"). Checked 2026-10-28.
gpu="${ANDROID_GPU:-swiftshader_indirect}"
url="${1:-http://localhost:5177/}"
devtools=9333

if ! adb devices | grep -q '^emulator-.*device$'; then
  nohup emulator -avd "$avd" -gpu "$gpu" -no-boot-anim -no-snapshot-save > "${${TMPDIR:-/tmp}%/}/floe-emulator.log" 2>&1 &
  adb wait-for-device
  until [[ $(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r') == 1 ]]; do sleep 2; done
fi

# Chrome's welcome screens would cover the page; this test-only switch skips them. Chrome reads the file when it's the
# debug app (a Google APIs image allows it).
adb root >/dev/null 2>&1 && adb wait-for-device
adb shell 'echo "_ --disable-fre --no-default-browser-check --no-first-run" > /data/local/tmp/chrome-command-line'
adb shell am set-debug-app --persistent com.android.chrome

# Any localhost port in the url is the Mac's
if [[ $url =~ '^https?://(localhost|127\.0\.0\.1):([0-9]+)' ]]; then adb reverse "tcp:${match[2]}" "tcp:${match[2]}" >/dev/null; fi

adb shell am force-stop com.android.chrome
adb shell am start -a android.intent.action.VIEW -d "'$url'" com.android.chrome >/dev/null
adb forward "tcp:$devtools" localabstract:chrome_devtools_remote >/dev/null

echo "Android: $avd opened $url"
echo "DevTools: http://127.0.0.1:$devtools (chrome-devtools MCP), screenshot: adb exec-out screencap -p > shot.png"
