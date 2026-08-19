#!/usr/bin/env bash

set -eu

dry_run=0
auto_prepare=0
join_meeting=0
join_delay="${MEETING_COPILOT_JOIN_DELAY:-2}"
restart_profile=0
manual_devices_required=0
meeting_url=''
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
environment_cdp_port="${MEETING_COPILOT_CDP_PORT:-}"

if [ -f "$repo_root/.meeting-copilot.env" ]; then
  # shellcheck disable=SC1091
  . "$repo_root/.meeting-copilot.env"
fi
if [ -n "$environment_cdp_port" ]; then
  MEETING_COPILOT_CDP_PORT="$environment_cdp_port"
fi

usage() {
  cat <<'EOF'
Usage: ./scripts/open-gpt-participant.sh [options] MEETING_URL

Opens a Zoom Web Client tab in the shared Meeting Copilot Chrome profile.
Zoom /j/ invitation URLs are converted to the browser client automatically.

Environment variables:
  MEETING_COPILOT_CHROME_PATH   Override the Google Chrome .app path.
  MEETING_COPILOT_PROFILE_DIR   Override the dedicated user data directory.
  MEETING_COPILOT_NAME          Participant name shown in instructions.
  MEETING_COPILOT_CDP_PORT      Local automation port (default: 9223).
  MEETING_COPILOT_JOIN_DELAY    Seconds to wait before joining (default: 2).
  MEETING_COPILOT_ZOOM_PASSCODE Meeting passcode when not embedded in the URL.

Options:
  --auto-prepare       Fill the name, mute the mic, and set audio devices.
  --join               Prepare the pre-join screen and join automatically.
  --join-delay SEC     Override the delay before joining.
  --restart-profile    Restart the whole shared profile; this also closes ChatGPT.
  --dry-run            Print the launch command without opening Chrome.

Examples:
  ./scripts/open-gpt-participant.sh https://zoom.us/j/123456789
  ./scripts/open-gpt-participant.sh --join --restart-profile "https://us05web.zoom.us/j/123456789?pwd=SECRET"
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)
      dry_run=1
      ;;
    --auto-prepare)
      auto_prepare=1
      ;;
    --join)
      auto_prepare=1
      join_meeting=1
      ;;
    --join-delay)
      shift
      join_delay="${1:-}"
      ;;
    --restart-profile)
      restart_profile=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --*)
      printf 'Unknown option: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
    *)
      if [ -n "$meeting_url" ]; then
        printf 'Only one meeting URL may be supplied.\n' >&2
        usage >&2
        exit 2
      fi
      meeting_url="$1"
      ;;
  esac
  shift
done

case "$join_delay" in
  ''|*[!0-9]*)
    printf '%s\n' '--join-delay must be a non-negative integer.' >&2
    exit 2
    ;;
esac

if [ -z "$meeting_url" ]; then
  printf 'A meeting URL is required.\n' >&2
  usage >&2
  exit 2
fi

case "$meeting_url" in
  https://meet.google.com/*)
    printf 'This is the Zoom version of Meeting Copilot.\n' >&2
    printf 'For Google Meet, use the upstream project: https://github.com/bb8ad8/meeting-copilot\n' >&2
    exit 2
    ;;
  https://zoom.us/*|https://*.zoom.us/*) ;;
  *)
    printf 'Unsupported meeting URL: %s\n' "$meeting_url" >&2
    printf 'Only HTTPS Zoom meeting URLs are accepted.\n' >&2
    exit 2
    ;;
esac

# Convert an invitation URL (/j/MEETING_ID) into the Web Client join page
# (/wc/MEETING_ID/join) while preserving the query string with the passcode.
normalized_url="$(printf '%s' "$meeting_url" | sed -E \
  -e 's#^(https://[A-Za-z0-9.-]*zoom\.us)/j/([0-9]+)(\?.*)?$#\1/wc/\2/join\3#' \
  -e 's#^(https://[A-Za-z0-9.-]*zoom\.us)/wc/([0-9]+)(\?.*)?$#\1/wc/\2/join\3#')"

