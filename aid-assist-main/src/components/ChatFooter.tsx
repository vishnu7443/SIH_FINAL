import { AlertTriangle } from "lucide-react";

export function ChatFooter() {
  return (
    <div className="p-4 border-t border-border bg-muted/30 text-center">
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <span>
          <strong>Disclaimer:</strong> This chatbot provides general health awareness. 
          It is not a substitute for professional medical advice. 
          For emergencies, call your local helpline.
        </span>
      </div>
    </div>
  );
}