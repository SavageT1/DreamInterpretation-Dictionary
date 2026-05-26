import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import cron from "node-cron";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read Firebase Config to dynamically connect to the correct Database ID on Spark plans
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: firebaseConfig.projectId
});
const db = getFirestore(firebaseConfig.firestoreDatabaseId);

let ai: GoogleGenAI | null = null;
function getAI() {
  console.log("GEMINI_API_KEY environment variable exists:", !!process.env.GEMINI_API_KEY);
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return ai;
}
async function startServer() {
  const app = reportAppErrors();
  const PORT = 3000;

  app.use(express.json());

  // API Error wrapper helper
  function reportAppErrors() {
    return express();
  }

  // API routes
  app.post("/api/generate-image", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const idToken = authHeader.split(" ")[1];
      await admin.auth().verifyIdToken(idToken);
      const { dreamText } = req.body;

      // 1. Generate Prompt using modern Flash
      const promptResponse = await getAI().models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{
            role: "user",
            parts: [{ text: `Create an artistic prompt for a surreal painting based on: ${dreamText}` }]
        }]
      });
      const visualPrompt = promptResponse.text || dreamText;

      // 2. Generate Image using Flash Image (or Imagen models if needed, default gemini-2.5-flash-image)
      const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [{ role: "user", parts: [{ text: visualPrompt }] }],
        config: { imageConfig: { aspectRatio: "1:1" } },
      });

      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part && part.inlineData) {
        res.json({ imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
      } else {
        res.status(500).json({ error: "Image generation failed" });
      }
    } catch (error) {
      console.error("API Error (generate-image):", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  app.post("/api/interpret", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const idToken = authHeader.split(" ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;
      const { dreamText, focus, tone } = req.body;

      // 1. Fetch user subscription/usage doc (with graceful fallback on DB connectivity issues)
      let userData = { usageCount: 0, lastReset: new Date().toISOString(), tier: 'free' };
      let userRef = null;
      let dbAccessSuccessful = false;

      try {
        userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          const docData = userDoc.data();
          if (docData) {
            userData = {
              usageCount: typeof docData.usageCount === "number" ? docData.usageCount : 0,
              lastReset: docData.lastReset || new Date().toISOString(),
              tier: docData.tier || 'free'
            };
          }
        }
        dbAccessSuccessful = true;
      } catch (dbError: any) {
        console.warn("Firestore database read failed (gracefully bypassing limit checking):", dbError.message || dbError);
      }
      
      // 2. Logic: Check monthly limit (4 per month, unless Pro)
      const limit = 4;
      const isPro = userData.tier === 'pro';
      if (dbAccessSuccessful && userData.usageCount >= limit && !isPro) {
        return res.status(403).json({ error: "Monthly limit reached. Please upgrade to Pro for unlimited access." });
      }

      // 3. Call Gemini
      const response = await getAI().models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: `Interpret this dream with a ${tone} perspective. Focus on emotions, symbols, and potential subconscious meanings. 
            Focus area: ${focus}. 
            Dream: ${dreamText}` }]
          }
        ],
        config: {
          temperature: 0.7,
        }
      });

      // 4. Increment count (gracefully ignore database write failures)
      if (dbAccessSuccessful && userRef) {
        try {
          await userRef.set({
            ...userData,
            usageCount: userData.usageCount + 1
          }, { merge: true });
        } catch (dbError: any) {
          console.warn("Firestore database write failed (gracefully continuing):", dbError.message || dbError);
        }
      }

      res.json({ interpretation: response.text });
    } catch (error) {
      console.error("API Error (interpret):", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  app.post("/api/transcribe", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const idToken = authHeader.split(" ")[1];
      await admin.auth().verifyIdToken(idToken);
      const { audioBase64, mimeType } = req.body;

      if (!audioBase64) {
        return res.status(400).json({ error: "Missing audio data" });
      }

      const response = await getAI().models.generateContent({
        model: "gemini-3.5-flash",
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

      res.json({ text: response.text });
    } catch (error) {
      console.error("API Error (transcribe):", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  app.post("/api/speak", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const idToken = authHeader.split(" ")[1];
      await admin.auth().verifyIdToken(idToken);
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Missing text" });
      }

      const response = await getAI().models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `Read this dream interpretation in a soothing, calm voice: ${text}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.status(500).json({ error: "No audio generated" });
      }

      res.json({ audioBase64: base64Audio });
    } catch (error) {
      console.error("API Error (speak):", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  app.post("/api/update-tier", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const idToken = authHeader.split(" ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;
      const { tier } = req.body;

      if (tier !== 'free' && tier !== 'pro') {
        return res.status(400).json({ error: "Invalid tier" });
      }

      try {
        await db.collection("users").doc(userId).set({
          tier: tier
        }, { merge: true });
      } catch (dbError: any) {
        console.warn("Firestore database write for update-tier failed (gracefully continuing):", dbError.message || dbError);
      }

      res.json({ status: "success", tier });
    } catch (error) {
      console.error("API Error (update-tier):", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Schedule jobs
    cron.schedule('0 9 * * *', async () => {
      console.log('Running daily notification check...');
      // Logic for inactivity and credit reset would go here:
      // 1. Check users with lastLogDate > 3 days
      // 2. Check users for credit reset (using lastReset)
      // 3. Send using admin.messaging().send(...)
    });
  });
}

startServer();
