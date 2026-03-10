import admin from "firebase-admin";

const db = admin.firestore();

export const queryMeetingsDef = {
  type: "function",
  function: {
    name: "query_meetings",
    description: "Search and retrieve information from past meetings, including transcripts, summaries, and action items.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The topic or keyword to search for in meeting titles or summaries." },
        category: { type: "string", description: "Optional category to filter meetings (e.g., 'Engineering', 'Project Alpha')." },
        limit: { type: "number", default: 3, description: "Maximum number of meetings to return." },
      },
      required: ["query"],
    },
  },
};

export async function queryMeetingsFn(args: { query: string; category?: string; limit?: number }) {
  console.log(`[Tool] Querying meetings: ${args.query} (category: ${args.category})`);

  try {
    let meetingsQuery: admin.firestore.Query = db.collection("meetings");

    if (args.category) {
      meetingsQuery = meetingsQuery.where("category", "==", args.category);
    }

    // Since Firestore doesn't support full-text search natively without extensions, 
    // we'll fetch recent ones and filter/provide context. For a better RAG, one would use 
    // vector search, but for MVP we'll fetch the last N meetings related to the category or overall.
    const snapshot = await meetingsQuery.orderBy("date", "desc").limit(args.limit || 5).get();

    if (snapshot.empty) {
      return "No se encontraron reuniones que coincidan con los criterios.";
    }

    let result = "Resultados de reuniones encontradas:\n\n";
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      result += `📅 *Fecha:* ${data.date.toDate().toLocaleDateString()}\n`;
      result += `📌 *Título:* ${data.title}\n`;
      result += `📁 *Categoría:* ${data.category}\n`;
      result += `📝 *Resumen:* ${data.summary.substring(0, 300)}...\n`;
      result += `✅ *Tareas:* ${data.actionItems?.join(", ") || "Ninguna"}\n`;
      result += `---\n`;
    });

    return result;
  } catch (error: any) {
    console.error("[Tool Error] query_meetings:", error);
    return `Error consultando reuniones: ${error.message}`;
  }
}
