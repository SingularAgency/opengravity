import { slackService } from "../../services/slack.js";

// Tool definitions
export const slackListChannelsDef = {
  type: "function" as const,
  function: {
    name: "slack_list_channels",
    description: "Lists all Slack channels (public and private) that the bot has access to.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
};

export const slackReadMessagesDef = {
  type: "function" as const,
  function: {
    name: "slack_read_messages",
    description: "Reads the most recent messages from a specific Slack channel to understand conversation context.",
    parameters: {
      type: "object",
      properties: {
        channel_id: {
          type: "string",
          description: "The ID of the Slack channel (e.g., 'C12345678').",
        },
        limit: {
          type: "number",
          description: "The number of messages to retrieve (default is 20).",
        },
      },
      required: ["channel_id"],
    },
  },
};

// Tool execution functions
export const slackListChannelsFn = async () => {
  try {
    const channels = await slackService.listChannels();
    if (channels.length === 0) {
      return "No Slack channels found or the bot hasn't been added to any.";
    }
    const channelList = channels
      .map((c) => `- ${c.name} (ID: ${c.id})${c.is_private ? " [PRIVATE]" : ""}`)
      .join("\n");
    return `Available Slack Channels:\n${channelList}`;
  } catch (error: any) {
    return `Error listing Slack channels: ${error.message}`;
  }
};

export const slackReadMessagesFn = async (args: { channel_id: string; limit?: number }) => {
  try {
    const messages = await slackService.getChannelHistory(args.channel_id, args.limit);
    if (messages.length === 0) {
      return "No messages found in this channel.";
    }
    const formattedMessages = messages
      .map((m) => `[${m.user}]: ${m.text}`)
      .join("\n");
    return `Recent messages in channel ${args.channel_id}:\n${formattedMessages}`;
  } catch (error: any) {
    return `Error reading Slack messages: ${error.message}`;
  }
};
