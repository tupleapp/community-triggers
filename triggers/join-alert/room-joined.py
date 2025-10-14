#!/usr/bin/env python3

"""
Tuple Join Alert
See README.md for installation and usage instructions
"""

import os
import sys
import subprocess
import platform
from typing import List, Tuple, Optional


def name_matches(person_filter: str, full_name: str, email: str) -> bool:
    return email == person_filter or person_filter.lower() in full_name.lower()


def room_matches(room_filter: Optional[str], room_name: str) -> bool:
    return not room_filter or room_filter.lower() in room_name.lower()


def parse_notification_config(input: str) -> Tuple[str, Optional[str]]:
    """
    Parse "person:room" format configuration string.

    Args:
        input: Configuration in format "person" or "person:room"

    Returns:
        Tuple of (person, room) where room may be None if not specified
    """
    if ":" in input:
        person, room = input.split(":", 1)
        return person, room
    else:
        return input, None


def matches_any_combination(
    notifications: List[str],
    full_name: str,
    email: str,
    room_name: str
) -> bool:
    """
    Check if current trigger matches any of the configured combinations.

    Args:
        notifications: List of notification configurations ("person" or "person:room")
        full_name: The trigger's full name
        email: The trigger's email
        room_name: The trigger's room name
    """
    return any(
        name_matches(person, full_name, email) and room_matches(
            room, room_name)
        for combo in notifications
        for person, room in [parse_notification_config(combo)]
    )


def send_notification(person_name: str, room_name: str) -> None:
    """
    Send notification using platform-specific notification system.

    Args:
        person_name: Name of the person who joined
        room_name: Name of the room
    """
    title = "Tuple Join Alert"
    message = f"{person_name} joined {room_name}"
    system = platform.system()

    try:
        if system == "Darwin":  # macOS
            _send_notification_macos(title, message)
        elif system == "Windows":
            _send_notification_windows(title, message)
        elif system == "Linux":
            _send_notification_linux(title, message)
        else:
            print(f"Warning: Notifications not supported on {system}", file=sys.stderr)
            print(f"{title}: {message}")
    except Exception as e:
        print(f"Error sending notification: {e}", file=sys.stderr)
        print(f"{title}: {message}")


def _send_notification_macos(title: str, message: str) -> None:
    """Send notification on macOS using osascript."""
    def escape_applescript(text: str) -> str:
        """Escape double quotes and backslashes to prevent command injection"""
        return text.replace('\\', '\\\\').replace('"', '\\"')

    title_escaped = escape_applescript(title)
    message_escaped = escape_applescript(message)

    subprocess.run([
        "osascript",
        "-e",
        f'display notification "{message_escaped}" with title "{title_escaped}" sound name "Hero"'
    ], check=True)


def _send_notification_windows(title: str, message: str) -> None:
    """Send notification on Windows using PowerShell."""
    import html

    # Escape for XML to prevent injection
    title_escaped = html.escape(title, quote=True)
    message_escaped = html.escape(message, quote=True)

    # Use Windows 10+ toast notifications via PowerShell
    ps_script = f'''
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.UI.Notifications.ToastNotification, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

$APP_ID = 'TupleJoinAlert'

$template = @"
<toast>
    <visual>
        <binding template="ToastText02">
            <text id="1">{title_escaped}</text>
            <text id="2">{message_escaped}</text>
        </binding>
    </visual>
</toast>
"@

$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml($template)
$toast = New-Object Windows.UI.Notifications.ToastNotification $xml
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($APP_ID).Show($toast)
'''

    subprocess.run(
        ["powershell", "-Command", ps_script],
        check=True,
        capture_output=True
    )


def _send_notification_linux(title: str, message: str) -> None:
    """
    Send notification on Linux using notify-send.

    Note: Passing arguments as a list (not shell=True) prevents command injection.
    """
    subprocess.run(
        ["notify-send", "-u", "normal", "-i", "dialog-information", title, message],
        check=True
    )


def get_array_environment_variable(variable_name: str) -> List[str]:
    """
    Get array from environment variable.

    In bash, arrays are passed to child processes as space-separated values
    in a single environment variable. This function splits them back into a list.
    """
    value = os.environ.get(variable_name, "")
    if not value:
        return []

    # Split on newlines or spaces, filter empty strings
    # Arrays from bash can be exported with newlines using printf "%s\n"
    return [item.strip() for item in value.split("\n") if item.strip()]


def main() -> int:
    print("Entering script.")

    # Exit if you joined the room yourself
    if os.environ.get("TUPLE_TRIGGER_IS_SELF") == "true":
        print("Event triggered for self. Exiting.")
        return 0

    # Get TUPLE_TRIGGER environment variables
    full_name = os.environ.get("TUPLE_TRIGGER_FULL_NAME", "")
    email = os.environ.get("TUPLE_TRIGGER_EMAIL", "")
    room_name = os.environ.get("TUPLE_TRIGGER_ROOM_NAME", "") or "Unknown Room"

    # Get notification configurations
    notifications = get_array_environment_variable(
        "TUPLE_JOIN_ALERT_NOTIFICATIONS")

    if not notifications:
        print("Error: TUPLE_JOIN_ALERT_NOTIFICATIONS array must be set",
              file=sys.stderr)
        return 1

    if not matches_any_combination(notifications, full_name, email, room_name):
        print("Doesn't match any configured combination. Exiting.")
        return 0

    person_name = full_name or email
    send_notification(person_name, room_name)

    print("Exiting.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
