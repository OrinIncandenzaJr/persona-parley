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
        # Prepare messages array
        messages = []
        
        if not payload.conversation_history:
            # If this is the first message, set up the full debate context
            initial_system_message = """Welcome to the moderated debate. Here are all participants:

            """ + "\n".join([f"- {p['name']}: {p['description']}" for p in PERSONAS]) + """

            Debate Rules:
            1. Stay true to your assigned perspective
            2. Only respond to the Moderator or personas who have already spoken
            3. Do not reference personas who haven't participated yet
            4. Be concise but thorough
            5. Engage meaningfully with previous arguments"""
            
            messages.append({"role": "system", "content": initial_system_message})
        else:
            # For subsequent messages, just identify the current speaker
            messages.append({"role": "system", "content": f"You are {speaker['name']}. Respond based on your perspective."})
        
        # Add conversation history
        for msg in payload.conversation_history:
            role = "assistant" if msg.persona != "Moderator" else "user"
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
