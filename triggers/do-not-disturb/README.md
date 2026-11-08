# Do Not Disturb

Enable the Do Not Disturb focus mode when on a call or in a room.

> **Note:** Tuple's built-in [App Veil](https://docs.tuple.app/application-preferences/macos-preferences-app-veil) includes a "Hide all notifications" setting that covers most of what this trigger does. Use this trigger if you want a full system-wide DnD focus mode (which also silences phone calls) rather than just hiding notifications during screen share.

This trigger requires that you configure two "shortcuts" in the macOS Shortcuts app.

The first should be named `dnd-on`, and it should turn the Do Not Disturb focus mode "on" until "Turned Off".

The other should be named `dnd-off`, and it should turn the Do Not Disturb focus mode "off".

Do Not Disturb turns on when a call connects or when you join a room, and turns off when the call ends or you leave the room. Other people joining or leaving a room you're in don't change it.
