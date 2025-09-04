import os
from fastapi import APIRouter, Request, Form
from fastapi.responses import StreamingResponse, JSONResponse, PlainTextResponse
from app.models import ChatRequest, FAQ
import pandas as pd
import asyncio
import json
import re
import logging
from typing import List, Tuple, Dict
from pathlib import Path
from gtts import gTTS
from gtts.lang import tts_langs
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import heapq
from deep_translator import GoogleTranslator
from fastapi import BackgroundTasks
import requests
import speech_recognition as sr
from io import BytesIO
import re
import os
import logging
import requests
import tempfile
from io import BytesIO
from fastapi import APIRouter, Form, BackgroundTasks
from fastapi.responses import PlainTextResponse
import speech_recognition as sr
import whisper
import requests
import tempfile
from pydub import AudioSegment
from pydub.utils import which

# At the top of routes.py
PUBLIC_URL = os.getenv("PUBLIC_URL", "https://9c961f52afbf.ngrok-free.app")


# ------------------------------------------------------------------------------
# Router
# ------------------------------------------------------------------------------
router = APIRouter()
STOP_FLAG = False
CURRENT_LANGUAGE = "en"  # default for web client

# Per-user language for WhatsApp (keyed by WhatsApp number)
WHATSAPP_LANG_MAP: Dict[str, str] = {}
whisper_model = whisper.load_model("tiny")   # try "small" or "medium" if GPU
# ------------------------------------------------------------------------------
# Dataset
# ------------------------------------------------------------------------------
try:
    dataset = pd.read_csv(
        "app/data/clean_health_chatbot_dataset.csv",
        on_bad_lines="skip",
        encoding="utf-8"
    )
    logging.info(f"Dataset loaded: {dataset.shape[0]} rows")
except Exception as e:
    logging.error(f"Failed to load dataset: {e}")
    dataset = pd.DataFrame(columns=["question", "answer", "source", "disease"])

for col in ["question", "answer", "source", "disease"]:
    if col not in dataset.columns:
        dataset[col] = ""

dataset = dataset.astype(str).fillna("")
questions_raw = dataset["question"].tolist()
answers = dataset["answer"].tolist()
sources = dataset["source"].tolist()
diseases = dataset["disease"].tolist()

# ------------------------------------------------------------------------------
# Text normalization
# ------------------------------------------------------------------------------
STOPWORDS = set("""a an the and or of in on at to with for from is are be was were been being do does did doing 
have has had having what why how when where which whom whose can could may might shall should will would must 
if then else than not no yes""".split())

def clean_text(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    tokens = [t for t in text.split() if t not in STOPWORDS]
    return " ".join(tokens)

questions_clean = [clean_text(q) for q in questions_raw]

# ------------------------------------------------------------------------------
# TF-IDF Vectorizer
# ------------------------------------------------------------------------------
vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=2)
tfidf_matrix = vectorizer.fit_transform(questions_clean)

def significant_overlap(q1: str, q2: str) -> int:
    return len(set(clean_text(q1).split()) & set(clean_text(q2).split()))

# ------------------------------------------------------------------------------
# Supported Languages (for UI + translations)
# ------------------------------------------------------------------------------
SUPPORTED_LANGUAGES = {
    # Global
    "en": "English", "es": "Spanish", "fr": "French", "de": "German",
    "it": "Italian", "pt": "Portuguese", "ru": "Russian",
    "zh": "Chinese (Simplified)", "ja": "Japanese", "ko": "Korean", "ar": "Arabic",

    # Indian Languages
    "hi": "Hindi", "bn": "Bengali", "gu": "Gujarati", "kn": "Kannada",
    "ml": "Malayalam", "mr": "Marathi", "pa": "Punjabi", "ta": "Tamil",
    "te": "Telugu", "ur": "Urdu", "or": "Odia", "as": "Assamese",
}

# Friendly name normalization for WhatsApp users
LANG_NAME_TO_CODE = {
    # English names
    "english": "en", "spanish": "es", "french": "fr", "german": "de",
    "italian": "it", "portuguese": "pt", "russian": "ru",
    "chinese": "zh", "japanese": "ja", "korean": "ko", "arabic": "ar",
    "hindi": "hi", "bengali": "bn", "gujarati": "gu", "kannada": "kn",
    "malayalam": "ml", "marathi": "mr", "punjabi": "pa", "tamil": "ta",
    "telugu": "te", "urdu": "ur", "odia": "or", "oriya": "or", "assamese": "as",

    # Native names (optional, you can add more)
    "हिंदी": "hi", "বাংলা": "bn", "ગુજરાતી": "gu", "ಕನ್ನಡ": "kn",
    "മലയാളം": "ml", "मराठी": "mr", "ਪੰਜਾਬੀ": "pa", "தமிழ்": "ta",
    "తెలుగు": "te", "اردو": "ur", "ଓଡ଼ିଆ": "or", "অসমীয়া": "as",
}

