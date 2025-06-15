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

// Create the initial message with the release and unlock buttons
async function createReleaseMessage() {
  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "🚀 *Release Management*\nClick a button below to lock or unlock the develop/subscriptions branch."
      }
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Lock Branch",
            emoji: true
          },
          style: "primary",
          action_id: "lock_branch"
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Unlock Branch",
            emoji: true
          },
          style: "primary",
          action_id: "unlock_branch"
        }
      ]
    }
  ];

  await postSlackMessage("Release Management", blocks);
}

// Handle the lock button click
app.action('lock_branch', async ({ ack, body, client }) => {
  try {
    await ack();
    await client.chat.update({
      channel: body.channel.id,
      ts: body.message.ts,
      text: 'Release Management - Processing',
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🚀 *Release Management*\nLocking branch in progress..."
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
   // await postSlackMessage('🚀 Starting release process...');
    await postSlackMessage('🔒 Triggering workflow to lock develop/subscriptions branch...');
    await triggerGitHubWorkflow({
      workflowFile: 'change-branch-lock-status.yml',
      workflowBranch: 'master',
      lockOption: 'lock',
      branchToLock: 'develop/subscriptions',
    });
    // Wait 5 seconds before fetching the workflow run URL
    await new Promise(resolve => setTimeout(resolve, 5000));
    const runURL = await getWorkflowRunURL('change-branch-lock-status.yml');
    if (runURL) {
      await postSlackMessage(`✅ Workflow triggered successfully!\n🔗 Workflow run URL: ${runURL}`);
    } else {
      await postSlackMessage('✅ Workflow triggered successfully!');
    }
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
                text: "Start Release ",
                emoji: true
              },
              style: "primary",
              action_id: "start_release"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Unlock Branch",
                emoji: true
              },
              style: "primary",
              action_id: "unlock_branch"
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Error in release process:', error);
    await postSlackMessage(`❌ Error during release process: ${error.message}`);
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
                text: "Lock Branch",
                emoji: true
              },
              style: "primary",
              action_id: "lock_branch"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Unlock Branch",
                emoji: true
              },
              style: "danger",
              action_id: "unlock_branch"
            }
          ]
        }
      ]
    });
  }
});

// Handle the unlock button click
app.action('unlock_branch', async ({ ack, body, client }) => {
  try {
    await ack();
    await client.chat.update({
      channel: body.channel.id,
      ts: body.message.ts,
      text: 'Release Management - Processing',
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🚀 *Release Management*\nUnlocking branch in progress..."
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
              style: "danger",
              action_id: "processing_unlock"
            }
          ]
        }
      ]
    });
    await postSlackMessage('🚀 Starting unlock process...');
    await postSlackMessage('🔓 Triggering workflow to unlock develop/subscriptions branch...');
    await triggerGitHubWorkflow({
      workflowFile: 'change-branch-lock-status.yml',
      workflowBranch: 'master',
      lockOption: 'unlock',
      branchToLock: 'develop/subscriptions',
    });
    // Wait 5 seconds before fetching the workflow run URL
    await new Promise(resolve => setTimeout(resolve, 5000));
    const runURL = await getWorkflowRunURL('change-branch-lock-status.yml');
    if (runURL) {
      await postSlackMessage(`✅ Workflow triggered successfully!\n🔗 Workflow run URL: ${runURL}`);
    } else {
      await postSlackMessage('✅ Workflow triggered successfully!');
    }
    await client.chat.update({
      channel: body.channel.id,
      ts: body.message.ts,
      text: 'Release Management - Success',
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🚀 *Release Management*\nUnlock process completed successfully!"
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Start Release (Lock)",
                emoji: true
              },
              style: "primary",
              action_id: "start_release"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Unlock Branch",
                emoji: true
              },
              style: "danger",
              action_id: "unlock_branch"
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Error in unlock process:', error);
    await postSlackMessage(`❌ Error during unlock process: ${error.message}`);
    await client.chat.update({
      channel: body.channel.id,
      ts: body.message.ts,
      text: 'Release Management - Error',
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🚀 *Release Management*\n❌ Unlock process failed. Please try again."
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Start Release (Lock)",
                emoji: true
              },
              style: "primary",
              action_id: "start_release"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Unlock Branch",
                emoji: true
              },
              style: "danger",
              action_id: "unlock_branch"
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
})();

// Listen for app mentions and show the buttons when tagged
app.event('app_mention', async ({ event, context }) => {
  try {
    await createReleaseMessage();
  } catch (error) {
    console.error('Error posting release message on mention:', error);
    await postSlackMessage('❌ Error showing release options.');
  }
}); 