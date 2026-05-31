"use client";

import { FormEvent, useMemo, useRef, useState, useEffect } from "react";
import { Mic, MicOff, Send, Loader2, User, Bot } from "lucide-react";
import { askChat } from "@/lib/api";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type Message = {
  role: "user" | "assistant";
  text: string;
};

type Props = {
  projectId: string;
};

const NORMAL_TTS_RATE = 1.08;
const NORMAL_TTS_PITCH = 1.0;

function sanitizeForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[>#*_~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;

  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en-"));
  const localEnglish = englishVoices.filter((voice) => voice.localService);

  return (
    localEnglish.find((voice) => voice.lang.toLowerCase().startsWith("en-us")) ??
    localEnglish.find((voice) => voice.lang.toLowerCase().startsWith("en-gb")) ??
    localEnglish.find((voice) => voice.lang.toLowerCase().startsWith("en-in")) ??
    localEnglish.find((voice) => voice.default) ??
    englishVoices.find((voice) => voice.lang.toLowerCase().startsWith("en-us")) ??
    englishVoices.find((voice) => voice.lang.toLowerCase().startsWith("en-gb")) ??
    englishVoices.find((voice) => voice.lang.toLowerCase().startsWith("en-in")) ??
    englishVoices[0]
  );
}

export function ChatPanel({ projectId }: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Ask me about material choices, lifecycle cost, structural risks, or weather impact."
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const chatLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages]);

  const speechApiSupported = useMemo(
    () => typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window),
    []
  );

  function toggleVoiceInput() {
    if (voiceEnabled) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  }

  function startVoiceInput() {
    if (!speechApiSupported) return;
    const recognitionFactory = (window as unknown as {
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      SpeechRecognition?: new () => SpeechRecognitionLike;
    }).webkitSpeechRecognition ??
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition;

    const SpeechRecognitionImpl = recognitionFactory;
    if (!SpeechRecognitionImpl) return;

    try {
      const recognition = new SpeechRecognitionImpl();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = false;
      
      recognition.onresult = (event) => {
        let currentTranscript = "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = event.results as any;
        for (let i = 0; i < results.length; i++) {
          currentTranscript += results[i][0].transcript;
        }
        setInput(currentTranscript);
      };
      
      recognition.onend = () => setVoiceEnabled(false);
      recognition.onerror = () => setVoiceEnabled(false);
      
      recognition.start();
      recognitionRef.current = recognition;
      setVoiceEnabled(true);
    } catch (e) {
      console.error("Speech recognition error:", e);
      setVoiceEnabled(false);
    }
  }

  function stopVoiceInput() {
    try {
      recognitionRef.current?.stop();
    } catch (e) {
      console.error(e);
    }
    setVoiceEnabled(false);
  }

  async function onSubmit(event?: FormEvent) {
    if (event) event.preventDefault();
    if (!input.trim() || loading) return;

    if (voiceEnabled) stopVoiceInput();

    const userText = input.trim();
    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: userText }]);

    try {
      const response = await askChat(projectId, userText);
      const assistantText = response.response;
      setMessages((prev) => [...prev, { role: "assistant", text: assistantText }]);

      if (speechApiSupported && "speechSynthesis" in window) {
        const synthesis = window.speechSynthesis;
        synthesis.cancel();

        const spokenText = sanitizeForSpeech(assistantText);
        const utterance = new SpeechSynthesisUtterance(spokenText);

        const voices = synthesis.getVoices();
        const preferredVoice = pickVoice(voices);

        utterance.lang = preferredVoice?.lang ?? "en-US";
        utterance.rate = NORMAL_TTS_RATE;
        utterance.pitch = NORMAL_TTS_PITCH;
        utterance.volume = 1;

        if (preferredVoice) {
          utterance.voice = preferredVoice;
          if (preferredVoice.lang.toLowerCase().startsWith("en-in")) {
            utterance.rate = 1.15;
          }
        }

        synthesis.speak(utterance);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I could not reach the assistant right now. Please try again in a moment."
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel chat-panel" style={{ display: "flex", flexDirection: "column", height: "100%", padding: "1.5rem" }}>
      <div className="chat-log" ref={chatLogRef} role="log" aria-live="polite" style={{ flex: 1, padding: "1.5rem", background: "var(--surface)", border: "none", display: "flex", flexDirection: "column", gap: "1.5rem", overflowY: "auto", height: "auto", minHeight: "450px", marginBottom: "1rem" }}>
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} style={{ display: "flex", gap: "1rem", maxWidth: "85%", alignSelf: message.role === "assistant" ? "flex-start" : "flex-end", flexDirection: message.role === "user" ? "row-reverse" : "row" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: message.role === "assistant" ? "var(--brand-soft)" : "var(--border)", color: message.role === "assistant" ? "var(--brand)" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {message.role === "assistant" ? <Bot size={20} /> : <User size={20} />}
            </div>
            <div className={`msg msg-${message.role}`} style={{ background: message.role === "assistant" ? "var(--surface-alt)" : "var(--brand)", color: message.role === "user" ? "#fff" : "inherit", padding: "1rem 1.25rem", borderRadius: "16px", border: "none", boxShadow: "var(--shadow-sm)", borderTopLeftRadius: message.role === "assistant" ? "4px" : "16px", borderTopRightRadius: message.role === "user" ? "4px" : "16px", maxWidth: "100%" }}>
              <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.5 }}>{message.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: "1rem", maxWidth: "85%", alignSelf: "flex-start" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--brand-soft)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Bot size={20} />
            </div>
            <div style={{ background: "var(--surface-alt)", padding: "1rem 1.25rem", borderRadius: "16px", borderTopLeftRadius: "4px", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)" }}>
              <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "0.9rem" }}>Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "0.5rem" }}>
        <form 
          onSubmit={onSubmit} 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "0.5rem", 
            background: "var(--surface)", 
            border: "1px solid var(--border)", 
            padding: "0.5rem 0.5rem 0.5rem 1.25rem", 
            borderRadius: "99px",
            boxShadow: "var(--shadow-sm)",
            transition: "all 0.2s"
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = "var(--brand)"}
          onBlur={(e) => e.currentTarget.style.borderColor = "var(--border)"}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about material choices or weather impact..."
            style={{ 
              flex: 1, 
              border: "none", 
              background: "transparent", 
              padding: 0, 
              outline: "none", 
              fontSize: "0.95rem",
              boxShadow: "none"
            }}
          />
          
          {speechApiSupported && (
            <button 
              type="button" 
              onClick={toggleVoiceInput}
              disabled={loading}
              title={voiceEnabled ? "Stop recording" : "Start voice input"}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "none",
                background: voiceEnabled ? "#fee2e2" : "transparent",
                color: voiceEnabled ? "#ef4444" : "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.2s",
                boxShadow: "none"
              }}
              onMouseOver={(e) => {
                if (!voiceEnabled) e.currentTarget.style.background = "var(--surface-alt)";
              }}
              onMouseOut={(e) => {
                if (!voiceEnabled) e.currentTarget.style.background = "transparent";
              }}
            >
              {voiceEnabled ? <Mic className="animate-pulse" style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} size={20} /> : <MicOff size={20} />}
            </button>
          )}

          <button 
            type="submit" 
            disabled={!input.trim() || loading}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "none",
              background: input.trim() && !loading ? "var(--brand)" : "var(--surface-alt)",
              color: input.trim() && !loading ? "#fff" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              padding: 0,
              transition: "all 0.2s",
              boxShadow: "none"
            }}
          >
            <Send size={18} style={{ transform: "translateX(-1px) translateY(1px)" }} />
          </button>
        </form>
        {!speechApiSupported && (
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.5rem 0 0 1rem", textAlign: "center" }}>
            Voice input is not supported in your browser.
          </p>
        )}
      </div>
    </section>
  );
}
