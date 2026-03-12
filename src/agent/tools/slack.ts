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
        channel_name: {
          type: "string",
          description: "The human-readable name of the channel (e.g., 'general' or '#general').",
        },
        limit: {
          type: "number",
          description: "The number of messages to retrieve (default is 20).",
        },
      },
      oneOf: [
        { required: ["channel_id"] },
        { required: ["channel_name"] },
      ],
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

export const slackReadMessagesFn = async (args: { channel_id?: string; channel_name?: string; limit?: number }) => {
  try {
    const identifier = args.channel_id || args.channel_name;
    if (!identifier) {
      return "Debes indicar un channel_id o channel_name para leer mensajes.";
    }

    const history = await slackService.getChannelHistory(identifier, args.limit);
    if (history.messages.length === 0) {
      return "No messages found in this channel.";
    }
    const formattedMessages = history.messages.map((m) => `[${m.user}]: ${m.text}`).join("\n");
    const channelLabel = history.channelName ? `${history.channelName} (${history.channelId})` : history.channelId;
    return `Recent messages in channel ${channelLabel}:\n${formattedMessages}`;
  } catch (error: any) {
    return `Error reading Slack messages: ${error.message}`;
  }
};
