# Development

## Installing by hand

1. Copy this folder to `~/.tuple/triggers/mic-drop-sync`.
2. Turn on triggers in Tuple: Settings → Triggers → Enable Triggers.
3. Join a call. The first time, macOS will ask whether TupleTriggers may control Mic Drop. Allow it.

To uninstall, delete `~/.tuple/triggers/mic-drop-sync`.

## How it works

The `call-connected` and `room-joined` hooks start `sync` in the background, and `call-ended` and `room-left` stop it. As a backup, `sync` also stops by itself if the `tuple state follow` stream it watches (see below) shows the call has ended, or if Tuple quits.

While running, it follows `tuple state follow` for Tuple's mute state and polls Mic Drop's AppleScript `read` command four times a second, since Mic Drop doesn't announce changes. It sets the state with `tuple call mute`/`unmute` and Mic Drop's AppleScript `mute`/`unmute`.

Two details:

1. Tuple reports muted for a moment when you join, then unmutes itself. So for the first 5 seconds, Tuple changes aren't copied to Mic Drop. If Tuple changes during that time, it's muted or unmuted again to match Mic Drop.
2. After changing one app, changes in the other app are ignored for 2 seconds, so a stale reading can't flip it back.

Logs go to `~/Library/Logs/tuple-mic-drop-sync.log`. Tuple's own trigger log is `~/.tuple/triggers/triggers.log`.

## Icon

`assets/icon.png` is rendered from `assets/icon.svg` at 512×512, the size Tuple's directory requires.
