import dotenv from "dotenv";

dotenv.config();

function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name];
  if (!value) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  TELEGRAM_BOT_TOKEN: getEnvVar("TELEGRAM_BOT_TOKEN"),
  TELEGRAM_ALLOWED_USER_IDS: getEnvVar("TELEGRAM_ALLOWED_USER_IDS")
    .split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id)),
  GROQ_API_KEY: getEnvVar("GROQ_API_KEY"),
  OPENROUTER_API_KEY: getEnvVar("OPENROUTER_API_KEY", ""),
  OPENROUTER_MODEL: getEnvVar("OPENROUTER_MODEL", "openrouter/auto"),
  GOOGLE_APPLICATION_CREDENTIALS: getEnvVar("GOOGLE_APPLICATION_CREDENTIALS", "./service-account.json"),
  ELEVENLABS_API_KEY: getEnvVar("ELEVENLABS_API_KEY", ""),
  ELEVENLABS_VOICE_ID: getEnvVar("ELEVENLABS_VOICE_ID", "9bwMQmoS2uNoM99shO4f"), // Default: Aria (Multilingual & Latin Spanish focus)
  TAVILY_API_KEY: getEnvVar("TAVILY_API_KEY", ""),
};
