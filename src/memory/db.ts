import admin from "firebase-admin";
import fs from "fs";
import { env } from "../config/env.js";

// Initialize Firebase Admin
let credential: admin.credential.Credential | null = null;
const credPath = env.GOOGLE_APPLICATION_CREDENTIALS;

if (env.GOOGLE_CREDENTIALS_JSON) {
  try {
    const serviceAccount = JSON.parse(env.GOOGLE_CREDENTIALS_JSON);
    credential = admin.credential.cert(serviceAccount);
    console.log("[Firebase] Initialized using GOOGLE_CREDENTIALS_JSON env var");
  } catch (err) {
    console.error("[Firebase] Error parsing GOOGLE_CREDENTIALS_JSON:", err);
  }
}

if (!credential) {
  // Check if file exists and is NOT a directory (Docker often creates directories for missing volumes)
  if (fs.existsSync(credPath) && !fs.lstatSync(credPath).isDirectory()) {
    credential = admin.credential.cert(credPath);
    console.log(`[Firebase] Initialized using file: ${credPath}`);
  } else {
    console.warn(`[Firebase] Credential file not found or is a directory: ${credPath}`);
    // If no credentials found, let admin try default (might fail if not in GCP, but cleaner)
    try {
      credential = admin.credential.applicationDefault();
      console.log("[Firebase] Initialized using Application Default Credentials");
    } catch (e) {
      console.error("[Firebase] Could not initialize any credentials. The bot will likely fail.");
    }
  }
}

if (!credential) {
  throw new Error("[Firebase] No credentials available. Set GOOGLE_CREDENTIALS_JSON or mount the service-account.json file.");
}

admin.initializeApp({
  credential
});

const db = admin.firestore();

export function ensureUser(userId: number) {
  const userRef = db.collection("users").doc(userId.toString());
  // We don't await this because it can happen in the background and sets a basic timestamp 
  // if the user didn't exist, though we could use set with merge: true
  userRef.set({ created_at: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(console.error);
}

export async function getOrCreateConversation(userId: number): Promise<string> {
  ensureUser(userId);
  
  const conversationsRef = db.collection("conversations");
  const querySnapshot = await conversationsRef
    .where("user_id", "==", userId)
    .orderBy("created_at", "desc")
    .limit(1)
    .get();

  if (querySnapshot.empty) {
    const newDoc = await conversationsRef.add({
      user_id: userId,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return newDoc.id;
  }

  return querySnapshot.docs[0].id;
}

export async function getMessages(conversationId: string): Promise<any[]> {
  const messagesRef = db.collection("conversations").doc(conversationId).collection("messages");
  const querySnapshot = await messagesRef.orderBy("created_at", "asc").get();
  
  return querySnapshot.docs.map(doc => doc.data().raw_message);
}

export async function addMessage(
  conversationId: string,
  role: "system" | "user" | "assistant" | "tool",
  rawMessage: any
): Promise<void> {
  const messagesRef = db.collection("conversations").doc(conversationId).collection("messages");
  await messagesRef.add({
    role,
    raw_message: rawMessage,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  });
}
