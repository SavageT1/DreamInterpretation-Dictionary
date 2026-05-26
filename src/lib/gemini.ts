import { auth } from './firebase';

export async function interpretDream(dreamText: string, focus: string, tone: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  
  const token = await user.getIdToken();
  const response = await fetch('/api/interpret', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ dreamText, focus, tone })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Interpretation failed");
  }

  const data = await response.json();
  return data.interpretation;
}

export async function transcribeAudio(audioBase64: string, mimeType: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const token = await user.getIdToken();
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ audioBase64, mimeType })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Transcription failed");
  }

  const data = await response.json();
  return data.text;
}

export async function speakInterpretation(text: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const token = await user.getIdToken();
  const response = await fetch('/api/speak', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Speech generation failed");
  }

  const data = await response.json();
  const base64Audio = data.audioBase64;
  if (!base64Audio) return null;

  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}

export async function generateDreamImage(dreamText: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  
  const token = await user.getIdToken();
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ dreamText })
  });

  if (!response.ok) {
    throw new Error("Image generation failed");
  }

  const data = await response.json();
  return data.imageUrl;
}
