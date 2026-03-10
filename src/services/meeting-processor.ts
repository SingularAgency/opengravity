import { env } from "../config/env.js";
import { generateResponse } from "../agent/llm.js";
import admin from "firebase-admin";
import { bot } from "../bot/telegram.js";

const db = admin.firestore();

export interface ReadAIMeeting {
  id: string;
  title: string;
  start_time: string;
  summary: string;
  transcript: string;
  action_items?: string[];
  chapters?: any[];
  topics?: string[];
}

export async function processMeeting(meetingData: ReadAIMeeting) {
  console.log(`[MeetingProcessor] Processing meeting: ${meetingData.title} (${meetingData.id})`);

  try {
    // 1. Categorization
    const categoryPrompt = [
      {
        role: "system",
        content: "You are an expert organizer. Categorize the meeting into one of these buckets: [Project Alpha, Project Beta, Engineering, HR, Personal, Sales, General]. Return ONLY the bucket name."
      },
      {
        role: "user",
        content: `Meeting Title: ${meetingData.title}\nSummary: ${meetingData.summary}`
      }
    ];

    const categoryResponse = await generateResponse(categoryPrompt);
    const category = categoryResponse.choices[0].message.content.trim();

    // 2. Extract Tasks (Action Items)
    // Read AI usually provides action_items, but we'll use LLM to refine them if needed or just use them.
    const actionItems = meetingData.action_items || [];

    // 3. Save to Firestore
    const meetingRef = db.collection("meetings").doc(meetingData.id);
    await meetingRef.set({
      externalId: meetingData.id,
      title: meetingData.title,
      date: admin.firestore.Timestamp.fromDate(new Date(meetingData.start_time)),
      summary: meetingData.summary,
      transcript: meetingData.transcript,
      category: category,
      actionItems: actionItems,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 4. Update Pending Tasks
    if (actionItems.length > 0) {
      const batch = db.batch();
      actionItems.forEach((task, index) => {
        const taskRef = db.collection("pending_tasks").doc(`${meetingData.id}_${index}`);
        batch.set(taskRef, {
          description: task,
          source_meeting_id: meetingData.id,
          source_meeting_title: meetingData.title,
          category: category,
          status: "pending",
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    // 5. Notify the user via Telegram
    const userId = env.TELEGRAM_ALLOWED_USER_IDS[0];
    if (userId) {
      const message = `📊 *Nueva Reunión Procesada*\n\n` +
                      `📌 *Título:* ${meetingData.title}\n` +
                      `📁 *Categoría:* ${category}\n` +
                      `✅ *Tareas extraídas:* ${actionItems.length}\n\n` +
                      `Puedes preguntarme sobre los detalles de esta reunión en cualquier momento.`;
      
      await bot.api.sendMessage(userId, message, { parse_mode: "Markdown" });
    }

    return { success: true, category };
  } catch (error) {
    console.error(`[MeetingProcessor] Error processing meeting ${meetingData.id}:`, error);
    throw error;
  }
}
