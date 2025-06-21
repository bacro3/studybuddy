import os
import requests
from fastapi import FastAPI, HTTPException, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import openai
from typing import List, Optional
import uuid
import json

# Load environment variables
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise RuntimeError("OPENAI_API_KEY is not set in environment variables.")

openai_client = openai.OpenAI(api_key=openai_api_key)

app = FastAPI(title="StudyBuddy Backend", version="0.1.0")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.0.2:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    prompt: str
    history: list[str] = []

class ChatResponse(BaseModel):
    response: str

class AIStudyRequest(BaseModel):
    projectId: str
    files: List[str]
    option: str
    customPrompt: Optional[str] = None

# In-memory store for study sessions (for demo only)
study_sessions = {}

# --- HARDCODED SUPABASE CREDENTIALS FOR TESTING ---
SUPABASE_URL = "https://vgmxuhmfyaefcwhlnfmx.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnbXh1aG1meWFlZmN3aGxuZm14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTUyMjI5NywiZXhwIjoyMDY1MDk4Mjk3fQ.XA4cqSoLiopOP7HAFYaQf1oFxqJqcSJzzAQ6Un3kZ0I"
# ---------------------------------------------------

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/qna", response_model=ChatResponse)
async def qna(request: ChatRequest):
    try:
        messages = [{"role": "user", "content": msg} for msg in request.history]
        messages.append({"role": "user", "content": request.prompt})

        completion = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=512,
            temperature=0.7,
        )
        result = completion.choices[0].message.content.strip()
        return {"response": result}
    except Exception as e:
        print("❌ OpenAI Error:", e)
        raise HTTPException(status_code=500, detail=f"OpenAI error: {e}")

@app.post("/api/ai-study")
async def ai_study(request: AIStudyRequest):
    try:
        print("Received request:", request)
        bucket = "project-files"

        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise HTTPException(status_code=500, detail="Supabase credentials not set.")

        file_texts = []
        for file_path in request.files:
            api_url = f"{SUPABASE_URL}/storage/v1/object/sign/{bucket}/{file_path}"
            headers = {"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"}
            resp = requests.post(api_url, headers=headers, json={"expiresIn": 600})
            print("Signed URL API URL:", api_url)
            print("Signed URL response:", resp.status_code, resp.text)
            if resp.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Failed to get signed URL for {file_path}")
            signed_url = resp.json().get("signedURL")
            if not signed_url:
                raise HTTPException(status_code=500, detail=f"No signed URL for {file_path}")

            file_url = f"{SUPABASE_URL}/storage/v1{signed_url}"
            file_resp = requests.get(file_url)
            print("File download URL:", file_url)
            print("File download response:", file_resp.status_code, file_resp.text)
            if file_resp.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Failed to download {file_path}")

            if file_path.lower().endswith(".txt"):
                text = file_resp.text
            else:
                text = f"[File {file_path} is not a supported type for extraction in this demo.]"
            file_texts.append(text)

        if request.option == "flashcards":
            prompt = "Create flashcards from the following text:\n\n"
        elif request.option == "summarize":
            prompt = "Summarize the following text:\n\n"
        elif request.option == "quiz":
            prompt = (
                "Create a quiz based on the following text.\n"
                "IMPORTANT: Only generate multiple-choice questions. "
                "Each question must have exactly four options, labeled A), B), C), and D). "
                "After all questions, provide an answer key in this format:\n\n"
                "**Answers:**\n"
                "1. B) Correct answer text\n"
                "2. D) Correct answer text\n"
                "3. A) Correct answer text\n"
                "...\n\n"
                "Do not use open-ended questions or any other format. Always follow this structure:\n\n"
                "1. Question text\n"
                "   - A) Option A\n"
                "   - B) Option B\n"
                "   - C) Option C\n"
                "   - D) Option D\n\n"
                "Repeat for each question. Then provide the answer key as shown above.\n\n"
            )
        elif request.option == "other" and request.customPrompt:
            prompt = request.customPrompt + "\n\n"
        else:
            prompt = "Analyze the following text:\n\n"

        prompt += "\n\n".join(file_texts)

        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful study assistant. "
                            "When asked to create a quiz, you must ONLY use the following format: "
                            "Each question must be multiple-choice with four options labeled A), B), C), D). "
                            "After all questions, provide an answer key in this format:\n"
                            "**Answers:**\n"
                            "1. B) Correct answer text\n"
                            "2. D) Correct answer text\n"
                            "3. A) Correct answer text\n"
                            "...\n"
                            "Never use open-ended questions or any other format."
                        ),
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1024,
                temperature=0.7,
            )
            ai_output = response.choices[0].message.content
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OpenAI error: {str(e)}")

        session_id = str(uuid.uuid4())
        study_sessions[session_id] = {
            "type": request.option,
            "result": ai_output,
            "title": f"{request.option.title()} Session"
        }
        print("Returning sessionId:", session_id)
        print("AI output:", ai_output)
        print("Saving to Supabase...")

        try:
            # Try to parse as JSON
            result_json = json.loads(ai_output)
        except Exception:
            # Fallback: wrap as string
            result_json = {"text": ai_output}

        session_data = {
            "id": session_id,
            "type": request.option,
            "title": f"{request.option.title()} Session",
            "result": result_json,
            # "user_id": user_id,
        }

        supabase_resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/study_sessions",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            data=json.dumps(session_data)
        )
        print("Supabase insert response:", supabase_resp.status_code, supabase_resp.text)

        return {"sessionId": session_id}
    except Exception as e:
        print("ERROR in /api/ai-study:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/study-session/{type}/{session_id}")
async def get_study_session(
    type: str = Path(...),
    session_id: str = Path(...)
):
    # Try in-memory first (optional)
    session = study_sessions.get(session_id)
    if session and session["type"] == type:
        return session

    # Fetch from Supabase
    supabase_url = f"{SUPABASE_URL}/rest/v1/study_sessions"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    params = {
        "id": f"eq.{session_id}",
        "type": f"eq.{type}",
        "select": "*"
    }
    resp = requests.get(supabase_url, headers=headers, params=params)
    print("Supabase fetch response:", resp.status_code, resp.text)
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch session from Supabase")
    data = resp.json()
    if not data:
        raise HTTPException(status_code=404, detail="Session not found")
    return data[0]