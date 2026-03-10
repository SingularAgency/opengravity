import { bot } from "./bot/telegram.js";
import "./memory/db.js"; // This initializes Firebase admin
import { startWebhookServer } from "./services/webhook.service.js";

async function main() {
  console.log("Starting OpenGravity...");

  console.log("Starting Webhook server...");
  startWebhookServer();

  console.log("Starting Telegram Bot long polling...");
  bot.start({
    onStart: (botInfo) => {
      console.log(`Bot started successfully as @${botInfo.username}`);
    },
  });

  // Handle graceful shutdown
  process.once("SIGINT", () => bot.stop());
  process.once("SIGTERM", () => bot.stop());
}

main().catch(console.error);
