import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export async function checkNameAvailability(name: string) {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Is the name "${name}" commonly used or trademarked in the software/app space? Provide a brief summary.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  return response.text;
}
