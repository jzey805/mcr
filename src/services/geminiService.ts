import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const fetchSongFromUrl = async (url: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Please extract the song title (Chinese and English if possible) and lyrics from this URL: ${url}. 
      If the page is too complex, focus primarily on the song text content. 
      Result must be in JSON format.`,
      config: {
        tools: [{ urlContext: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Main Title (often Chinese)" },
            englishTitle: { type: Type.STRING, description: "English Title" },
            lyrics: { type: Type.STRING, description: "Full original lyrics" },
            englishLyrics: { type: Type.STRING, description: "Full English Translation of Lyrics if available" }
          },
          required: ["title", "lyrics"]
        }
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Fetch Song Error:", error);
    throw error;
  }
};

export const askGraceAI = async (prompt: string, context: string = "", language: string = 'en') => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: `You are Grace Assistant, an AI expert on Grace Community church. You help church staff with questions about administration, personnel, activities, and spiritual guidance. 
        Context about the church: ${context || "Grace Community is a spiritual community focused on growing together in faith."}
        CRITICAL: Always respond in the language specified by the user's interface, which is currently set to: ${language}.
        Keep your answers concise, helpful, and professional yet warm.`,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Grace AI Error:", error);
    return "I'm sorry, I'm having trouble connecting to the Grace system right now. Please try again later.";
  }
};
