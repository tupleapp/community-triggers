# Welcome Party

The most obnoxious call join trigger ever created. When someone joins your call, they get the full treatment: AI-generated voice announcements, themed sound effects, and a full-screen confetti explosion.

## What happens

Every join randomly picks one of 5 themes:

| Theme | SFX | Voice |
|-------|-----|-------|
| **WWE** | Pyrotechnics + metal riff | "THE UNDEFEATED! THE UNMATCHED!" |
| **Royal** | Trumpet fanfare | "All rise! The magnificent [name] has arrived!" |
| **Sports** | Arena crowd + organ | "Number ONE in our hearts!" |
| **Movie Trailer** | Cinematic booms | "In a world where calls are boring..." |
| **DJ Hype** | Dubstep buildup + drop | "OH MY GOD! [name] IS HERE!" |

Each theme also has matching emoji and subtitle in the confetti page.

## Requirements

- **ElevenLabs API key** with text-to-speech access — set `ELEVENLABS_API_KEY` in your environment
- **macOS** (uses `afplay`, `afinfo`, `open`, and `python3`)
- **Tuple** with triggers enabled (Preferences > Triggers > Enable)

## Setup

1. Copy the `welcome-party` folder to `~/.tuple/triggers/`
2. Make the trigger executable: `chmod +x ~/.tuple/triggers/welcome-party/participant-joined`
3. Set your ElevenLabs API key: `export ELEVENLABS_API_KEY="your-key-here"` in your shell profile
4. Enable triggers in Tuple Preferences

## How it works

- Uses **ElevenLabs v3** with the **Xavier** voice (Dominating, Metallic Announcer) and audio tags like `[screaming]`, `[explosion]`, and `[crowd erupts]` for expressive delivery
- Sound effects were generated with ElevenLabs Sound Effects and Music Generation APIs
- Voice lines are **cached** by content hash in `audio-cache/` so repeat announcements are instant and don't burn API credits
- The confetti page fades out and the browser tab is closed via AppleScript when audio finishes

## Testing

Use the theme override to test a specific theme:

```bash
TUPLE_TRIGGER_THEME_OVERRIDE=dj-hype \
TUPLE_TRIGGER_FULL_NAME="Your Name" \
~/.tuple/triggers/welcome-party/participant-joined
```

Or use Tuple's built-in trigger tester: Preferences > Triggers > Test Triggers.
