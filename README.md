# Release Management Slack App

## 🚀 RelEase Buddy

A Slack app built using Bolt for JavaScript to automate the core app release process directly from Slack.

- 🤖 Eliminates manual Slack updates by automating release workflow steps
- 📈 Improves traceability and consistency across the release cycle
- 🔗 Seamlessly integrates with GitHub workflows and test suites


## Features

- Interactive button interface to start the release process
- Automatic locking of the develop branch via GitHub Actions
- Real-time status updates in a designated Slack channel
- Error handling and logging
- Workflow run URL tracking

## Prerequisites

- Node.js 14.x or later
- Access to "Chargebee" slack workspace
- Github user of Chargebee Organization

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
   - `SLACK_BOT_TOKEN`: Your Slack bot token. Reach out to [Surya](https://chargebee.slack.com/team/U02HAFY26TU) to get this.
   - `SLACK_SIGNING_SECRET`: Your Slack app signing secret. Reach out to [Surya](https://chargebee.slack.com/team/U02HAFY26TU) to get this.
   - `SLACK_APP_TOKEN`: Your Slack app token. Reach out to [Surya](https://chargebee.slack.com/team/U02HAFY26TU) to get this.
   - `GITHUB_TOKEN`: Your GitHub personal access token. Get yours from [here](https://github.com/settings/tokens)
   - `GITHUB_REPO_OWNER`: Your GitHub organization or username
   - `GITHUB_REPO_NAME`: Your repository name
   - `SLACK_CHANNEL_ID`: The ID of the Slack channel for notifications(Restricted only to #core-production-releases)

5. Start the app:
   ```bash
   npm start
   ```

## Usage

1. When the app starts, in #core-production_releases channel, Mention the app by tagging @RelEase Buddy. 
2. Click the button for the desired outcome. 
   Ex:
   - Click "Lock Develop Branch" to lock the `develop/subscriptions` branch
   - This will trigger GitHub Actions workflow to lock the develop branch
   - See real-time status updates in the channel
   - Get the workflow run URL for tracking

## Error Handling

- All errors are logged to the console
- Error messages are posted to the configured Slack channel
- The app includes retry-safe error handling for API calls
- The button interface provides visual feedback during the process 

## 🤝 Contribute

RelEase Buddy is built to eliminate the manual overhead faced by release engineers and managers during the Chargebee app release cycle. Our goal is to streamline and automate every possible step in the process.

We’re looking for contributors to help bring this vision to life.

### How to Contribute

- Browse the list of open enhancements or pain points.
- Pick an item you'd like to implement.
- Define a function and hook it into the `app.js` logic.
- Test your implementation and raise a pull request.

### Examples of Contributions

- Trigger pre prod git workflow
- Rerun prism for failed test cases

Your help is welcome and appreciated!