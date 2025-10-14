# Tuple Join Alert

This Tuple trigger sends a desktop notification when a specific person joins a Tuple room.

## Installation

1. Copy the Python script to: `~/.tuple/triggers/join-alert/room-joined.py`
   ```bash
   cp room-joined.py ~/.tuple/triggers/join-alert/room-joined.py
   chmod +x ~/.tuple/triggers/join-alert/room-joined.py
   ```

2. Set environment variables in your shell profile:

   **macOS/Linux** (`~/.zshrc` or `~/.bashrc`):
   ```bash
   export TUPLE_JOIN_ALERT_NOTIFICATIONS="Smith
   Smith:TeamRoom-1
   :TeamRoom-1
   smith@example.com:TeamRoom-1"
   ```

   **Windows** (PowerShell profile `$PROFILE`):
   ```powershell
   $env:TUPLE_JOIN_ALERT_NOTIFICATIONS = "Smith
   Smith:TeamRoom-1
   :TeamRoom-1
   smith@example.com:TeamRoom-1"
   ```

   (Person can be a full name, partial name, or email address. Room is optional - use `person:room` format to specify both)

## Platform Requirements

- **macOS**: No additional requirements (uses built-in `osascript`)
- **Linux**: Requires `notify-send` (usually part of `libnotify-bin` package)
  ```bash
  # Ubuntu/Debian
  sudo apt-get install libnotify-bin

  # Fedora/RHEL
  sudo dnf install libnotify

  # Arch
  sudo pacman -S libnotify
  ```
- **Windows**: Requires Windows 10+ (uses built-in PowerShell toast notifications)

## Testing

Run tests with:
```bash
python3 test_room_joined.py -v
```

Tests cover:
- Name matching (exact email, case-insensitive substring)
- Room matching (case-insensitive substring)
- Configuration parsing (`person:room` format)
- Multiple notification combinations
- Cross-platform notification support (macOS, Windows, Linux)
- Edge cases and error handling, including prevention of command injection

## Example matches for person="smith"
- "John Smith"
- "SMITH, Jane"
- "Smithson"
- "sarah.smith@example.com" (in full name)

## Example matches for room="alpha"
- "Project Alpha"
- "ALPHA-TEAM"
- "alpha-staging"
- "Company Alpha Room"
