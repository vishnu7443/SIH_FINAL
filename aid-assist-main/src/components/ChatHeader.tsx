// ==============================
// ChatHeader.tsx (Refactored)
// ==============================
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Moon, Sun, Globe, Menu, Volume2, VolumeX } from "lucide-react";
import { useTheme } from "next-themes";
import healthIcon from "@/assets/health-icon.png";

interface ChatHeaderProps {
  language: string;
  onLanguageChange?: (language: string) => void;
  onShowFAQ?: () => void;
  ttsEnabled?: boolean;
  onToggleTTS?: () => void;
}

// ✅ Centralized languages + TTS voice mapping
const LANGUAGE_OPTIONS: Record<
  string,
  { label: string; voice: string }
> = {
  en: { label: "English", voice: "en-US-Wavenet-D" },
  hi: { label: "हिंदी (Hindi)", voice: "hi-IN-Wavenet-A" },
  ta: { label: "தமிழ் (Tamil)", voice: "ta-IN-Standard-A" },
  te: { label: "తెలుగు (Telugu)", voice: "te-IN-Standard-A" },
  kn: { label: "ಕನ್ನಡ (Kannada)", voice: "kn-IN-Standard-A" },
  ml: { label: "മലയാളം (Malayalam)", voice: "ml-IN-Standard-A" },
  mr: { label: "मराठी (Marathi)", voice: "mr-IN-Standard-A" },
  bn: { label: "বাংলা (Bengali)", voice: "bn-IN-Standard-A" },
  gu: { label: "ગુજરાતી (Gujarati)", voice: "gu-IN-Standard-A" },
  pa: { label: "ਪੰਜਾਬੀ (Punjabi)", voice: "pa-IN-Standard-A" },
  or: { label: "ଓଡ଼ିଆ (Odia)", voice: "or-IN-Standard-A" },
  ur: { label: "اردو (Urdu)", voice: "ur-IN-Standard-A" },
};

export function ChatHeader({
  language,
  onLanguageChange,
  onShowFAQ,
  ttsEnabled = true,
  onToggleTTS,
}: ChatHeaderProps) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="flex items-center justify-between p-4 border-b border-border bg-gradient-health text-white">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <img
          src={healthIcon}
          alt="Health Assistant"
          className="w-8 h-8 rounded-lg bg-white/10 p-1"
        />
        <div>
          <h1 className="text-lg font-semibold">AI Health Assistant</h1>
          <p className="text-sm text-white/80">Powered by Healthcare AI</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* FAQ Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowFAQ}
          className="text-white hover:bg-white/10"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Language Selector */}
        <Select value={language} onValueChange={onLanguageChange}>
          <SelectTrigger className="w-44 bg-white/10 border-white/20 text-white">
            <Globe className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LANGUAGE_OPTIONS).map(([code, { label }]) => (
              <SelectItem key={code} value={code}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* TTS Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleTTS}
          className="text-white hover:bg-white/10"
        >
          {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="text-white hover:bg-white/10"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}

// ✅ Export mapping so other components (like TTS engine) can use it
export { LANGUAGE_OPTIONS };
