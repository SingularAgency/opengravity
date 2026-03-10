import admin from "firebase-admin";
import { env } from "../config/env.js";
// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(env.GOOGLE_APPLICATION_CREDENTIALS)
});
const db = admin.firestore();
export function ensureUser(userId) {
    const userRef = db.collection("users").doc(userId.toString());
    // We don't await this because it can happen in the background and sets a basic timestamp 
    // if the user didn't exist, though we could use set with merge: true
    userRef.set({ created_at: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(console.error);
}
export async function getOrCreateConversation(userId) {
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
export async function getMessages(conversationId) {
    const messagesRef = db.collection("conversations").doc(conversationId).collection("messages");
    const querySnapshot = await messagesRef.orderBy("created_at", "asc").get();
    return querySnapshot.docs.map(doc => doc.data().raw_message);
}
export async function addMessage(conversationId, role, rawMessage) {
    const messagesRef = db.collection("conversations").doc(conversationId).collection("messages");
    await messagesRef.add({
        role,
        raw_message: rawMessage,
        created_at: admin.firestore.FieldValue.serverTimestamp()
    });
}
