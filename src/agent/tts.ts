import { env } from "../config/env.js";
import fs from "fs";
import path from "path";

/**
 * Converts text to speech using ElevenLabs API.
 * Returns the path to the generated audio file.
 */
export async function textToSpeech(text: string, outputDir: string): Promise<string> {
    if (!env.ELEVENLABS_API_KEY) {
        throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const voiceId = env.ELEVENLABS_VOICE_ID;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "xi-api-key": env.ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            text: text,
            model_id: "eleven_multilingual_v2", // Multilingual model for ES/EN support
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.8,
                style: 0.0,
                use_speaker_boost: true,
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs Error: ${response.status} ${errorText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `voice_resp_${Date.now()}.mp3`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFileSync(filePath, buffer);

    return filePath;
}
