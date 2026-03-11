import express from "express";
import { env } from "../config/env.js";
import { processMeeting } from "./meeting-processor.js";

const app = express();
app.use(express.json());

// Root test endpoint
app.get("/", (req, res) => {
  res.send("OpenGravity Webhook Server is ONLINE");
});

// GET handler for testing the webhook URL in browser
app.get("/webhooks/read-ai", (req, res) => {
  res.send("OpenGravity Webhook Endpoint is READY (Use POST for Read AI)");
});

// Main webhook endpoint
app.post("/webhooks/read-ai", async (req, res) => {
  console.log("[Webhook] Received POST request from Read AI");
  console.log("[Webhook] Payload:", JSON.stringify(req.body, null, 2));
  
  try {
    const meetingData = req.body;
    
    // Read AI webhook structure usually contains the report in the body
    if (!meetingData || !meetingData.id) {
      console.warn("[Webhook] Potential test request or invalid payload (No ID)");
      return res.status(200).send("Webhook endpoint reachable (Test/Handshake OK)");
    }

    // Process meeting in the background (or await if you want to respond later, 
    // but webhooks usually require fast response)
    processMeeting(meetingData).catch(err => {
      console.error("[Webhook] Error in background processing:", err);
    });

    res.status(200).send("Webhook received and processing started");
  } catch (error) {
    console.error("[Webhook] Error handling request:", error);
    res.status(500).send("Internal Server Error");
  }
});

export function startWebhookServer() {
  const port = env.PORT;
  app.listen(port, () => {
    console.log(`[Webhook] Server listening on port ${port}`);
    console.log(`[Webhook] URL: /webhooks/read-ai`);
  });
}
