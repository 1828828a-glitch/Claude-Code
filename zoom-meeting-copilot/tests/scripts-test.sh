#!/usr/bin/env bash

set -eu

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
failures=0
temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/meeting-copilot-zoom-tests.XXXXXX")"
fake_chrome="$temp_dir/Google Chrome.app"
mkdir -p "$fake_chrome/Contents/MacOS"
touch "$fake_chrome/Contents/MacOS/Google Chrome"
chmod +x "$fake_chrome/Contents/MacOS/Google Chrome"
trap 'rm -rf "$temp_dir"' EXIT

pass() {
  printf '[PASS] %s\n' "$1"
}

fail() {
  printf '[FAIL] %s\n' "$1" >&2
  failures=$((failures + 1))
}

for script in "$repo_root"/scripts/*.sh; do
  if bash -n "$script"; then
    pass "bash syntax: ${script##*/}"
  else
    fail "bash syntax: ${script##*/}"
  fi
done

for javascript in "$repo_root"/scripts/*.mjs; do
  if node --check "$javascript"; then
    pass "JavaScript syntax: ${javascript##*/}"
  else
    fail "JavaScript syntax: ${javascript##*/}"
  fi
done

if "$repo_root/scripts/check-env.sh" --help >/dev/null; then
  pass 'check-env help'
else
  fail 'check-env help'
fi

if "$repo_root/scripts/configure-audio.sh" --help >/dev/null; then
  pass 'audio routing setup help'
else
  fail 'audio routing setup help'
fi

fake_audio_source="$temp_dir/SwitchAudioSource"
fake_audio_state="$temp_dir/fake-audio-state"
fake_audio_runtime="$temp_dir/fake-audio-runtime"
printf 'Physical microphone\nPhysical output\n' > "$fake_audio_state"
cat > "$fake_audio_source" <<'EOF'
#!/usr/bin/env bash
set -eu
case "$*" in
  -a)
    printf 'BlackHole 2ch\nBlackHole 16ch\nPhysical microphone\nPhysical output\n'
    ;;
  '-c -t input')
    sed -n '1p' "$FAKE_AUDIO_STATE"
    ;;
  '-c -t output')
    sed -n '2p' "$FAKE_AUDIO_STATE"
    ;;
  '-t input -s BlackHole 2ch')
    { printf 'BlackHole 2ch\n'; sed -n '2p' "$FAKE_AUDIO_STATE"; } > "$FAKE_AUDIO_STATE.tmp"
    mv "$FAKE_AUDIO_STATE.tmp" "$FAKE_AUDIO_STATE"
    ;;
  '-t input -s Physical microphone')
    { printf 'Physical microphone\n'; sed -n '2p' "$FAKE_AUDIO_STATE"; } > "$FAKE_AUDIO_STATE.tmp"
    mv "$FAKE_AUDIO_STATE.tmp" "$FAKE_AUDIO_STATE"
    ;;
  '-t output -s '*)
    printf 'System output must not be changed.\n' >&2
    exit 90
    ;;
  *)
    printf 'Unexpected SwitchAudioSource arguments: %s\n' "$*" >&2
    exit 2
    ;;
esac
EOF
chmod +x "$fake_audio_source"
if configure_result="$(FAKE_AUDIO_STATE="$fake_audio_state" \
  MEETING_COPILOT_SWITCH_AUDIO_SOURCE="$fake_audio_source" \
  MEETING_COPILOT_RUNTIME_DIR="$fake_audio_runtime" \
  "$repo_root/scripts/configure-audio.sh")" &&
  [ "$(sed -n '2p' "$fake_audio_state")" = 'Physical output' ] &&
  node -e '
    const fs = require("node:fs");
    const result = JSON.parse(process.argv[1]);
    const state = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
    if (!result.outputUnchanged || result.output !== "Physical output" || state.outputChanged !== false) process.exit(1);
  ' "$configure_result" "$fake_audio_runtime/audio-original.json"; then
  pass 'audio setup keeps the system output unchanged'
else
  fail 'audio setup keeps the system output unchanged'
fi

if FAKE_AUDIO_STATE="$fake_audio_state" \
  MEETING_COPILOT_SWITCH_AUDIO_SOURCE="$fake_audio_source" \
  MEETING_COPILOT_RUNTIME_DIR="$fake_audio_runtime" \
  "$repo_root/scripts/restore-audio.sh" >/dev/null &&
  [ "$(sed -n '1p' "$fake_audio_state")" = 'Physical microphone' ] &&
  [ "$(sed -n '2p' "$fake_audio_state")" = 'Physical output' ] &&
  [ ! -f "$fake_audio_runtime/audio-original.json" ]; then
  pass 'audio restore restores only the changed input'
else
  fail 'audio restore preserves the unchanged system output'
fi

if "$repo_root/scripts/restore-audio.sh" --help >/dev/null; then
  pass 'audio routing restore help'
else
  fail 'audio routing restore help'
fi

if "$repo_root/scripts/close-dedicated-chrome.sh" --help >/dev/null; then
  pass 'dedicated Chrome cleanup help'
else
  fail 'dedicated Chrome cleanup help'
fi

if "$repo_root/scripts/uninstall.sh" --help >/dev/null; then
  pass 'uninstaller help'
else
  fail 'uninstaller help'
fi

if [ "$(uname)" != 'Darwin' ]; then
  pass 'audio installer dry run (skipped: not macOS)'
elif "$repo_root/scripts/install-audio-deps.sh" --dry-run --yes --accept-blackhole-license >/dev/null; then
  pass 'audio installer dry run'
else
  fail 'audio installer dry run'
fi

if node "$repo_root/scripts/prepare-zoom.mjs" --help >/dev/null; then
  pass 'Zoom preparation help'
