import { getNewSessionId } from "./App";

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=`;
const SYSTEM_INSTRUCTION = "You are a friendly, helpful, and concise AI assistant named 'Grace'. Your responses should be formatted using Markdown. Always provide high-quality, relevant information.";
const apiKey = import.meta.env.VITE_API_KEY;

const callGeminiAPI = async (messages: any,setSessions: any,currentSessionId: string) => {
    try {
      const history = messages.map((msg:any) => ({
        role: msg.role === "user"? "user":"model",
        parts: [{ text: msg.text }],
      }));

      const payload = {
        contents: history,
        systemInstruction: {
          role: "system",
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
      };
      
      setSessions((prev: any) => {
        const newSessions = { ...prev };
        if (newSessions[currentSessionId]) {
          newSessions[currentSessionId].isTyping = true;
        }
        return newSessions;
      });

      const response = await fetch(`${API_URL}${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const result = await response.json();
      const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error("API response was empty or malformed.");
      }

      setSessions((prev: any) => {
        const newSessions = { ...prev };
        const session = newSessions[currentSessionId];
        if (session) {
          session.isTyping = false;
          session.messages.push({
            id: getNewSessionId(),
            role: "model",
            text: generatedText,
            timestamp: new Date().toISOString(),
          });
          session.error = null;
        }
        return newSessions;
      });
      return;
    } catch (error) {
      console.error("API call failed:", error);
    }
};

export default callGeminiAPI;