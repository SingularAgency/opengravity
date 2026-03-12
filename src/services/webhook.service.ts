import express from "express";
import { env } from "../config/env.js";
import { processMeeting, ReadAIMeeting } from "./meeting-processor.js";

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
    const meetingData = req.body as ReadAIMeeting | undefined;
    if (!meetingData) {
      console.warn("[Webhook] Payload missing body");
      return res.status(202).send("Webhook reachable but no data received.");
    }

    const normalizedId =
      meetingData.id ||
      meetingData.session_id ||
      meetingData.platform_meeting_id ||
      meetingData.report_url;

    if (!normalizedId) {
      console.warn("[Webhook] Payload missing id/session_id/platform_meeting_id");
      return res.status(202).send("Webhook reachable but payload missing identifiers.");
    }

    meetingData.id = normalizedId;

    processMeeting(meetingData).catch((err) => {
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
