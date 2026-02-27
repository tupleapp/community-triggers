#!/usr/bin/env bash
# shellcheck disable=SC2059  # ANSI colour vars in printf format strings are intentional
# Dad Joke Greeter — setup helper
#
# Validates prerequisites and walks you through the one-time audio setup
# so remote Tuple participants can hear the jokes.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
RESET='\033[0m'

pass() { printf "${GREEN}  ✓ %s${RESET}\n" "$1"; }
fail() { printf "${RED}  ✗ %s${RESET}\n" "$1"; }
warn() { printf "${YELLOW}  ! %s${RESET}\n" "$1"; }
step() { printf "\n${BOLD}%s${RESET}\n" "$1"; }

errors=0

# ── Prerequisites ──────────────────────────────────────────────────────

step "Checking prerequisites..."

# jq
if command -v jq &>/dev/null; then
  pass "jq installed ($(jq --version))"
else
  fail "jq not found — install with: brew install jq"
  errors=$((errors + 1))
fi

# BlackHole 2ch
if system_profiler SPAudioDataType 2>/dev/null | grep -q "BlackHole 2ch"; then
  pass "BlackHole 2ch installed"
else
  fail "BlackHole 2ch not found — install with: brew install blackhole-2ch"
  errors=$((errors + 1))
  warn "If you just installed BlackHole, you may need to restart your Mac (or log out"
  warn "and back in) before it appears as an audio device. Then re-run this script."
fi

# curl
if command -v curl &>/dev/null; then
  pass "curl installed"
else
  fail "curl not found"
  errors=$((errors + 1))
fi

if [[ "$errors" -gt 0 ]]; then
  printf "\n${RED}Fix the issues above and re-run this script.${RESET}\n"
  exit 1
fi

# ── Aggregate audio device ─────────────────────────────────────────────

step "Checking for aggregate audio device..."

DEVICE_NAME="BH + Mic Input"

if system_profiler SPAudioDataType 2>/dev/null | grep -qi "$DEVICE_NAME"; then
  pass "\"$DEVICE_NAME\" aggregate device exists"
