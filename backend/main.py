from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

class Question(BaseModel):
    question: str

@app.post("/ask_debate")
async def ask_debate(question: Question):
    if not question.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    # TODO: Process user_input or pass it to LLM
    return {"response": f"You asked: {question.question}"}