case "$normalized_url" in
  https://zoom.us/wc/*|https://*.zoom.us/wc/*) ;;
  *)
    printf 'Could not derive a Zoom Web Client URL from: %s\n' "$meeting_url" >&2
    printf 'Use an invitation URL such as https://zoom.us/j/123456789 or a /wc/ URL.\n' >&2
    exit 2
    ;;
esac
meeting_url="$normalized_url"

find_chrome() {
  for app_path in \
    '/Applications/Google Chrome.app' \
    "$HOME/Applications/Google Chrome.app"; do
    if [ -d "$app_path" ]; then
      printf '%s\n' "$app_path"
      return 0
    fi
  done
  return 1
}

chrome_path="${MEETING_COPILOT_CHROME_PATH:-}"
if [ -z "$chrome_path" ]; then
  chrome_path="$(find_chrome || true)"
fi

if [ -z "$chrome_path" ] || [ ! -d "$chrome_path" ]; then
  printf 'Google Chrome was not found.\n' >&2
  printf 'Set MEETING_COPILOT_CHROME_PATH to the browser .app path.\n' >&2
  exit 1
fi

profile_dir="${MEETING_COPILOT_PROFILE_DIR:-$HOME/Library/Application Support/MeetingCopilot/GPTParticipantChrome}"
participant_name="${MEETING_COPILOT_NAME:-GPT-Live}"
cdp_port="${MEETING_COPILOT_CDP_PORT:-9223}"

printf 'Provider:     Zoom (Web Client)\n'
printf 'Browser:      %s\n' "$chrome_path"
printf 'Profile data: %s\n' "$profile_dir"
printf 'Display name: %s (set or verify in the meeting UI)\n' "$participant_name"

chrome_binary="$chrome_path/Contents/MacOS/${chrome_path##*/}"
chrome_binary="${chrome_binary%.app}"

if [ "$dry_run" -eq 1 ]; then
  printf '[DRY RUN] open -na %q --args --remote-debugging-address=127.0.0.1 --remote-debugging-port=%q --use-fake-ui-for-media-stream --user-data-dir=%q --no-first-run --new-window %q\n' \
    "$chrome_path" "$cdp_port" "$profile_dir" "$meeting_url"
  if [ "$join_meeting" -eq 1 ]; then
    printf '[DRY RUN] prepare the Zoom pre-join screen, wait %s seconds, and join\n' "$join_delay"
  fi
  exit 0
fi

if [ ! -x "$chrome_binary" ]; then
  printf 'Chrome executable was not found at %s.\n' "$chrome_binary" >&2
  exit 1
fi

mkdir -p "$profile_dir"

find_profile_pids() {
  ps -axo pid=,command= | awk -v profile="--user-data-dir=$profile_dir" '
    index($0, profile) && $0 ~ /Contents\/MacOS\// && $0 !~ /Helper/ { print $1 }
  '
}

dedicated_endpoint_ready() {
  node "$repo_root/scripts/verify-dedicated-chrome.mjs" \
    --profile-dir "$profile_dir" --port "$cdp_port" >/dev/null 2>&1
}

if [ ! -d "$repo_root/node_modules/playwright-core" ]; then
  printf 'playwright-core is required. Run: npm install\n' >&2
  exit 1
fi

launch_chrome=1
profile_pids="$(find_profile_pids)"
if [ -n "$profile_pids" ]; then
  if [ "$restart_profile" -eq 1 ]; then
    printf '[INFO] Restarting shared Meeting Copilot Chrome profile.\n'
    for profile_pid in $profile_pids; do
      kill "$profile_pid" 2>/dev/null || true
    done

    attempts=0
    while [ -n "$(find_profile_pids)" ] && [ "$attempts" -lt 20 ]; do
      sleep 0.25
      attempts=$((attempts + 1))
    done
  elif dedicated_endpoint_ready; then
    launch_chrome=0
    printf '[INFO] Reusing shared Meeting Copilot Chrome profile.\n'
  else
    printf 'The shared Chrome profile is running without its automation endpoint.\n' >&2
    printf 'Close it, then run the command again.\n' >&2
    exit 1
  fi
