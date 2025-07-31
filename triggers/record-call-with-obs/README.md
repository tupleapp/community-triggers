# Record call with OBS

If you're looking for a way to record the audio and video of your Tuple calls, [OBS](https://obsproject.com/) is a solid choice. This guide will help you get set up to automatically record your calls.

### Install OBS
You can grab OBS for your OS [here](https://obsproject.com/download).

### Add Sources in OBS
In order to have OBS capture your screen, you'll need to add three "sources" (these are configured via the "Sources" panel in the lower left of the OBS window):

- macOS Screen Capture
- Audio Input Capture
- macOS Audio Capture

### Enable OBS's WebSocket server

Additionally, you'll need to start OBS's built-in WebSocket server. You can enable this by going to Tools > WebSocket Server Settings, clicking "Enable WebSocket server", and clicking "Apply". You can read more about this functionality [here](https://obsproject.com/kb/remote-control-guide).

You can also set a WebSocket server password if desired. Note that the scripts in this trigger expect the WebSocket server **to not have a password set**. If you choose to set a password, update these trigger scripts accordingly.

### Install Deno
These scripts run via [deno](https://deno.com/). They expect the `deno` executable to be at `/usr/local/bin/deno`. If you have it installed in a different location, you'll need to update that in the scripts, or create a symlink in the expected location.