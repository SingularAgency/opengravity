import { WebClient } from "@slack/web-api";
import { env } from "../config/env.js";
import { UserFacingError } from "../utils/user-facing-error.js";

type SlackChannelSummary = {
  id?: string;
  name?: string;
  is_private?: boolean;
};

function buildSlackError(
  action: string,
  err: any,
  extras?: string
): UserFacingError {
  const slackErrorCode = err?.data?.error || err?.code;
  let message = `${action} falló`;
  if (slackErrorCode) {
    message += ` (Slack: ${slackErrorCode})`;
  }
  const suggestions: string[] = [];
  switch (slackErrorCode) {
    case "not_authed":
    case "invalid_auth":
      suggestions.push("Revisa SLACK_BOT_TOKEN y reinstala la app en tu workspace.");
      break;
    case "not_in_channel":
      suggestions.push("Invita al bot al canal con /invite @TuBot.");
      break;
    case "channel_not_found":
      suggestions.push("Verifica el nombre o ID del canal y que el bot tenga acceso.");
      break;
  }
  if (extras) suggestions.push(extras);
  if (suggestions.length > 0) {
    message += `. Sugerencias: ${suggestions.join(" ")}`;
  }
  return new UserFacingError(message, {
    details: slackErrorCode || err?.message,
  });
}

export class SlackService {
  private client: WebClient;

  constructor() {
    this.client = new WebClient(env.SLACK_BOT_TOKEN);
  }

  private async fetchAllChannels(): Promise<SlackChannelSummary[]> {
    const channels: SlackChannelSummary[] = [];
    let cursor: string | undefined;

    do {
      const result = await this.client.conversations.list({
        types: "public_channel,private_channel",
        exclude_archived: true,
        limit: 1000,
        cursor,
      });
      channels.push(...(result.channels || []));
      cursor = result.response_metadata?.next_cursor || undefined;
    } while (cursor);

    return channels;
  }

  /**
   * List all public and private channels the bot has access to.
   */
  async listChannels() {
    try {
      const channels = await this.fetchAllChannels();
      return channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        is_private: channel.is_private,
      }));
    } catch (error) {
      console.error("[SlackService] Error listing channels:", error);
      throw buildSlackError(
        "No pude listar los canales",
        error,
        "Asegúrate de que el bot esté instalado y tenga permisos channels:read."
      );
    }
  }

  private async resolveChannel(identifier: string): Promise<SlackChannelSummary | null> {
    if (!identifier) return null;

    const trimmed = identifier.trim();
    const looksLikeId = /^C[A-Z0-9]+$/i.test(trimmed);
    if (looksLikeId) {
      // Optionally verify the ID exists by calling conversations.info
      try {
        const info = await this.client.conversations.info({ channel: trimmed });
        return info.channel || { id: trimmed };
      } catch (error) {
        console.warn(`[SlackService] conversations.info failed for ${trimmed}:`, error);
        return null;
      }
    }

    const normalizedName = trimmed.replace(/^#/, "").toLowerCase();
    const channels = await this.fetchAllChannels();
    const match = channels.find((channel) => channel.name?.toLowerCase() === normalizedName);
    return match || null;
  }

  /**
   * Get message history for a specific channel (ID or name).
   */
  async getChannelHistory(channelIdentifier: string, limit: number = 20) {
    try {
      const channel = await this.resolveChannel(channelIdentifier);
      if (!channel?.id) {
        throw new Error("Channel not found or the bot is not a member.");
      }

      const result = await this.client.conversations.history({
        channel: channel.id,
        limit,
      });

      const messages = result.messages || [];

      // Resolve user IDs to names for better context
      const enrichedMessages = await Promise.all(
        messages.map(async (msg) => {
          let userName = "Unknown User";
          if (msg.user) {
            try {
              const userInfo = await this.client.users.info({ user: msg.user });
              userName = userInfo.user?.real_name || userInfo.user?.name || "Unknown User";
            } catch (err) {
              console.warn(`[SlackService] Could not fetch info for user ${msg.user}`);
            }
          }
          return {
            user: userName,
            text: msg.text,
            ts: msg.ts,
          };
        })
      );

      return {
        channelId: channel.id,
        channelName: channel.name,
        messages: enrichedMessages.reverse(),
      };
    } catch (error) {
      console.error(`[SlackService] Error fetching history for channel ${channelIdentifier}:`, error);
      throw buildSlackError(
        `No pude leer el historial de ${channelIdentifier}`,
        error,
        "Confirma que el bot fue invitado y que proporcionaste el nombre o ID correctos."
      );
    }
  }
}

export const slackService = new SlackService();
