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

type FirebaseAppletConfig = {
  projectId: string;
  firestoreDatabaseId: string;
};

// Read Firebase config if it exists, but do not fail startup if credentials are missing.
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: FirebaseAppletConfig | null = null;

try {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8")) as FirebaseAppletConfig;
} catch (error) {
  console.warn("Firebase applet config could not be loaded. Continuing without Firebase Admin.", error);
}

let adminApp: admin.app.App | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

if (firebaseConfig) {
  try {
    adminApp =
      admin.apps.length > 0
        ? admin.app()
        : admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: firebaseConfig.projectId,
          });
    db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
  } catch (error) {
    console.warn(
      "Firebase Admin could not be initialized. Cloud features will stay offline until credentials are provided.",
      error,
    );
    adminApp = null;
    db = null;
  }
}

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
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ai;
}

function requireFirebaseAdmin(res: express.Response) {
  if (!adminApp) {
    res.status(503).json({
      error: "Cloud services are not configured yet. The site is still open in local preview mode.",
    });
    return false;
  }

  return true;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT ?? process.env.APP_PORT ?? 3000);

  app.use(express.json());

  app.post("/api/generate-image", async (req, res) => {
    if (!requireFirebaseAdmin(res)) {
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const idToken = authHeader.split(" ")[1];
      await admin.auth().verifyIdToken(idToken);
      const { dreamText } = req.body;

      const promptResponse = await getAI().models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: `Create an artistic prompt for a surreal painting based on: ${dreamText}` }],
          },
        ],
      });
      const visualPrompt = promptResponse.text || dreamText;

      const response = await getAI().models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: "user", parts: [{ text: visualPrompt }] }],
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
    if (!requireFirebaseAdmin(res)) {
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const idToken = authHeader.split(" ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;
      const { dreamText, focus, tone } = req.body;

      let userData = { usageCount: 0, lastReset: new Date().toISOString(), tier: "free" };
      let userRef: ReturnType<ReturnType<typeof getFirestore>["collection"]["prototype"]["doc"]> | null = null;
      let dbAccessSuccessful = false;

      try {
        if (db) {
          userRef = db.collection("users").doc(userId) as typeof userRef;
          const userDoc = await userRef.get();
          if (userDoc.exists) {
            const docData = userDoc.data();
            if (docData) {
              userData = {
                usageCount: typeof docData.usageCount === "number" ? docData.usageCount : 0,
                lastReset: docData.lastReset || new Date().toISOString(),
                tier: docData.tier || "free",
              };
            }
          }
          dbAccessSuccessful = true;
        }
      } catch (dbError: any) {
        console.warn("Firestore database read failed (gracefully bypassing limit checking):", dbError.message || dbError);
      }

      const limit = 4;
      const isPro = userData.tier === "pro";
      if (dbAccessSuccessful && userData.usageCount >= limit && !isPro) {
        return res.status(403).json({ error: "Monthly limit reached. Please upgrade to Pro for unlimited access." });
      }

      const response = await getAI().models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Interpret this dream with a ${tone} perspective. Focus on emotions, symbols, and potential subconscious meanings.\n            Focus area: ${focus}.\n            Dream: ${dreamText}`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.7,
        },
      });
      console.log("Gemini interpret successful");

      if (dbAccessSuccessful && userRef) {
        try {
          await userRef.set(
            {
              ...userData,
              usageCount: userData.usageCount + 1,
            },
            { merge: true },
          );
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
    if (!requireFirebaseAdmin(res)) {
      return;
    }

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
              { text: "Transcribe this dream description accurately. Only return the transcription text." },
            ],
          },
        ],
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("API Error (transcribe):", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  app.post("/api/speak", async (req, res) => {
    if (!requireFirebaseAdmin(res)) {
      return;
    }

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
              prebuiltVoiceConfig: { voiceName: "Kore" },
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
    if (!requireFirebaseAdmin(res)) {
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const idToken = authHeader.split(" ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;
      const { tier } = req.body;

      if (tier !== "free" && tier !== "pro") {
        return res.status(400).json({ error: "Invalid tier" });
      }

      try {
        if (db) {
          await db.collection("users").doc(userId).set(
            {
              tier: tier,
            },
            { merge: true },
          );
        }
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
    res.json({
      status: "ok",
      firebaseAdminReady: Boolean(adminApp),
      firebaseConfigLoaded: Boolean(firebaseConfig),
      geminiReady: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      app.get("*", (_req, res) => {
        res.status(200).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dream Interpretation Dictionary</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #050505;
        color: #f8fafc;
        font-family: Inter, system-ui, sans-serif;
      }
      main {
        max-width: 42rem;
        padding: 2rem;
        text-align: center;
        line-height: 1.6;
      }
      h1 {
        margin: 0 0 1rem;
        font-size: clamp(2rem, 4vw, 3.5rem);
      }
      p {
        margin: 0;
        color: #cbd5e1;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Dream Interpretation Dictionary</h1>
      <p>The app is starting in safe preview mode. The full deployment will appear here once the production build is available.</p>
    </main>
  </body>
</html>`);
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);

    cron.schedule("0 9 * * *", async () => {
      console.log("Running daily notification check...");
      // Logic for inactivity and credit reset would go here:
      // 1. Check users with lastLogDate > 3 days
      // 2. Check users for credit reset (using lastReset)
      // 3. Send using admin.messaging().send(...)
    });
  });
}

startServer();