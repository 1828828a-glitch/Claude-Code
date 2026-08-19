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

# Keep the dedicated browser open so the operator can complete a sign-in, but
# hand the microphone back to the previous macOS input while they do.
pause_for_signin() {
  launch_completed=1
  "$repo_root/scripts/restore-audio.sh" >/dev/null 2>&1 || true
  printf '\nSign in to %s in the dedicated Chrome window that stays open,\n' "$1" >&2
  printf 'then rerun the same command:\n' >&2
  printf '  ./scripts/start-zoom-copilot.sh "%s"\n' "$meeting_url" >&2
}

audio_configured=1
"$repo_root/scripts/configure-audio.sh"
dedicated_launch_started=1
set +e
"$repo_root/scripts/open-chatgpt-live.sh" --restart-profile
chatgpt_status=$?
set -e
if [ "$chatgpt_status" -eq 10 ]; then
  # First run: ChatGPT is not signed in yet. The failure trap must not close
  # the browser here, or signing in becomes impossible.
  pause_for_signin 'ChatGPT'
  exit 10
elif [ "$chatgpt_status" -ne 0 ]; then
  exit "$chatgpt_status"
fi

set +e
"$repo_root/scripts/open-gpt-participant.sh" --join "$meeting_url"
join_status=$?
set -e
if [ "$join_status" -eq 13 ]; then
  # The meeting only admits signed-in participants; keep the browser open for
  # the Zoom sign-in.
  pause_for_signin 'Zoom'
  exit 13
elif [ "$join_status" -eq 15 ] || [ "$join_status" -eq 16 ]; then
  # The join needs a human: an indeterminate page state or a CAPTCHA. Keep
  # the browser and audio routing as they are so the operator can finish the
  # join in the dedicated Chrome window.
  launch_completed=1
  printf '\nFinish the Zoom join manually in the dedicated Chrome window.\n' >&2
  printf 'Once the participant is in the meeting, run: ./scripts/set-zoom-mic.sh --wait 60 unmute\n' >&2
  exit "$join_status"
elif [ "$join_status" -eq 18 ]; then
  # Joined, but the BlackHole devices are unverified. Leave the participant
  # muted and the session running so the operator can fix the devices by hand;
  # unmuting now could loop meeting audio back into the meeting.
  launch_completed=1
  printf '\nThe Zoom participant stays muted until the BlackHole devices are selected manually.\n' >&2
  printf 'After fixing them, run: ./scripts/set-zoom-mic.sh unmute\n' >&2
  exit 18
elif [ "$join_status" -ne 0 ]; then
  # Keep the browser open on unexpected join failures so the state can be
  # inspected (node scripts/dump-zoom-ui.mjs), but hand the microphone back.
  launch_completed=1
  "$repo_root/scripts/restore-audio.sh" >/dev/null 2>&1 || true
  printf '\nThe Zoom join step failed (exit %s). The dedicated browser stays open for diagnosis:\n' "$join_status" >&2
  printf '  node scripts/dump-zoom-ui.mjs      # capture the Zoom page state\n' >&2
  printf '  ./scripts/close-dedicated-chrome.sh  # close it when done\n' >&2
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
