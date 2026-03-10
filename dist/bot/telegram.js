import { Bot, InputFile } from "grammy";
import { hydrateFiles } from "@grammyjs/files";
import { env } from "../config/env.js";
import { getOrCreateConversation } from "../memory/db.js";
import { runAgentLoop } from "../agent/loop.js";
import { transcribeAudio } from "../agent/llm.js";
import { textToSpeech } from "../agent/tts.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Initialize the Telegram bot
export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
// File downloader plugin
bot.api.config.use(hydrateFiles(bot.token));
// Whitelist middleware for security
bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId)
        return;
    if (env.TELEGRAM_ALLOWED_USER_IDS.includes(userId)) {
        await next();
    }
    else {
        console.warn(`[Security] Rejected message from unauthorized user ID: ${userId}`);
    }
});
/**
 * Shared logic to handle responding to the user
 */
async function handleResponse(ctx, inputText, useVoice = false) {
    const userId = ctx.from.id;
    const conversationId = await getOrCreateConversation(userId);
    const response = await runAgentLoop(conversationId, inputText);
    if (useVoice && env.ELEVENLABS_API_KEY) {
        try {
            await ctx.api.sendChatAction(ctx.chat.id, "record_voice");
            const tempDir = path.join(process.cwd(), "temp_audio");
            const speechPath = await textToSpeech(response, tempDir);
            // Send text and voice (since sometimes voice can be long or users prefer reading too)
            await ctx.reply(response);
            await ctx.replyWithVoice(new InputFile(speechPath));
            // Clean up MP3
            if (fs.existsSync(speechPath))
                fs.unlinkSync(speechPath);
        }
        catch (ttsError) {
            console.error("[TTS Error]", ttsError);
            await ctx.reply(response);
            await ctx.reply("⚠️ No pude generar la respuesta de voz, pero aquí tienes el texto.");
        }
    }
    else {
        // Normal text reply
        if (response.length > 4000) {
            for (let i = 0; i < response.length; i += 4000) {
                await ctx.reply(response.substring(i, i + 4000));
            }
        }
        else {
            await ctx.reply(response);
        }
    }
}
// Main message handler
bot.on("message:text", async (ctx) => {
    await ctx.api.sendChatAction(ctx.chat.id, "typing");
    try {
        await handleResponse(ctx, ctx.message.text, false);
    }
    catch (error) {
        console.error("[Bot Error]", error);
        await ctx.reply(`Ocurrió un error: ${error.message}`);
    }
});
// Voice message handler
bot.on("message:voice", async (ctx) => {
    const userId = ctx.from.id;
    const voice = ctx.message.voice;
    await ctx.api.sendChatAction(ctx.chat.id, "typing");
    const tempDir = path.join(process.cwd(), "temp_audio");
    if (!fs.existsSync(tempDir))
        fs.mkdirSync(tempDir);
    const filePath = path.join(tempDir, `${userId}_${Date.now()}.ogg`);
    try {
        const file = await ctx.api.getFile(voice.file_id);
        await file.download(filePath);
        const transcribedText = await transcribeAudio(filePath);
        console.log(`[Voice] Transcribed: ${transcribedText}`);
        // When user speaks, bot replies with voice too
        await handleResponse(ctx, transcribedText, true);
    }
    catch (error) {
        console.error("[Voice Error]", error);
        await ctx.reply(`Error procesando audio: ${error.message}`);
    }
    finally {
        if (fs.existsSync(filePath))
            fs.unlinkSync(filePath);
    }
});
// Error handler
bot.catch((err) => {
    console.error(`[Grammy Error] Error in bot:`, err);
});
