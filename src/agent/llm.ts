import Groq from "groq-sdk";
import fs from "fs";
import { Readable } from "stream";
import { env } from "../config/env.js";
import { toolsDefinition } from "./tools/index.js";

const groq = new Groq({ apiKey: env.GROQ_API_KEY });
const groqModel = "llama-3.3-70b-versatile"; // 8b failed at complex tool calls

// Call OpenRouter via standard fetch
async function generateWithOpenRouter(messages: any[], tools?: any[]) {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("OpenRouter fallback triggered but no API key configured");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://opengravity.local", // Optional but recommended
      "X-Title": "OpenGravity", // Optional but recommended
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL,
      messages: messages,
      tools,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter Error: ${response.status} ${text}`);
  }

  return response.json();
}

export async function generateResponse(
  messages: any[],
  options?: { disableTools?: boolean }
) {
  try {
    const completionRequest: any = {
      messages: messages as any[],
      model: groqModel,
    };

    if (!options?.disableTools) {
      completionRequest.tools = toolsDefinition as any[];
    }

    // Try Groq as the primary LLM
    const completion = await groq.chat.completions.create(completionRequest);

    return completion;
  } catch (error: any) {
    console.warn("Groq API error. Falling back to OpenRouter:", error.message);
    try {
      // Fallback
      const tools = options?.disableTools ? undefined : (toolsDefinition as any[]);
      return await generateWithOpenRouter(messages, tools);
    } catch (fallbackError: any) {
      console.error("Fallback error:", fallbackError);
      throw error; // Throw the original error or the combined error
    }
  }
}

export async function transcribeAudio(filePath: string): Promise<string> {
  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "whisper-large-v3",
    response_format: "json",
  });
  return transcription.text;
}
