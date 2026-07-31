# Slack Notify

Notify a Slack #channel when you join a room.

## Prerequisites

- [`jq`](https://jqlang.github.io/jq/) (`brew install jq`) — used to build the JSON payload so participant and room names are safely encoded.

## Setup

1. Create a Slack app at https://api.slack.com/apps. Click **Create New App → From scratch**, name it (e.g. "Tuple Room Notify"), and pick the workspace you want to post to.
2. In the app's sidebar, open **Incoming Webhooks** and toggle it on.
3. Click **Add New Webhook to Workspace**, choose the channel that should receive notifications, and click **Allow**.
4. Copy the webhook URL that Slack generates.

In the [room-joined script](./room-joined), replace the `SLACK_WEBHOOK_URL` value with your webhook URL.
