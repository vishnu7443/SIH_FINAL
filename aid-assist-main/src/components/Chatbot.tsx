// ==============================
// Chatbot.tsx
// ==============================
import { useState, useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ChatHeader } from "./ChatHeader";
import { ChatFooter } from "./ChatFooter";
import { TypingIndicator } from "./TypingIndicator";
import { FAQSidebar } from "./FAQSidebar";
import { Card } from "@/components/ui/card";

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

export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your AI Health Assistant. How can I help you today?",
      isBot: true,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);

  // 🔊 TTS + Language state
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [language, setLanguage] = useState("en-US");

  // FAQs (reload when language changes)
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  /** 🔹 Auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  /** 🔹 Load FAQs whenever language changes */
  useEffect(() => {
    fetch("http://127.0.0.1:8000/faqs")
      .then((res) => res.json())
      .then(setFaqs)
      .catch(console.error);
  }, [language]);

  /** 🔊 Speak text */
  const speakText = (text: string) => {
    if (!ttsEnabled) return;
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  /** 🔹 Add new message */
  const addMessage = (
    text: string,
    isBot: boolean,
    meta?: MessageMeta,
    id?: string
  ) => {
    const newMessage: Message = {
      id: id || Date.now().toString(),
      text,
      isBot,
      meta,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, newMessage]);
    if (isBot) speakText(text);
    return newMessage.id;
  };

  /** 🔹 Update message (for streaming) */
  const updateMessage = (id: string, newText: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, text: newText } : msg))
    );
    if (ttsEnabled) speakText(newText);
  };

  /** 🔹 Handle send */
  const handleSendMessage = async (message: string) => {
    addMessage(message, false);
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, language }),
      });

      if (!response.ok) throw new Error("Streaming error");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let botMsgId: string | null = null;
      let accumulated = "";
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          const event = JSON.parse(line);

          if (event.type === "reply") {
            if (!botMsgId) botMsgId = addMessage("", true);
            accumulated += event.data;
            updateMessage(botMsgId, accumulated);
          } else if (event.type === "end") {
            console.log("✅ Stream finished");
          }
        }
      }
    } catch (err) {
      console.error(err);
      addMessage(
        "⚠️ Sorry, I couldn't process your request. Please try again.",
        true
      );
    } finally {
      setIsLoading(false);
    }
  };

  /** 🔹 FAQ select */
  const handleFAQSelect = (question: string, answer: string) => {
    addMessage(question, false);
    setTimeout(() => {
      addMessage(answer, true);
    }, 600);
  };

  /** 🔹 Handle language change (call backend) */
  const handleLanguageChange = async (lang: string) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/set_language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
      const data = await res.json();
      setLanguage(data.language || lang);
    } catch (err) {
      console.error("⚠️ Failed to set language", err);
      setLanguage(lang);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[90vh] flex flex-col shadow-card">
        <ChatHeader
          language={language}
          onLanguageChange={handleLanguageChange}
          onShowFAQ={() => setShowFAQ(true)}
          ttsEnabled={ttsEnabled}
          onToggleTTS={() => setTtsEnabled((prev) => !prev)}
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onQuickReply={(text) => handleSendMessage(text)}
              ttsEnabled={ttsEnabled}
              language={language}
            />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
            quickReplies={[]}
          />
        </div>

        <ChatFooter />
      </Card>

      <FAQSidebar
        isOpen={showFAQ}
        onClose={() => setShowFAQ(false)}
        onSelectFAQ={handleFAQSelect}
        faqs={faqs}
      />
    </div>
  );
}
