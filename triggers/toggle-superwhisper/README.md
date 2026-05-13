# Toggle Superwhisper

This trigger automatically starts a Superwhisper recording when a call starts.
It will also automatically stop the recording when the call ends.

Uses Superwhisper's `superwhisper://record` and `superwhisper://mode` deep links — see [Superwhisper: Switching modes](https://superwhisper.com/docs/modes/switching-modes).

## Modifications

If you want to force a particular mode, you can add this line to your scripts:

```
open superwhisper://mode?key={your superwhisper mode key}
```
