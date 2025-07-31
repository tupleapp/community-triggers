# Record call with OBS

You can use this trigger to automatically start recording a call using [OBS](https://obsproject.com/). Caveats:

- These scripts run via [deno](https://deno.com/). They expect the `deno` executable to be at `/usr/local/bin/deno`. If you have it installed in a different location, you'll need to update that in the scripts.
- These scripts rely on OBS's built-in websocket server. You'll need to enable it in OBS's settings; see more [here](https://obsproject.com/kb/remote-control-guide).
- These scripts also don't have a password set for the websocket server. If you have a password set, you'll need to update the scripts to include it.