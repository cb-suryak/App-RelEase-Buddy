# Release Management Slack App

A Slack app built with Bolt for JavaScript that helps manage the release process by locking the develop branch through GitHub Actions.

## Features

- Interactive button interface to start the release process
- Automatic locking of the develop branch via GitHub Actions
- Real-time status updates in a designated Slack channel
- Error handling and logging
- Workflow run URL tracking

## Prerequisites

- Node.js 14.x or later
- A Slack workspace with admin privileges
- A GitHub repository with admin access
- GitHub Actions workflow for locking the develop branch

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Fill in the environment variables in `.env`:
   - `SLACK_BOT_TOKEN`: Your Slack bot token
   - `SLACK_SIGNING_SECRET`: Your Slack app signing secret
   - `SLACK_APP_TOKEN`: Your Slack app token
   - `GITHUB_TOKEN`: Your GitHub personal access token
   - `GITHUB_REPO_OWNER`: Your GitHub organization or username
   - `GITHUB_REPO_NAME`: Your repository name
   - `SLACK_CHANNEL_ID`: The ID of the Slack channel for notifications

5. Start the app:
   ```bash
   npm start
   ```

## Slack App Setup

1. Create a new Slack app at https://api.slack.com/apps
2. Enable Socket Mode
3. Add the following bot token scopes:
   - `chat:write`
   - `chat:write.public`
   - `im:write`
4. Install the app to your workspace

## GitHub Setup

1. Create a GitHub Actions workflow file at `.github/workflows/lock-develop.yml` in your repository
2. Ensure the workflow has the necessary permissions to lock branches
3. Create a GitHub personal access token with `repo` scope

## Usage

1. When the app starts, it will post a message with a "Start Release" button in the configured Slack channel
2. Click the "Start Release" button to:
   - Trigger the GitHub Actions workflow to lock the develop branch
   - See real-time status updates in the channel
   - Get the workflow run URL for tracking

## Error Handling

- All errors are logged to the console
- Error messages are posted to the configured Slack channel
- The app includes retry-safe error handling for API calls
- The button interface provides visual feedback during the process 