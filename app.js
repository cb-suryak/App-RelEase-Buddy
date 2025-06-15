const { App } = require('@slack/bolt');
const axios = require('axios');
require('dotenv').config();

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// GitHub API configuration
const githubConfig = {
  owner: process.env.GITHUB_REPO_OWNER,
  repo: process.env.GITHUB_REPO_NAME,
  headers: {
    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json'
  }
};

// Helper function to post messages to Slack
async function postSlackMessage(text, blocks = null) {
  try {
    await app.client.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: text,
      blocks: blocks
    });
  } catch (error) {
    console.error('Error posting to Slack:', error);
  }
}

// Helper function to trigger GitHub workflow with inputs
async function triggerGitHubWorkflow({
  workflowFile = 'change-branch-lock-status.yml',
  workflowBranch = 'master',
  lockOption = 'lock',
  branchToLock = 'develop/subscriptions',
}) {
  try {
    const response = await axios.post(
      `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/actions/workflows/${workflowFile}/dispatches`,
      {
        ref: workflowBranch,
        inputs: {
          LockStatus: lockOption,
          Branch: branchToLock
        }
      },
      {
        headers: githubConfig.headers
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error triggering GitHub workflow:', error.response?.data || error.message);
    throw error;
  }
}

// Helper function to get workflow run URL
async function getWorkflowRunURL(workflowFile = 'change-branch-lock-status.yml') {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/actions/runs`,
      {
        headers: githubConfig.headers,
        params: {
          per_page: 1
        }
      }
    );
    if (response.data.workflow_runs.length > 0) {
      // Optionally filter by workflow file name
      const run = response.data.workflow_runs.find(run => run.name === workflowFile || run.path?.endsWith(workflowFile));
      return (run ? run.html_url : response.data.workflow_runs[0].html_url);
    }
    return null;
  } catch (error) {
    console.error('Error getting workflow run URL:', error.response?.data || error.message);
    return null;
  }
}

// Create the initial message with the release button
async function createReleaseMessage() {
  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "🚀 *Release Management*\nClick the button below to start the release process and lock the develop/subscriptions branch."
      }
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Start Release",
            emoji: true
          },
          style: "primary",
          action_id: "start_release"
        }
      ]
    }
  ];

  await postSlackMessage("Release Management", blocks);
}

// Handle the button click
app.action('start_release', async ({ ack, body, client }) => {
  try {
    // Acknowledge the button click
    await ack();

    // Update the message to show the button is disabled (remove 'disabled' property)
    await client.chat.update({
      channel: body.channel.id,
      ts: body.message.ts,
      text: 'Release Management - Processing',
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🚀 *Release Management*\nRelease process in progress..."
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Processing...",
                emoji: true
              },
              style: "primary",
              action_id: "processing_release"
            }
          ]
        }
      ]
    });

    // Post initial message
    await postSlackMessage('🚀 Starting release process...');

    // Trigger GitHub workflow with parameters
    await postSlackMessage('🔒 Triggering workflow to lock develop/subscriptions branch...');
    await triggerGitHubWorkflow({
      workflowFile: 'change-branch-lock-status.yml',
      workflowBranch: 'master',
      lockOption: 'lock',
      branchToLock: 'develop/subscriptions',
    });

    // Get and post workflow run URL
    const runURL = await getWorkflowRunURL('change-branch-lock-status.yml');
    if (runURL) {
      await postSlackMessage(`✅ Workflow triggered successfully!\n🔗 Workflow run URL: ${runURL}`);
    } else {
      await postSlackMessage('✅ Workflow triggered successfully!');
    }

    // Update the original message to show completion
    await client.chat.update({
      channel: body.channel.id,
      ts: body.message.ts,
      text: 'Release Management - Success',
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🚀 *Release Management*\nRelease process completed successfully!"
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Start Release",
                emoji: true
              },
              style: "primary",
              action_id: "start_release"
            }
          ]
        }
      ]
    });

  } catch (error) {
    console.error('Error in release process:', error);
    await postSlackMessage(`❌ Error during release process: ${error.message}`);
    
    // Update the original message to show error
    await client.chat.update({
      channel: body.channel.id,
      ts: body.message.ts,
      text: 'Release Management - Error',
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🚀 *Release Management*\n❌ Release process failed. Please try again."
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Start Release",
                emoji: true
              },
              style: "primary",
              action_id: "start_release"
            }
          ]
        }
      ]
    });
  }
});

// Error handling
app.error(async (error) => {
  console.error('App error:', error);
  await postSlackMessage(`❌ An error occurred: ${error.message}`);
});

// Start the app
(async () => {
  await app.start();
  console.log('⚡️ Bolt app is running!');
  
  // Create the initial message with the release button
  await createReleaseMessage();
})(); 