import { GoogleGenAI, Type } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

function parseModelResponse(text: string | undefined): any {
  if (!text) return {};
  try {
    // Try clean parse first
    return JSON.parse(text);
  } catch (e) {
    // Try to extract JSON from markdown if present
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/```\n?([\s\S]*?)\n?```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e2) {
        console.error("Failed to parse extracted JSON:", e2);
      }
    }
    
    // Fallback: search for first { and last }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.substring(start, end + 1));
      } catch (e3) {
        console.error("Failed to parse substring JSON:", e3);
      }
    }
    
    console.warn("Could not parse JSON from response, returning raw text as message");
    return { message: text };
  }
}

export async function fetchSongFromUrl(url: string) {
  try {
    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            englishTitle: { type: Type.STRING },
            lyrics: { type: Type.STRING },
            englishLyrics: { type: Type.STRING },
            key: { type: Type.STRING }
          }
        }
      },
      contents: `Extract song lyrics from this URL: ${url}. 
      Return a JSON object with title, englishTitle, lyrics, englishLyrics, and key.`
    });

    return parseModelResponse(result.text);
  } catch (error) {
    console.error("Gemini fetch error:", error);
    throw error;
  }
}

export const askGraceAIV2 = async (prompt: string, context: string = "", language: string = 'en') => {
  try {
    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING, description: "The text response to the user" },
            suggestRosterButton: { type: Type.BOOLEAN, description: "Whether to show a 'Go to Roster' button" },
            suggestMembersButton: { type: Type.BOOLEAN, description: "Whether to show a 'Go to Members' button" },
            suggestTasksButton: { type: Type.BOOLEAN, description: "Whether to show a 'Go to Tasks' button" }
          },
          required: ["message"]
        },
        systemInstruction: `You are Grace Assistant, an AI church management expert. 
        Context: ${context}
        Current Language: ${language}
        
        Rules:
        1. Always respond in ${language}.
        2. Be professional, warm, and helpful.
        3. Intent Detection:
           - If user asks about service schedule, roster, duty, or serving: set 'suggestRosterButton' to true.
           - If user asks about members, people, directory, or contacts: set 'suggestMembersButton' to true.
           - If user asks about tasks, to-do, progress, or assignments: set 'suggestTasksButton' to true.`
      },
      contents: prompt
    });

    const parsed = parseModelResponse(result.text);
    return {
      message: parsed.message || "I couldn't generate a proper response.",
      suggestRosterButton: !!parsed.suggestRosterButton,
      suggestMembersButton: !!parsed.suggestMembersButton,
      suggestTasksButton: !!parsed.suggestTasksButton
    };
  } catch (error) {
    console.error("Grace AI Error details:", error);
    return { 
      message: `Error connecting to Grace AI: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`,
      suggestRosterButton: false,
      suggestMembersButton: false,
      suggestTasksButton: false
    };
  }
};

/** @deprecated Use askGraceAIV2 */
export const askGraceAI = async (prompt: string, context: string = "", language: string = 'en') => {
  const res = await askGraceAIV2(prompt, context, language);
  return res.message;
};
