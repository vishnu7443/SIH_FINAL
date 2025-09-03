// ==============================
// ChatMessage.tsx
// ==============================
import React, { useState } from "react";
import { Volume2, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MessageMeta {
  disease?: string;
  source?: string;
  matched_question?: string;
  similarity_score?: number;
  top_matches?: { question: string; score: number }[];
}

export interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: string;
  meta?: MessageMeta;
}

interface ChatMessageProps {
  message: Message;
  onQuickReply?: (text: string) => void;
  ttsEnabled?: boolean;
  language?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onQuickReply,
  ttsEnabled = true,
  language = "en-US",
}) => {
  const { text, isBot, timestamp, meta } = message;
  const [isSpeaking, setIsSpeaking] = useState(false);

  /** 🔊 Play/Pause/Stop TTS for this message */
  const speakMessage = (action: "play" | "pause" | "stop") => {
    if (!ttsEnabled || !("speechSynthesis" in window)) return;

    if (action === "play") {
      window.speechSynthesis.cancel(); // stop any ongoing
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } else if (action === "pause") {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        setIsSpeaking(false);
      } else if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsSpeaking(true);
      }
    } else if (action === "stop") {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"} mb-3`}>
      <div
        className={`p-3 rounded-2xl shadow-md max-w-[75%] relative ${
          isBot ? "bg-gray-100 text-gray-800" : "bg-blue-500 text-white"
        }`}
      >
        {/* Main Answer / Question */}
        <p className="mb-2 whitespace-pre-line">{text}</p>

        {/* Extra info (only for bot messages) */}
        {isBot && meta && (
          <div className="mt-2 border-t pt-2 text-sm text-gray-700 space-y-1">
            {meta.disease && (
              <p>
                <strong>Disease:</strong> {meta.disease}
              </p>
            )}
            {meta.source && (
              <p>
                <strong>Source:</strong> {meta.source}
              </p>
            )}
            {meta.matched_question && (
              <p>
                <strong>Matched Question:</strong> {meta.matched_question}
              </p>
            )}
            {typeof meta.similarity_score === "number" && (
              <p>
                <strong>Confidence:</strong>{" "}
                {(meta.similarity_score * 100).toFixed(1)}%
              </p>
            )}

            {/* Related Qs as quick reply buttons */}
            {meta.top_matches?.length ? (
              <div className="mt-2">
                <p className="font-semibold">Related:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {meta.top_matches.map((m, idx) => (
                    <button
                      key={idx}
                      onClick={() => onQuickReply?.(m.question)}
                      className="px-2 py-1 text-xs rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                    >
                      {m.question}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-gray-500 mt-1 text-right">{timestamp}</div>

        {/* 🔊 Per-message TTS Controls (only for bot messages) */}
        {isBot && (
          <div className="flex gap-2 mt-2">
            <Button size="icon" variant="ghost" onClick={() => speakMessage("play")}>
              <Volume2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => speakMessage("pause")}>
              <Pause className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => speakMessage("stop")}>
              <Square className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
