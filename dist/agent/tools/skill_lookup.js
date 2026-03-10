import fs from "fs/promises";
import path from "path";
const MCP_ENDPOINT = "https://prompts.chat/api/mcp";
async function callPromptsApi(method, params) {
    const response = await fetch(MCP_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method,
            params,
        }),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Prompts.chat API Error: ${response.status} ${errorBody}`);
    }
    const text = await response.text();
    const dataLine = text.split("\n").find(line => line.startsWith("data: "));
    if (dataLine) {
        const data = JSON.parse(dataLine.substring(6));
        // Tool responses are in .result.content[0].text
        if (data.result && data.result.content && data.result.content[0]?.text) {
            return JSON.parse(data.result.content[0].text);
        }
        return data.result || data;
    }
    return JSON.parse(text);
}
export const searchSkillsDef = {
    type: "function",
    function: {
        name: "search_skills",
        description: "Search for Agent Skills by keyword in prompts.chat.",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "Search terms" },
            },
            required: ["query"],
        },
    },
};
export async function searchSkillsFn(args) {
    try {
        const data = await callPromptsApi("tools/call", {
            name: "search_skills",
            arguments: {
                query: args.query
            }
        });
        const skills = data.skills || [];
        if (skills.length === 0)
            return "No skills found for that query.";
        return skills.map((p) => `ID: ${p.id}\nSlug: ${p.slug}\nTitle: ${p.title}\nDesc: ${p.description || "N/A"}`).join("\n\n");
    }
    catch (err) {
        return `Error searching skills: ${err.message}`;
    }
}
export const getSkillDef = {
    type: "function",
    function: {
        name: "get_skill",
        description: "Get detailed information and file contents of a specific skill.",
        parameters: {
            type: "object",
            properties: {
                id: { type: "string", description: "The skill ID from search results" },
            },
            required: ["id"],
        },
    },
};
export async function getSkillFn(args) {
    try {
        const data = await callPromptsApi("tools/call", {
            name: "get_skill",
            arguments: {
                id: args.id
            }
        });
        if (data.error)
            return `Skill not found: ${data.error}`;
        const filesInfo = (data.files || []).map((f) => `- ${f.filename}`).join("\n");
        return `Skill: ${data.title}\nDescription: ${data.description}\n\nFiles:\n${filesInfo}\n\nTo install this skill, use install_skill with ID: ${data.id} and a unique slug.`;
    }
    catch (err) {
        return `Error getting skill: ${err.message}`;
    }
}
export const installSkillDef = {
    type: "function",
    function: {
        name: "install_skill",
        description: "Download and install a skill's files into the project.",
        parameters: {
            type: "object",
            properties: {
                id: { type: "string", description: "The skill ID" },
                slug: { type: "string", description: "A unique slug for the directory name" },
            },
            required: ["id", "slug"],
        },
    },
};
export async function installSkillFn(args) {
    try {
        const data = await callPromptsApi("tools/call", {
            name: "get_skill",
            arguments: {
                id: args.id
            }
        });
        if (data.error)
            return `Skill not found: ${data.error}`;
        const skillDir = path.join(process.cwd(), ".opengravity", "skills", args.slug);
        await fs.mkdir(skillDir, { recursive: true });
        const files = data.files || [];
        for (const file of files) {
            const filePath = path.join(skillDir, file.filename);
            // Ensure parent directories for the file exist
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, file.content || "");
        }
        return `Skill "${data.title}" installed successfully!\nFiles saved to: .opengravity/skills/${args.slug}/\n\nNote: You may need to restart the agent if the skill requires new logic integration.`;
    }
    catch (err) {
        return `Error installing skill: ${err.message}`;
    }
}
