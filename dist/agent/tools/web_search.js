import { env } from "../../config/env.js";
/**
 * Perform a web search using Tavily API.
 * Tavily is optimized for LLMs and provides clean, relevant content.
 */
export async function searchWebFn(args) {
    const query = args.query;
    const apiKey = env.TAVILY_API_KEY;
    if (!apiKey) {
        throw new Error("TAVILY_API_KEY is not configured in .env");
    }
    const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            api_key: apiKey,
            query: query,
            search_depth: "basic", // Valid values: 'basic' or 'advanced'
            max_results: 5,
        }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily API Error: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
        return "No se encontraron resultados relevantes en la web.";
    }
    return data.results
        .map((res) => `Título: ${res.title}\nURL: ${res.url}\nContenido: ${res.content}`)
        .join("\n\n---\n\n");
}
export const searchWebDef = {
    type: "function",
    function: {
        name: "search_web",
        description: "Busca información actualizada en tiempo real en internet sobre cualquier tema.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "La consulta de búsqueda detallada.",
                },
            },
            required: ["query"],
        },
    },
};
