from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os

app = FastAPI()

# Configure OpenAI
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
if not client.api_key:
    raise ValueError("OPENAI_API_KEY environment variable is not set")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Predefined personas
PERSONAS = [
    {
        "id": "blue-collar",
        "name": "Blue Collar Worker",
        "description": "Practical, hands-on perspective focused on labor, wages, and working conditions"
    },
    {
        "id": "economist",
        "name": "Balanced Economist",
        "description": "Data-driven analysis of economic policies and market dynamics"
    },
    {
        "id": "futurist",
        "name": "Tech Futurist",
        "description": "Forward-thinking perspective on technology's impact on society"
    },
    {
        "id": "white-collar",
        "name": "White Collar Worker",
        "description": "Corporate and professional workplace perspective"
    }
]

class DebateMessage(BaseModel):
    persona: str
    content: str

class DebatePayload(BaseModel):
    new_message: str
    speaker_id: str = Field(..., description="ID of the persona to speak next")
    conversation_history: List[DebateMessage]

@app.get("/check_api_key")
async def check_api_key():
    """Debug endpoint to check if API key is set"""
    return {"api_key_set": bool(client.api_key)}

@app.get("/personas")
async def get_personas() -> List[dict]:
    """Return list of available personas"""
    return PERSONAS

@app.post("/ask_debate")
async def ask_debate(payload: DebatePayload):
    # Validate persona exists
    speaker = next((p for p in PERSONAS if p["id"] == payload.speaker_id), None)
    if not speaker:
        raise HTTPException(status_code=400, detail="Invalid persona ID")
    
    try:
        # Create system message with debate context
        system_message = f"""You are a {speaker['name']} participating in a multi-persona debate.
        Your perspective: {speaker['description']}
        You are aware this is a debate with multiple viewpoints. Stay true to your perspective while
        engaging meaningfully with others' arguments. Be concise but thorough."""

        # Convert conversation history to OpenAI message format
        messages = [{"role": "system", "content": system_message}]
        
        # Add conversation history
        for msg in payload.conversation_history:
            role = "assistant" if msg.persona != "User" else "user"
            messages.append({"role": role, "content": f"{msg.persona}: {msg.content}"})
        
        # Add the new message
        messages.append({"role": "user", "content": payload.new_message})

        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )

        return {
            "response": response.choices[0].message.content if response.choices else "No response generated",
            "persona": speaker
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
