import { google } from "googleapis";
import { authenticate } from "@google-cloud/local-auth";
import fs from "fs/promises";
import path from "path";
import process from "process";
const SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
];
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH, "utf8");
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    }
    catch (err) {
        return null;
    }
}
async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH, "utf8");
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: "authorized_user",
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}
export async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}
// Gmail Tools
export const gmailListMessagesDef = {
    type: "function",
    function: {
        name: "gmail_list_messages",
        description: "List recent messages from Gmail inbox.",
        parameters: {
            type: "object",
            properties: {
                max_results: { type: "number", default: 5 },
                query: { type: "string", description: "Query string to filter messages (e.g. 'from:example.com')" },
            },
        },
    },
};
export async function gmailListMessagesFn(args) {
    const auth = await authorize();
    const gmail = google.gmail({ version: "v1", auth: auth });
    const res = await gmail.users.messages.list({
        userId: "me",
        maxResults: args.max_results || 5,
        q: args.query,
    });
    const messages = res.data.messages || [];
    if (messages.length === 0)
        return "No messages found.";
    let result = "Recent Emails:\n";
    for (const msg of messages) {
        const detail = await gmail.users.messages.get({ userId: "me", id: msg.id });
        const subject = detail.data.payload?.headers?.find((h) => h.name === "Subject")?.value || "(No Subject)";
        const from = detail.data.payload?.headers?.find((h) => h.name === "From")?.value || "(Unknown)";
        result += `- From: ${from}\n  Subject: ${subject}\n  ID: ${msg.id}\n`;
    }
    return result;
}
// Calendar Tools
export const calendarListEventsDef = {
    type: "function",
    function: {
        name: "calendar_list_events",
        description: "List upcoming events from Google Calendar.",
        parameters: {
            type: "object",
            properties: {
                max_results: { type: "number", default: 5 },
            },
        },
    },
};
export async function calendarListEventsFn(args) {
    const auth = await authorize();
    const calendar = google.calendar({ version: "v3", auth: auth });
    const res = await calendar.events.list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        maxResults: args.max_results || 5,
        singleEvents: true,
        orderBy: "startTime",
    });
    const events = res.data.items || [];
    if (events.length === 0)
        return "No upcoming events found.";
    let result = "Upcoming Events:\n";
    for (const event of events) {
        const start = event.start?.dateTime || event.start?.date;
        result += `- ${start}: ${event.summary}\n`;
    }
    return result;
}
