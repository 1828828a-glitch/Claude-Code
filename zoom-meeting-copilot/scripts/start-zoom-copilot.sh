#!/usr/bin/env bash

set -eu

if [ "$#" -ne 1 ]; then
  printf 'Usage: ./scripts/start-zoom-copilot.sh MEETING_URL\n' >&2
  exit 2
fi

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
meeting_url="$1"
audio_configured=0
launch_completed=0
dedicated_launch_started=0
environment_cdp_port="${MEETING_COPILOT_CDP_PORT:-}"

cleanup_on_failure() {
  if [ "$launch_completed" -ne 1 ]; then
    if [ "$dedicated_launch_started" -eq 1 ]; then
      printf '[INFO] Closing the dedicated browser after launch failure.\n' >&2
      "$repo_root/scripts/close-dedicated-chrome.sh" >/dev/null 2>&1 || true
    fi
    if [ "$audio_configured" -eq 1 ]; then
      printf '[INFO] Restoring the previous macOS audio defaults after launch failure.\n' >&2
      "$repo_root/scripts/restore-audio.sh" >/dev/null 2>&1 || true
    fi
  fi
}
trap cleanup_on_failure EXIT

if [ -f "$repo_root/.meeting-copilot.env" ]; then
  set -a
  . "$repo_root/.meeting-copilot.env"
  set +a
fi
if [ -n "$environment_cdp_port" ]; then
  MEETING_COPILOT_CDP_PORT="$environment_cdp_port"
  export MEETING_COPILOT_CDP_PORT
fi

audio_configured=1
"$repo_root/scripts/configure-audio.sh"
dedicated_launch_started=1
"$repo_root/scripts/open-chatgpt-live.sh" --restart-profile
set +e
"$repo_root/scripts/open-gpt-participant.sh" --join "$meeting_url"
join_status=$?
set -e
if [ "$join_status" -eq 18 ]; then
  # Joined, but the BlackHole devices are unverified. Leave the participant
  # muted and the session running so the operator can fix the devices by hand;
  # unmuting now could loop meeting audio back into the meeting.
  launch_completed=1
  printf '\nThe Zoom participant stays muted until the BlackHole devices are selected manually.\n' >&2
  printf 'After fixing them, run: ./scripts/set-zoom-mic.sh unmute\n' >&2
  exit 18
elif [ "$join_status" -ne 0 ]; then
  exit "$join_status"
fi

# A waiting room can delay admission; keep polling for the in-meeting mic.
# set-zoom-mic re-verifies the BlackHole devices before unmuting and exits 18
# if they cannot be confirmed.
set +e
"$repo_root/scripts/set-zoom-mic.sh" --assume-before muted --wait 120 unmute
mic_status=$?
set -e
if [ "$mic_status" -eq 18 ]; then
  launch_completed=1
  printf '\nThe Zoom participant stays muted until the BlackHole devices are selected manually.\n' >&2
  printf 'After fixing them, run: ./scripts/set-zoom-mic.sh unmute\n' >&2
  exit 18
elif [ "$mic_status" -ne 0 ]; then
  exit "$mic_status"
fi

launch_completed=1

printf '\nChatGPT Voice is active and the Zoom participant has joined.\n'
printf 'The meeting microphone is unmuted; Project instructions control when ChatGPT speaks.\n'