else
  fail 'Zoom preparation help'
fi

if node "$repo_root/scripts/prepare-chatgpt-live.mjs" --help >/dev/null; then
  pass 'ChatGPT Voice preparation help'
else
  fail 'ChatGPT Voice preparation help'
fi

if node "$repo_root/scripts/open-chrome-page.mjs" --help >/dev/null; then
  pass 'shared Chrome page opener help'
else
  fail 'shared Chrome page opener help'
fi

if node "$repo_root/scripts/verify-dedicated-chrome.mjs" --help >/dev/null; then
  pass 'dedicated Chrome ownership verifier help'
else
  fail 'dedicated Chrome ownership verifier help'
fi

if node "$repo_root/scripts/set-zoom-mic.mjs" --help >/dev/null; then
  pass 'Zoom microphone control help'
else
  fail 'Zoom microphone control help'
fi

if "$repo_root/scripts/set-zoom-mic.sh" --help >/dev/null; then
  pass 'Zoom microphone wrapper help'
else
  fail 'Zoom microphone wrapper help'
fi

if node "$repo_root/scripts/set-zoom-mic.mjs" \
  --state unmuted --assume-before invalid >/dev/null 2>&1; then
  fail 'Zoom microphone rejects invalid assumed state'
else
  pass 'Zoom microphone rejects invalid assumed state'
fi

launcher_output="$(MEETING_COPILOT_CHROME_PATH="$fake_chrome" \
  MEETING_COPILOT_PROFILE_DIR="$temp_dir/profile" \
  "$repo_root/scripts/open-gpt-participant.sh" --dry-run 'https://zoom.us/j/123456789')"
if printf '%s\n' "$launcher_output" | grep -F -- 'https://zoom.us/wc/123456789/join' >/dev/null &&
  printf '%s\n' "$launcher_output" | grep -F -- '--user-data-dir=' >/dev/null; then
  pass 'Zoom launcher converts /j/ URLs to the Web Client'
else
  fail 'Zoom launcher converts /j/ URLs to the Web Client'
fi

passcode_output="$(MEETING_COPILOT_CHROME_PATH="$fake_chrome" \
  MEETING_COPILOT_PROFILE_DIR="$temp_dir/profile" \
  "$repo_root/scripts/open-gpt-participant.sh" --dry-run \
  'https://us05web.zoom.us/j/123456789?pwd=SECRET.1')"
# The dry-run output quotes the URL with %q, escaping "?", so the URL is
# matched in two parts.
if printf '%s\n' "$passcode_output" | grep -F -- 'https://us05web.zoom.us/wc/123456789/join' >/dev/null &&
  printf '%s\n' "$passcode_output" | grep -F -- 'pwd=SECRET.1' >/dev/null; then
  pass 'Zoom launcher preserves the passcode and subdomain'
else
  fail 'Zoom launcher preserves the passcode and subdomain'
fi

join_launcher_output="$(MEETING_COPILOT_CHROME_PATH="$fake_chrome" \
  MEETING_COPILOT_PROFILE_DIR="$temp_dir/profile" \
  "$repo_root/scripts/open-gpt-participant.sh" --join --join-delay 7 --restart-profile --dry-run \
  'https://zoom.us/j/123456789')"
if printf '%s\n' "$join_launcher_output" | grep -F -- 'wait 7 seconds' >/dev/null &&
  printf '%s\n' "$join_launcher_output" | grep -F -- '--use-fake-ui-for-media-stream' >/dev/null; then
  pass 'automated Zoom join dry run'
else
  fail 'automated Zoom join dry run'
fi

if MEETING_COPILOT_CHROME_PATH="$fake_chrome" \
  "$repo_root/scripts/open-gpt-participant.sh" --dry-run 'https://meet.google.com/abc-defg-hij' >/dev/null 2>&1; then
  fail 'launcher rejects Google Meet URLs with an upstream pointer'
else
  pass 'launcher rejects Google Meet URLs with an upstream pointer'
fi

if MEETING_COPILOT_CHROME_PATH="$fake_chrome" \
  "$repo_root/scripts/open-gpt-participant.sh" --dry-run 'http://example.com/not-a-meeting' >/dev/null 2>&1; then
  fail 'launcher rejects unsupported URLs'
else
  pass 'launcher rejects unsupported URLs'
fi

chatgpt_launcher_output="$(MEETING_COPILOT_CHROME_PATH="$fake_chrome" \
  MEETING_COPILOT_PROFILE_DIR="$temp_dir/profile" \
  MEETING_COPILOT_CDP_PORT=9223 \
  MEETING_COPILOT_CHATGPT_PROJECT_URL='https://chatgpt.com/g/g-p-test/project' \
  "$repo_root/scripts/open-chatgpt-live.sh" --restart-profile --dry-run)"
if printf '%s\n' "$chatgpt_launcher_output" | grep -F -- '--remote-debugging-port=9223' >/dev/null &&
  printf '%s\n' "$chatgpt_launcher_output" | grep -F -- "--user-data-dir=$temp_dir/profile" >/dev/null &&
  printf '%s\n' "$chatgpt_launcher_output" | grep -F -- 'https://chatgpt.com/g/g-p-test/project' >/dev/null; then
  pass 'ChatGPT Voice launcher dry run'
else
  fail 'ChatGPT Voice launcher dry run'
fi

if "$repo_root/scripts/start-zoom-copilot.sh" >/dev/null 2>&1; then
  fail 'integrated launcher requires a meeting URL'
else
  pass 'integrated launcher requires a meeting URL'
fi

if [ "$failures" -ne 0 ]; then
  printf '%s test(s) failed.\n' "$failures" >&2
  exit 1
fi

printf 'All script tests passed.\n'
