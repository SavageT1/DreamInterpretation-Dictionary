import { GoogleGenAI, Modality, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export async function interpretDream(dreamText: string) {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: [
      {
        role: "user",
        parts: [{ text: `Interpret this dream with a calming, insightful, and psychological perspective. Focus on emotions, symbols, and potential subconscious meanings. Keep it supportive and meditative.\n\nDream: ${dreamText}` }]
      }
    ],
    config: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
    }
  });

  return response.text;
}

export async function transcribeAudio(audioBase64: string, mimeType: string) {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: audioBase64, mimeType } },
          { text: "Transcribe this dream description accurately. Only return the transcription text." }
        ]
      }
    ]
  });

  return response.text;
}

export async function speakInterpretation(text: string) {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read this dream interpretation in a soothing, calm voice: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) return null;

  // Convert base64 to Blob and play
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}

export async function generateDreamImage(dreamText: string) {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [
      {
        role: "user",
        parts: [{ text: `Create a surreal, ethereal, and artistic digital painting representing this dream. The style should be dreamy, soft, and meditative, with a focus on the key symbols and emotions mentioned. Avoid text or realistic photography. \n\nDream: ${dreamText}` }]
      }
    ],
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  return null;
}
