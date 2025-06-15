from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai

# === OPENAI API Setup ===
openai_client = openai.OpenAI(
    api_key="OPENAI_API_KEY"
)

# === FastAPI App ===
app = FastAPI(title="StudyBuddy Backend", version="0.1.0")

# === CORS Configuration ===
origins = [
    "http://localhost:3000",  # Your Next.js frontend origin
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Pydantic Models ===
class ChatRequest(BaseModel):
    prompt: str
    history: list[str] = []

class ChatResponse(BaseModel):
    response: str

# === Health Check ===
@app.get("/health")
def health_check():
    return {"status": "ok"}

# === AI Q&A Endpoint ===
@app.post("/api/qna", response_model=ChatResponse)
def qna(request: ChatRequest):
    try:
        completion = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                *[{"role": "user", "content": msg} for msg in request.history],
                {"role": "user", "content": request.prompt}
            ]
        )
        return {"response": completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI error: {e}")
