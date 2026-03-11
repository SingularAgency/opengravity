import { getMessages, addMessage } from "../memory/db.js";
import { generateResponse } from "./llm.js";
import { toolsExecutor } from "./tools/index.js";

const SYSTEM_PROMPT = `You are OpenGravity, a personal AI assistant.
You have access to tools, including Google Workspace (Gmail, Calendar) and Skill Discovery.
If the user asks for new capabilities or specialized tools, use the Skill Discovery tools (search_skills, get_skill, install_skill) to find and "learn" them.
Keep your answers brief, clear, and nicely formatted for Telegram.`;

// Limit conversation history to avoid exceeding Groq TPM limits
const MAX_HISTORY = 10;
// Max characters per tool result in history (prevents huge email/calendar dumps)
const MAX_TOOL_RESULT_CHARS = 800;

/**
 * Truncates tool result content in history to keep token usage under control.
 * Full results are still stored in DB; only the LLM context is trimmed.
 */
function truncateHistory(messages: any[]): any[] {
  return messages.map((msg) => {
    if (msg.role === "tool" && typeof msg.content === "string" && msg.content.length > MAX_TOOL_RESULT_CHARS) {
      return {
        ...msg,
        content: msg.content.slice(0, MAX_TOOL_RESULT_CHARS) + `\n...[truncado, ${msg.content.length - MAX_TOOL_RESULT_CHARS} caracteres omitidos]`,
      };
    }
    return msg;
  });
}


export async function runAgentLoop(
  conversationId: string,
  userMessage: string
): Promise<string> {
  const maxIterations = 5;

  // 1. Add user message to DB
  await addMessage(conversationId, "user", { role: "user", content: userMessage });

  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    // 2. Load context (limit history to avoid TPM limits)
    const dbMessages = await getMessages(conversationId);
    const recentMessages = dbMessages.slice(-MAX_HISTORY);
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...truncateHistory(recentMessages),
    ];

    // 3. Call LLM
    const response = await generateResponse(messages);
    const responseMessage =
      response.choices?.[0]?.message || response.message; // Handle groq SDK or general openrouter format

    if (!responseMessage) {
      throw new Error("No message returned from LLM");
    }

    // 4. Check for tool calls
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      // Save the assistant's tool calls to DB
      await addMessage(conversationId, "assistant", responseMessage);

      // Execute each tool
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments || "{}");

        console.log(`[Agent] Calling tool: ${functionName}`, functionArgs);

        let resultText = "";
        try {
          if (toolsExecutor[functionName]) {
            resultText = await toolsExecutor[functionName](functionArgs);
          } else {
            resultText = `Error: Tool ${functionName} not found.`;
          }
        } catch (err: any) {
          resultText = `Error calling tool ${functionName}: ${err.message}`;
        }

        console.log(`[Agent] Tool result: ${resultText}`);

        // Save tool result to DB
        await addMessage(conversationId, "tool", {
          role: "tool",
          name: functionName,
          tool_call_id: toolCall.id,
          content: resultText,
        });
      }
      // Continue the loop to let the LLM see the tool results
    } else {
      // 5. Final text response
      await addMessage(conversationId, "assistant", responseMessage);
      return responseMessage.content || "I have nothing to say.";
    }
  }

  return "I reached my iteration limit while trying to fulfill your request.";
}

export async function runAgentLoopSafe(
  conversationId: string,
  userMessage: string
): Promise<string> {
  try {
    return await runAgentLoop(conversationId, userMessage);
  } catch (error: any) {
    if (error?.status === 413 || error?.message?.includes('rate_limit_exceeded') || error?.message?.includes('Request too large')) {
      return "⚠️ El mensaje es demasiado largo para procesar en este momento. Por favor, intenta con una pregunta más corta o espera un momento e intenta de nuevo.";
    }
    throw error;
  }
}
