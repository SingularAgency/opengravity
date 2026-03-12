import { slackService } from "../../services/slack.js";
import { UserFacingError } from "../../utils/user-facing-error.js";

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
  const channels = await slackService.listChannels();
  if (channels.length === 0) {
    throw new UserFacingError("No encontré canales de Slack disponibles.", {
      hint: "Invita al bot a algún canal o revisa sus permisos.",
    });
  }
  const channelList = channels
    .map((c) => `- ${c.name} (ID: ${c.id})${c.is_private ? " [PRIVATE]" : ""}`)
    .join("\n");
  return `Available Slack Channels:\n${channelList}`;
};

export const slackReadMessagesFn = async (args: { channel_id?: string; channel_name?: string; limit?: number }) => {
  const identifier = args.channel_id || args.channel_name;
  if (!identifier) {
    throw new UserFacingError("Debes indicar un channel_id o channel_name para leer mensajes.");
  }

  const history = await slackService.getChannelHistory(identifier, args.limit);
  if (history.messages.length === 0) {
    return "No se encontraron mensajes recientes en ese canal.";
  }
  const formattedMessages = history.messages.map((m) => `[${m.user}]: ${m.text}`).join("\n");
  const channelLabel = history.channelName ? `${history.channelName} (${history.channelId})` : history.channelId;
  return `Recent messages in channel ${channelLabel}:\n${formattedMessages}`;
};
