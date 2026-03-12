# Integration of Read AI (Webhooks) with OpenGravity

This plan outlines how to integrate Read AI meeting transcriptions via Webhooks to allow for automated categorization, task updates, and RAG-based querying.

## Proposed Changes

### [Backend Service]

#### [NEW] `src/services/webhook.service.ts`
- Implement an Express server to listen for POST requests from Read AI.
- Validate the payload (transcript, summary, action items).

### [Memory Layer]

#### [MODIFY] `src/memory/db.ts`
- Add functions to manage `meetings` collection in Firestore.
- Store structured meeting data:
  ```typescript
  interface Meeting {
    externalId: string;
    title: string;
    date: Date;
    summary: string;
    transcript: string;
    category: string;
    actionItems: string[];
  }
  ```

### [Agent Logic]

#### [NEW] `src/services/meeting-processor.ts`
- Logic to process incoming webhook data:
  - Call LLM (Groq) to categorize the meeting based on the transcript/summary.
  - Formally extract tasks and append to a `pending_tasks` collection.
  - Save the full meeting record to Firestore.

#### [NEW] `src/tools/read_ai_query.ts`
- `query_meeting_context`: A tool for the agent to search within the stored meeting data.

## Verification Plan

### Automated Tests
- Use `curl` or Postman to send mock Read AI webhook payloads to the local server.
- Verify Firestore records and LLM categorization.

### Manual Verification
1. Deploy updated code to Hostinger VPS.
2. Configure Webhook URL in Read AI portal.
3. Complete a test meeting.
4. Verify Telegram notifications and query capabilities.

## Verification Plan

### Automated Tests
- Mock Read AI API responses and verify the ingestion logic.
- Test LLM categorization prompts with sample transcripts.

### Manual Verification
1. Run `npm run dev`.
2. Trigger meeting sync via Telegram: `/sync_meetings`.
3. Ask the agent: "What was discussed in the last Engineering sync?" or "Who has pending tasks from the last meeting?".
