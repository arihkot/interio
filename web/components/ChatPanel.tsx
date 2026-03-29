"use client";

import { FormEvent, useMemo, useRef, useState } from "react";

import { askChat } from "@/lib/api";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
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

  const speechApiSupported = useMemo(
    () => typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window),
    []
  );

  function startVoiceInput() {
    if (!speechApiSupported) return;
    const recognitionFactory = (window as unknown as {
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      SpeechRecognition?: new () => SpeechRecognitionLike;
    }).webkitSpeechRecognition ??
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition;

    const SpeechRecognitionImpl = recognitionFactory;
    if (!SpeechRecognitionImpl) return;

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.onend = () => setVoiceEnabled(false);
    recognition.onerror = () => setVoiceEnabled(false);
    recognition.start();
    recognitionRef.current = recognition;
    setVoiceEnabled(true);
  }

  function stopVoiceInput() {
    recognitionRef.current?.stop();
    setVoiceEnabled(false);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!input.trim() || loading) return;

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
    <section className="panel chat-panel">
      <div className="panel-header">
        <h3>Context-Aware Assistant</h3>
        <p>Voice-enabled chatbot with full project context.</p>
      </div>

      <div className="chat-log" role="log" aria-live="polite">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`msg msg-${message.role}`}>
            <strong>{message.role === "assistant" ? "Interio" : "You"}</strong>
            <p>{message.text}</p>
          </div>
        ))}
      </div>

      <form className="chat-input-row" onSubmit={onSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Explain slab recommendation for monsoon climate"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send"}
        </button>
      </form>

      <div className="voice-row">
        <button type="button" onClick={voiceEnabled ? stopVoiceInput : startVoiceInput} disabled={!speechApiSupported}>
          {voiceEnabled ? "Stop Voice Input" : "Start Voice Input"}
        </button>
        <span>{speechApiSupported ? "Speech input/output ready." : "Speech API not supported in this browser."}</span>
      </div>
    </section>
  );
}
