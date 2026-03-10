import dotenv from "dotenv";
dotenv.config();
console.log("Injected vars count:", Object.keys(process.env).filter(k => k.includes("TELEGRAM") || k.includes("GROQ") || k.includes("OPENROUTER") || k.includes("GOOGLE") || k.includes("ELEVEN")).length);
console.log("GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
console.log("ELEVENLABS_API_KEY length:", process.env.ELEVENLABS_API_KEY?.length || "undefined");
