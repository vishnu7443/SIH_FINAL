import { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean; // loading state
  quickReplies?: string[];
  onQuickReply?: (reply: string) => void;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  quickReplies = [],
  onQuickReply,
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSendMessage(trimmed);
      setMessage("");
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-3">
      {/* Quick Replies */}
      {quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickReplies.map((reply) => (
            <Button
              key={reply}
              variant="outline"
              size="sm"
              onClick={() => onQuickReply?.(reply)}
              disabled={disabled}
              className="h-8 px-3 text-xs border-primary/20 hover:border-primary hover:bg-primary/5"
            >
              {reply}
            </Button>
          ))}
        </div>
      )}

      {/* Input + Send */}
      <div className="flex gap-2">
        {/* 🔹 Changed Input → textarea for typing support */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={
            disabled ? "Waiting for response..." : "Type your message..."
          }
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-md border border-border/50 bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none transition-all",
            disabled && "animate-pulse border-primary/50"
          )}
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          size="icon"
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft"
        >
          {disabled ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
