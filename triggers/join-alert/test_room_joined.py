#!/usr/bin/env python3

"""
Tests for Tuple Room Notification Trigger
"""

import unittest
from unittest.mock import patch, MagicMock
import os
import sys
import importlib.util

# Import the module under test (handling hyphenated filename)
spec = importlib.util.spec_from_file_location("room_joined", "room-joined.py")
room_joined = importlib.util.module_from_spec(spec)
spec.loader.exec_module(room_joined)


class TestNameMatches(unittest.TestCase):
    """Test cases for name_matches function"""

    def test_exact_email_match(self):
        """Test exact email match"""
        self.assertTrue(
            room_joined.name_matches(
                "john@example.com",
                "John Smith",
                "john@example.com"
            )
        )

    def test_email_case_sensitive(self):
        """Test that email matching is case-sensitive"""
        self.assertFalse(
            room_joined.name_matches(
                "JOHN@example.com",
                "John Smith",
                "john@example.com"
            )
        )

    def test_full_name_contains_person_case_insensitive(self):
        """Test full name contains person (case-insensitive)"""
        self.assertTrue(
            room_joined.name_matches(
                "smith",
                "John Smith",
                "john@example.com"
            )
        )

    def test_full_name_uppercase(self):
        """Test full name matching with uppercase"""
        self.assertTrue(
            room_joined.name_matches(
                "SMITH",
                "John Smith",
                "john@example.com"
            )
        )

    def test_full_name_mixed_case(self):
        """Test full name matching with mixed case"""
        self.assertTrue(
            room_joined.name_matches(
                "SmiTh",
                "John Smith",
                "john@example.com"
            )
        )

    def test_partial_name_match(self):
        """Test partial name matching"""
        self.assertTrue(
            room_joined.name_matches(
                "Joh",
                "John Smith",
                "john@example.com"
            )
        )

    def test_no_match(self):
        """Test no match"""
        self.assertFalse(
            room_joined.name_matches(
                "Jane",
                "John Smith",
                "john@example.com"
            )
        )

    def test_empty_full_name(self):
        """Test with empty full name"""
        self.assertFalse(
            room_joined.name_matches(
                "John",
                "",
                "john@example.com"
            )
        )


class TestRoomMatches(unittest.TestCase):
    """Test cases for room_matches function"""

    def test_no_room_filter_matches_all(self):
        """Test that None room filter matches all rooms"""
        self.assertTrue(room_joined.room_matches(None, "Any Room"))

    def test_empty_room_filter_matches_all(self):
        """Test that empty room filter matches all rooms"""
        self.assertTrue(room_joined.room_matches("", "Any Room"))

    def test_exact_room_match_case_insensitive(self):
        """Test exact room name match (case-insensitive)"""
        self.assertTrue(
            room_joined.room_matches("project-alpha", "Project-Alpha")
        )

    def test_partial_room_match(self):
        """Test partial room name match"""
        self.assertTrue(
            room_joined.room_matches("alpha", "Project Alpha Team")
        )

    def test_room_match_uppercase(self):
        """Test room matching with uppercase filter"""
        self.assertTrue(
            room_joined.room_matches("ALPHA", "project-alpha")
        )

    def test_room_match_mixed_case(self):
        """Test room matching with mixed case"""
        self.assertTrue(
            room_joined.room_matches("AlPhA", "project-ALPHA-team")
        )

    def test_room_no_match(self):
        """Test room no match"""
        self.assertFalse(
            room_joined.room_matches("beta", "project-alpha")
        )


class TestParseNotificationConfig(unittest.TestCase):
    """Test cases for parse_notification_config function"""

    def test_person_only(self):
        """Test parsing person-only config"""
        person, room = room_joined.parse_notification_config("John")
        self.assertEqual(person, "John")
        self.assertIsNone(room)

    def test_person_and_room(self):
        """Test parsing person:room config"""
        person, room = room_joined.parse_notification_config("John:alpha")
        self.assertEqual(person, "John")
        self.assertEqual(room, "alpha")

    def test_email_and_room(self):
        """Test parsing email:room config"""
        person, room = room_joined.parse_notification_config("john@example.com:HQ-1")
        self.assertEqual(person, "john@example.com")
        self.assertEqual(room, "HQ-1")

    def test_multiple_colons(self):
        """Test parsing config with multiple colons (only first is used as separator)"""
        person, room = room_joined.parse_notification_config("john@example.com:room:with:colons")
        self.assertEqual(person, "john@example.com")
        self.assertEqual(room, "room:with:colons")


