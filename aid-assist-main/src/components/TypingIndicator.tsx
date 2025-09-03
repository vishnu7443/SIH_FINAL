import { cn } from "@/lib/utils";

export function TypingIndicator() {
  return (
    <div className="flex w-full mb-4 justify-start">
      <div className="flex items-start gap-3 max-w-[80%]">
        {/* Bot Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
          🤖
        </div>
        
        {/* Typing bubble */}
        <div className="bg-bot-message text-bot-message-foreground rounded-xl rounded-tl-sm px-4 py-3 shadow-soft">
          <div className="flex items-center gap-1">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></div>
            </div>
            <span className="text-xs text-muted-foreground ml-2">AI is typing...</span>
          </div>
        </div>
      </div>
    </div>
  );
}