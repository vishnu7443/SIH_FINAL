"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { X, HelpCircle } from "lucide-react";

interface FAQSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFAQ: (question: string, answer: string) => void;
}

interface FAQ {
  question: string;
  answer: string;
}

export function FAQSidebar({ isOpen, onClose, onSelectFAQ }: FAQSidebarProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Fetch FAQs when sidebar is opened */
  useEffect(() => {
    if (!isOpen) return;

    const fetchFAQs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("http://127.0.0.1:8000/api/faqs?limit=10");
        if (!res.ok) throw new Error("Failed to load FAQs");
        const data = await res.json();
        setFaqs(data);
      } catch (err: any) {
        console.error("❌ FAQ fetch error:", err);
        setError("Unable to load FAQs. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchFAQs();
  }, [isOpen]);

  /** Handle FAQ click */
  const handleFAQClick = (faq: FAQ) => {
    onSelectFAQ(faq.question, faq.answer);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 p-0">
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border bg-gradient-health text-white">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Frequently Asked Questions
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="p-4">
          {loading && (
            <p className="text-sm text-muted-foreground">Loading FAQs...</p>
          )}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {!loading && !error && faqs.length > 0 && (
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full text-left p-3 h-auto justify-start hover:bg-accent"
                  onClick={() => handleFAQClick(faq)}
                >
                  <div>
                    <div className="font-medium text-sm mb-1">
                      {faq.question}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {faq.answer}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}

          {!loading && !error && faqs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No FAQs available.
            </p>
          )}

          {/* Footer Tip */}
          <div className="mt-6 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              💡 Click any question to insert it into your chat with the AI assistant.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
