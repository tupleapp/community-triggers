# Dad Joke Greeter

Greet participants with a random dad joke when they join your Tuple room — spoken aloud so everyone on the call hears it.

Jokes are fetched from [icanhazdadjoke.com](https://icanhazdadjoke.com/) and played through macOS text-to-speech. Audio is routed to both your local speakers and a virtual audio device so remote participants hear the joke through Tuple.

## Installation

Copy the trigger into your Tuple triggers directory:

```bash
cp -r triggers/dad-joke-greeter ~/.tuple/triggers/dad-joke-greeter
```

> If you installed this trigger from the [Tuple Triggers Directory](https://tuple.app/triggers), it's already in place — skip to Quick Setup.

## How it works

- When **you** join a room, the trigger records which room you're in (no joke yet — you're alone).
- When **someone else** joins the same room, a dad joke is fetched and spoken aloud.
- When **you** leave the room, state is cleared and jokes stop.

## Quick setup

Run the included setup script to check prerequisites, create the audio device, and validate everything:

```bash
bash ~/.tuple/triggers/dad-joke-greeter/setup.sh
```

The script will walk you through each step interactively. If you prefer to set things up manually, follow the steps below.

## Prerequisites

- macOS (uses `say` for text-to-speech)
- [jq](https://jqlang.github.io/jq/) (`brew install jq`)
- [BlackHole 2ch](https://existential.audio/blackhole/) (free virtual audio driver)
> **Note:** After installing BlackHole, you may need to restart your Mac (or log out and back in) before it appears as an audio device.

## Manual audio setup

The key trick is routing the `say` audio into Tuple's microphone input so remote participants hear the joke. This requires a virtual audio loopback device.

### 1. Install BlackHole

```bash
brew install blackhole-2ch
```

### 2. Create an aggregate audio device

Open **Audio MIDI Setup** (Spotlight → "Audio MIDI Setup") and create a new aggregate device:

1. Click the **+** button in the bottom-left → **Create Aggregate Device**
2. Name it **"BH + Mic Input"**
3. Check **your preferred microphone first** — this can be any hardware mic (e.g. "MacBook Pro Microphone", an external USB mic, etc.)
4. Check **"BlackHole 2ch" second**
5. Enable **Drift Correction** on the BlackHole 2ch row
6. Set the **Clock Source** to the microphone you selected in step 3

> **Order matters.** Your hardware mic must be added first and used as the clock source. BlackHole needs drift correction enabled because it runs on a virtual clock that can drift from the hardware mic. Getting this wrong can cause audio glitches or silence.

### 3. Configure Tuple

In Tuple, go to **Preferences → Audio → Input Device** and select **"BH + Mic Input"**.

Now Tuple receives both your voice (real mic) and the joke audio (BlackHole).

### 4. Speaker device name

During setup, the script automatically detects your audio output devices and writes the selected device into the `room-joined` script. No manual editing needed.

If you skipped setup or need to change it later, update `SPEAKER_DEVICE` in the `room-joined` script. Find your device name with:

```bash
system_profiler SPAudioDataType | grep -A2 "Output Channels" | grep -v "Output Channels"
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SPEAKER_DEVICE` | `MacBook Pro Speakers` | Local speaker device name |
| `BLACKHOLE_DEVICE` | `BlackHole 2ch` | Virtual audio device name |

## Limiting to specific rooms

By default, jokes trigger in any room you join. To restrict to specific rooms, create `~/.tuple/tracked-rooms` with one room name per line:

```
Engineering
Design Crit
```
> **Room names are case-sensitive and must match exactly.** Use the room name as it appears in Tuple.

When this file exists, only rooms listed in it will trigger jokes. Remove the file to go back to all rooms.

## Disabling temporarily

Create a disable file to pause jokes without removing the trigger:

```bash
# Disable
touch ~/.tuple/.dad-jokes-disabled

# Re-enable
rm ~/.tuple/.dad-jokes-disabled
```

> Tuple spawns trigger scripts as subprocesses, so environment variables set in your terminal don't propagate. The touch-file approach works reliably regardless of how the script is launched.

Alternatively, remove or rename the trigger files in `~/.tuple/triggers/dad-joke-greeter/`.

## Known limitations

- **Switching microphones:** The aggregate audio device is configured with a specific mic. If you swap between multiple inputs throughout the day (e.g. AirPods, built-in mic, headset), you'll need to update the aggregate device in Audio MIDI Setup to use the new mic. A future version may automate this by detecting the current input and rebuilding the aggregate on the fly.
