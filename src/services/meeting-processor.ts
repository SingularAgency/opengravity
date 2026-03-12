import { randomUUID } from "crypto";
import admin from "firebase-admin";
import { env } from "../config/env.js";
import { generateResponse } from "../agent/llm.js";
import { bot } from "../bot/telegram.js";

const db = admin.firestore();

export interface ReadAIMeeting {
  id?: string;
  session_id?: string;
  platform_meeting_id?: string | null;
  title?: string;
  start_time?: string;
  end_time?: string;
  summary?: string;
  transcript?: ReadAITranscript | string;
  action_items?: Array<string | ReadAIActionItem>;
  topics?: Array<string | { text?: string }>;
  chapter_summaries?: unknown[];
  key_questions?: Array<{ text?: string }>;
  report_url?: string;
  trigger?: string;
  participants?: Array<{ name?: string; email?: string | null }>;
  [key: string]: unknown;
}

interface ReadAIActionItem {
  text?: string;
}

interface ReadAISpeakerBlock {
  start_time?: number | string;
  end_time?: number | string;
  speaker?: { name?: string };
  words?: string;
}

interface ReadAITranscript {
  speaker_blocks?: ReadAISpeakerBlock[];
  speakers?: Array<{ name?: string }>;
}

export async function processMeeting(meetingData: ReadAIMeeting) {
  const meetingId = resolveMeetingId(meetingData);
  const meetingTitle = meetingData.title?.trim() || "Reunión sin título";
  const meetingSummary = meetingData.summary?.trim() || "Sin resumen disponible.";

  console.log(`[MeetingProcessor] Processing meeting: ${meetingTitle} (${meetingId})`);

  try {
    const categoryPrompt = [
      {
        role: "system",
        content:
          "You are an expert organizer. Categorize the meeting into one of these buckets: [Project Alpha, Project Beta, Engineering, HR, Personal, Sales, General]. Return ONLY the bucket name.",
      },
      {
        role: "user",
        content: `Meeting Title: ${meetingTitle}\nSummary: ${meetingSummary}`,
      },
    ];

    const categoryResponse = await generateResponse(categoryPrompt);
    const category = categoryResponse.choices[0].message.content.trim();

    const actionItems = normalizeActionItems(meetingData.action_items);
    const meetingRef = db.collection("meetings").doc(meetingId);
    const meetingDate = buildMeetingDate(meetingData.start_time);
    const { text: transcriptText, blocks: transcriptBlocks } = buildTranscript(
      meetingData.transcript,
      meetingSummary
    );
    const topics = normalizeTopics(meetingData.topics);

    await meetingRef.set({
      externalId: meetingId,
      sessionId: meetingData.session_id ?? null,
      platformMeetingId: meetingData.platform_meeting_id ?? null,
      reportUrl: meetingData.report_url ?? null,
      title: meetingTitle,
      date: admin.firestore.Timestamp.fromDate(meetingDate),
      summary: meetingSummary,
      transcript: transcriptText,
      transcriptBlocks,
      category,
      actionItems,
      topics,
      rawPayload: meetingData,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (actionItems.length > 0) {
      const batch = db.batch();
      actionItems.forEach((task, index) => {
        const taskRef = db.collection("pending_tasks").doc(`${meetingId}_${index}`);
        batch.set(taskRef, {
          description: task,
          source_meeting_id: meetingId,
          source_meeting_title: meetingTitle,
          category,
          status: "pending",
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    const userId = env.TELEGRAM_ALLOWED_USER_IDS[0];
    if (userId) {
      const message =
        `Nueva reunión procesada\n\n` +
        `Título: ${meetingTitle}\n` +
        `Categoría: ${category}\n` +
        `Tareas extraídas: ${actionItems.length}\n\n` +
        `Puedes preguntarme sobre los detalles cuando quieras.`;

      await bot.api.sendMessage(userId, message, { parse_mode: "Markdown" });
    }

    return { success: true, category };
  } catch (error) {
    console.error(`[MeetingProcessor] Error processing meeting ${meetingId}:`, error);
    throw error;
  }
}

function resolveMeetingId(meeting: ReadAIMeeting): string {
  return (
    meeting.id ||
    meeting.session_id ||
    meeting.platform_meeting_id ||
    meeting.report_url ||
    randomUUID()
  );
}

function normalizeActionItems(items?: Array<string | ReadAIActionItem>): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item) return "";
      if (typeof item === "string") return item;
      return item.text || "";
    })
    .map((text) => text.trim())
    .filter((text) => text.length > 0);
}

function normalizeTopics(topics?: Array<string | { text?: string }>): string[] {
  if (!Array.isArray(topics)) return [];
  return topics
    .map((topic) => (typeof topic === "string" ? topic : topic?.text || ""))
    .map((text) => text.trim())
    .filter((text) => text.length > 0);
}

function buildTranscript(transcript: ReadAITranscript | string | undefined, fallbackSummary: string) {
  if (!transcript) {
    return { text: fallbackSummary, blocks: [] as ReadAISpeakerBlock[] };
  }

  if (typeof transcript === "string") {
    return { text: transcript, blocks: [] as ReadAISpeakerBlock[] };
  }

  const blocks = Array.isArray(transcript.speaker_blocks) ? transcript.speaker_blocks : [];
  const text = blocks
    .map((block) => {
      const speaker = block.speaker?.name || "Desconocido";
      const words = block.words?.trim() || "";
      if (!words) return "";
      return `[${speaker}] ${words}`;
    })
    .filter((line) => line.length > 0)
    .join("\n");

  return { text: text || fallbackSummary, blocks };
}

function buildMeetingDate(start?: string) {
  if (!start) return new Date();
  const parsed = new Date(start);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}