class TestMatchesAnyCombination(unittest.TestCase):
    """Test cases for matches_any_combination function"""

    def test_single_person_match(self):
        """Test single person configuration matches"""
        self.assertTrue(
            room_joined.matches_any_combination(
                ["John"],
                "John Smith",
                "john@example.com",
                "Any Room"
            )
        )

    def test_person_and_room_both_match(self):
        """Test person:room both match"""
        self.assertTrue(
            room_joined.matches_any_combination(
                ["Smith:alpha"],
                "John Smith",
                "john@example.com",
                "Project Alpha"
            )
        )

    def test_person_and_room_person_no_match(self):
        """Test person:room where person doesn't match"""
        self.assertFalse(
            room_joined.matches_any_combination(
                ["Jane:alpha"],
                "John Smith",
                "john@example.com",
                "Project Alpha"
            )
        )

    def test_person_and_room_room_no_match(self):
        """Test person:room where room doesn't match"""
        self.assertFalse(
            room_joined.matches_any_combination(
                ["Smith:beta"],
                "John Smith",
                "john@example.com",
                "Project Alpha"
            )
        )

    def test_multiple_configs_first_matches(self):
        """Test multiple configs where first one matches"""
        self.assertTrue(
            room_joined.matches_any_combination(
                ["John", "Jane:beta"],
                "John Smith",
                "john@example.com",
                "Project Alpha"
            )
        )

    def test_multiple_configs_second_matches(self):
        """Test multiple configs where second one matches"""
        self.assertTrue(
            room_joined.matches_any_combination(
                ["Jane", "Smith:alpha"],
                "John Smith",
                "john@example.com",
                "Project Alpha"
            )
        )

    def test_multiple_configs_none_match(self):
        """Test multiple configs where none match"""
        self.assertFalse(
            room_joined.matches_any_combination(
                ["Jane", "Bob:beta"],
                "John Smith",
                "john@example.com",
                "Project Alpha"
            )
        )

    def test_empty_notifications_list(self):
        """Test empty notifications list"""
        self.assertFalse(
            room_joined.matches_any_combination(
                [],
                "John Smith",
                "john@example.com",
                "Project Alpha"
            )
        )

    def test_email_exact_match_with_room(self):
        """Test exact email match with room filter"""
        self.assertTrue(
            room_joined.matches_any_combination(
                ["john@example.com:alpha"],
                "John Smith",
                "john@example.com",
                "Project Alpha"
            )
        )


class TestGetEnvArray(unittest.TestCase):
    """Test cases for get_array_environment_variable function"""

    def test_newline_separated(self):
        """Test parsing newline-separated array"""
        with patch.dict(os.environ, {"TEST_VAR": "value1\nvalue2\nvalue3"}):
            result = room_joined.get_array_environment_variable("TEST_VAR")
            self.assertEqual(result, ["value1", "value2", "value3"])

    def test_empty_env_var(self):
        """Test empty environment variable"""
        with patch.dict(os.environ, {}, clear=True):
            result = room_joined.get_array_environment_variable("TEST_VAR")
            self.assertEqual(result, [])

    def test_with_extra_whitespace(self):
        """Test parsing with extra whitespace"""
        with patch.dict(os.environ, {"TEST_VAR": " value1 \n value2 \n value3 "}):
            result = room_joined.get_array_environment_variable("TEST_VAR")
            self.assertEqual(result, ["value1", "value2", "value3"])

    def test_with_empty_lines(self):
        """Test parsing with empty lines"""
        with patch.dict(os.environ, {"TEST_VAR": "value1\n\nvalue2\n\n"}):
            result = room_joined.get_array_environment_variable("TEST_VAR")
            self.assertEqual(result, ["value1", "value2"])