def normalize_language_code(lang: str) -> str:
    if not lang:
        return "en"
    lang = lang.strip().lower()
    # Accept code directly
    if lang in SUPPORTED_LANGUAGES:
        return lang
    # Handle hyphenated from frontend e.g. en-US, hi-IN
    lang = lang.split("-")[0]
    if lang in SUPPORTED_LANGUAGES:
        return lang
    # Map friendly name → code
    if lang in LANG_NAME_TO_CODE:
        return LANG_NAME_TO_CODE[lang]
    return "en"

# ------------------------------------------------------------------------------
# Translation (deep_translator)
# ------------------------------------------------------------------------------
def translate_text(text: str, target_lang: str) -> str:
    """Translate text safely. Uses GoogleTranslator with source='auto'."""
    if not text or target_lang == "en":
        return text
    try:
        return GoogleTranslator(source="auto", target=target_lang).translate(text)
    except Exception as e:
        logging.error(f"Translation error: {e}")
        return text  # fallback to original

# ------------------------------------------------------------------------------
# TTS with gTTS + fallback
# ------------------------------------------------------------------------------
GTT_SUPPORTED = tts_langs()  # language codes supported by gTTS
GTTS_ALIAS = {"zh": "zh-CN"}  # gTTS expects "zh-CN" or "zh-TW" for Chinese

def pick_tts_lang(lang: str) -> str:
    """Choose the best TTS language. Fallback to Hindi or English if unsupported."""
    if lang in GTT_SUPPORTED:
        return lang
    alias = GTTS_ALIAS.get(lang)
    if alias and alias in GTT_SUPPORTED:
        return alias
    if "hi" in GTT_SUPPORTED:
        return "hi"
    return "en"

def text_to_speech(text: str, lang: str, filename: str = "output.mp3") -> str | None:
    """Generate TTS audio. Requires Internet for gTTS."""
    try:
        tts_lang = pick_tts_lang(lang)
        path = Path("app/static")
        path.mkdir(parents=True, exist_ok=True)
        filepath = path / filename
        gTTS(text=text, lang=tts_lang).save(str(filepath))
        return f"/static/{filename}"
    except Exception as e:
        logging.error(f"TTS error: {e}")
        return None

# ------------------------------------------------------------------------------
# Matching
# ------------------------------------------------------------------------------
def get_best_answer(user_msg: str):
    query = user_msg.strip()
    query_clean = clean_text(query)
    if not query_clean:
        return {"answer": "❓ I couldn’t understand that. Please try asking clearly.",
                "disease": "unknown", "source": "Dataset",
                "matched_question": None, "similarity_score": 0.0, "top_matches": []}

    q_vec = vectorizer.transform([query_clean])
    sims = cosine_similarity(q_vec, tfidf_matrix).flatten()
    top_idx = sims.argsort()[::-1][:5]
    candidates = [(i, sims[i]) for i in top_idx if significant_overlap(query, questions_raw[i]) >= 1]

    if not candidates:
        return {"answer": "❓ Sorry, I don’t have an exact answer for that. Try rephrasing your question.",
                "disease": "unknown", "source": "Dataset",
                "matched_question": None, "similarity_score": 0.0, "top_matches": []}

    best_idx, best_score = max(candidates, key=lambda x: x[1])
    if best_score < 0.15:
        return {"answer": "❓ I’m not confident about the answer. Could you provide more details?",
                "disease": "unknown", "source": "Dataset",
                "matched_question": None, "similarity_score": float(best_score),
                "top_matches": [{"question": questions_raw[i], "score": float(sims[i])} for i in top_idx]}

    return {"answer": answers[best_idx], "disease": diseases[best_idx], "source": sources[best_idx],
            "matched_question": questions_raw[best_idx], "similarity_score": float(best_score),
            "top_matches": [{"question": questions_raw[i], "score": float(sims[i])} for i in top_idx]}

