import { runAgentLoop } from "./src/agent/loop.js";
import { getOrCreateConversation } from "./src/memory/db.js";

async function test() {
    const userId = 5549053495; // From env TELEGRAM_ALLOWED_USER_IDS
    try {
        const cid = await getOrCreateConversation(userId);
        console.log("Conversation ID:", cid);
        const resp = await runAgentLoop(cid, "Hello, tell me the time at Colombia");
        console.log("Response:", resp);
        process.exit(0);
    } catch (err) {
        console.error("TEST FAILED:", err);
        process.exit(1);
    }
}
test();