class TestMain(unittest.TestCase):
    """Test cases for main function"""

    def setUp(self):
        """Set up test fixtures"""
        self.env_patcher = patch.dict(os.environ, {
            "TUPLE_TRIGGER_IS_SELF": "false",
            "TUPLE_TRIGGER_FULL_NAME": "John Smith",
            "TUPLE_TRIGGER_EMAIL": "john@example.com",
            "TUPLE_TRIGGER_ROOM_NAME": "Project Alpha",
            "TUPLE_JOIN_ALERT_NOTIFICATIONS": "Smith:alpha"
        })
        self.env_patcher.start()

    def tearDown(self):
        """Tear down test fixtures"""
        self.env_patcher.stop()

    def test_main_sends_notification_on_match(self):
        """Test main sends notification when match found"""
        with patch.object(room_joined, 'send_notification') as mock_send:
            result = room_joined.main()
            self.assertEqual(result, 0)
            mock_send.assert_called_once_with("John Smith", "Project Alpha")

    def test_main_exits_when_self(self):
        """Test main exits early when TUPLE_TRIGGER_IS_SELF is true"""
        with patch.object(room_joined, 'send_notification') as mock_send:
            with patch.dict(os.environ, {"TUPLE_TRIGGER_IS_SELF": "true"}):
                result = room_joined.main()
                self.assertEqual(result, 0)
                mock_send.assert_not_called()

    def test_main_no_notification_when_no_match(self):
        """Test main doesn't send notification when no match"""
        with patch.object(room_joined, 'send_notification') as mock_send:
            with patch.dict(os.environ, {"TUPLE_JOIN_ALERT_NOTIFICATIONS": "Jane:beta"}):
                result = room_joined.main()
                self.assertEqual(result, 0)
                mock_send.assert_not_called()

    def test_main_error_when_no_notifications_config(self):
        """Test main returns error when notifications not configured"""
        with patch.dict(os.environ, {"TUPLE_JOIN_ALERT_NOTIFICATIONS": ""}, clear=False):
            result = room_joined.main()
            self.assertEqual(result, 1)

    def test_main_uses_email_when_no_full_name(self):
        """Test main uses email for notification when full name is empty"""
        with patch.object(room_joined, 'send_notification') as mock_send:
            with patch.dict(os.environ, {
                "TUPLE_TRIGGER_FULL_NAME": "",
                "TUPLE_JOIN_ALERT_NOTIFICATIONS": "john@example.com:alpha"
            }):
                result = room_joined.main()
                self.assertEqual(result, 0)
                mock_send.assert_called_once_with("john@example.com", "Project Alpha")

    def test_main_default_room_name(self):
        """Test main uses default room name when not provided"""
        with patch.object(room_joined, 'send_notification') as mock_send:
            with patch.dict(os.environ, {"TUPLE_TRIGGER_ROOM_NAME": ""}, clear=False):
                with patch.dict(os.environ, {"TUPLE_JOIN_ALERT_NOTIFICATIONS": "Smith"}):
                    result = room_joined.main()
                    self.assertEqual(result, 0)
                    mock_send.assert_called_once_with("John Smith", "Unknown Room")