else
  warn "\"$DEVICE_NAME\" not found — let's create it"

  # List available microphones (filter out virtual/aggregate devices)
  printf "\n${BOLD}Available microphones:${RESET}\n"
  mics=()
  while IFS= read -r mic; do
    # Skip BlackHole, aggregate, and Zoom virtual devices
    case "$mic" in
      *BlackHole*|*"$DEVICE_NAME"*|*ZoomAudio*) continue ;;
    esac
    mics+=("$mic")
    printf "  ${GREEN}%d)${RESET} %s\n" "${#mics[@]}" "$mic"
  done < <(
    system_profiler SPAudioDataType 2>/dev/null \
      | grep -B2 "Input Channels" \
      | grep -v "Input Channels" \
      | grep -v "^--$" \
      | sed 's/^ *//;s/:$//' \
      | grep -v '^$'
  )

  if [[ ${#mics[@]} -eq 0 ]]; then
    fail "No microphones found"
    errors=$((errors + 1))
  else
    printf "\n"
    mic_choice=""
    while [[ -z "$mic_choice" ]]; do
      read -rp "Select your microphone [1-${#mics[@]}]: " pick
      if [[ "$pick" =~ ^[0-9]+$ ]] && [[ "$pick" -ge 1 ]] && [[ "$pick" -le ${#mics[@]} ]]; then
        candidate="${mics[$((pick - 1))]}"
        read -rp "Use \"$candidate\"? [Y/n] " confirm
        if [[ -z "$confirm" || "$confirm" =~ ^[Yy] ]]; then
          mic_choice="$candidate"
        fi
      else
        printf "  ${RED}Invalid choice. Enter a number between 1 and %d.${RESET}\n" "${#mics[@]}"
      fi
    done
    pass "Using microphone: \"$mic_choice\""
  fi

  read -rp "Press Enter to open Audio MIDI Setup (instructions will follow)..."
  open -a "Audio MIDI Setup"

  printf "\n${BOLD}Follow these steps in Audio MIDI Setup:${RESET}\n"
  printf "\n"
  printf "  1. Click the ${BOLD}+${RESET} button (bottom-left) → ${BOLD}Create Aggregate Device${RESET}\n"
  printf "  2. Rename it to ${BOLD}\"$DEVICE_NAME\"${RESET}\n"
  printf "  3. Check ${BOLD}\"%s\" FIRST${RESET}\n" "${mic_choice:-your built-in microphone}"
  printf "  4. Check ${BOLD}\"BlackHole 2ch\" SECOND${RESET}\n"
  printf "  5. Enable ${BOLD}Drift Correction${RESET} on the BlackHole 2ch row\n"
  printf "  6. Set ${BOLD}Clock Source${RESET} to ${BOLD}\"%s\"${RESET}\n" "${mic_choice:-your built-in microphone}"
  printf "\n"
  printf "  ${YELLOW}Order matters!${RESET} The mic must be added first and used as the\n"
  printf "  clock source. BlackHole needs drift correction enabled because\n"
  printf "  it runs on a virtual clock that can drift from the hardware mic.\n"
  printf "\n"

  read -rp "Press Enter once you've created the device..."

  if system_profiler SPAudioDataType 2>/dev/null | grep -qi "$DEVICE_NAME"; then
    pass "\"$DEVICE_NAME\" created successfully"
  else
    fail "The device \"$DEVICE_NAME\" was not found."
    warn "Make sure you: (1) created it in Audio MIDI Setup, (2) named it exactly"
    warn "\"$DEVICE_NAME\", (3) clicked Done and closed the dialog."
    errors=$((errors + 1))
  fi
fi

# ── Tuple audio input ──────────────────────────────────────────────────

step "Tuple configuration..."

printf "\n  Set Tuple's audio input to the aggregate device:\n"
printf "  ${BOLD}Tuple → Preferences → Audio → Input Device → \"$DEVICE_NAME\"${RESET}\n\n"
read -rp "Press Enter once configured (or if already done)..."

# ── Speaker device ─────────────────────────────────────────────────────

step "Detecting speaker device..."

# Enumerate audio output devices dynamically
DETECTED_SPEAKER=""
output_devices=()
while IFS= read -r dev; do
  # Skip BlackHole, aggregate, and Zoom virtual devices
  case "$dev" in
    *BlackHole*|*"$DEVICE_NAME"*|*ZoomAudio*) continue ;;
  esac
  output_devices+=("$dev")
done < <(
  system_profiler SPAudioDataType 2>/dev/null \
    | grep -B2 "Output Channels" \
    | grep -v "Output Channels" \
    | grep -v "^--$" \
    | sed 's/^ *//;s/:$//' \
    | grep -v '^$'
)

if [[ ${#output_devices[@]} -eq 0 ]]; then
  warn "Could not enumerate audio output devices."
else
  echo "Available audio output devices:"
  for i in "${!output_devices[@]}"; do
    printf "  %d) %s\n" "$((i+1))" "${output_devices[$i]}"
  done
  printf "  0) Skip (set manually later)\n"
  read -rp "Select speaker device [0-${#output_devices[@]}]: " speaker_choice
  if [[ "$speaker_choice" =~ ^[1-9][0-9]*$ ]] && [[ "$speaker_choice" -le "${#output_devices[@]}" ]]; then
    DETECTED_SPEAKER="${output_devices[$((speaker_choice-1))]}"
  fi
fi

if [[ -n "$DETECTED_SPEAKER" ]]; then
  sed -i '' "s|^SPEAKER_DEVICE=.*|SPEAKER_DEVICE='${DETECTED_SPEAKER}'|" "$SCRIPT_DIR/room-joined"
  pass "Updated SPEAKER_DEVICE in room-joined to: ${DETECTED_SPEAKER}"
else
  warn "SPEAKER_DEVICE not set. To configure manually, edit room-joined and set:"
  warn "  SPEAKER_DEVICE='Your Device Name'"
  warn "Find your device name with: say -a '?' 2>&1"
fi

# ── API test ───────────────────────────────────────────────────────────

step "Testing joke API..."

joke=$(
  curl -sfS --connect-timeout 3 --max-time 5 \
    -H "Accept: application/json" \
    -H "User-Agent: TupleDadJokeGreeter/1.0" \
    "https://icanhazdadjoke.com/" | jq -r '.joke // empty'
)

if [[ -n "$joke" ]]; then
  pass "API working"
  printf "  ${BOLD}Sample joke:${RESET} %s\n" "$joke"
else
  fail "Could not fetch a joke — check your internet connection"
  errors=$((errors + 1))
fi

# ── Summary ────────────────────────────────────────────────────────────

step "Setup summary"

if [[ "$errors" -gt 0 ]]; then
  printf "\n${RED}Setup incomplete — fix the issues above and re-run.${RESET}\n"
  exit 1
else
  printf "\n${GREEN}All good! Dad jokes are ready to roll.${RESET}\n"
  printf "  Join a Tuple room and wait for someone else — they'll be greeted.\n"
fi
