# Tuple Join Alert

This Tuple trigger sends a desktop notification when a specific person joins a Tuple room.

## Platform Requirements

- **macOS**: No additional requirements (uses built-in `osascript`)
- **Windows**: Requires Windows 10+ (uses built-in PowerShell toast notifications)
- **Linux**: Requires `notify-send` (usually part of `libnotify-bin` package)
  ```bash
  # Ubuntu/Debian
  sudo apt-get install libnotify-bin

  # Fedora/RHEL
  sudo dnf install libnotify

  # Arch
  sudo pacman -S libnotify
  ```

## Installation

Set environment variables in your shell profile:

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