fi

if [ "$launch_chrome" -eq 1 ]; then
  open -na "$chrome_path" --args \
    --remote-debugging-address=127.0.0.1 \
    "--remote-debugging-port=$cdp_port" \
    --use-fake-ui-for-media-stream \
    "--user-data-dir=$profile_dir" \
    --no-first-run \
    --new-window \
    "$meeting_url"
fi

attempts=0
while ! dedicated_endpoint_ready; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 40 ]; then
    printf 'Chrome automation endpoint did not start on port %s.\n' "$cdp_port" >&2
    exit 1
  fi
  sleep 0.25
done

if [ "$auto_prepare" -eq 1 ]; then
  prepare_args=(
    --cdp "http://127.0.0.1:$cdp_port"
    --name "$participant_name"
    --url "$meeting_url"
  )
  if [ "$join_meeting" -eq 1 ]; then
    prepare_args+=(--join --join-delay "$join_delay")
  fi

  set +e
  node "$repo_root/scripts/prepare-zoom.mjs" \
    "${prepare_args[@]}"
  prepare_status=$?
  set -e

  case "$prepare_status" in
    0) ;;
    13)
      printf '\nThis meeting only admits signed-in participants.\n' >&2
      printf 'Sign in to Zoom once in the dedicated browser, then rerun the same command.\n' >&2
      exit 13
      ;;
    14)
      printf '\nZoom rejected the join request. Check the passcode and host settings.\n' >&2
      exit 14
      ;;
    15)
      printf '\nThe Zoom join state could not be determined. Check the browser window and continue manually.\n' >&2
      exit 15
      ;;
    16)
      printf '\nZoom needs manual action in the browser window (see joinStatus above):\n' >&2
      printf 'solve the CAPTCHA or turn the camera off, then join manually or rerun.\n' >&2
      exit 16
      ;;
    17)
      printf '\nThis meeting requires a passcode that is not embedded in the URL.\n' >&2
      printf 'Set MEETING_COPILOT_ZOOM_PASSCODE or use the full invitation URL with ?pwd=.\n' >&2
      exit 17
      ;;
    18)
      manual_devices_required=1
      ;;
    *)
      exit "$prepare_status"
      ;;
  esac
else
  if [ "$launch_chrome" -eq 0 ]; then
    node "$repo_root/scripts/open-chrome-page.mjs" \
      --cdp "http://127.0.0.1:$cdp_port" \
      --url "$meeting_url" >/dev/null
  fi
fi

if [ "$auto_prepare" -eq 1 ]; then
  if [ "$join_meeting" -eq 1 ]; then
    if [ "$manual_devices_required" -eq 1 ]; then
      cat <<EOF

Zoom was joined, but the BlackHole audio devices could not be confirmed.
Open the arrow next to the microphone button in the dedicated Chrome window and
select "BlackHole 16ch" as the microphone and "BlackHole 2ch" as the speaker.
The meeting microphone remains muted until this is verified.

See docs/audio-routing.md for the full sequence.
EOF
      # Callers must not unmute this participant; see set-zoom-mic exit 18.
      exit 18
    else
      cat <<EOF

Zoom join was requested. The meeting microphone remains muted.
If the host uses a waiting room, admission happens on the host side.

See docs/audio-routing.md for the full sequence.
EOF
    fi
  else
    cat <<EOF

Browser prepared. Verify the pre-join screen, then join manually.
The meeting microphone remains muted until the routing test is ready.

See docs/audio-routing.md for the full sequence.
EOF
  fi
else
  cat <<EOF

Browser opened. Before joining:
  1. Set the participant name to ${participant_name}.
  2. Set microphone/input to BlackHole 16ch.
  3. Set speaker/output to BlackHole 2ch.
  4. Keep the meeting microphone muted until the routing test is ready.

See docs/audio-routing.md for the full sequence.
EOF
fi