# ------------------------------------------------------------------------------
# Summarizer
# ------------------------------------------------------------------------------
MAX_WORDS = 120
def summarize_text(text: str, max_words: int = 120) -> str:
    sentences = re.split(r'(?<=[.!?]) +', text)
    if len(sentences) <= 2:
        return text
    vec = TfidfVectorizer(stop_words="english")
    tfidf = vec.fit_transform(sentences)
    scores = tfidf.sum(axis=1).A1
    top_n = max(3, len(sentences)//3)
    ranked = sorted(heapq.nlargest(top_n, range(len(scores)), scores.__getitem__))
    summary = " ".join([sentences[i] for i in ranked])
    words = summary.split()
    return " ".join(words[:max_words]) + ("..." if len(words) > max_words else "")

# ------------------------------------------------------------------------------
# Routes (Frontend API)
# ------------------------------------------------------------------------------
@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """Streaming API for web chat."""
    global STOP_FLAG, CURRENT_LANGUAGE
    STOP_FLAG = False

    result = get_best_answer(req.message)
    answer_text = result["answer"]

    if len(answer_text.split()) > MAX_WORDS:
        answer_text = summarize_text(answer_text)

    # Translate for current web language
    answer_text = translate_text(answer_text, CURRENT_LANGUAGE)

    # Generate audio
    audio_path = text_to_speech(answer_text, CURRENT_LANGUAGE, "last_answer.mp3")

    async def event_generator():
        for word in answer_text.split():
            if STOP_FLAG:
                yield json.dumps({"type": "stopped"}) + "\n"
                return
            yield json.dumps({"type": "reply", "data": word + " "}) + "\n"
            await asyncio.sleep(0.03)

        # Meta info
        meta = result.copy()
        if meta["matched_question"]:
            meta["matched_question"] = translate_text(meta["matched_question"], CURRENT_LANGUAGE)
        meta["answer"] = answer_text
        if audio_path:
            meta["audio"] = audio_path

        yield json.dumps({"type": "meta", "data": meta}) + "\n"
        yield json.dumps({"type": "end"}) + "\n"

    return StreamingResponse(event_generator(), media_type="application/json")

@router.post("/chat/stop")
async def stop_response(request: Request):
    global STOP_FLAG
    STOP_FLAG = True
    msg = translate_text("⏹️ Response stopped by user.", CURRENT_LANGUAGE)
    return JSONResponse({"status": "stopping", "message": msg})

@router.get("/faqs", response_model=list[FAQ])
def get_faqs(limit: int = 10):
    return [FAQ(
        question=translate_text(questions_raw[i], CURRENT_LANGUAGE),
        answer=translate_text(answers[i], CURRENT_LANGUAGE)
    ) for i in range(min(limit, len(questions_raw)))]

@router.post("/set_language")
async def set_language(request: Request):
    """Frontend can call this to set current web chat language."""
    global CURRENT_LANGUAGE
    data = await request.json()
    CURRENT_LANGUAGE = normalize_language_code(data.get("language", "en"))
    prompts = {
        "chat_started": translate_text("💬 Chat started. You can ask me health questions.", CURRENT_LANGUAGE),
        "stopped": translate_text("⏹️ Response stopped.", CURRENT_LANGUAGE),
        "language_set": translate_text(
            f"✅ Language set to {SUPPORTED_LANGUAGES.get(CURRENT_LANGUAGE, 'English')}.", CURRENT_LANGUAGE
        ),
    }
    return JSONResponse({"status": "ok", "language": CURRENT_LANGUAGE, "prompts": prompts})

@router.get("/languages")
def get_supported_languages():
    """Return list of languages for frontend dropdown."""
    return {"languages": SUPPORTED_LANGUAGES}

# ------------------------------------------------------------------------------
# WhatsApp Webhook (Twilio)
# ------------------------------------------------------------------------------
# --------------------------------------------------------------------------
# WhatsApp Webhook (Twilio) with Voice Input
# --------------------------------------------------------------------------

recognizer = sr.Recognizer()

@router.post("/whatsapp")
async def whatsapp_webhook(
    Body: str = Form(""),          # default empty if audio-only
    From: str = Form(...),
    To: str = Form(...),
    NumMedia: int = Form(0),
    MediaUrl0: str = Form(None),
    MediaContentType0: str = Form(None),
    background_tasks: BackgroundTasks = None
):
    logging.info(f"📩 WhatsApp from {From}: {Body} (media: {NumMedia})")

    # --- Language setting command ---
    maybe_match = re.match(r"^\s*(lang|language)\s*[:=]\s*(.+)$", Body.strip(), re.IGNORECASE)
    if maybe_match:
        lang_value = normalize_language_code(maybe_match.group(2))
        WHATSAPP_LANG_MAP[From] = lang_value
        confirm = f"✅ Language set to {SUPPORTED_LANGUAGES.get(lang_value, 'English')}."
        response = f"<Response><Message>{confirm}</Message></Response>"
        return PlainTextResponse(content=response, media_type="application/xml")

    user_lang = WHATSAPP_LANG_MAP.get(From, "en")

    # --- Normal answer pipeline ---
    result = get_best_answer(Body)
    answer_text = result["answer"]

    if len(answer_text.split()) > MAX_WORDS:
        answer_text = summarize_text(answer_text)

    answer_text = translate_text(answer_text, user_lang)

    # --- Build response ---
    response = f"<Response><Message><Body>{answer_text}</Body></Message></Response>"

    return PlainTextResponse(content=response, media_type="application/xml")