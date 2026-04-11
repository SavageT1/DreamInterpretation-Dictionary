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

  // Step 1: Generate a highly descriptive visual prompt using a text model
  const promptResponse = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: [
      {
        role: "user",
        parts: [{ text: `You are an expert prompt engineer for AI image generation. 
        Analyze the following dream description and create a detailed, artistic, and atmospheric prompt for a surreal digital painting.
        
        Requirements:
        1. Identify the core symbols and dominant emotions (e.g., wonder, fear, serenity).
        2. Describe a specific artistic style: "A high-detail surrealist digital painting with ethereal lighting and soft, fluid textures."
        3. Specify lighting: Use terms like "bioluminescent," "volumetric fog," "golden hour," or "celestial glow."
        4. Focus on composition: Describe the arrangement of elements to create a sense of vastness or intimacy.
        5. DO NOT include any text, words, or labels in the prompt.
        6. Keep the final prompt under 150 words.
        
        Dream: ${dreamText}
        
        Visual Prompt:` }]
      }
    ]
  });

  const visualPrompt = promptResponse.text || dreamText;

  // Step 2: Generate the image using the refined prompt
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [
      {
        role: "user",
        parts: [{ text: visualPrompt }]
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
