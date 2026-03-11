import { WebClient } from "@slack/web-api";
import { env } from "../config/env.js";

export class SlackService {
  private client: WebClient;

  constructor() {
    this.client = new WebClient(env.SLACK_BOT_TOKEN);
  }

  /**
   * List all public and private channels the bot has access to.
   */
  async listChannels() {
    try {
      const result = await this.client.conversations.list({
        types: "public_channel,private_channel",
        exclude_archived: true,
      });

      return (result.channels || []).map((channel) => ({
        id: channel.id,
        name: channel.name,
        is_private: channel.is_private,
      }));
    } catch (error) {
      console.error("[SlackService] Error listing channels:", error);
      throw new Error("Failed to list Slack channels.");
    }
  }

  /**
   * Get message history for a specific channel.
   */
  async getChannelHistory(channelId: string, limit: number = 20) {
    try {
      const result = await this.client.conversations.history({
        channel: channelId,
        limit: limit,
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

      return enrichedMessages.reverse(); // Return in chronological order
    } catch (error) {
      console.error(`[SlackService] Error fetching history for channel ${channelId}:`, error);
      throw new Error("Failed to fetch Slack message history.");
    }
  }
}

export const slackService = new SlackService();
