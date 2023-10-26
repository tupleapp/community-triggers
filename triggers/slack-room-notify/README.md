# Slack Notify

Notify a Slack #channel when you join a room.

## Setup

1. Go to your Slack app's incoming webhooks page: https://YOUR_WORKSPACE.slack.com/apps/A0F7XDUAZ-incoming-webhooks.
2. Click "Add to Slack".
3. Choose the channel where notifications should be posted, and click "Add Incoming Webhooks Integration".
4. Copy the webhook URL provided. This URL is used to post messages from external sources into Slack.

In the [room-joined script](./room-joined) replace the `SLACK_WEBHOOK_URL` variable with the new webhook URL you generated above.