class TestSendNotification(unittest.TestCase):
    """Test cases for send_notification function"""

    @patch('platform.system', return_value='Darwin')
    @patch('subprocess.run')
    def test_send_notification_macos(self, mock_run, mock_platform):
        """Test send_notification calls osascript on macOS"""
        room_joined.send_notification("John Smith", "Project Alpha")

        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        self.assertEqual(args[0], "osascript")
        self.assertEqual(args[1], "-e")
        self.assertIn('John Smith joined Project Alpha', args[2])
        self.assertIn('Tuple Join Alert', args[2])

    @patch('platform.system', return_value='Windows')
    @patch('subprocess.run')
    def test_send_notification_windows(self, mock_run, mock_platform):
        """Test send_notification calls PowerShell on Windows"""
        room_joined.send_notification("John Smith", "Project Alpha")

        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        self.assertEqual(args[0], "powershell")
        self.assertEqual(args[1], "-Command")
        self.assertIn('John Smith joined Project Alpha', args[2])
        self.assertIn('Tuple Join Alert', args[2])

    @patch('platform.system', return_value='Linux')
    @patch('subprocess.run')
    def test_send_notification_linux(self, mock_run, mock_platform):
        """Test send_notification calls notify-send on Linux"""
        room_joined.send_notification("John Smith", "Project Alpha")

        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        self.assertEqual(args[0], "notify-send")
        self.assertIn("Tuple Join Alert", args)
        self.assertIn("John Smith joined Project Alpha", args)

    @patch('platform.system', return_value='Darwin')
    @patch('subprocess.run')
    def test_send_notification_escapes_message(self, mock_run, mock_platform):
        """Test send_notification properly escapes special characters on macOS"""
        room_joined.send_notification('John "Johnny" Smith', "Alpha's Room")

        # Check that the call was made with properly escaped strings
        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        self.assertEqual(args[0], "osascript")
        self.assertEqual(args[1], "-e")
        # Double quotes should be escaped with backslash
        self.assertIn('John \\"Johnny\\" Smith', args[2])
        self.assertIn("Alpha's Room", args[2])

    @patch('platform.system', return_value='Darwin')
    @patch('subprocess.run')
    def test_send_notification_escapes_backslashes(self, mock_run, mock_platform):
        """Test send_notification properly escapes backslashes to prevent injection"""
        room_joined.send_notification('User\\nMalicious', 'Room\\nCode')

        # Check that backslashes are escaped
        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        self.assertEqual(args[0], "osascript")
        self.assertEqual(args[1], "-e")
        # Backslashes should be doubled
        self.assertIn('User\\\\nMalicious', args[2])
        self.assertIn('Room\\\\nCode', args[2])

    @patch('platform.system', return_value='FreeBSD')
    @patch('subprocess.run')
    def test_send_notification_unsupported_platform(self, mock_run, mock_platform):
        """Test send_notification handles unsupported platforms gracefully"""
        # Should not raise an exception
        room_joined.send_notification("John Smith", "Project Alpha")

        # Should not call subprocess.run
        mock_run.assert_not_called()

    @patch('platform.system', return_value='Darwin')
    @patch('subprocess.run', side_effect=Exception("Command failed"))
    def test_send_notification_error_handling(self, mock_run, mock_platform):
        """Test send_notification handles errors gracefully"""
        # Should not raise an exception
        room_joined.send_notification("John Smith", "Project Alpha")

    @patch('platform.system', return_value='Windows')
    @patch('subprocess.run')
    def test_send_notification_windows_xml_escaping(self, mock_run, mock_platform):
        """Test Windows notification properly escapes XML special characters"""
        room_joined.send_notification('Test <script>alert("xss")</script>', 'Room & "Test"')

        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        self.assertEqual(args[0], "powershell")
        ps_script = args[2]
        # XML special characters should be escaped
        self.assertIn('&lt;script&gt;', ps_script)
        self.assertIn('&quot;', ps_script)
        self.assertIn('&amp;', ps_script)
        # Original unescaped strings should not be in the script
        self.assertNotIn('<script>', ps_script)

    @patch('platform.system', return_value='Linux')
    @patch('subprocess.run')
    def test_send_notification_linux_no_shell_injection(self, mock_run, mock_platform):
        """Test Linux notification prevents shell injection"""
        # Try to inject shell commands
        room_joined.send_notification('John; echo "hacked"', 'Room`whoami`')

        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        # Arguments should be passed as list items, not shell command
        self.assertEqual(args[0], "notify-send")
        # The message combines person and room name
        self.assertIn('John; echo "hacked" joined Room`whoami`', args)
        # Verify shell=True is not used (would allow command injection)
        call_kwargs = mock_run.call_args[1] or {}
        self.assertFalse(call_kwargs.get('shell', False))


if __name__ == "__main__":
    unittest.main()
